/**
 * One-off parity check: the legacy prototype's client-side sizing algorithm
 * (prototype/app.js) vs the API's /api/uniforms/recommendations.
 * Run: node scripts/check-sizing-parity.js
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const http = require('http');

const root = path.resolve(__dirname, '..', '..');
const dataSrc = fs.readFileSync(path.join(root, 'prototype/data.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'prototype/app.js'), 'utf8');

const ctx = {
    console,
    setTimeout,
    clearTimeout,
    window: { addEventListener() {} },
    document: {
        addEventListener() {},
        getElementById: () => null,
        querySelectorAll: () => []
    },
    navigator: {},
    URL: { createObjectURL: () => '' }
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(dataSrc, ctx);
vm.runInContext(appSrc, ctx);

let legacy = null;
ctx.displayRecommendations = (recs) => {
    legacy = recs;
};

const cases = [
    { height: 172, weight: 68, chest: 92, waist: 78, gender: 'Male' },
    { height: 158, weight: 50, chest: 80, waist: 65, gender: 'Female' },
    { height: 165, weight: 75, gender: 'Male' }, // no chest/waist
    { height: 190, weight: 110, chest: 110, waist: 100, gender: 'Female' },
    { height: 145, weight: 40, chest: 70, waist: 58, gender: 'Female' }
];

function post(payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const req = http.request(
            {
                host: 'localhost',
                port: 5000,
                path: '/api/uniforms/recommendations',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let data = '';
                res.on('data', (c) => (data += c));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

(async () => {
    let allMatch = true;

    for (const payload of cases) {
        legacy = null;
        ctx.processMeasurements({ ...payload, studentName: 'parity', method: 'manual' });

        const { recommendations } = await post(payload);

        const left = legacy
            .slice()
            .sort((a, b) => b.confidence - a.confidence)
            .map((r) => `${r.uniform.id}:${r.size.size}:${r.confidence}`);
        const right = recommendations.map(
            (r) => `${r.uniformId}:${r.recommendedSize}:${r.confidence}`
        );

        const match = JSON.stringify(left) === JSON.stringify(right);
        allMatch = allMatch && match;
        console.log(
            `${match ? 'MATCH   ' : 'MISMATCH'} ${JSON.stringify(payload)}\n` +
                `         legacy=${JSON.stringify(left)}\n` +
                `         api   =${JSON.stringify(right)}`
        );
    }

    console.log(allMatch ? '\nAll cases match.' : '\nDifferences found.');
    process.exit(allMatch ? 0 : 1);
})();
