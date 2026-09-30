/**
 * Payment event pipeline - the single place where a gateway event turns into
 * database state. Both the HTTP webhook and the sandbox confirm endpoint call
 * `handleEvent`, so production and test paths share every transition.
 *
 * Guarantees:
 *  - idempotent: events are deduplicated on their id (or body hash) first
 *  - environment-guarded: live events are ignored outside live mode
 *  - order status only ever moves pending -> paid, never backwards
 */

const crypto = require('crypto');
const env = require('../config/env');
const { Payment, Order, WebhookEvent } = require('../models');
const { getProvider } = require('./index');

const HANDLED_EVENTS = [
    'checkout_session.payment.paid',
    'checkout_session.payment.failed',
    'checkout_session.expired'
];

/**
 * Supports both documented envelope shapes:
 *   {data: {type: 'event', attributes: {type, livemode, data: resource}}}
 *   {data: {type: 'checkout_session.payment.paid', livemode, data: resource}}
 */
function normalizeEvent(payload) {
    const outer = payload && payload.data;
    if (!outer || typeof outer !== 'object') return null;

    let type = null;
    let resource = null;
    let livemode = null;

    if (outer.attributes && typeof outer.attributes.type === 'string') {
        type = outer.attributes.type;
        resource = outer.attributes.data ?? null;
        livemode =
            typeof outer.attributes.livemode === 'boolean' ? outer.attributes.livemode : null;
    } else if (typeof outer.type === 'string' && outer.type.includes('.') && outer.type !== 'event') {
        type = outer.type;
        resource = outer.data ?? null;
        livemode = typeof outer.livemode === 'boolean' ? outer.livemode : null;
    } else {
        return null;
    }

    return { eventId: typeof outer.id === 'string' ? outer.id : null, type, resource, livemode };
}

function bodyHash(rawBody, payload) {
    const bytes = rawBody
        ? rawBody
        : Buffer.from(JSON.stringify(payload), 'utf8');
    return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 48)}`;
}

function expectedLivemode() {
    const provider = getProvider().name;
    if (provider !== 'paymongo') return false;
    return env.payments.paymongoSecretKey.startsWith('sk_live');
}

/** Reads reference_number / payment method out of either resource shape. */
function resourceAttributes(resource) {
    const attributes = (resource && resource.attributes) || {};
    const nestedPayments = Array.isArray(attributes.payments) ? attributes.payments : [];
    const nested = nestedPayments[0] && nestedPayments[0].attributes ? nestedPayments[0].attributes : {};
    const source = nested.source || attributes.source || null;

    return {
        referenceNumber: attributes.reference_number ?? null,
        amountCentavos: nested.amount ?? attributes.amount ?? null,
        status: nested.status || attributes.status || null,
        method: source && source.type ? source.type : null
    };
}

async function markPaid(payment, resource) {
    if (payment.status === 'succeeded') return payment;

    const info = resourceAttributes(resource);
    await payment.update({
        status: 'succeeded',
        paidAt: new Date(),
        method: payment.method || info.method,
        failureReason: null,
        providerData: {
            ...(payment.providerData || {}),
            settledAmount: info.amountCentavos,
            gatewayStatus: info.status
        }
    });

    const order = await Order.findByPk(payment.orderId);
    if (order && order.status === 'pending') {
        order.status = 'paid';
        await order.save();
    }
    return payment;
}

async function markFailed(payment, resource, fallbackReason) {
    if (payment.status === 'succeeded') return payment; // never un-pay

    const info = resourceAttributes(resource);
    await payment.update({
        status: 'failed',
        failureReason: info.status || fallbackReason || 'payment_failed',
        providerData: { ...(payment.providerData || {}), gatewayStatus: info.status }
    });
    return payment;
}

async function markExpired(payment) {
    if (payment.status !== 'pending') return payment;
    await payment.update({ status: 'expired', failureReason: 'session_expired' });
    return payment;
}

/**
 * Processes one gateway event.
 * @param {object} payload  parsed webhook JSON
 * @param {{rawBody?: Buffer}} [context]
 * @returns {Promise<{ok: boolean, reason: string, paymentId?: string}>}
 */
async function handleEvent(payload, context = {}) {
    const event = normalizeEvent(payload);
    if (!event || !event.type) return { ok: false, reason: 'unrecognized' };

    const eventId = event.eventId || bodyHash(context.rawBody, payload);
    const [record, created] = await WebhookEvent.findOrCreate({
        where: { eventId },
        defaults: { eventId, type: event.type, livemode: event.livemode }
    });
    if (!created) return { ok: false, reason: 'duplicate', paymentId: record.paymentId };

    if (!HANDLED_EVENTS.includes(event.type)) {
        return { ok: false, reason: 'ignored_type' };
    }

    if (event.livemode !== null && event.livemode !== expectedLivemode()) {
        return { ok: false, reason: 'livemode_mismatch' };
    }

    const info = resourceAttributes(event.resource);
    const sessionId = event.resource && typeof event.resource.id === 'string' ? event.resource.id : null;

    let payment = sessionId
        ? await Payment.findOne({ where: { providerSessionId: sessionId } })
        : null;
    if (!payment && info.referenceNumber) {
        payment = await Payment.findOne({
            where: { referenceNumber: info.referenceNumber },
            order: [['createdAt', 'DESC']]
        });
    }

    if (!payment) {
        // Acknowledged by the caller; recorded so retries do not loop.
        return { ok: false, reason: 'payment_not_found' };
    }

    if (event.type === 'checkout_session.payment.paid') {
        await markPaid(payment, event.resource);
    } else if (event.type === 'checkout_session.payment.failed') {
        await markFailed(payment, event.resource, 'checkout_failed');
    } else if (event.type === 'checkout_session.expired') {
        await markExpired(payment);
    }

    await record.update({ paymentId: payment.id });
    return { ok: true, reason: 'processed', paymentId: payment.id };
}

module.exports = { handleEvent, normalizeEvent, HANDLED_EVENTS };
