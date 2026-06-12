// Playwright check for supporting-elements.html (file://):
// zero console errors, every section visually populated, full-page screenshot.
import { chromium } from 'playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(ROOT, '.verify'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => errors.push(`requestfailed: ${r.url()} (${r.failure()?.errorText})`));

await page.goto('file://' + join(ROOT, 'supporting-elements.html'), { waitUntil: 'networkidle' });
await page.waitForTimeout(800); // identicon scripts + fonts settle

// every section must be visually populated (no collapsed/empty blocks)
const CHECKS = [
  ['.backup-banner', 40],
  ['.account-header', 120],
  ['.transaction-list', 100],
  ['#x-search-bar .search-bar', 30],
  ['.swap-balance-bar', 100],
  ['.sidebar-panel .price-chart-widget', 80],
  ['.sidebar-panel .balance-distribution', 40],
  ['.nq-hero-section', 400],
  ['.nq-app-showcase-card:not(.wide)', 300],
  ['.nq-app-showcase-card.wide', 200],
  ['.nq-honeycomb-band', 200],
];
const problems = [];
for (const [sel, minH] of CHECKS) {
  const el = page.locator(sel).first();
  if (await el.count() === 0) { problems.push(`MISSING ${sel}`); continue; }
  const box = await el.boundingBox();
  if (!box) { problems.push(`NOT RENDERED ${sel}`); continue; }
  if (box.height < minH || box.width < 60) problems.push(`COLLAPSED ${sel}: ${Math.round(box.width)}x${Math.round(box.height)} (need h>=${minH})`);
}

// identicon imgs swapped from the placeholder?
const iqons = await page.$$eval('.identicon img', imgs =>
  imgs.map(i => i.src.includes('image/svg+xml,<svg width="64"') ? 'placeholder' : 'generated'));
const placeholders = iqons.filter(s => s === 'placeholder').length;

await page.screenshot({ path: join(ROOT, '.verify', 'supporting-elements.png'), fullPage: true });
await browser.close();

console.log(`console errors: ${errors.length}`);
errors.forEach(e => console.log('  ' + e));
console.log(`section problems: ${problems.length}`);
problems.forEach(p => console.log('  ' + p));
console.log(`identicons: ${iqons.length} total, ${placeholders} still placeholder`);
if (errors.length || problems.length) process.exit(1);
console.log('OK — screenshot at .verify/supporting-elements.png');
