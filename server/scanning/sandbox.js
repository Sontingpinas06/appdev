/**
 * Sandbox scan provider - the no-key default.
 *
 * Produces deterministic, anthropometrically plausible measurements derived
 * from SHA-256 of the image bytes plus the selected gender, so the same photo
 * always yields the same result (testable, and a stable UX while a real AI
 * provider is being wired up). Results are labelled `simulated` and the UI
 * must say so.
 *
 * To add a real provider later: create gemini.js/openai.js exposing
 * `{ name, simulated: false, estimate({ bytes, mimeType, gender }) }`,
 * register it in index.js behind its API-key env var, and 'auto' picks it up.
 */

const crypto = require('crypto');

/** mulberry32 - tiny deterministic PRNG seeded from the image hash. */
function mulberry32(seed) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const RANGES = {
    Male: { height: [155, 190], weight: [50, 94] },
    Female: { height: [145, 180], weight: [42, 82] }
};

const clamp = (value, min, max, fallback) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

class SandboxScanProvider {
    constructor() {
        this.name = 'sandbox';
        this.simulated = true;
    }

    /**
     * @param {{bytes: Buffer, gender: 'Male'|'Female'}} input
     * @returns {{height: number, weight: number, chest: number, waist: number}}
     */
    async estimate({ bytes, gender }) {
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        const random = mulberry32(parseInt(hash.slice(0, 8), 16) >>> 0);

        const [heightMin, heightMax] = RANGES[gender].height;
        const [weightMin, weightMax] = RANGES[gender].weight;

        const frame = random(); // body-frame factor, stable per photo
        const heightT = random(); // independent height factor
        const jitter = random() * 6 - 3; // +/-3cm shaping noise

        const height = Math.round(heightMin + heightT * (heightMax - heightMin));

        // Weight grows with stature, then varies by frame.
        const heightShare = (height - heightMin) / (heightMax - heightMin);
        const weight =
            weightMin + heightShare * 0.45 * (weightMax - weightMin) + frame * 0.55 * (weightMax - weightMin);

        // Girths track weight/height (rough anthropometry for a simulation).
        const chest =
            gender === 'Male'
                ? 0.35 * weight + 0.32 * height + 12 + jitter
                : 0.3 * weight + 0.3 * height + 16 + jitter;
        const waist =
            gender === 'Male'
                ? 0.45 * weight + 0.22 * height + 5 + jitter
                : 0.4 * weight + 0.2 * height + 8 + jitter;

        return {
            height: clamp(Math.round(height), 100, 250, 170),
            weight: clamp(Math.round(weight), 20, 200, 65),
            chest: clamp(Math.round(chest), 50, 150, 90),
            waist: clamp(Math.round(waist), 40, 150, 75)
        };
    }
}

module.exports = SandboxScanProvider;
