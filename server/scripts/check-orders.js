/**
 * Phase 3 acceptance gate for cart/checkout/orders.
 *
 *   npm run check:orders
 *
 * Requires the API to be running (npm run dev) and a seeded database.
 * Creates two throwaway students; restores stock it consumes.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bcp.edu.ph';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function call(path, { method = 'GET', body, token, expected } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
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
    if (expected !== undefined && response.status !== expected) {
        results.push({ name: `expect ${expected}: ${method} ${path}`, ok: false, detail: String(response.status) });
    }
    return { status: response.status, body: parsed };
}

/** Reads live stock for a size straight from the catalogue. */
async function stockOf(token, uniformId, sizeIndex) {
    const list = await call('/api/uniforms', { token });
    const uniform = list.body.find((u) => u.id === uniformId);
    return uniform.sizes[sizeIndex].stock;
}

(async () => {
    const stamp = Date.now();
    const mkStudent = (tag) => ({
        name: `Order ${tag} ${stamp}`,
        email: `order.${tag}.${stamp}@bcp.edu.ph`,
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
    const line = { uniformId: UNIFORM, sizeId, quantity: 2 };

    // 1. Checkout requires a session
    const anon = await call('/api/orders', { method: 'POST', body: { items: [line] } });
    check('POST /orders without token -> 401', anon.status === 401, String(anon.status));

    // 2. Valid checkout
    const placed = await call('/api/orders', {
        method: 'POST',
        token: aliceToken,
        body: { items: [line] },
        expected: 201
    });
    const order = placed.body?.order;
    check('checkout returns 201 with an order number', Boolean(order?.orderNumber?.startsWith('BCP-')), String(order?.orderNumber));
    check('checkout total matches price x qty', Number(order?.totalAmount) === price * 2, `${order?.totalAmount} vs ${price * 2}`);
    check('order snapshot keeps name/size/price', order?.items?.[0]?.uniformName && order?.items?.[0]?.sizeLabel && Number(order?.items?.[0]?.price) === price);
    check('checkout decrements stock', (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 2, `baseline ${baseline}`);

    // 3. Overselling is refused and stock is untouched
    const currentStock = baseline - 2;
    const oversell = await call('/api/orders', {
        method: 'POST',
        token: aliceToken,
        body: { items: [{ uniformId: UNIFORM, sizeId, quantity: Math.min(50, currentStock + 1) }] }
    });
    check('overselling -> 409', oversell.status === 409, String(oversell.status));
    check('failed checkout leaves stock unchanged', (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 2);

    // 4. Empty / malformed carts
    const empty = await call('/api/orders', { method: 'POST', token: aliceToken, body: { items: [] } });
    check('empty cart -> 400', empty.status === 400, String(empty.status));

    // 5. Order history and access control
    const aliceList = await call('/api/orders', { token: aliceToken });
    check('GET /orders returns own orders', aliceList.body?.orders?.some((o) => o.id === order.id));
    const bobList = await call('/api/orders', { token: bobToken });
    check("another student's order is not listed", !bobList.body?.orders?.some((o) => o.id === order.id));

    const byId = await call(`/api/orders/${order.id}`, { token: aliceToken });
    check('GET /orders/:id owner -> 200', byId.status === 200, String(byId.status));
    const crossRead = await call(`/api/orders/${order.id}`, { token: bobToken });
    check("GET /orders/:id other student -> 404", crossRead.status === 404, String(crossRead.status));

    // 6. Bob orders too, so the admin list has data from both students
    const bobOrder = await call('/api/orders', {
        method: 'POST',
        token: bobToken,
        body: { items: [{ uniformId: UNIFORM, sizeId, quantity: 1 }] },
        expected: 201
    });

    const scopeLeak = await call('/api/orders?scope=all', { token: aliceToken });
    check('student ?scope=all -> 403', scopeLeak.status === 403, String(scopeLeak.status));
    const adminLogin = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        expected: 200
    });
    const adminToken = adminLogin.body?.accessToken;
    const allOrders = await call('/api/orders?scope=all', { token: adminToken });
    const adminSeesBoth =
        allOrders.body?.orders?.some((o) => o.id === order.id) &&
        allOrders.body?.orders?.some((o) => o.id === bobOrder.body?.order?.id && Boolean(o.user?.email));
    check('admin sees every order with the buyer attached', adminSeesBoth, String(allOrders.body?.orders?.length));

    // 7. Status workflow (students cannot touch it)
    const studentPatch = await call(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        token: aliceToken,
        body: { status: 'paid' }
    });
    check('student PATCH status -> 403', studentPatch.status === 403, String(studentPatch.status));

    const badStatus = await call(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'shipped' }
    });
    check('unknown status -> 400', badStatus.status === 400, String(badStatus.status));

    const paid = await call(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'paid' },
        expected: 200
    });
    check('admin marks order paid', paid.body?.order?.status === 'paid', String(paid.body?.order?.status));
    check('marking paid does not touch stock', (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 3);

    // 8. Cancelling returns the stock
    const cancelled = await call(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'cancelled' },
        expected: 200
    });
    check('cancelled order restores stock', (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 1, 'expected baseline - 1 (Bob keeps 1)');

    const cancelledAgain = await call(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'cancelled' },
        expected: 200
    });
    check('re-cancelling is a no-op', (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline - 1);

    // Leave Bob's order cancelled as well so the run is stock-neutral.
    await call(`/api/orders/${bobOrder.body?.order?.id}/status`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'cancelled' },
        expected: 200
    });
    check('stock restored after all cancellations', (await stockOf(aliceToken, UNIFORM, SIZE_INDEX)) === baseline, `${await stockOf(aliceToken, UNIFORM, SIZE_INDEX)} vs ${baseline}`);

    // Report
    let failed = 0;
    for (const { name, ok, detail } of results) {
        if (!ok) failed += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> ${detail}`}`);
    }
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed === 0 ? 0 : 1);
})();
