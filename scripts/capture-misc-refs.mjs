import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/Users/andrjoo/Projects/nimiq/nimiq-branding-cli/references/screenshots/misc';
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  {
    slug: 'identicons-demo',
    url: 'https://nimiq.github.io/identicons/',
    elements: [
      { name: 'identicon-grid', selectors: ['#identicons', '.identicons', 'main', 'body > div'] },
      { name: 'identicon-single', selectors: ['svg', 'canvas', 'img'] },
    ],
  },
  {
    slug: 'criptociudad',
    url: 'https://criptociudad.cr',
    elements: [
      { name: 'hero', selectors: ['header', 'section', '.hero', 'main > div'] },
      { name: 'nav', selectors: ['nav'] },
    ],
  },
  {
    slug: 'nimiq-dev',
    url: 'https://nimiq.dev',
    elements: [
      { name: 'hero', selectors: ['main section', '.hero', 'main > div'] },
      { name: 'nav', selectors: ['header', 'nav'] },
    ],
  },
  {
    slug: 'nimiq-staking',
    url: 'https://www.nimiq.com/staking/',
    elements: [
      { name: 'hero', selectors: ['main section', 'section', '.hero'] },
      { name: 'nav', selectors: ['header', 'nav'] },
    ],
  },
  {
    slug: 'nimiq-staking-calculator',
    url: 'https://www.nimiq.com/staking-calculator/',
    elements: [
      { name: 'calculator-widget', selectors: ['form', '[class*="calculator"]', 'main section', 'section'] },
    ],
  },
];

const results = [];
const browser = await chromium.launch();

for (const t of targets) {
  for (const [viewName, vp] of [['desktop-1440x900', { width: 1440, height: 900 }], ['mobile-390x844', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
      ...(viewName.startsWith('mobile') ? { isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } : {}),
    });
    const page = await ctx.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForTimeout(3000));
      await page.waitForTimeout(2500);
      // dismiss common cookie banners
      for (const sel of ['button:has-text("Accept")', 'button:has-text("Aceptar")', 'button:has-text("OK")', '[class*="cookie"] button']) {
        try { await page.locator(sel).first().click({ timeout: 1200 }); break; } catch {}
      }
      await page.waitForTimeout(500);
      const fp = `${OUT}/${t.slug}_${viewName}_fullpage.png`;
      await page.screenshot({ path: fp, fullPage: true });
      results.push({ ok: true, path: fp, url: t.url, view: viewName, kind: 'fullpage' });

      // element shots only on desktop pass
      if (viewName.startsWith('desktop')) {
        for (const el of t.elements) {
          let done = false;
          for (const sel of el.selectors) {
            try {
              const loc = page.locator(sel).first();
              await loc.waitFor({ state: 'visible', timeout: 3000 });
              const box = await loc.boundingBox();
              if (!box || box.width < 40 || box.height < 40) continue;
              const ep = `${OUT}/${t.slug}_element-${el.name}.png`;
              await loc.screenshot({ path: ep, timeout: 8000 });
              results.push({ ok: true, path: ep, url: t.url, view: 'desktop element', kind: `element:${el.name} (${sel})` });
              done = true;
              break;
            } catch {}
          }
          if (!done) results.push({ ok: false, url: t.url, kind: `element:${el.name}`, reason: 'no matching selector' });
        }
      }
    } catch (e) {
      results.push({ ok: false, url: t.url, view: viewName, reason: String(e).slice(0, 200) });
    }
    await ctx.close();
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
