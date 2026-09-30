/**
 * Webhook signature verification (PayMongo `Paymongo-Signature` header).
 *
 * Documented scheme: HMAC-SHA256 of the raw request body with the endpoint
 * secret, compared timing-safely. The header also carries a timestamp
 * (`t=<unix>,v1=<hex>`), so both the timestamped payload (`t.body`) and the
 * plain body are accepted - whichever matches proves the sender knows the
 * secret. Always verify against the raw bytes, never a re-serialised body.
 */

const crypto = require('crypto');

function hmac(secret, data) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function safeEqual(a, b) {
    const bufferA = Buffer.from(String(a), 'utf8');
    const bufferB = Buffer.from(String(b), 'utf8');
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Parses `t=1700000000,v1=abc,v1=def` as well as a bare hex signature.
 * @returns {{timestamp: number|null, values: string[]}|null}
 */
function parseHeader(header) {
    if (!header || typeof header !== 'string') return null;
    const trimmed = header.trim();
    if (!trimmed.includes('=')) {
        return trimmed ? { timestamp: null, values: [trimmed] } : null;
    }

    const values = [];
    let timestamp = null;
    for (const piece of trimmed.split(',')) {
        const index = piece.indexOf('=');
        if (index < 1) continue;
        const key = piece.slice(0, index).trim();
        const value = piece.slice(index + 1).trim();
        if (key === 'v1' && value) values.push(value);
        if (key === 't' && /^\d+$/.test(value)) timestamp = Number(value);
    }
    return values.length ? { timestamp, values } : null;
}

/**
 * @param {Buffer|string} rawBody  exactly the bytes that were signed
 * @param {string} secret          endpoint secret
 * @param {string} header          value of the signature header
 * @param {object} [options]
 * @param {number} [options.toleranceSec] max clock skew for timestamped schemes
 * @returns {boolean}
 */
function verifySignature(rawBody, secret, header, options = {}) {
    if (!secret || !header) return false;

    const parsed = parseHeader(header);
    if (!parsed) return false;

    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
    const { toleranceSec = 300 } = options;

    if (parsed.timestamp !== null) {
        const age = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
        if (age > toleranceSec) return false;
    }

    const candidates = [hmac(secret, body)];
    if (parsed.timestamp !== null) {
        candidates.push(hmac(secret, `${parsed.timestamp}.${body}`));
    }

    return parsed.values.some((value) => candidates.some((candidate) => safeEqual(value, candidate)));
}

/** Signs a payload the same way (used by tests and synthetic sandbox events). */
function signPayload(rawBody, secret, timestamp) {
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
    const t = timestamp ?? Math.floor(Date.now() / 1000);
    return { t, v1: hmac(secret, `${t}.${body}`), plain: hmac(secret, body) };
}

module.exports = { verifySignature, signPayload };
