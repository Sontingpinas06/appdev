/**
 * Smoke test for the React app (Phases 1-2).
 * Drives the real app with the system Chrome install (no bundled browser).
 *
 *   npm run smoke
 */
import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5173';
const shots = mkdtempSync(join(tmpdir(), 'uniguide-smoke-'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

const errors = [];
// A 401 from POST /auth/refresh is the normal "no session to restore" path.
const EXPECTED_401 = /status of 401/;
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
    if (msg.type() === 'error' && !EXPECTED_401.test(msg.text())) {
        errors.push(`console: ${msg.text()} @ ${msg.location().url || 'unknown'}`);
    }
});
page.on('response', (res) => {
    if (res.status() === 404) errors.push(`404: ${res.url()}`);
});

const results = {};
const check = (name, condition, detail = '') => {
    results[name] = condition ? 'PASS' : `FAIL ${detail}`;
};

try {
    // --- Body scan sizing -------------------------------------------------
    await page.goto(`${BASE}/sizing`, { waitUntil: 'networkidle' });
    await page.fill('#studentName', 'Test Student');
    await page.selectOption('#gender', 'Male');
    await page.fill('#height', '172');
    await page.fill('#weight', '68');
    await page.fill('#chest', '92');
    await page.fill('#waist', '78');
    await page.click('#measurementForm button[type="submit"]');
    await page.waitForSelector('#sizing-results', { timeout: 5000 });

    const cards = await page.$$eval('.recommendation-card', (els) => els.length);
    const first = await page.$eval('.recommendation-card h4', (el) => el.textContent);
    const confidence = await page.$eval('.confidence-bar small', (el) => el.textContent);
    check('sizing: recommendations rendered', cards === 5, `got ${cards}`);
    check('sizing: top pick is Polo Shirt - White', first?.includes('Polo Shirt - White'), String(first));
    check('sizing: confidence shown', /Confidence:\s*\d+%/.test(confidence || ''), String(confidence));
    await page.screenshot({ path: join(shots, 'sizing-results.png') });

    // --- Catalog: load, filter, search, detail modal ----------------------
    await page.goto(`${BASE}/catalog`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.catalog-item');
    const total = await page.$$eval('.catalog-item', (els) => els.length);
    check('catalog: 11 uniforms from API', total === 11, `got ${total}`);

    await page.selectOption('#genderFilter', 'Female');
    const female = await page.$$eval('.catalog-item', (els) => els.length);
    check('catalog: female filter', female === 6, `got ${female}`);

    await page.fill('#searchInput', 'blouse');
    const searched = await page.$$eval('.catalog-item h3', (els) => els.map((e) => e.textContent));
    check(
        'catalog: search narrows results',
        searched.length === 2 && searched.every((t) => t?.toLowerCase().includes('blouse')),
        JSON.stringify(searched)
    );

    await page.fill('#searchInput', '');
    await page.selectOption('#genderFilter', '');
    await page.click('.catalog-item .item-actions button');
    await page.waitForSelector('.modal .size-options', { timeout: 3000 });
    const sizes = await page.$$eval('.modal .size-option .size-name', (els) => els.map((e) => e.textContent));
    check('catalog: detail modal lists sizes', sizes.length === 6, JSON.stringify(sizes));
    const closeClickable = await page.evaluate(() => {
        const close = document.querySelector('.modal .close');
        if (!close) return false;
        const rect = close.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return Boolean(hit && (hit === close || close.contains(hit)));
    });
    check('catalog: modal close button clickable', closeClickable);
    await page.screenshot({ path: join(shots, 'catalog-modal.png') });
    await page.click('.modal .close');

    // --- Theme selector ---------------------------------------------------
    await page.click('.nav-actions button[title="Change Theme"]');
    await page.waitForSelector('.theme-selector-grid');
    await page.click('.theme-option:nth-child(2)'); // Dark Mode
    const bg = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim()
    );
    check('theme: dark mode applied', bg === '#0f172a', bg);
    const stored = await page.evaluate(() => localStorage.getItem('bcpThemeName'));
    check('theme: persisted', stored === 'dark', String(stored));
    const indicator = await page.$eval('.theme-check.active', (el) =>
        el.closest('.theme-option')?.querySelector('h4')?.textContent
    );
    check('theme: indicator on selected theme', indicator === 'Dark Mode', String(indicator));
    await page.screenshot({ path: join(shots, 'theme-dark.png') });
    await page.click('.modal .close');

    // --- Auth: route guard, registration, session, logout, login ----------
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForURL('**/login');
    check('auth: signed-out /admin redirects to /login', page.url().endsWith('/login'), page.url());

    const stamp = Date.now();
    const account = {
        name: `Smoke Student ${stamp}`,
        email: `smoke.${stamp}@bcp.edu.ph`,
        password: 'Passw0rd!1'
    };

    await page.click('.method-selector .method-btn:nth-child(2)'); // Create Account
    await page.fill('#regName', account.name);
    await page.fill('#regEmail', account.email);
    await page.fill('#regStudentId', `2024-${String(stamp).slice(-5)}`);
    await page.selectOption('#regGender', 'Male');
    await page.fill('#regPassword', account.password);
    await page.fill('#regConfirm', account.password);
    await page.click('.measurement-form.active button[type="submit"]');
    await page.waitForSelector('#userProfile', { timeout: 5000 });

    const navName = await page.$eval('#userProfile .profile-button span', (el) => el.textContent);
    check('auth: registration signs the user in', navName === account.name.split(' ')[0], String(navName));

    // Registered from /admin, so the student lands on the 403 screen there.
    const adminBlocked = await page.locator('h2', { hasText: 'Admin access required' }).count();
    check('auth: student is refused the admin panel', adminBlocked > 0, page.url());

    // Session must survive a reload (httpOnly refresh cookie -> new access token).
    await page.reload({ waitUntil: 'networkidle' });
    const restored = await page
        .waitForSelector('#userProfile', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    check('auth: session restored after reload', restored);

    // Logout
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.click('#userProfile .profile-button');
    await page.waitForSelector('.profile-dropdown.active');
    await page.click('.profile-dropdown .dropdown-item.danger');
    await page.waitForSelector('.modal-actions');
    await page.click('.modal-actions .btn-danger');
    const signedOut = await page
        .waitForSelector('#authButtons', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    check('auth: logout returns to the signed-out navbar', signedOut);

    // Login again
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#identifier', account.email);
    await page.fill('#loginPassword', account.password);
    await page.click('.measurement-form.active button[type="submit"]');
    const signedIn = await page
        .waitForSelector('#userProfile', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
    check('auth: login restores the session', signedIn);

    // --- Responsive navigation -------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('.mobile-menu-toggle');
    const menuActive = await page.$eval('#navMenu', (el) => el.classList.contains('active'));
    check('responsive: mobile menu opens', menuActive);
    await page.screenshot({ path: join(shots, 'mobile-menu.png') });

    check('no console/page errors', errors.length === 0, JSON.stringify(errors, null, 2));
} finally {
    await browser.close();
}

console.log(`Screenshots: ${shots}`);
for (const [name, verdict] of Object.entries(results)) {
    console.log(`${verdict.startsWith('PASS') ? 'PASS' : 'FAIL'}  ${name}${verdict.startsWith('FAIL') ? ' ->' + verdict.slice(4) : ''}`);
}

process.exit(Object.values(results).every((v) => v === 'PASS') ? 0 : 1);
