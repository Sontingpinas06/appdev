import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('bcpThemeName', 'dark'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);

const report = await page.evaluate(() => {
    const chainAt = (x, y) => {
        const out = [];
        let el = document.elementFromPoint(x, y);
        while (el && out.length < 6) {
            const cs = getComputedStyle(el);
            out.push({
                tag: el.tagName.toLowerCase(),
                cls: el.className && typeof el.className === 'string' ? el.className : '',
                bg: cs.backgroundColor,
                bgImage: cs.backgroundImage.slice(0, 80)
            });
            el = el.parentElement;
        }
        return out;
    };

    const footer = document.querySelector('.site-footer');
    const body = getComputedStyle(document.body);
    const before = getComputedStyle(document.body, '::before');

    return {
        scrollHeight: document.documentElement.scrollHeight,
        midPageChain: chainAt(700, 1000),
        lowerChain: chainAt(700, 1800),
        footer: footer
            ? {
                  present: true,
                  rect: JSON.stringify(footer.getBoundingClientRect()),
                  display: getComputedStyle(footer).display,
                  bg: getComputedStyle(footer).backgroundColor
              }
            : { present: false },
        bodyBg: body.backgroundColor,
        bodyBgImage: body.backgroundImage.slice(0, 120),
        bodyAttachment: body.backgroundAttachment,
        beforeContent: before.content,
        beforePos: before.position,
        beforeInset: `${before.top} ${before.left} ${before.width} ${before.height}`,
        beforeZ: before.zIndex,
        beforeBgImage: before.backgroundImage.slice(0, 140)
    };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
