/**
 * Phase 5 acceptance gate for photo-scan sizing.
 *
 *   npm run check:scan
 *
 * Requires the API to be running (npm run dev). Exercises validation
 * (MIME whitelist, base64 hygiene, magic bytes, size cap), determinism of the
 * sandbox provider, the scan -> recommendations pipeline and rate-limit
 * headers. Read-only: it places no orders and changes no stock.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function call(path, { method = 'POST', body } = {}) {
    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch (error) {
        return { status: 0, body: null, headers: new Headers(), error: error.message };
    }

    let parsed = null;
    try {
        parsed = await response.json();
    } catch {
        // Empty/non-JSON body.
    }
    return { status: response.status, body: parsed, headers: response.headers };
}

const scan = (image, gender, studentName) =>
    call('/api/uniforms/scan', {
        body: { image, gender, ...(studentName ? { studentName } : {}) }
    });

// 1x1 PNG (standard fixture). Verified against the magic bytes below.
const PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const pngDataUrl = `data:image/png;base64,${PNG_BASE64}`;

// JPEG magic (FF D8 FF) followed by filler; only the magic is inspected.
const jpegBytes = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from('JFIF-check-scan-fixture', 'ascii')
]);
const jpegDataUrl = `data:image/jpeg;base64,${jpegBytes.toString('base64')}`;

const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

function validMeasurements(m, gender) {
    if (!m || m.method !== 'photo_scan') return false;
    if (m.gender !== gender) return false;
    if (!inRange(m.height, 100, 250)) return false;
    if (!inRange(m.weight, 20, 200)) return false;
    if (!inRange(m.chest, 50, 150)) return false;
    if (!inRange(m.waist, 40, 150)) return false;
    if (gender === 'Male' && m.height > 190) return false;
    if (gender === 'Female' && m.height > 180) return false;
    return true;
}

(async () => {
    // Fixture sanity: the server checks magic bytes, so the PNG must have them.
    const magic = Buffer.from(PNG_BASE64, 'base64').subarray(0, 4);
    check(
        'fixture is a PNG (magic bytes)',
        magic[0] === 0x89 && magic[1] === 0x50 && magic[2] === 0x4e && magic[3] === 0x47,
        magic.toString('hex')
    );

    // 1. Input validation
    const noBody = await call('/api/uniforms/scan', { body: {} });
    check('empty body -> 400', noBody.status === 400, String(noBody.status));

    const noImage = await scan(null, 'Male');
    check('missing image -> 400', noImage.status === 400, String(noImage.status));

    const badGender = await scan(pngDataUrl, 'Other');
    check('invalid gender -> 400', badGender.status === 400, String(badGender.status));

    const gif = await scan('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'Male');
    check('non-whitelisted MIME -> 400', gif.status === 400, String(gif.status));

    const badBase64 = await scan('data:image/png;base64,@@@not-base64@@@', 'Male');
    check('malformed base64 -> 400', badBase64.status === 400, String(badBase64.status));

    const notAnImage = await scan(`data:image/png;base64,${Buffer.from('just some text, not a png').toString('base64')}`, 'Male');
    check('magic bytes must match the declared type -> 400', notAnImage.status === 400, String(notAnImage.status));

    const huge = await scan(`data:image/png;base64,${Buffer.alloc(5 * 1024 * 1024 + 131072, 1).toString('base64')}`, 'Male');
    check('oversized image -> 413', huge.status === 413, String(huge.status));

    // 2. Happy path (no session: sizing is public)
    const first = await scan(pngDataUrl, 'Male', 'Scan Tester');
    check('scan returns 200 with measurements', first.status === 200, `${first.status} ${JSON.stringify(first.body)}`);
    const m1 = first.body?.measurements;
    check('male measurements are in range and photo_scan', validMeasurements(m1, 'Male'), JSON.stringify(m1));
    check('student name echoed into the measurements', m1?.studentName === 'Scan Tester', String(m1?.studentName));
    check(
        'scan reports the sandbox provider as simulated',
        first.body?.scan?.provider === 'sandbox' && first.body?.scan?.simulated === true,
        JSON.stringify(first.body?.scan)
    );
    check('image hash returned', /^[0-9a-f]{16}$/.test(first.body?.scan?.imageHash || ''), String(first.body?.scan?.imageHash));

    const rateHeader = [...first.headers.entries()].find(([key]) => key.startsWith('ratelimit'));
    check('rate-limit headers present', Boolean(rateHeader), 'none');

    // 3. Determinism: the same photo always scans the same way
    const second = await scan(pngDataUrl, 'Male', 'Scan Tester');
    const m2 = second.body?.measurements;
    check(
        'same photo -> identical measurements',
        JSON.stringify({ ...m2, studentName: undefined }) === JSON.stringify({ ...m1, studentName: undefined }),
        `${JSON.stringify(m1)} vs ${JSON.stringify(m2)}`
    );
    check('same photo -> same image hash', second.body?.scan?.imageHash === first.body?.scan?.imageHash);

    // 4. A different photo scans differently (different hash at minimum)
    const other = await scan(jpegDataUrl, 'Male');
    check('jpeg accepted', other.status === 200, String(other.status));
    check('different photo -> different hash', other.body?.scan?.imageHash !== first.body?.scan?.imageHash);
    check('jpeg measurements still valid', validMeasurements(other.body?.measurements, 'Male'), JSON.stringify(other.body?.measurements));

    // 5. Gender shapes the result
    const female = await scan(pngDataUrl, 'Female');
    check('female scan valid for gender', female.status === 200 && validMeasurements(female.body?.measurements, 'Female'),
        JSON.stringify(female.body?.measurements));

    // 6. Scanned measurements feed the sizing pipeline
    const recs = await call('/api/uniforms/recommendations', { body: m1 });
    check('scan output -> recommendations 200', recs.status === 200, String(recs.status));
    check('recommendations rendered for the scanned body', recs.body?.recommendations?.length === 5,
        String(recs.body?.recommendations?.length));
    check(
        'recommendation confidence is computed',
        (recs.body?.recommendations || []).every((r) => r.confidence >= 0 && r.confidence <= 100),
        'confidence out of range'
    );

    // Report
    let failed = 0;
    for (const { name, ok, detail } of results) {
        if (!ok) failed += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> ${detail}`}`);
    }
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed === 0 ? 0 : 1);
})();
