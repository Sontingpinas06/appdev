import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:5173';
const out = mkdtempSync(join(tmpdir(), 'uniguide-theme-pass-'));
const themes = ['default', 'dark', 'green', 'purple', 'red', 'orange'];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });

const errors = [];
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
    if (msg.type() === 'error' && !/status of 401/.test(msg.text())) {
        errors.push(`console: ${msg.text()}`);
    }
});

for (const theme of themes) {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.evaluate((name) => localStorage.setItem('bcpThemeName', name), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(out, `home-${theme}.png`), fullPage: true });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(out, `login-${theme}.png`), fullPage: true });
    // Register tab too - the strength meter and toggles live there.
    await page.click('.method-selector .method-btn:nth-child(2)');
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(out, `register-${theme}.png`), fullPage: true });
}

// Mobile layout of the landing page (390x844).
await page.evaluate(() => localStorage.setItem('bcpThemeName', 'default'));
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: join(out, 'home-mobile.png'), fullPage: true });
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: join(out, 'login-mobile.png'), fullPage: true });

console.log('shots:', out);
console.log('errors:', errors.length ? JSON.stringify(errors, null, 2) : 'none');
await browser.close();
