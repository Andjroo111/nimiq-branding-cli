// Tests for the address-structure lint rule — `address not uppercase / flat (use 3×3 grid)`.
// node:test style, matching test/check.test.mjs.
//
// A NIM address is 36 characters, nine four-char blocks, and Nimiq renders one 3×3 in Fira Mono.
// The rule that enforces that was silently passing nearly every real violation, so these tests pin
// the cases that were missed in the wild:
//
//   1. an address set in body copy — the old rule required `fontSize >= 20px`
//   2. an address sharing a <p> with a <br> or a <span> — the old rule required no element children
//   3. an address broken across <br>, where no single text node holds the whole thing
//
// and the two false positives that came with fixing it: an ancestor of a correct component reading
// as the address on its own, and a four-char block being flagged as an uppercase eyebrow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { lint } = await import(join(ROOT, 'scripts', 'lint.mjs'));

const ADDR = 'NQ63 SX1R 3UTB 8KD8 A0CV PDF2 J0VC UGUB 3HH0';

const page = (body, head = '') => `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>fixture</title>
<style>
 body{font-family:'Mulish',sans-serif;background:#F8F8F8;color:#1F2348;margin:0;padding:48px}
 .mono{font-family:'Fira Mono',monospace}
 ${head}
</style>
${body}`;

// the real component, from `nq add address-display --html`, rem values converted for a 16px root
const GRID_CSS = `
 .address-display{display:grid;justify-items:center;width:100%;box-sizing:content-box;
   color:#1F2348;font-size:22px;font-family:'Fira Mono',monospace;margin:0 auto}
 .format-nimiq{grid-template-columns:repeat(3,33%);justify-content:space-between;max-width:208px}
 .chunk{margin:6px 0;line-height:1.11;text-align:center;white-space:nowrap;text-transform:uppercase}
 .space{font-size:0}`;

const gridMarkup = (addr = ADDR) =>
  `<div class="address-display format-nimiq">${addr
    .split(' ')
    .map((b) => `<span class="chunk">${b}<span class="space">&nbsp;</span></span>`)
    .join('')}</div>`;

// lint() prints its --json report through console.log and returns only the counts, so capture
// the sink rather than widening the public return shape.
async function lintHtml(html) {
  const dir = await mkdtemp(join(tmpdir(), 'nq-lint-addr-'));
  const file = join(dir, 'fixture.html');
  await writeFile(file, html);
  const lines = [];
  const real = console.log;
  console.log = (s = '') => lines.push(String(s));
  try {
    await lint(file, { json: true });
  } finally {
    console.log = real;
    await rm(dir, { recursive: true, force: true });
  }
  const raw = lines.join('\n');
  const start = raw.indexOf('{');
  assert.ok(start !== -1, `no JSON in lint output:\n${raw.slice(0, 400)}`);
  return JSON.parse(raw.slice(start));
}

const addrHits = (r) => r?.raw?.addrStructure ?? [];

test('flat address in body copy is caught — the old 20px floor missed it', async () => {
  const r = await lintHtml(page(`<p class="mono" style="font-size:14px">${ADDR}</p>`));
  assert.equal(addrHits(r).length, 1);
  assert.match(addrHits(r)[0], /flat run/);
});

test('flat address sharing a <p> with a <br> and a <span> is caught', async () => {
  // the exact shape nimiq.blog shipped: el.children.length !== 0, so the old rule skipped it
  const r = await lintHtml(page(
    `<p class="mono" style="font-size:14px">${ADDR}<br>
     <span style="color:rgba(31,35,72,.58)">balance</span> 0 <strong>706,716,410.50 NIM</strong></p>`,
  ));
  assert.equal(addrHits(r).length, 1);
  assert.match(addrHits(r)[0], /flat run/);
});

test('lowercase address is reported as not uppercase', async () => {
  const r = await lintHtml(page(`<p class="mono" style="font-size:18px">${ADDR.toLowerCase()}</p>`));
  assert.equal(addrHits(r).length, 1);
  assert.match(addrHits(r)[0], /not uppercase/);
});

test('address split across <br> is caught, though no single text node holds it', async () => {
  // ADDR_RE's `\s?` is optional, so the text nodes joined across the <br> still match it —
  // the "already reported" guard has to track whether the text-node check actually fired.
  const [a, b, c] = [ADDR.slice(0, 14), ADDR.slice(15, 29), ADDR.slice(30)];
  const r = await lintHtml(page(`<p class="mono" style="font-size:18px">${a}<br>${b}<br>${c}</p>`));
  assert.equal(addrHits(r).length, 1);
  assert.match(addrHits(r)[0], /3×3 grid/);
});

test('the real 3×3 component is clean, and every ancestor of it stays clean', async () => {
  const r = await lintHtml(page(
    `<div class="wrap"><div class="box">${gridMarkup()}</div></div>`,
    GRID_CSS,
  ));
  assert.deepEqual(addrHits(r), []);
});

test('a four-char block is not an uppercase eyebrow', async () => {
  // blocks like UGUB / TDUR / VVHH carry no digit, so the digit-based exemption missed them
  // and the pixel-verified component was flagged on its own reference render.
  const r = await lintHtml(page(gridMarkup(), GRID_CSS));
  assert.deepEqual(r?.raw?.uppercase ?? [], []);
});

test('an address inside <code> is left alone', async () => {
  const r = await lintHtml(page(`<pre><code>${ADDR}</code></pre>`));
  assert.deepEqual(addrHits(r), []);
});
