/**
 * Photo-scan pipeline: parse and validate the uploaded photo, then hand it to
 * the active scan provider.
 *
 * Validation is deliberately strict before any provider runs:
 *  - a base64 data URL whose MIME type is one of JPEG / PNG / WebP
 *  - well-formed base64 whose decoded size is within SCAN_MAX_BYTES
 *  - magic bytes must match the declared type (nothing decodes the pixels,
 *    so this is the last line of defence against junk payloads)
 */

const crypto = require('crypto');
const env = require('../config/env');
const { getScanProvider } = require('./index');

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

class ScanError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function matchesMagic(mime, bytes) {
    if (mime === 'image/png') {
        return (
            bytes.length >= 8 &&
            bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47
        );
    }
    if (mime === 'image/jpeg') {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    // image/webp: RIFF....WEBP
    return (
        bytes.length >= 12 &&
        bytes.toString('ascii', 0, 4) === 'RIFF' &&
        bytes.toString('ascii', 8, 12) === 'WEBP'
    );
}

/** @returns {{bytes: Buffer, mimeType: string}} */
function decodeImage(dataUrl) {
    const match = DATA_URL.exec(String(dataUrl || ''));
    if (!match) {
        throw new ScanError(400, 'Expected a base64 data URL (JPEG, PNG or WebP)');
    }
    const [, mimeType, base64] = match;

    // ~4/3 inflation: refuse obviously oversized payloads before decoding.
    if (base64.length > Math.ceil((env.scan.maxBytes * 4) / 3) + 1024) {
        throw new ScanError(413, 'Image is too large');
    }

    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length === 0) {
        throw new ScanError(400, 'Image data is empty');
    }
    if (bytes.length > env.scan.maxBytes) {
        throw new ScanError(413, 'Image is too large');
    }
    if (!matchesMagic(mimeType, bytes)) {
        throw new ScanError(400, 'Image data does not match its declared type');
    }

    return { bytes, mimeType };
}

/**
 * Runs one scan.
 * @param {{image: string, gender: 'Male'|'Female', studentName?: string}} input
 * @returns {Promise<{measurements: object, scan: object}>}
 */
async function runScan({ image, gender, studentName }) {
    const { bytes, mimeType } = decodeImage(image);
    const provider = getScanProvider();

    const estimate = await provider.estimate({ bytes, mimeType, gender });
    if (!estimate || !Number.isFinite(estimate.height) || !Number.isFinite(estimate.weight)) {
        throw new Error(`Scan provider "${provider.name}" returned no measurements`);
    }

    const measurements = {
        ...(studentName ? { studentName } : {}),
        gender,
        height: estimate.height,
        weight: estimate.weight,
        chest: Number.isFinite(estimate.chest) ? estimate.chest : null,
        waist: Number.isFinite(estimate.waist) ? estimate.waist : null,
        method: 'photo_scan'
    };

    return {
        measurements,
        scan: {
            provider: provider.name,
            simulated: Boolean(provider.simulated),
            mimeType,
            imageHash: crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16)
        }
    };
}

module.exports = { runScan, decodeImage, ScanError };
