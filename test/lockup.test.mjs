import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SPEC, check, generate, inspectSource, layout, svgPathBounds } from '../scripts/lockup.mjs';

// Measured off the shipped nimiq.kids lockup, which is the fleet's one correct reference.
// These are the numbers the whole spec has to reproduce; if a change breaks them, the change
// is wrong, not the numbers.
const KIDS_SUFFIX_INK_WIDTH = 31.5000; // ink left of "kids" to ink right, in the 76x18 logo space
const KIDS_DOT_INK_LEFT = 78.0497;
const NATURAL_TRACKING_WIDTH = 27.6979; // the same string with no tracking, i.e. the wrong answer

function suffixInk(name) {
  const { pens, scale } = layout(name);
  const letters = pens.slice(1);
  let minX = Infinity, maxX = -Infinity;
  for (const p of letters) {
    const b = glyphInk(p.ch);
    minX = Math.min(minX, p.x + b.minX * scale);
    maxX = Math.max(maxX, p.x + b.maxX * scale);
  }
  return { minX, maxX, width: maxX - minX };
}

const FONT = JSON.parse(
  readFileSync(new URL('../assets/lockup/mulish-700.json', import.meta.url), 'utf8'),
);
function glyphInk(ch) {
  let minX = Infinity, maxX = -Infinity;
  for (const c of FONT.glyphs[ch].path) {
    for (let i = 1; i < c.length; i += 2) {
      minX = Math.min(minX, c[i]); maxX = Math.max(maxX, c[i]);
    }
  }
  return { minX, maxX };
}

test('the spec reproduces the shipped nimiq.kids artwork', () => {
  const ink = suffixInk('kids');
  assert.ok(
    Math.abs(ink.width - KIDS_SUFFIX_INK_WIDTH) < 0.001,
    `"kids" ink width ${ink.width.toFixed(4)}, shipped artwork is ${KIDS_SUFFIX_INK_WIDTH}`,
  );
  const dot = layout('kids').pens[0];
  const dotInk = dot.x + glyphInk('.').minX * layout('kids').scale;
  assert.ok(Math.abs(dotInk - KIDS_DOT_INK_LEFT) < 0.0001, `dot ink at ${dotInk}`);
});

test('natural tracking is measurably the wrong answer, not a close call', () => {
  // This is the mistake the fleet keeps making, so it is pinned. The gap between the two
  // models is 12%, far outside anything that could be a rounding argument.
  const correct = suffixInk('kids').width;
  const delta = (correct - NATURAL_TRACKING_WIDTH) / NATURAL_TRACKING_WIDTH;
  assert.ok(delta > 0.12, `tracked run should be >12% wider than natural, got ${(delta * 100).toFixed(1)}%`);
});

test('every suffix lands its dot on the spec position', () => {
  for (const name of ['blog', 'kids', 'cool', 'ninja', 'sale', 'win', 'x9']) {
    const l = layout(name);
    const dotInk = l.pens[0].x + glyphInk('.').minX * l.scale;
    assert.ok(
      Math.abs(dotInk - SPEC.suffix.periodInkLeft) < 1e-9,
      `${name}: dot ink at ${dotInk}, spec ${SPEC.suffix.periodInkLeft}`,
    );
  }
});

test('generated lockups pass their own checker', () => {
  for (const variant of ['mono', 'light', 'dark']) {
    for (const name of ['blog', 'kids', 'cool', 'ninja', 'sale']) {
      const svg = generate(name, { variant });
      const hits = inspectSource(svg, `nimiq-${name}-lockup.svg`);
      assert.equal(hits.length, 1, `${name}/${variant}: expected one finding`);
      assert.ok(hits[0].ok, `${name}/${variant}: ${hits[0].reason}`);
      assert.equal(hits[0].text, name);
    }
  }
});

test('the checker catches a dot that is off position', () => {
  const svg = generate('blog', { variant: 'mono' })
    .replace('<path class="nq-dot"', '<path transform="translate(2 0)" class="nq-dot"');
  const hits = inspectSource(svg, 'nimiq-blog-lockup.svg');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].ok, false);
  assert.match(hits[0].reason, /Q to dot/);
});

test('the checker catches a suffix run that is not tracked', () => {
  // Rebuild ".blog" with no tracking, which is exactly what nimiq.cool ships.
  const svg = generate('blog', { variant: 'mono' });
  const tight = svg.replace(/(<path class="nq-suffix"[^>]*d=")([^"]+)(")/, (m, a, d, c) => {
    // squeeze every x coordinate toward the run's start to simulate a denser run
    const b = svgPathBounds(d);
    const squeezed = d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (mm, x, y) =>
      `${(b.minX + (parseFloat(x) - b.minX) * 0.88).toFixed(4)} ${y}`);
    return a + squeezed + c;
  });
  const hits = inspectSource(tight, 'nimiq-blog-lockup.svg');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].ok, false);
  assert.match(hits[0].reason, /tighter than spec/);
});

test('the checker flags a live <text> suffix regardless of its spacing', () => {
  const svg =
    '<svg><text x="66" y="11" font-size="12.434">.</text>' +
    '<text x="70" y="11" font-size="12.434" letter-spacing="1.039">sale</text></svg>';
  const hits = inspectSource(svg, 'brand-lockup.js');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].ok, false);
  assert.match(hits[0].reason, /live <text>/);
});

test('a plain NIMIQ logo with no suffix is not a finding', () => {
  const src = readFileSync(
    new URL('../assets/logos/nimiq-icons-logos/logos-nimiq-horizontal.svg', import.meta.url),
    'utf8',
  );
  assert.deepEqual(inspectSource(src, 'logos-nimiq-horizontal.svg'), []);
});

test('the path parser survives the arcs in the real logotype', () => {
  // The logotype contains arcs whose flags are packed against the following coordinate
  // ("0 0014.299"). A naive tokeniser desyncs there and returns NaN, which silently broke
  // every measurement until it was fixed. Its ink is a known constant.
  const src = readFileSync(
    new URL('../assets/logos/nimiq-icons-logos/logos-nimiq-horizontal.svg', import.meta.url),
    'utf8',
  );
  const d = [...src.matchAll(/d="([^"]+)"/g)][1][1];
  const b = svgPathBounds(d);
  assert.ok(Math.abs(b.minX - 27.76) < 0.001, `logotype ink starts at ${b.minX}`);
  assert.ok(Math.abs(b.maxX - SPEC.logotypeInkEnd) < 0.001, `logotype ink ends at ${b.maxX}`);
});

// The exact geometry nimiq.cool shipped before it was regenerated: the suffix run laid out at
// NATURAL tracking instead of the logotype's 0.0836em. Pinned as a literal rather than read
// from the repo, because the repo file is now fixed and a file-based test would have silently
// started passing for the wrong reason. This is the bug pattern, so it must stay caught.
const COOL_UNTRACKED_LETTERS_INK_WIDTH = 27.841; // vs 30.9 correct, measured on the shipped file
test('the untracked-run bug that nimiq.cool shipped is still caught', () => {
  const good = generate('cool', { variant: 'light' });
  const b = svgPathBounds(/class="nq-suffix"[^>]*d="([^"]+)"/.exec(good)[1]);
  const squeeze = COOL_UNTRACKED_LETTERS_INK_WIDTH / (b.maxX - b.minX);
  const broken = good.replace(/(<path class="nq-suffix"[^>]*d=")([^"]+)(")/, (m, a, d, c) =>
    a + d.replace(/(-?[\d.]+) (-?[\d.]+)/g,
      (mm, x, y) => `${(b.minX + (parseFloat(x) - b.minX) * squeeze).toFixed(4)} ${y}`) + c);
  const hits = inspectSource(broken, 'nimiq-cool-lockup-light.svg');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].ok, false, 'an untracked suffix run must fail');
  assert.match(hits[0].reason, /tighter than spec/);
});

// Every lockup this machine has checked out must be on spec. Skipped where they are not, so
// the suite stays hermetic in CI, but on a dev box this is the real regression guard.
const FLEET = [
  'Projects/andjroo/public/apps-assets',
  'Projects/nimiq.blog/assets/brand',
  'gdkc/projects/nimiq.kids/public/assets/brand',
].map((p) => join(homedir(), p)).filter((p) => existsSync(p));
test('every checked-out fleet lockup is on spec', { skip: !FLEET.length && 'none checked out' }, () => {
  const bad = check(FLEET).filter((r) => !r.ok);
  assert.deepEqual(bad.map((r) => `${r.file}: ${r.reason}`), []);
});
