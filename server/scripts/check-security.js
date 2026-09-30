/**
 * Phase 6 acceptance gate for security hardening.
 *
 *   npm run check:security
 *
 * Three batteries:
 *   A. env fail-fast - production refuses to boot without explicit
 *      JWT_SECRET / TRUST_PROXY / CLIENT_ORIGINS / ADMIN_PASSWORD. Each probe
 *      runs in a child process with a clean environment and a temporary
 *      working directory so server/.env can never mask a missing variable.
 *   B. HTTP hardening against the running dev server - security headers, no
 *      X-Powered-By, response hygiene, CORS allow-list, cookie flags, JWT
 *      alg=none rejection, refresh-as-access rejection, password policy,
 *      mass-assignment, IDOR, SQL-injection probe.
 *   C. limiter trip-proof - boots a throwaway server on :5099 with tiny
 *      limits and shows every limiter actually 429ing with its own message,
 *      plus TRUST_PROXY=1 moving a flood onto the X-Forwarded-For identity.
 *
 * Creates two test accounts and three pending orders (two on the throwaway
 * server). Run `npm run reset:stock` afterwards if stock totals matter.
 */
const { execFileSync, spawn } = require('node:child_process');
const { mkdtempSync, readFileSync } = require('node:fs');
const http = require('node:http');
const { tmpdir } = require('node:os');
const path = require('node:path');

const BASE = process.env.API_BASE || 'http://localhost:5000';
const SERVER_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(SERVER_DIR, 'config', 'env.js').replace(/\\/g, '/');
const CHILD_PORT = Number(process.env.SECURITY_TEST_PORT || 5099);
const CHILD_BASE = `http://127.0.0.1:${CHILD_PORT}`;

const MSG = {
    scan: 'Too many scan requests. Please try again later.',
    order: 'Too many orders. Please try again later.',
    auth: 'Too many attempts. Please try again in a few minutes.',
    global: 'Too many requests. Please slow down.'
};

// Same verified 1x1 PNG fixture as check-scan.js (magic bytes are enforced).
const PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uniqueEmail = (tag) => `sec-${Date.now()}-${tag}@example.com`;

/** Raw HTTP helper: node:http so arbitrary headers (Origin, X-Forwarded-For) stick. */
function request(base, route, { method = 'POST', body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(route, base);
        const payload = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
        const req = http.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method,
                // No socket pooling: a 413 tears the connection down and a
                // reused socket would die with ECONNRESET on the next call.
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
                        // Non-JSON body (some proxies answer in plain text).
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

// ---------------------------------------------------------------------------
// Battery A - env fail-fast (children get a scrubbed environment + temp cwd
// so dotenv cannot backfill values that the test requires to be missing).
// ---------------------------------------------------------------------------
const ENV_KEYS = [
    'PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP',
    'APPDATA', 'LOCALAPPDATA', 'HOME', 'USER'
];

function envProbe(vars) {
    const cwd = mkdtempSync(path.join(tmpdir(), 'uniguide-env-'));
    const env = {};
    for (const key of ENV_KEYS) {
        if (process.env[key]) env[key] = process.env[key];
    }
    for (const [key, value] of Object.entries(vars)) {
        if (value !== undefined) env[key] = value; // undefined = "leave it unset"
    }
    try {
        execFileSync(process.execPath, ['-e', `require(${JSON.stringify(ENV_PATH)})`], {
            cwd,
            env,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        return { ok: true, output: '' };
    } catch (error) {
        return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}` };
    }
}

const PROD_BASE = {
    NODE_ENV: 'production',
    JWT_SECRET: 'gate-secret-a',
    JWT_REFRESH_SECRET: 'gate-secret-b',
    ADMIN_PASSWORD: 'GateStr0ng!',
    CLIENT_ORIGINS: 'https://app.example',
    TRUST_PROXY: '1'
};

function expectEnvFailure(name, vars, needle) {
    const result = envProbe(vars);
    const ok = !result.ok && result.output.includes(needle);
    check(
        name,
        ok,
        result.ok ? 'booted but should have failed' : `expected "${needle}" in: ${result.output.trim().slice(0, 240)}`
    );
}

function batteryEnv() {
    expectEnvFailure('production without JWT_SECRET refuses to boot', { NODE_ENV: 'production' }, 'JWT_SECRET');
    expectEnvFailure(
        'production refuses identical JWT secrets',
        { NODE_ENV: 'production', JWT_SECRET: 'same', JWT_REFRESH_SECRET: 'same' },
        'must differ'
    );
    expectEnvFailure(
        'production refuses the default ADMIN_PASSWORD',
        { ...PROD_BASE, ADMIN_PASSWORD: 'Admin123!' },
        'ADMIN_PASSWORD'
    );
    expectEnvFailure(
        'production without TRUST_PROXY refuses to boot',
        { ...PROD_BASE, TRUST_PROXY: undefined },
        'TRUST_PROXY'
    );
    expectEnvFailure(
        'production without a CORS allow-list refuses to boot',
        { ...PROD_BASE, CLIENT_ORIGINS: '' },
        'CLIENT_ORIGINS'
    );
    expectEnvFailure(
        'unknown SCAN_PROVIDER rejected',
        { NODE_ENV: 'development', SCAN_PROVIDER: 'bogus' },
        'SCAN_PROVIDER'
    );

    const dev = envProbe({ NODE_ENV: 'development' });
    check('development config boots with documented defaults', dev.ok, dev.output.trim().slice(0, 240));
}

// ---------------------------------------------------------------------------
// Battery B - HTTP hardening against the running server
// ---------------------------------------------------------------------------
function readClientOrigins() {
    // CI and containerised runs configure this via the environment; local dev
    // usually keeps it in server/.env.
    if (process.env.CLIENT_ORIGINS) {
        return process.env.CLIENT_ORIGINS.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
    }
    try {
        const line = readFileSync(path.join(SERVER_DIR, '.env'), 'utf8')
            .split(/\r?\n/)
            .find((entry) => entry.startsWith('CLIENT_ORIGINS='));
        if (!line) return [];
        return line
            .slice(line.indexOf('=') + 1)
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

async function batteryHttp() {
    // --- headers & response hygiene ---------------------------------------
    const catalogue = await request(BASE, '/api/uniforms', { method: 'GET' });
    const headerNames = Object.keys(catalogue.headers);
    check('helmet: X-Content-Type-Options set', catalogue.headers['x-content-type-options'] === 'nosniff',
        String(catalogue.headers['x-content-type-options']));
    check('helmet: X-Frame-Options set', Boolean(catalogue.headers['x-frame-options']),
        String(catalogue.headers['x-frame-options']));
    check('helmet: Referrer-Policy set', Boolean(catalogue.headers['referrer-policy']),
        String(catalogue.headers['referrer-policy']));
    check('helmet: HSTS set (ready for HTTPS deploys)', Boolean(catalogue.headers['strict-transport-security']),
        String(catalogue.headers['strict-transport-security']));
    check('X-Powered-By removed', !catalogue.headers['x-powered-by'], String(catalogue.headers['x-powered-by']));
    check('global API limiter advertises its budget', headerNames.some((h) => h.startsWith('ratelimit')),
        headerNames.filter((h) => h.startsWith('ratelimit')).join(', ') || 'none');

    const unknown = await request(BASE, '/api/does-not-exist', { method: 'GET' });
    check('unknown route -> JSON 404 without internals',
        unknown.status === 404 && unknown.body?.message === 'Not found' && !('stack' in (unknown.body || {})),
        `${unknown.status} ${unknown.text.slice(0, 120)}`);

    const malformed = await request(BASE, '/api/uniforms/recommendations', { body: '{oops' });
    check('malformed JSON -> 400', malformed.status === 400 && /malformed/i.test(malformed.body?.message || ''),
        `${malformed.status} ${malformed.body?.message}`);

    const oversized = await request(BASE, '/api/auth/login', {
        body: `{"password":"${'a'.repeat(200 * 1024)}"}`
    });
    check('100kb body on normal routes -> 413', oversized.status === 413, String(oversized.status));

    // --- password policy ---------------------------------------------------
    const weakNoNumber = await request(BASE, '/api/auth/register', {
        body: { name: 'Policy Test', email: uniqueEmail('weak1'), password: 'abcdefgh', gender: 'Male' }
    });
    check('password without a number -> 400', weakNoNumber.status === 400, String(weakNoNumber.status));

    const weakNoLetter = await request(BASE, '/api/auth/register', {
        body: { name: 'Policy Test', email: uniqueEmail('weak2'), password: '12345678', gender: 'Male' }
    });
    check('password without a letter -> 400', weakNoLetter.status === 400, String(weakNoLetter.status));

    // --- registration: strong password + mass-assignment attempt -----------
    const studentEmail = uniqueEmail('student');
    const register = await request(BASE, '/api/auth/register', {
        body: {
            name: 'Sec Student',
            email: studentEmail,
            password: 'Passw0rd!1',
            gender: 'Male',
            role: 'admin',
            tokenVersion: 99
        }
    });
    check('strong password registers', register.status === 201, String(register.status));
    check('role injection in the register body is ignored',
        register.body?.user?.role === 'student', String(register.body?.user?.role));
    const studentToken = register.body?.accessToken;
    const studentId = register.body?.user?.id;
    check('registration issued a token', Boolean(studentToken), 'none');

    const cookies = register.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((entry) => entry.startsWith('bcp_rt='));
    check('refresh cookie is HttpOnly + SameSite=Lax + path-scoped',
        Boolean(refreshCookie) &&
            /HttpOnly/i.test(refreshCookie) &&
            /SameSite=Lax/i.test(refreshCookie) &&
            /Path=\/api\/auth/i.test(refreshCookie),
        String(refreshCookie).slice(0, 160));

    // --- login: constant message + timing-equalized path -------------------
    const wrongPassword = await request(BASE, '/api/auth/login', {
        body: { identifier: studentEmail, password: 'Wr0ngPass9' }
    });
    const ghostLogin = await request(BASE, '/api/auth/login', {
        body: { identifier: uniqueEmail('ghost'), password: 'Wr0ngPass9' }
    });
    check('wrong password and unknown account answer identically',
        wrongPassword.status === 401 &&
            ghostLogin.status === 401 &&
            JSON.stringify(wrongPassword.body) === JSON.stringify(ghostLogin.body),
        `${wrongPassword.status}/${ghostLogin.status} ${wrongPassword.text} vs ${ghostLogin.text}`);

    // --- token attacks ------------------------------------------------------
    const tampered = await request(BASE, '/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}x` }
    });
    check('tampered access token -> 401', tampered.status === 401, String(tampered.status));

    const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const algNone = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
        sub: studentId,
        role: 'admin',
        type: 'access',
        iat: now,
        exp: now + 3600
    })}.`;
    const noneUsed = await request(BASE, '/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${algNone}` }
    });
    check('alg=none privilege-escalation token -> 401', noneUsed.status === 401, String(noneUsed.status));

    const refreshValue = refreshCookie ? refreshCookie.slice(refreshCookie.indexOf('=') + 1, refreshCookie.indexOf(';')) : '';
    const refreshAsAccess = await request(BASE, '/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${refreshValue}` }
    });
    check('refresh token used as an access token -> 401', refreshAsAccess.status === 401, String(refreshAsAccess.status));

    // --- authorization boundaries ------------------------------------------
    const scopeAll = await request(BASE, '/api/orders?scope=all', { method: 'GET', headers: auth(studentToken) });
    check('student cannot list every order (?scope=all) -> 403', scopeAll.status === 403, String(scopeAll.status));

    const adminStatus = await request(BASE, '/api/orders/00000000-0000-4000-8000-000000000000/status', {
        method: 'PATCH',
        body: { status: 'paid' },
        headers: auth(studentToken)
    });
    check('student cannot drive the order workflow -> 403', adminStatus.status === 403, String(adminStatus.status));

    const adminStock = await request(BASE, '/api/uniforms/stock', {
        method: 'PATCH',
        body: { sizeId: 1, newStock: 0 },
        headers: auth(studentToken)
    });
    check('student cannot edit inventory -> 403', adminStock.status === 403, String(adminStock.status));

    // --- IDOR: a second account must not see the first account's order ------
    const otherEmail = uniqueEmail('other');
    const other = await request(BASE, '/api/auth/register', {
        body: { name: 'Sec Other', email: otherEmail, password: 'Passw0rd!1', gender: 'Female' }
    });
    const otherToken = other.body?.accessToken;
    check('second account registered', other.status === 201 && Boolean(otherToken), String(other.status));

    const sizes = (Array.isArray(catalogue.body) ? catalogue.body : [])
        .flatMap((uniform) =>
            (uniform.sizes || []).map((size) => ({ uniformId: uniform.id, sizeId: size.id, stock: size.stock }))
        )
        .filter((size) => size.stock >= 1);
    const target = sizes[0];
    const order = target
        ? await request(BASE, '/api/orders', {
              body: { items: [{ uniformId: target.uniformId, sizeId: target.sizeId, quantity: 1 }] },
              headers: auth(studentToken)
          })
        : null;
    check('control order created', Boolean(order) && order.status === 201, String(order?.status));

    if (order?.body?.order?.id) {
        const orderId = order.body.order.id;
        const owner = await request(BASE, `/api/orders/${orderId}`, { method: 'GET', headers: auth(studentToken) });
        check('owner can read their order', owner.status === 200, String(owner.status));

        const intruder = await request(BASE, `/api/orders/${orderId}`, { method: 'GET', headers: auth(otherToken) });
        check('other account cannot read it -> 404 (no probing)', intruder.status === 404, String(intruder.status));

        const payIntruder = await request(BASE, '/api/payments/checkout', {
            body: { orderId },
            headers: auth(otherToken)
        });
        check('other account cannot start a session on it -> 404', payIntruder.status === 404, String(payIntruder.status));
    }

    // --- CORS allow-list -----------------------------------------------------
    const origins = readClientOrigins();
    const evil = await request(BASE, '/api/uniforms', { method: 'GET', headers: { Origin: 'https://evil.example' } });
    const evilAcao = evil.headers['access-control-allow-origin'];
    if (origins.length > 0) {
        check('disallowed origin gets no CORS grant', !evilAcao || evilAcao !== 'https://evil.example',
            String(evilAcao));

        const allowed = await request(BASE, '/api/uniforms', { method: 'GET', headers: { Origin: origins[0] } });
        check(`configured origin ${origins[0]} is granted`, allowed.headers['access-control-allow-origin'] === origins[0],
            String(allowed.headers['access-control-allow-origin']));
    } else {
        check('CORS allow-list present in server/.env (evil-origin check skipped)', false,
            'CLIENT_ORIGINS not found in server/.env');
    }

    // --- injection probe -----------------------------------------------------
    const injection = await request(
        BASE,
        `/api/uniforms?search=${encodeURIComponent(`'; DROP TABLE "Uniforms"; --`)}`,
        { method: 'GET' }
    );
    check('SQL injection probe answers 200 (parameterised query)', injection.status === 200, String(injection.status));
    const intact = await request(BASE, '/api/uniforms', { method: 'GET' });
    check('catalogue intact after the probe', (Array.isArray(intact.body) ? intact.body.length : -1) === 11,
        String(Array.isArray(intact.body) ? intact.body.length : typeof intact.body));
}

function auth(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Battery C - throwaway server proving every limiter trips
// ---------------------------------------------------------------------------
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
                TRUST_PROXY: '1',
                API_RATE_LIMIT: '15',
                AUTH_RATE_LIMIT: '3',
                SCAN_RATE_LIMIT: '2',
                ORDER_RATE_LIMIT: '2'
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
        proc.on('exit', (code) => settle({ proc, ready: false, detail: `exited ${code}: ${stderr.slice(-500)}` }));
        setTimeout(() => settle({ proc, ready: false, detail: `boot timeout: ${stderr.slice(-500)}` }), 30000);
    });
}

async function batteryLimiters() {
    const started = await startChild();
    if (!started.ready) {
        check('throwaway server boots with tiny limits', false, started.detail || 'unknown boot failure');
        try {
            started.proc.kill();
        } catch {
            // Already gone.
        }
        return;
    }
    check('throwaway server boots with tiny limits', true);

    try {
        // 1. scan limiter (SCAN_RATE_LIMIT=2)
        const scanBody = { image: `data:image/png;base64,${PNG_BASE64}`, gender: 'Male' };
        const s1 = await request(CHILD_BASE, '/api/uniforms/scan', { body: scanBody });
        const s2 = await request(CHILD_BASE, '/api/uniforms/scan', { body: scanBody });
        const s3 = await request(CHILD_BASE, '/api/uniforms/scan', { body: scanBody });
        check('scan limiter: first two scans pass', s1.status === 200 && s2.status === 200,
            `${s1.status}/${s2.status}`);
        check('scan limiter: third scan 429s with the scan message',
            s3.status === 429 && s3.body?.message === MSG.scan, `${s3.status} ${s3.body?.message}`);

        // 2. one account for the rest (AUTH_RATE_LIMIT=3 counts register+login)
        const email = uniqueEmail('child');
        const register = await request(CHILD_BASE, '/api/auth/register', {
            body: { name: 'Child User', email, password: 'Passw0rd!1', gender: 'Male' }
        });
        check('throwaway: account registered', register.status === 201, String(register.status));
        const login = await request(CHILD_BASE, '/api/auth/login', {
            body: { identifier: email, password: 'Passw0rd!1' }
        });
        const token = login.body?.accessToken;
        check('throwaway: login issued a token', login.status === 200 && Boolean(token), String(login.status));

        // 3. order limiter (ORDER_RATE_LIMIT=2) - needs a real size
        const uniforms = await request(CHILD_BASE, '/api/uniforms', { method: 'GET' });
        const line = (Array.isArray(uniforms.body) ? uniforms.body : [])
            .flatMap((uniform) => (uniform.sizes || []).map((size) => ({ uniformId: uniform.id, sizeId: size.id, stock: size.stock })))
            .find((size) => size.stock >= 1);
        const orderBody = line
            ? { items: [{ uniformId: line.uniformId, sizeId: line.sizeId, quantity: 1 }] }
            : null;
        const o1 = orderBody ? await request(CHILD_BASE, '/api/orders', { body: orderBody, headers: auth(token) }) : { status: 0 };
        const o2 = orderBody ? await request(CHILD_BASE, '/api/orders', { body: orderBody, headers: auth(token) }) : { status: 0 };
        const o3 = orderBody ? await request(CHILD_BASE, '/api/orders', { body: orderBody, headers: auth(token) }) : { status: 0 };
        check('order limiter: first two checkouts pass', o1.status === 201 && o2.status === 201,
            `${o1.status}/${o2.status}`);
        check('order limiter: third checkout 429s with the order message',
            o3.status === 429 && o3.body?.message === MSG.order, `${o3.status} ${o3.body?.message}`);

        // 4. auth limiter (AUTH_RATE_LIMIT=3: register + login + one miss)
        const miss1 = await request(CHILD_BASE, '/api/auth/login', {
            body: { identifier: email, password: 'Wr0ngPass9' }
        });
        const miss2 = await request(CHILD_BASE, '/api/auth/login', {
            body: { identifier: email, password: 'Wr0ngPass9' }
        });
        check('auth limiter: first miss still 401s', miss1.status === 401, String(miss1.status));
        check('auth limiter: next miss 429s with the auth message',
            miss2.status === 429 && miss2.body?.message === MSG.auth, `${miss2.status} ${miss2.body?.message}`);

        // 5. global API limiter (API_RATE_LIMIT=15, shared by everything above)
        let globalTrip = null;
        for (let attempt = 0; attempt < 10 && !globalTrip; attempt += 1) {
            const hit = await request(CHILD_BASE, '/api/uniforms', { method: 'GET' });
            if (hit.status === 429) globalTrip = hit;
        }
        check('global API limiter trips with its own message',
            Boolean(globalTrip) && globalTrip.body?.message === MSG.global,
            globalTrip ? String(globalTrip.body?.message) : 'never tripped in 10 attempts');

        // 6. TRUST_PROXY=1: the same flood from a different X-Forwarded-For
        // identity lands in a fresh bucket (proves req.ip honours the proxy hop).
        const viaProxy = await request(CHILD_BASE, '/api/uniforms', {
            method: 'GET',
            headers: { 'X-Forwarded-For': '1.2.3.4' }
        });
        check('TRUST_PROXY=1 keys the limiter onto X-Forwarded-For', viaProxy.status === 200,
            String(viaProxy.status));
    } finally {
        try {
            started.proc.kill();
        } catch {
            // Already gone.
        }
    }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
(async () => {
    batteryEnv();

    try {
        await request(BASE, '/health', { method: 'GET' });
    } catch (error) {
        check('dev server reachable', false, `${BASE} - ${error.message}. Start it with npm run dev.`);
        report();
        return;
    }

    const batteries = [
        ['HTTP hardening battery', batteryHttp],
        ['limiter battery', batteryLimiters]
    ];
    for (const [name, battery] of batteries) {
        try {
            await battery();
        } catch (error) {
            check(name, false, String(error.stack || error.message).slice(0, 400));
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
    if (failed === 0) console.log('Note: this gate creates test accounts plus pending orders - npm run reset:stock resets stock.');
    process.exit(failed === 0 ? 0 : 1);
}
