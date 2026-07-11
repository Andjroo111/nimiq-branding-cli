// PWA icons for `nq new-app` — REAL, non-broken PNGs at scaffold time.
//
// Nine fleet apps shipped manifests pointing at icon files that don't exist (or
// aren't valid PNGs). This module makes the scaffold structurally incapable of
// that: it renders the OFFICIAL Nimiq signet (assets/logos/official/colored/
// nimiq_signet_rgb_base_size.svg — the real gold-gradient hexagon, no redraw)
// centered on the brand navy radial gradient (the --nimiq-blue-bg stops from
// @nimiq/style: #260133 → #1F2348) and rasterizes it with playwright's chromium
// at 192/512, plus maskable variants (smaller mark so it survives the launcher's
// safe-zone crop; the gradient bleeds to the edge).
//
// Fallback: when playwright or its browser isn't available (e.g. an `npx
// github:…` run), the pre-rendered copies vendored in assets/pwa/ (produced by
// this same pipeline, committed) are used instead — a scaffolded app NEVER gets
// broken icons.
//
// Regenerate the vendored copies:  node scripts/pwa-icons.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SIGNET = join(ROOT, 'assets', 'logos', 'official', 'colored', 'nimiq_signet_rgb_base_size.svg');
const VENDORED_DIR = join(ROOT, 'assets', 'pwa');

// file → raster size, mark scale (fraction of canvas width), manifest purpose.
// Maskable marks sit at 0.52 so the horizontal hexagon vertices stay well inside
// the 80%-diameter safe-zone circle launchers may crop to.
export const ICON_SPECS = [
  { file: 'icon-192.png', size: 192, scale: 0.64, sizes: '192x192', purpose: 'any' },
  { file: 'icon-512.png', size: 512, scale: 0.64, sizes: '512x512', purpose: 'any' },
  { file: 'icon-192-maskable.png', size: 192, scale: 0.52, sizes: '192x192', purpose: 'maskable' },
  { file: 'icon-512-maskable.png', size: 512, scale: 0.52, sizes: '512x512', purpose: 'maskable' },
];

const iconHtml = (signetSvg, size, scale) => `<!DOCTYPE html>
<html><head><style>
  html, body { margin: 0; padding: 0; }
  body {
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    /* brand navy radial gradient — the --nimiq-blue-bg stops from @nimiq/style */
    background: radial-gradient(100% 100% at bottom right, #260133, #1F2348);
  }
  svg { width: ${Math.round(size * scale)}px; height: auto; display: block; }
</style></head><body>${signetSvg}</body></html>`;

async function renderWithPlaywright() {
  const { chromium } = await import('playwright');
  const signet = await readFile(SIGNET, 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
    const out = {};
    for (const { file, size, scale } of ICON_SPECS) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(iconHtml(signet, size, scale));
      out[file] = await page.screenshot({ type: 'png' });
    }
    return out;
  } finally {
    await browser.close();
  }
}

async function loadVendored() {
  const out = {};
  for (const { file } of ICON_SPECS) out[file] = await readFile(join(VENDORED_DIR, file));
  return out;
}

// The icons carry no app-specific content (same brand mark for every app), so one
// render per process is cached and reused across scaffold calls (keeps tests to a
// single browser launch).
let cached = null;

/** @returns {Promise<Record<string, Buffer>>} file name → PNG bytes */
export function generatePwaIcons() {
  cached ??= renderWithPlaywright().catch(async (err) => {
    try {
      return await loadVendored();
    } catch {
      cached = null;
      throw new Error(`PWA icon render failed (${err.message}) and no vendored fallback in assets/pwa/`);
    }
  });
  return cached;
}

// CLI mode: (re)write the vendored fallback copies in assets/pwa/.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const icons = await renderWithPlaywright();
  await mkdir(VENDORED_DIR, { recursive: true });
  for (const [file, buf] of Object.entries(icons)) {
    await writeFile(join(VENDORED_DIR, file), buf);
    console.log(`+ assets/pwa/${file} (${buf.length} bytes)`);
  }
}
