// Tests for `nq init` — token-set delivery, incl. the tokens-px px-only sheet
// (the escape hatch for the legacy 8px-rem trap that 11 apps dodged by hand-copying hex).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NQ = join(ROOT, 'bin', 'nq.js');

async function inTmp(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'nq-init-'));
  try { return await fn(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('nq init --style tokens-px drops the px-only token sheet', async () => {
  await inTmp(async (dir) => {
    execFileSync('node', [NQ, 'init', '--style', 'tokens-px', '--out', dir]);
    const cssPath = join(dir, 'nimiq', 'tokens-px', 'tokens.css');
    assert.ok(existsSync(cssPath), 'nimiq/tokens-px/tokens.css must land');
    const css = await readFile(cssPath, 'utf8');

    // brand colors + the radial -bg gradients, verbatim legacy values
    assert.match(css, /--nimiq-blue:\s*#1F2348/);
    assert.match(css, /--nimiq-light-blue:\s*#0582CA/);
    assert.match(css, /--nimiq-blue-bg:\s*radial-gradient\(100% 100% at bottom right, #260133, var\(--nimiq-blue\)\)/);
    assert.match(css, /--nimiq-gold-bg:\s*radial-gradient\(100% 100% at bottom right, #EC991C, var\(--nimiq-gold\)\)/);
    // radii + shadows + easing + fonts
    assert.match(css, /--nimiq-radius:\s*8px/);
    assert.match(css, /--nimiq-shadow-page:\s*0 3px 22px rgba\(0, 0, 0, 0\.1\)/);
    assert.match(css, /--nimiq-ease:\s*cubic-bezier\(0\.25, 0, 0, 1\)/);
    assert.match(css, /--nimiq-font:\s*'Mulish'/);
    assert.match(css, /--nimiq-font-mono:\s*'Fira Mono'/);
    // the 16-step text opacity ladder (wallet names)
    for (const step of [100, 80, 70, 60, 50, 40, 35, 30, 25, 22, 20, 16, 14, 12, 10, 6]) {
      assert.match(css, new RegExp(`--text-${step}:\\s*rgba\\(31, 35, 72,`), `ladder step ${step}`);
    }
    // crypto colors
    assert.match(css, /--bitcoin-orange:\s*#F7931A/);
    assert.match(css, /--usdc-blue:\s*#2775CA/);
    assert.match(css, /--usdt-green:\s*#009393/);

    // THE POINT of the file: tokens only, plain px — no rescale, no rem, no components
    const code = stripComments(css);
    assert.ok(!/html\s*\{/.test(code), 'must not restyle html (no font-size rescale)');
    assert.ok(!/\d(\.\d+)?rem\b/.test(code), 'no rem values anywhere in declarations');
    assert.ok(!/\.[a-z][\w-]*\s*\{/i.test(code), 'no component classes — :root only');

    // tailwind v4 companion carries the same core values in an @theme block
    const twPath = join(dir, 'nimiq', 'tokens-px', 'tailwind-theme.css');
    assert.ok(existsSync(twPath), 'tailwind-theme.css must land');
    const tw = await readFile(twPath, 'utf8');
    assert.match(tw, /@theme\s*\{/);
    assert.match(tw, /--color-nimiq-blue:\s*#1F2348/);
    assert.ok(!/\d(\.\d+)?rem\b/.test(stripComments(tw)), 'tailwind theme is px-only too');
  });
});

test('nq init default (modern) and --style legacy still work', async () => {
  await inTmp(async (dir) => {
    execFileSync('node', [NQ, 'init', '--out', dir]);
    assert.ok(existsSync(join(dir, 'nimiq', 'modern', 'index.css')));
    execFileSync('node', [NQ, 'init', '--style', 'legacy', '--out', dir]);
    assert.ok(existsSync(join(dir, 'nimiq', 'legacy', 'nimiq-style.min.css')));
  });
});

test('nq init rejects an unknown style', async () => {
  await inTmp(async (dir) => {
    assert.throws(() => execFileSync('node', [NQ, 'init', '--style', 'nope', '--out', dir], { stdio: 'pipe' }));
  });
});
