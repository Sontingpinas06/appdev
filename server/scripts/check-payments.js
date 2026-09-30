/**
 * Phase 4 acceptance gate for payments.
 *
 *   npm run check:payments
 *
 * Requires the API to be running (npm run dev). Creates two throwaway
 * students, exercises the checkout session lifecycle, webhook signature
 * verification (timestamped and bare schemes), idempotency, the sandbox
 * approve/decline paths and the cash-on-pickup exclusion - then cancels
 * every order it created so the run is stock-neutral.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bcp.edu.ph';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const crypto = require('crypto');

// Same resolved secret the server verifies with (shared .env / dev default).
const { payments } = require('../config/env');
const WEBHOOK_SECRET = payments.webhookSecret;

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function call(path, { method = 'GET', body, token, headers = {} } = {}) {
    const requestHeaders = { ...headers };
    if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
    if (token) requestHeaders.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers: requestHeaders,
            body: typeof body === 'string' ? body : body === undefined ? undefined : JSON.stringify(body)
        });
    } catch (error) {
        return { status: 0, body: null, error: error.message };
    }

    let parsed = null;
    try {
        parsed = await response.json();
    } catch {
        // Empty/non-JSON body.
    }
    return { status: response.status, body: parsed };
}

const hmac = (data, secret) =>
    crypto.createHmac('sha256', secret).update(data).digest('hex');

/** Timestamped scheme: t=<unix>,v1=HMAC(t.body) */
function signedHeader(rawBody) {
    const t = Math.floor(Date.now() / 1000);
    return `t=${t},v1=${hmac(`${t}.${rawBody}`, WEBHOOK_SECRET)}`;
}

/** Bare scheme documented as HMAC of the raw body alone. */
const bareHeader = (rawBody) => hmac(rawBody, WEBHOOK_SECRET);

function postWebhook(rawBody, signature) {
    return call('/api/payments/webhook', {
        method: 'POST',
        body: rawBody,
        headers: signature ? { 'Paymongo-Signature': signature } : {}
    });
}

/** PayMongo-shaped `checkout_session.payment.paid` event. */
function paidEvent({ eventId, sessionId, reference, amountCentavos, method, livemode = false }) {
    return JSON.stringify({
        data: {
            id: eventId,
            type: 'event',
            attributes: {
                type: 'checkout_session.payment.paid',
                livemode,
                created_at: Math.floor(Date.now() / 1000),
                data: {
                    id: sessionId,
                    type: 'checkout_session',
                    attributes: {
                        reference_number: reference,
                        status: 'paid',
                        payments: [
                            {
                                id: `pay_${eventId}`,
                                attributes: {
                                    amount: amountCentavos,
                                    currency: 'PHP',
                                    status: 'paid',
                                    source: { type: method }
                                }
                            }
                        ]
                    }
                }
            }
        }
    });
}

async function stockOf(token, uniformId, sizeIndex) {
    const list = await call('/api/uniforms', { token });
    const uniform = list.body.find((u) => u.id === uniformId);
    return uniform.sizes[sizeIndex].stock;
}

(async () => {
    if (!WEBHOOK_SECRET) {
        console.error('setup failed: no webhook secret resolved from the environment');
        process.exit(1);
    }

    const stamp = Date.now();
    const mkStudent = (tag) => ({
        name: `Pay ${tag} ${stamp}`,
        email: `pay.${tag}.${stamp}@bcp.edu.ph`,
        password: 'Passw0rd!1',
        gender: 'Male'
    });

    const alice = mkStudent('alice');
    const bob = mkStudent('bob');

    const regAlice = await call('/api/auth/register', { method: 'POST', body: alice, expected: 201 });
    const regBob = await call('/api/auth/register', { method: 'POST', body: bob, expected: 201 });
    const aliceToken = regAlice.body?.accessToken;
    const bobToken = regBob.body?.accessToken;
    if (!aliceToken || !bobToken) {
        console.error('setup failed: could not register test students', regAlice.status, regBob.status);
        process.exit(1);
    }

    const UNIFORM = 1; // Polo Shirt - White
    const SIZE_INDEX = 0; // XS
    const baseline = await stockOf(aliceToken, UNIFORM, SIZE_INDEX);
    const uniformList = await call('/api/uniforms');
    const sizeId = uniformList.body.find((u) => u.id === UNIFORM).sizes[SIZE_INDEX].id;
    const price = uniformList.body.find((u) => u.id === UNIFORM).sizes[SIZE_INDEX].price;

    const placeOrder = (paymentMethod) =>
        call('/api/orders', {
            method: 'POST',
            token: aliceToken,
            body: {
                items: [{ uniformId: UNIFORM, sizeId, quantity: 1 }],
                ...(paymentMethod ? { paymentMethod } : {})
            }
        });

    // -------------------------------------------------------------------------
    // 1. Online order A: session creation and idempotency
    // -------------------------------------------------------------------------
    const placedA = await placeOrder('online');
    const orderA = placedA.body?.order;
    check('online order returns 201 with paymentMethod=online',
        placedA.status === 201 && orderA?.paymentMethod === 'online',
        `${placedA.status} ${orderA?.paymentMethod}`);
    check('stock decremented once for order A',
        (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 1,
        `baseline ${baseline}`);

    const anonCheckout = await call('/api/payments/checkout', {
        method: 'POST',
        body: { orderId: orderA?.id }
    });
    check('POST /payments/checkout without token -> 401', anonCheckout.status === 401, String(anonCheckout.status));

    const badUuid = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: 'not-a-uuid' }
    });
    check('malformed orderId -> 400', badUuid.status === 400, String(badUuid.status));

    const crossCheckout = await call('/api/payments/checkout', {
        method: 'POST',
        token: bobToken,
        body: { orderId: orderA?.id }
    });
    check("another student's checkout -> 404", crossCheckout.status === 404, String(crossCheckout.status));

    const checkout1 = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderA?.id }
    });
    const paymentA = checkout1.body?.payment;
    check('checkout session created (201, pending, with a URL)',
        checkout1.status === 201 && paymentA?.status === 'pending' && Boolean(checkout1.body?.checkoutUrl),
        `${checkout1.status} ${paymentA?.status}`);
    check('session amount equals the order total',
        Number(paymentA?.amount) === Number(orderA?.totalAmount),
        `${paymentA?.amount} vs ${orderA?.totalAmount}`);
    check('session references our order number', paymentA?.referenceNumber === orderA?.orderNumber,
        String(paymentA?.referenceNumber));

    const checkout2 = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderA?.id }
    });
    check('second checkout reuses the live session (no duplicate)',
        checkout2.status === 200 && checkout2.body?.reused === true && checkout2.body?.payment?.id === paymentA?.id,
        `${checkout2.status} reused=${checkout2.body?.reused}`);

    const paymentView = await call(`/api/payments/${orderA.id}`, { token: aliceToken });
    check('GET /payments/:orderId owner -> 200 pending',
        paymentView.status === 200 && paymentView.body?.payment?.status === 'pending',
        String(paymentView.body?.payment?.status));
    const paymentAnon = await call(`/api/payments/${orderA.id}`);
    check('GET /payments/:orderId without token -> 401', paymentAnon.status === 401, String(paymentAnon.status));
    const paymentCross = await call(`/api/payments/${orderA.id}`, { token: bobToken });
    check("another student's payment -> 404", paymentCross.status === 404, String(paymentCross.status));

    // -------------------------------------------------------------------------
    // 2. Webhook signature verification
    // -------------------------------------------------------------------------
    const eventA = paidEvent({
        eventId: `evt_gate_${stamp}`,
        sessionId: paymentA.providerSessionId,
        reference: orderA.orderNumber,
        amountCentavos: Math.round(Number(orderA.totalAmount) * 100),
        method: 'gcash'
    });

    const unsigned = await postWebhook(eventA, null);
    check('webhook without signature -> 401', unsigned.status === 401, String(unsigned.status));

    const wrongSecret = `t=${Math.floor(Date.now() / 1000)},v1=${hmac(eventA, 'wrong-secret')}`;
    const forged = await postWebhook(eventA, wrongSecret);
    check('webhook with wrong secret -> 401', forged.status === 401, String(forged.status));

    // Signature computed over one body, delivered with another.
    const tampered = await postWebhook(`${eventA} `, signedHeader(eventA));
    check('webhook with mismatched body -> 401', tampered.status === 401, String(tampered.status));

    // -------------------------------------------------------------------------
    // 3. Environment guard + settlement
    // -------------------------------------------------------------------------
    const liveEvent = paidEvent({
        eventId: `evt_gate_live_${stamp}`,
        sessionId: paymentA.providerSessionId,
        reference: orderA.orderNumber,
        amountCentavos: Math.round(Number(orderA.totalAmount) * 100),
        method: 'card',
        livemode: true
    });
    const live = await postWebhook(liveEvent, signedHeader(liveEvent));
    check('live event outside live mode -> acknowledged, ignored',
        live.status === 200 && live.body?.reason === 'livemode_mismatch',
        `${live.status} ${live.body?.reason}`);
    check('ignored live event left the payment pending',
        (await call(`/api/payments/${orderA.id}`, { token: aliceToken })).body?.payment?.status === 'pending');

    const settled = await postWebhook(eventA, signedHeader(eventA));
    check('signed paid event -> 200 processed', settled.status === 200 && settled.body?.reason === 'processed',
        `${settled.status} ${settled.body?.reason}`);

    const afterPaid = await call(`/api/payments/${orderA.id}`, { token: aliceToken });
    const paidPayment = afterPaid.body?.payment;
    check('payment marked succeeded with paidAt + method',
        paidPayment?.status === 'succeeded' && Boolean(paidPayment?.paidAt) && paidPayment?.method === 'gcash',
        `${paidPayment?.status} ${paidPayment?.method}`);
    check('order A auto-marked paid', afterPaid.body?.order?.status === 'paid', afterPaid.body?.order?.status);
    check('settling never touches stock',
        (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 1);

    const repeat = await postWebhook(eventA, signedHeader(eventA));
    check('duplicate event id -> acknowledged, not reprocessed',
        repeat.status === 200 && repeat.body?.reason === 'duplicate', `${repeat.status} ${repeat.body?.reason}`);
    const paidAtBefore = paidPayment?.paidAt;
    check('paidAt unchanged after duplicate',
        (await call(`/api/payments/${orderA.id}`, { token: aliceToken })).body?.payment?.paidAt === paidAtBefore);

    const unknown = JSON.stringify({
        data: { id: `evt_gate_x_${stamp}`, type: 'event', attributes: { type: 'refund.created', livemode: false } }
    });
    const ignored = await postWebhook(unknown, signedHeader(unknown));
    check('unhandled event type -> 200 acknowledged',
        ignored.status === 200 && ignored.body?.reason === 'ignored_type',
        `${ignored.status} ${ignored.body?.reason}`);

    const bare = JSON.stringify({
        data: { id: `evt_gate_bare_${stamp}`, type: 'event', attributes: { type: 'charge.succeeded', livemode: false } }
    });
    const bareOk = await postWebhook(bare, bareHeader(bare));
    check('bare body-only signature accepted', bareOk.status === 200, String(bareOk.status));

    const repaid = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderA?.id }
    });
    check('paid order cannot start checkout again -> 409', repaid.status === 409, String(repaid.status));

    // -------------------------------------------------------------------------
    // 4. Sandbox settle/decline and retry
    // -------------------------------------------------------------------------
    const placedB = await placeOrder('online');
    const orderB = placedB.body?.order;
    const checkoutB = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderB?.id }
    });
    const paymentB1 = checkoutB.body?.payment;

    const declined = await call('/api/payments/sandbox/confirm', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderB.id, result: 'declined', method: 'card' }
    });
    check('sandbox decline -> payment failed, order still pending',
        declined.status === 200 && declined.body?.payment?.status === 'failed' && declined.body?.orderStatus === 'pending',
        `${declined.status} ${declined.body?.payment?.status}/${declined.body?.orderStatus}`);
    check('declined order keeps its stock reserved',
        (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 2);

    const badResult = await call('/api/payments/sandbox/confirm', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderB.id, result: 'maybe' }
    });
    check('sandbox confirm rejects unknown result -> 400', badResult.status === 400, String(badResult.status));

    const badMethod = await call('/api/payments/sandbox/confirm', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderB.id, result: 'success', method: 'paypal' }
    });
    check('sandbox confirm rejects unknown method -> 400', badMethod.status === 400, String(badMethod.status));

    const crossConfirm = await call('/api/payments/sandbox/confirm', {
        method: 'POST',
        token: bobToken,
        body: { orderId: orderB.id, result: 'success' }
    });
    check("another student's sandbox confirm -> 404", crossConfirm.status === 404, String(crossConfirm.status));

    const retry = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderB?.id }
    });
    const paymentB2 = retry.body?.payment;
    check('retry after decline creates a fresh session',
        retry.status === 201 && paymentB2?.status === 'pending' && paymentB2?.id !== paymentB1?.id,
        `${retry.status} ${paymentB2?.id} vs ${paymentB1?.id}`);

    const approved = await call('/api/payments/sandbox/confirm', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderB.id, result: 'success', method: 'gcash' }
    });
    check('sandbox approval -> payment succeeded, order paid',
        approved.status === 200 && approved.body?.payment?.status === 'succeeded' && approved.body?.orderStatus === 'paid',
        `${approved.status} ${approved.body?.payment?.status}/${approved.body?.orderStatus}`);

    // -------------------------------------------------------------------------
    // 5. Cash-on-pickup orders are not payable online
    // -------------------------------------------------------------------------
    const placedC = await call('/api/orders', {
        method: 'POST',
        token: aliceToken,
        body: { items: [{ uniformId: UNIFORM, sizeId, quantity: 1 }] }
    });
    const orderC = placedC.body?.order;
    check('order defaults to cash on pickup',
        placedC.status === 201 && orderC?.paymentMethod === 'cash_on_pickup',
        String(orderC?.paymentMethod));

    const cashCheckout = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderC?.id }
    });
    check('cash order checkout -> 400', cashCheckout.status === 400, String(cashCheckout.status));

    const adminLogin = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        expected: 200
    });
    const adminToken = adminLogin.body?.accessToken;
    if (!adminToken) {
        console.error('setup failed: could not log in as admin');
        process.exit(1);
    }

    const adminPaidCash = await call(`/api/orders/${orderC.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'paid' }
    });
    check('admin can still mark a cash order paid', adminPaidCash.body?.order?.status === 'paid',
        adminPaidCash.body?.order?.status);

    const paidCashCheckout = await call('/api/payments/checkout', {
        method: 'POST',
        token: aliceToken,
        body: { orderId: orderC?.id }
    });
    check('already-paid order checkout -> 409', paidCashCheckout.status === 409, String(paidCashCheckout.status));

    const adminPaymentView = await call(`/api/payments/${orderA.id}`, { token: adminToken });
    check('admin can view any payment', adminPaymentView.status === 200, String(adminPaymentView.status));

    // -------------------------------------------------------------------------
    // 6. Admin order list carries the payment summary
    // -------------------------------------------------------------------------
    const allOrders = await call('/api/orders?scope=all', { token: adminToken });
    const adminViewA = allOrders.body?.orders?.find((o) => o.id === orderA.id);
    const adminViewC = allOrders.body?.orders?.find((o) => o.id === orderC.id);
    check('admin list shows online order with succeeded payment',
        adminViewA?.paymentMethod === 'online' && adminViewA?.payment?.status === 'succeeded',
        `${adminViewA?.paymentMethod}/${adminViewA?.payment?.status}`);
    check('admin list shows cash order with no payment attempt',
        adminViewC?.paymentMethod === 'cash_on_pickup' && !adminViewC?.payment,
        `${adminViewC?.paymentMethod}/${adminViewC?.payment}`);

    // -------------------------------------------------------------------------
    // 7. Cleanup: cancel everything so the run is stock-neutral
    // -------------------------------------------------------------------------
    for (const orderId of [orderA.id, orderB.id, orderC.id]) {
        await call(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            token: adminToken,
            body: { status: 'cancelled' }
        });
    }
    const finalStock = await stockOf(aliceToken, UNIFORM, SIZE_INDEX);
    check('stock fully restored after cancellations', finalStock === baseline, `${finalStock} vs ${baseline}`);

    // Report
    let failed = 0;
    for (const { name, ok, detail } of results) {
        if (!ok) failed += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> ${detail}`}`);
    }
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed === 0 ? 0 : 1);
})();
