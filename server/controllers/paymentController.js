/**
 * Payment Controller
 * Checkout sessions, status polling, the sandbox simulator and the signed
 * webhook endpoint. Settlement always goes through payments/service.handleEvent.
 */

const { z } = require('zod');
const env = require('../config/env');
const { Payment, Order, OrderItem } = require('../models');
const { getProvider } = require('../payments');
const { handleEvent } = require('../payments/service');
const { verifySignature } = require('../payments/signature');

const PAYMENT_METHODS = ['card', 'gcash', 'paymaya', 'maya', 'qrph'];

const checkoutSchema = z.object({
    orderId: z.string().uuid('orderId must be an order id')
});

const confirmSchema = z.object({
    orderId: z.string().uuid('orderId must be an order id'),
    result: z.enum(['success', 'declined']),
    method: z.enum(PAYMENT_METHODS).optional()
});

function serializePayment(payment) {
    if (!payment) return null;
    const plain = payment.get({ plain: true });
    plain.amount = Number(plain.amount);
    return plain;
}

/** Loads an order the caller is allowed to see (owner, or admin). */
async function loadOwnedOrder(orderId, user) {
    const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }]
    });
    if (!order) return null;
    if (order.userId !== user.id && user.role !== 'admin') return null;
    return order;
}

const paymentController = {
    schemas: { checkout: checkoutSchema, confirm: confirmSchema },

    // POST /api/payments/checkout - create (or reuse) a checkout session
    create: async (req, res, next) => {
        try {
            const order = await loadOwnedOrder(req.body.orderId, req.user);
            if (!order) return res.status(404).json({ message: 'Order not found' });

            if (order.status !== 'pending') {
                return res.status(409).json({ message: `Order is already ${order.status}` });
            }
            if (order.paymentMethod !== 'online') {
                return res
                    .status(400)
                    .json({ message: 'This order pays cash on pickup, not online' });
            }

            // Reuse a live session instead of minting a new one on every click.
            const existing = await Payment.findOne({
                where: { orderId: order.id, status: 'pending' },
                order: [['createdAt', 'DESC']]
            });
            if (existing && existing.checkoutUrl) {
                return res.json({
                    checkoutUrl: existing.checkoutUrl,
                    payment: serializePayment(existing),
                    reused: true
                });
            }

            const provider = getProvider();
            const payment = await Payment.create({
                orderId: order.id,
                provider: provider.name,
                // Provisional id until the gateway assigns the real session.
                providerSessionId: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                referenceNumber: order.orderNumber,
                amount: order.totalAmount,
                status: 'pending'
            });

            try {
                const session = await provider.createCheckout({
                    order,
                    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0)
                });
                await payment.update({
                    providerSessionId: session.providerSessionId,
                    checkoutUrl: session.checkoutUrl
                });
            } catch (error) {
                await payment.update({ status: 'failed', failureReason: error.message.slice(0, 250) });
                return res.status(502).json({ message: 'Could not start checkout', error: error.message });
            }

            return res.status(201).json({
                checkoutUrl: payment.checkoutUrl,
                payment: serializePayment(payment),
                reused: false
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/payments/:orderId - latest payment for polling
    get: async (req, res, next) => {
        try {
            const order = await loadOwnedOrder(req.params.orderId, req.user);
            if (!order) return res.status(404).json({ message: 'Order not found' });

            const payment = await Payment.findOne({
                where: { orderId: order.id },
                order: [['createdAt', 'DESC']]
            });

            res.json({
                payment: serializePayment(payment),
                order: { id: order.id, orderNumber: order.orderNumber, status: order.status, totalAmount: Number(order.totalAmount) }
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/payments/sandbox/confirm - simulate the gateway redirect-back.
    // Authenticated and owner-only; feeds the same pipeline as the webhook.
    confirm: async (req, res, next) => {
        try {
            if (getProvider().name !== 'sandbox') {
                return res.status(404).json({ message: 'Sandbox payments are disabled' });
            }

            const order = await Order.findByPk(req.body.orderId);
            if (!order || order.userId !== req.user.id) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const payment = await Payment.findOne({
                where: { orderId: order.id, status: 'pending' },
                order: [['createdAt', 'DESC']]
            });
            if (!payment) {
                return res.status(409).json({ message: 'No pending payment for this order' });
            }
            if (order.status !== 'pending') {
                return res.status(409).json({ message: `Order is already ${order.status}` });
            }

            const success = req.body.result === 'success';
            const event = {
                data: {
                    id: `evt_sandbox_${payment.id}`,
                    type: 'event',
                    attributes: {
                        type: success
                            ? 'checkout_session.payment.paid'
                            : 'checkout_session.payment.failed',
                        livemode: false,
                        created_at: Math.floor(Date.now() / 1000),
                        data: {
                            id: payment.providerSessionId,
                            type: 'checkout_session',
                            attributes: {
                                reference_number: payment.referenceNumber,
                                status: success ? 'paid' : 'failed',
                                payments: [
                                    {
                                        id: `pay_sandbox_${payment.id}`,
                                        attributes: {
                                            amount: Math.round(Number(payment.amount) * 100),
                                            currency: 'PHP',
                                            status: success ? 'paid' : 'failed',
                                            source: { type: req.body.method || 'card' }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            };

            const result = await handleEvent(event);
            const updated = await Payment.findByPk(payment.id);
            const freshOrder = await Order.findByPk(order.id);

            return res.json({
                result: result.ok ? 'processed' : result.reason,
                payment: serializePayment(updated),
                orderStatus: freshOrder.status
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/payments/webhook - gateway callback, signature-gated.
    // Always acknowledges 2xx for verified-but-unprocessable events so PayMongo
    // does not retry us into a loop; only a bad signature is rejected.
    webhook: async (req, res) => {
        const header =
            req.get('Paymongo-Signature') || req.get('x-paymongo-signature') || null;

        if (!env.payments.webhookSecret) {
            return res.status(401).json({ received: false, reason: 'no_webhook_secret' });
        }

        const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from('');
        if (!verifySignature(rawBody, env.payments.webhookSecret, header)) {
            return res.status(401).json({ received: false, reason: 'invalid_signature' });
        }

        try {
            const result = await handleEvent(req.body, { rawBody });
            return res.json({
                received: true,
                ...(env.isProduction ? {} : { reason: result.reason })
            });
        } catch (error) {
            // 500 triggers a PayMongo retry; the dedupe ledger makes retries safe.
            console.error('webhook processing failed:', error);
            return res.status(500).json({ received: false });
        }
    }
};

module.exports = paymentController;
