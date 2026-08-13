// Invariant tests for `nq lint` — the cheap, general defence against false negatives.
//
// Hand-writing a fixture per rule does not scale to 58 rules and goes stale. This instead pins a
// property that must hold for EVERY rule at once:
//
//   Wrapping a word in a bare <span> changes nothing about how the page renders. It only adds an
//   element child. So the set of rules that fire must not change.
//
// That single property is what the whole `el.children.length === 0` bug class violates. It caught
// four rules in one run — `wideText`, `tightLeadingBody`, `unconstrained` and `orphanLine` all went
// silent the moment a paragraph contained a <strong>, which is most real body copy. The address
// rule had already shipped the same bug to nimiq.blog.
//
// Adding a rule? Add a violation to the kitchen-sink fixture. The invariants then cover it for free.
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

// Which rule buckets came back non-empty. Counts are deliberately ignored: a <span> can nudge a
// count without meaning anything, but a rule falling silent is always a bug.
function firing(report) {
  const raw = report.raw ?? {};
  const out = new Set();
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v) ? v.length : (typeof v === 'number' ? v > 1 : v === true)) out.add(k);
  }
  // volatile / not rule buckets
  for (const k of ['fontSizes', 'offScale', 'scaleN', 'onScaleN', 'hasInfiniteAnim', 'offFont', 'offPalette', 'h1Count']) out.delete(k);
  return out;
}

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

const original = await readFile(FIXTURE, 'utf8');

test('the kitchen-sink fixture actually trips a broad set of rules', async () => {
  const fired = firing(await lintHtml(original));
  // if this drops, the fixture stopped exercising the linter and the invariants below prove nothing
  assert.ok(fired.size >= 8, `expected the fixture to trip 8+ rule buckets, got ${fired.size}: ${[...fired].join(', ')}`);
  // the four that the children.length===0 bug silenced, pinned by name
  for (const rule of ['wideText', 'tightLeadingBody', 'unconstrained', 'orphanLine', 'lowContrast']) {
    assert.ok(fired.has(rule), `${rule} did not fire on the kitchen sink`);
  }
});

test('wrapping words in a bare <span> does not silence any rule', async () => {
  const before = firing(await lintHtml(original));
  const after = firing(await lintHtml(addSpans(original)));
  const lost = [...before].filter((r) => !after.has(r));
  assert.deepEqual(lost, [], `a no-op <span> silenced: ${lost.join(', ')}`);
});

test('nesting the page deeper does not silence any rule', async () => {
  const before = firing(await lintHtml(original));
  const after = firing(await lintHtml(addNesting(original)));
  const lost = [...before].filter((r) => !after.has(r));
  assert.deepEqual(lost, [], `extra wrapper divs silenced: ${lost.join(', ')}`);
});
