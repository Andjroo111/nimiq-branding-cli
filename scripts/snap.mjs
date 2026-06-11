// Snapshot a component's truth render to its reference.png.
// Usage: node scripts/snap.mjs <component> [--demo]
//   default: renders registry/components/<name>/truth/truth.html -> reference.png
//   --demo : renders html/demo.html -> .verify/<name>.got.png (for eyeballing)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
const demoMode = process.argv.includes('--demo');
if (!name) { console.error('usage: node scripts/snap.mjs <component> [--demo]'); process.exit(1); }

const dir = join(ROOT, 'registry', 'components', name);
const meta = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'));
const v = meta.verify ?? {};
const src = demoMode ? join(dir, 'html', 'demo.html') : join(dir, 'truth', 'truth.html');
if (!existsSync(src)) { console.error(`missing ${src}`); process.exit(1); }

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: v.viewport ?? { width: 800, height: 600 },
  deviceScaleFactor: v.scale ?? 2,
});
await page.goto('file://' + src);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(v.settleMs ?? 250);
const target = v.selector ? page.locator(v.selector) : page;
const buf = await target.screenshot({ animations: 'disabled' });
let out;
if (demoMode) {
  await mkdir(join(ROOT, '.verify'), { recursive: true });
  out = join(ROOT, '.verify', `${name}.got.png`);
} else {
  out = join(dir, 'reference.png');
}
await writeFile(out, buf);
console.log(out);
await browser.close();
