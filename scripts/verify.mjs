// Pixel-verification harness: renders a component's html variant headlessly,
// screenshots it, and diffs against registry/components/<name>/reference.png.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'registry', 'components');

export async function verify(name) {
  const dir = join(REGISTRY, name);
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) return { status: 'skip', reason: 'no meta.json' };
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const demo = join(dir, 'html', 'demo.html');
  const ref = join(dir, 'reference.png');
  if (!existsSync(demo)) return { status: 'skip', reason: 'no html/demo.html' };
  if (!existsSync(ref)) return { status: 'skip', reason: 'no reference.png' };

  const { launchChromium } = await import('./_browser.mjs');
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;

  const v = meta.verify ?? {};
  const viewport = v.viewport ?? { width: 800, height: 600 };
  const threshold = v.maxDiffPct ?? 1.0; // percent of pixels allowed to differ

  const browser = await launchChromium('nq verify');
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: v.scale ?? 2 });
    await page.goto('file://' + demo);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(v.settleMs ?? 250); // let transitions settle
    const target = v.selector ? page.locator(v.selector) : page;
    const shotBuf = await target.screenshot({ animations: 'disabled' });

    const refPng = PNG.sync.read(await readFile(ref));
    let gotPng = PNG.sync.read(shotBuf);
    if (gotPng.width !== refPng.width || gotPng.height !== refPng.height) {
      return {
        status: 'fail', diffPct: 100, threshold,
        diffPath: `size mismatch: got ${gotPng.width}x${gotPng.height}, ref ${refPng.width}x${refPng.height}`,
      };
    }
    const diff = new PNG({ width: refPng.width, height: refPng.height });
    const badPixels = pixelmatch(refPng.data, gotPng.data, diff.data, refPng.width, refPng.height, {
      threshold: v.pixelThreshold ?? 0.1,
    });
    const diffPct = +(100 * badPixels / (refPng.width * refPng.height)).toFixed(3);
    if (diffPct <= threshold) return { status: 'pass', diffPct, threshold };
    const outDir = join(ROOT, '.verify');
    await mkdir(outDir, { recursive: true });
    const diffPath = join(outDir, `${name}.diff.png`);
    await writeFile(diffPath, PNG.sync.write(diff));
    await writeFile(join(outDir, `${name}.got.png`), shotBuf);
    return { status: 'fail', diffPct, threshold, diffPath };
  } finally {
    await browser.close();
  }
}

// CLI entry: node scripts/verify.mjs <name|all>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { readdir } = await import('node:fs/promises');
  const target = process.argv[2] ?? 'all';
  const names = target === 'all' ? (await readdir(REGISTRY)).sort() : [target];
  let fail = 0;
  for (const n of names) {
    const r = await verify(n);
    console.log(`${r.status === 'pass' ? '✓' : r.status === 'skip' ? '·' : '✗'} ${n}`, r);
    if (r.status === 'fail') fail++;
  }
  process.exitCode = fail ? 1 : 0;
}
