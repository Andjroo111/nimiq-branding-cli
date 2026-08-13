// Invariant tests for `nq lint` — the cheap, general defence against false negatives.
//
// Hand-writing a fixture per rule does not scale to 60 rules and goes stale. This instead pins a
// property that must hold for EVERY rule at once:
//
//   Wrapping a word in a bare <span> changes nothing about how the page renders. It only adds an
//   element child. So the set of rules that fire must not change.
//
// That single property is what the whole `el.children.length === 0` bug class violates. It caught
// four rules in one run — `wideText`, `tightLeadingBody`, `unconstrained` and `orphanLine` all went
// silent the moment a paragraph contained a <strong>, which is most real body copy. The address
// rule had already shipped the same bug to nimiq.blog. A later run over the completed fixture
// caught three more: `clippedText` and `denseSections` (the same guard again) and `greenAction`,
// which read a button's label from direct text nodes only, so `<button><span>Try</span> again</button>`
// silenced every button rule at once.
//
// The fixture now trips EVERY row the report prints, and `no rule may be silent` below is what
// holds that line — read off the report's own `rows`, so there is no hand-maintained row count to
// drift. Adding a rule? Add a violation to the kitchen-sink fixture. The invariants then cover the
// new rule for free.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { lint } = await import(join(ROOT, 'scripts', 'lint.mjs'));
const FIXTURE = join(ROOT, 'test', 'fixtures', 'lint-kitchen-sink.html');

// lint() prints its --json report through console.log and returns only counts.
async function lintHtml(html) {
  const dir = await mkdtemp(join(tmpdir(), 'nq-lint-inv-'));
  const file = join(dir, 'page.html');
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
  const out = lines.join('\n');
  const start = out.indexOf('{');
  assert.ok(start !== -1, `no JSON in lint output:\n${out.slice(0, 400)}`);
  return JSON.parse(out.slice(start));
}

// Buckets that are an INPUT to a rule or plain telemetry, never a rule on their own. Anything not
// listed here must trip on the fixture — that is what stops a new rule shipping unexercised.
const DERIVED = new Set([
  'scaleN', 'onScaleN',   // denominators for the "% on-scale spacing" figure
  'hasInfiniteAnim',      // input to noReducedMotion
  'foldColors',           // informational count printed under the warnings
  'fontSizes',            // input to type-scale sprawl, which gates at >12 distinct — see WARN_ROWS
  'offFont',              // input to the non-brand-font row, which gates at ≥3 uses — see WARN_ROWS
]);

// Which rule buckets came back non-empty. Counts are deliberately ignored: a <span> can nudge a
// count without meaning anything, but a rule falling silent is always a bug. Plain objects count as
// firing when they hold a key — without that, `offRadius`/`offScale`/`offPalette` read as silent no
// matter what the page does, and were quietly unprovable.
function firing(report) {
  const raw = report.raw ?? {};
  const out = new Set();
  for (const [k, v] of Object.entries(raw)) {
    if (DERIVED.has(k)) continue;
    const fires = Array.isArray(v) ? v.length > 0
      : typeof v === 'number' ? v > 1
      : v && typeof v === 'object' ? Object.keys(v).length > 0
      : v === true;
    if (fires) out.add(k);
  }
  return out;
}

const buckets = (report) => Object.keys(report.raw ?? {}).filter((k) => !DERIVED.has(k));

// Rules the printed report shows as not firing. This is the authoritative view: it covers the rows
// whose threshold cannot be read off `raw` (type-scale sprawl gates at >12 distinct sizes, the
// non-brand-font row at ≥3 uses, and the three responsive rows come from the sweep, not `raw`).
const silentRows = (report) =>
  [...report.rows.errors, ...report.rows.warnings].filter((x) => !x.n).map((x) => x.label);

const BODY = /<body[^>]*>([\s\S]*)<\/body>/i;

// wrap the first word of every text run in a bare <span> — visually a no-op, structurally a child
function addSpans(html) {
  return html.replace(BODY, (_m, body) =>
    `<body>${body.replace(/>([ \t]*)([A-Za-z][A-Za-z0-9]*)(?= )/g, '>$1<span>$2</span>')}</body>`);
}

// push the whole page one level deeper — also a rendering no-op for these rules
function addNesting(html) {
  return html.replace(BODY, (_m, body) => `<body><div><div>${body}</div></div></body>`);
}

// One render each: the fixture, and the two no-op rewrites of it. Each lintHtml() is a full browser
// launch plus a responsive sweep, so they are hoisted here rather than re-run per test.
const original = await readFile(FIXTURE, 'utf8');
const base = await lintHtml(original);
const spanned = await lintHtml(addSpans(original));
const nested = await lintHtml(addNesting(original));

test('the kitchen-sink fixture trips every rule the report prints', async () => {
  const fired = firing(base);
  const silent = buckets(base).filter((r) => !fired.has(r));
  assert.deepEqual(silent, [], `no violation in the fixture trips: ${silent.join(', ')}. `
    + 'Add one, or add the bucket to DERIVED with a reason if it is an input rather than a rule.');
  assert.deepEqual(silentRows(base), [], `these rules print but never fired: ${silentRows(base).join(' · ')}. `
    + 'A rule with no fixture violation is a rule nobody has ever seen work.');
  // the four that the children.length===0 bug silenced, pinned by name so the class stays visible
  for (const rule of ['wideText', 'tightLeadingBody', 'unconstrained', 'orphanLine', 'lowContrast']) {
    assert.ok(fired.has(rule), `${rule} did not fire on the kitchen sink`);
  }
});

test('wrapping words in a bare <span> does not silence any rule', async () => {
  const lost = [...firing(base)].filter((r) => !firing(spanned).has(r));
  assert.deepEqual(lost, [], `a no-op <span> silenced: ${lost.join(', ')}`);
  assert.deepEqual(silentRows(spanned), [], `a no-op <span> silenced: ${silentRows(spanned).join(' · ')}`);
});

test('nesting the page deeper does not silence any rule', async () => {
  const lost = [...firing(base)].filter((r) => !firing(nested).has(r));
  assert.deepEqual(lost, [], `extra wrapper divs silenced: ${lost.join(', ')}`);
  assert.deepEqual(silentRows(nested), [], `extra wrapper divs silenced: ${silentRows(nested).join(' · ')}`);
});
