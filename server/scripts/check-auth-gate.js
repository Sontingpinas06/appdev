/**
 * Phase 2 acceptance gate for authentication and roles.
 *
 *   npm run check:auth
 *
 * Requires the API to be running (npm run dev) and a reachable database.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bcp.edu.ph';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function call(path, { method = 'GET', body, token, cookie, raw } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = cookie;

    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
        });
    } catch (error) {
        return { status: 0, body: null, cookie: null, error: error.message };
    }

    const setCookie = response.headers.get('set-cookie');
    let parsed = null;
    try {
        parsed = await response.json();
    } catch {
        // Empty/non-JSON body.
    }
    return { status: response.status, body: parsed, cookie: setCookie };
}

(async () => {
    const stamp = Date.now();
    const student = {
        name: `Gate Student ${stamp}`,
        email: `gate.student.${stamp}@bcp.edu.ph`,
        password: 'Passw0rd!1',
        studentId: `2024-${String(stamp).slice(-5)}`,
        gender: 'Male'
    };

    // 1. Public catalogue endpoints stay open
    const list = await call('/api/uniforms');
    check('GET /api/uniforms is public', list.status === 200 && list.body.length === 11, String(list.status));

    // 2. Admin endpoint rejects anonymous callers
    const anon = await call('/api/uniforms/stock', {
        method: 'PATCH',
        body: { uniformId: 1, sizeIndex: 0, newStock: 25 }
    });
    check('PATCH /stock without token -> 401', anon.status === 401, String(anon.status));

    // 3. Registration
    const register = await call('/api/auth/register', { method: 'POST', body: student });
    check('POST /auth/register -> 201', register.status === 201, String(register.status));
    check(
        'register returns student role',
        register.body?.user?.role === 'student',
        JSON.stringify(register.body?.user?.role)
    );
    check('register sets refresh cookie', Boolean(register.cookie && register.cookie.includes('HttpOnly')));
    const studentToken = register.body?.accessToken;

    // 4. Student token is authenticated but not authorised
    const asStudent = await call('/api/uniforms/stock', {
        method: 'PATCH',
        token: studentToken,
        body: { uniformId: 1, sizeIndex: 0, newStock: 25 }
    });
    check('PATCH /stock with student token -> 403', asStudent.status === 403, String(asStudent.status));

    // 5. /auth/me
    const me = await call('/api/auth/me', { token: studentToken });
    check('GET /auth/me -> 200', me.status === 200, String(me.status));
    check('me returns no password hash', me.status === 200 && !JSON.stringify(me.body).includes('$2b$'));

    // 6. Duplicate registration
    const duplicate = await call('/api/auth/register', { method: 'POST', body: student });
    check('duplicate email -> 409', duplicate.status === 409, String(duplicate.status));

    // 7. Login by email and by student ID
    const loginEmail = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: student.email, password: student.password }
    });
    check('login with email -> 200', loginEmail.status === 200, String(loginEmail.status));

    const loginStudentId = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: student.studentId, password: student.password }
    });
    check('login with student ID -> 200', loginStudentId.status === 200, String(loginStudentId.status));

    const badPassword = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: student.email, password: 'wrong-password' }
    });
    check('wrong password -> 401', badPassword.status === 401, String(badPassword.status));

    // 8. Session restore and logout
    const refresh = await call('/api/auth/refresh', {
        method: 'POST',
        cookie: loginEmail.cookie.split(';')[0]
    });
    check('POST /auth/refresh -> 200', refresh.status === 200, String(refresh.status));
    const refreshCookie = refresh.cookie.split(';')[0];

    const logout = await call('/api/auth/logout', { method: 'POST', cookie: refreshCookie });
    check('POST /auth/logout -> 200', logout.status === 200, String(logout.status));

    const refreshAfterLogout = await call('/api/auth/refresh', {
        method: 'POST',
        cookie: refreshCookie
    });
    check('refresh token revoked after logout -> 401', refreshAfterLogout.status === 401, String(refreshAfterLogout.status));

    // 9. Admin
    const adminLogin = await call('/api/auth/login', {
        method: 'POST',
        body: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    check('admin login -> 200', adminLogin.status === 200, String(adminLogin.status));
    check('admin role is admin', adminLogin.body?.user?.role === 'admin', String(adminLogin.body?.user?.role));

    // Read-modify-write: a hardcoded number here would silently "return"
    // stock that pending orders are holding and mask real decrements.
    const catalogue = await call('/api/uniforms', { method: 'GET' });
    const stockBefore = catalogue.body?.[0]?.sizes?.[0]?.stock;
    const asAdmin =
        typeof stockBefore === 'number'
            ? await call('/api/uniforms/stock', {
                  method: 'PATCH',
                  token: adminLogin.body?.accessToken,
                  body: { uniformId: 1, sizeIndex: 0, newStock: stockBefore + 1 }
              })
            : { status: 0 };
    check('PATCH /stock with admin token -> 200', asAdmin.status === 200,
        `${asAdmin.status} (stockBefore=${stockBefore})`);

    // Put the original number back so the gate is stock-neutral.
    if (typeof stockBefore === 'number') {
        await call('/api/uniforms/stock', {
            method: 'PATCH',
            token: adminLogin.body?.accessToken,
            body: { uniformId: 1, sizeIndex: 0, newStock: stockBefore }
        });
    }

    // 10. Input hardening
    const malformed = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ not json'
    });
    check('malformed JSON -> 400', malformed.status === 400, String(malformed.status));

    const invalidBody = await call('/api/auth/register', {
        method: 'POST',
        body: { name: 'X', email: 'not-an-email', password: 'short', gender: 'Other' }
    });
    check('invalid register body -> 400', invalidBody.status === 400, String(invalidBody.status));

    // Report
    let failed = 0;
    for (const { name, ok, detail } of results) {
        if (!ok) failed += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> ${detail}`}`);
    }
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed === 0 ? 0 : 1);
})();
