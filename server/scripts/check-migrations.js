/**
 * Phase 7 acceptance gate for migrations + the production static path.
 *
 *   npm run check:migrations
 *
 * Proves the Sequelize migration creates a complete, working schema with
 * DB_SYNC disabled:
 *   1. drops and recreates a scratch database (uniguide_migrate_test)
 *   2. runs sequelize-cli db:migrate twice - first creates every table, the
 *      second is a recorded no-op - then checks migrate:status
 *   3. boots the API against it with DB_SYNC=false; if the migration missed
 *      anything, boot or the first query fails
 *   4. exercises every table through the API: Users (register/login),
 *      Uniforms+Sizes (boot seed), Orders+OrderItems (checkout), Payments
 *      (checkout session), WebhookEvents (signed webhook + dedup replay)
 *   5. checks the static client: / and deep links serve the SPA shell while
 *      /api still answers JSON 404
 *   6. drops the scratch database
 *
 * The main dev database is never touched.
 */
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const SERVER_DIR = path.resolve(__dirname, '..');
const CLI = path.join(SERVER_DIR, 'node_modules', 'sequelize-cli', 'lib', 'sequelize');
const MIGRATION = '20260930120000-initial-schema';
const TEST_DB = 'uniguide_migrate_test';
const CHILD_PORT = Number(process.env.MIGRATION_TEST_PORT || 5097);
const CHILD_BASE = `http://127.0.0.1:${CHILD_PORT}`;
// Dev default from config/env.js when no webhook secret is configured.
const WEBHOOK_SECRET = 'uniguide-dev-sandbox-secret';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

function baseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    try {
        const line = readFileSync(path.join(SERVER_DIR, '.env'), 'utf8')
            .split(/\r?\n/)
            .find((entry) => entry.startsWith('DATABASE_URL='));
        if (line) return line.slice(line.indexOf('=') + 1).trim();
    } catch {
        // No .env: fall through to the local default.
    }
    return 'postgres://postgres:postgres@localhost:5432/uniguide';
}

const withDb = (url, dbName) => {
    const parsed = new URL(url);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
};

const TEST_URL = withDb(baseUrl(), TEST_DB);

/** Raw HTTP (node:http so arbitrary headers stick; no socket pooling). */
function request(route, { method = 'POST', body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(route, CHILD_BASE);
        const payload = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
        const req = http.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method,
                agent: false,
                headers: {
                    ...(payload !== null ? { 'Content-Type': 'application/json' } : {}),
                    ...(payload !== null ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                    ...headers
                }
            },
            (res) => {
                let text = '';
                res.on('data', (chunk) => (text += chunk));
                res.on('end', () => {
                    let json = null;
                    try {
                        json = JSON.parse(text);
                    } catch {
                        // Non-JSON (the SPA shell).
                    }
                    resolve({ status: res.statusCode, headers: res.headers, text, body: json });
                });
            }
        );
        req.on('error', reject);
        if (payload !== null) req.write(payload);
        req.end();
    });
}

async function adminQuery(sql) {
    const { Client } = require('pg');
    const client = new Client({ connectionString: withDb(baseUrl(), 'postgres') });
    await client.connect();
    try {
        await client.query(sql);
    } finally {
        await client.end();
    }
}

function runCli(args) {
    return spawnSync(process.execPath, [CLI, ...args], {
        cwd: SERVER_DIR,
        env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: TEST_URL },
        encoding: 'utf8'
    });
}

function startChild() {
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let settled = false;
        const settle = (value) => {
            if (!settled) {
                settled = true;
                resolve(value);
            }
        };

        const proc = spawn(process.execPath, ['index.js'], {
            cwd: SERVER_DIR,
            env: {
                ...process.env,
                NODE_ENV: 'development',
                PORT: String(CHILD_PORT),
                DATABASE_URL: TEST_URL,
                DB_SYNC: 'false' // the whole point: migrations own the schema
            }
        });

        proc.stdout.on('data', (chunk) => {
            stdout += chunk;
            if (stdout.includes('Server running on port')) settle({ proc, ready: true });
        });
        proc.stderr.on('data', (chunk) => {
            stderr += chunk;
        });
        proc.on('error', (error) => settle({ proc, ready: false, detail: error.message }));
        proc.on('exit', (code) => settle({ proc, ready: false, detail: `exited ${code}: ${stderr.slice(-600)}` }));
        setTimeout(() => settle({ proc, ready: false, detail: `boot timeout: ${stderr.slice(-600)}` }), 30000);
    });
}

const kill = (proc) => {
    try {
        proc.kill();
    } catch {
        // Already gone.
    }
};

async function apiBattery() {
    const health = await request('/health', { method: 'GET' });
    check('migrated schema boots and answers /health', health.status === 200, String(health.status));

    // Uniforms + Sizes (boot seed ran against migrated tables).
    const catalogue = await request('/api/uniforms', { method: 'GET' });
    check('catalogue seeded into migrated Uniforms/Sizes (11 rows)',
        catalogue.status === 200 && Array.isArray(catalogue.body) && catalogue.body.length === 11,
        `${catalogue.status} ${Array.isArray(catalogue.body) ? catalogue.body.length : typeof catalogue.body}`);

    // Users: register + login cover the gender/role enums and hooks.
    const email = `mig-${Date.now()}@example.com`;
    const register = await request('/api/auth/register', {
        body: { name: 'Migration Student', email, password: 'Passw0rd!1', gender: 'Male' }
    });
    check('register writes to migrated Users', register.status === 201 && Boolean(register.body?.accessToken),
        String(register.status));
    const token = register.body?.accessToken;

    const login = await request('/api/auth/login', {
        body: { identifier: email, password: 'Passw0rd!1' }
    });
    check('login reads back from migrated Users', login.status === 200, String(login.status));

    // Orders + OrderItems: a cash checkout (stock decrement inside a transaction).
    const line = (Array.isArray(catalogue.body) ? catalogue.body : [])
        .flatMap((uniform) => (uniform.sizes || []).map((size) => ({ uniformId: uniform.id, sizeId: size.id, stock: size.stock })))
        .find((size) => size.stock >= 1);
    const auth = token ? { Authorization: `Bearer ${token}` } : {};

    const cash = line
        ? await request('/api/orders', {
              body: { items: [{ uniformId: line.uniformId, sizeId: line.sizeId, quantity: 1 }] },
              headers: auth
          })
        : { status: 0 };
    check('cash checkout writes Orders + OrderItems', cash.status === 201 && Boolean(cash.body?.order?.id),
        `${cash.status} ${cash.body?.message}`);

    if (cash.body?.order?.id) {
        const view = await request(`/api/orders/${cash.body.order.id}`, { method: 'GET', headers: auth });
        check('order reads back by UUID primary key', view.status === 200, String(view.status));
    }

    // Payments: an online checkout + hosted session (unique providerSessionId).
    const online = line
        ? await request('/api/orders', {
              body: { items: [{ uniformId: line.uniformId, sizeId: line.sizeId, quantity: 1 }], paymentMethod: 'online' },
              headers: auth
          })
        : { status: 0 };
    check('online order created', online.status === 201 && Boolean(online.body?.order?.id),
        `${online.status} ${online.body?.message}`);

    if (online.body?.order?.id) {
        const session = await request('/api/payments/checkout', {
            body: { orderId: online.body.order.id },
            headers: auth
        });
        check('checkout session written to migrated Payments',
            session.status === 201 && Boolean(session.body?.payment?.id),
            `${session.status} ${session.body?.message}`);
    }

    // WebhookEvents: signed delivery lands in the dedup ledger; a replay of the
    // same event id is acknowledged without reprocessing (PK on eventId).
    const eventBody = JSON.stringify({
        data: { id: `evt_mig_${Date.now()}`, type: 'unhandled.check', livemode: false, data: { id: 'cs_unknown' } }
    });
    const t = Math.floor(Date.now() / 1000);
    const signature = `t=${t},v1=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${eventBody}`).digest('hex')}`;
    const hook = await request('/api/payments/webhook', {
        body: eventBody,
        headers: { 'Paymongo-Signature': signature }
    });
    check('signed webhook recorded in migrated WebhookEvents',
        hook.status === 200 && hook.body?.received === true && hook.body?.reason === 'ignored_type',
        `${hook.status} ${hook.body ? JSON.stringify(hook.body) : hook.text.slice(0, 120)}`);

    const replay = await request('/api/payments/webhook', {
        body: eventBody,
        headers: { 'Paymongo-Signature': signature }
    });
    check('replayed event deduplicated by the ledger PK',
        replay.status === 200 && replay.body?.reason === 'duplicate',
        `${replay.status} ${replay.body?.reason}`);

    // Static client: / and deep links serve the SPA shell, /api stays JSON.
    const clientDist = path.join(SERVER_DIR, '..', 'client', 'dist');
    if (existsSync(path.join(clientDist, 'index.html'))) {
        const shell = await request('/', { method: 'GET' });
        check('GET / serves the built SPA shell',
            shell.status === 200 && shell.text.includes('<div id="root">'),
            `${shell.status} ${shell.text.slice(0, 80)}`);

        const deepLink = await request('/sizing', { method: 'GET' });
        check('deep link falls back to the SPA shell',
            deepLink.status === 200 && deepLink.text.includes('<div id="root">'),
            `${deepLink.status}`);

        const api404 = await request('/api/does-not-exist', { method: 'GET' });
        check('unknown API route still returns the JSON 404',
            api404.status === 404 && api404.body?.message === 'Not found',
            `${api404.status} ${api404.text.slice(0, 80)}`);
    } else {
        check('static client checks (client/dist not built - run npm run build)', true, 'skipped');
    }
}

(async () => {
    // 1. Scratch database.
    try {
        await adminQuery(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
        await adminQuery(`CREATE DATABASE ${TEST_DB}`);
        check('scratch database created', true);
    } catch (error) {
        check('scratch database created', false, error.message);
        return report();
    }

    let child = null;
    try {
        // 2. Migrations, twice, plus status.
        const first = runCli(['db:migrate']);
        check('db:migrate creates the schema on a fresh database',
            first.status === 0 && (first.stdout || '').includes(`${MIGRATION}: migrated`),
            `exit ${first.status}: ${(first.stderr || first.stdout || '').slice(-400)}`);

        const second = runCli(['db:migrate']);
        check('second db:migrate is a recorded no-op',
            second.status === 0 && /No migrations were executed/i.test(second.stdout || ''),
            `exit ${second.status}: ${(second.stdout || '').slice(-200)}`);

        const status = runCli(['db:migrate:status']);
        check('migrate:status reports the schema migration as up',
            status.status === 0 && (status.stdout || '').includes(`up ${MIGRATION}.js`),
            `exit ${status.status}: ${(status.stdout || '').slice(-300)}`);

        // 3. Boot against the migrated database with DB_SYNC off.
        const started = await startChild();
        child = started.proc;
        check('API boots on the migrated database with DB_SYNC=false', started.ready,
            started.detail || 'unknown boot failure');

        // 4. Exercise every table through the API (skipped if boot failed).
        if (started.ready) await apiBattery();
    } catch (error) {
        check('migration battery completed', false, String(error.stack || error.message).slice(0, 400));
    } finally {
        if (child) kill(child);
        try {
            await adminQuery(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
        } catch (error) {
            check('scratch database dropped', false, error.message);
        }
    }

    report();
})();

function report() {
    let failed = 0;
    for (const { name, ok, detail } of results) {
        if (!ok) failed += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> ${detail}`}`);
    }
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed === 0 ? 0 : 1);
}
