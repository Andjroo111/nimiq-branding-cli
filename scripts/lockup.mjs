// nq lockup — generate and verify NIMIQ.<suffix> fleet lockups.
//
// The whole reason this exists: the spacing rule is one line long and the fleet still got it
// wrong three times, because every new mark was eyeballed from an existing one and two of the
// existing ones are wrong. Generating from the spec removes the copying step entirely, and
// `check` catches anything that was not generated here.
//
// The rule, in full: set the ENTIRE ".suffix" run in Mulish 700 at the logotype's own
// 0.0836em tracking, then slide it until the period's ink lands on x=78.0497. Everything else
// falls out. See assets/lockup/spec.json for where each number comes from.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'assets/lockup/spec.json'), 'utf8'));
const FONT = JSON.parse(readFileSync(join(ROOT, 'assets/lockup/mulish-700.json'), 'utf8'));

// The logotype path is how we recognise a lockup in the wild, in any file type.
const LOGOTYPE_MARKER = 'M34.91 3.656';

// ---------------------------------------------------------------- artwork

/** Hexagon + NIMIQ logotype, read from the upstream artwork so there is one source for both. */
export function artwork() {
  const src = readFileSync(join(ROOT, SPEC.artwork.source), 'utf8');
  const paths = [...src.matchAll(/<path\b([^>]*)>/g)].map((m) => ({
    fill: (m[1].match(/fill="([^"]*)"/) || [])[1] || '',
    d: (m[1].match(/d="([^"]+)"/) || [])[1] || '',
  }));
  const hexagon = paths.find((p) => p.fill.startsWith('url('));
  const logotype = paths.find((p) => p.d.startsWith(LOGOTYPE_MARKER));
  if (!hexagon || !logotype) throw new Error(`cannot read artwork from ${SPEC.artwork.source}`);
  return { hexagon: hexagon.d, logotype: logotype.d };
}

// ---------------------------------------------------------------- layout

const num = (v) => {
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
};

/**
 * Lay a suffix run out in the 76x18 logo space.
 * Returns the per-glyph pen positions plus the ink extent, all in logo units.
 */
export function layout(suffix) {
  const run = `.${suffix}`;
  for (const ch of run) {
    if (!FONT.glyphs[ch]) throw new Error(`no glyph for ${JSON.stringify(ch)} in the Mulish 700 set`);
  }
  const { size, tracking, periodInkLeft } = SPEC.suffix;
  const upm = FONT.unitsPerEm;
  const s = size / upm;
  const trackUnits = tracking * upm;

  // Pen positions with the run starting at 0, so the period's ink offset can be measured.
  let x = 0;
  const pens = [];
  for (const ch of run) {
    pens.push({ ch, pen: x });
    x += FONT.glyphs[ch].advance + trackUnits;
  }

  // Slide the whole run so the period's INK, not its pen, lands on the spec position.
  const dotInkOffset = inkBounds(FONT.glyphs['.'].path).minX;
  const x0 = periodInkLeft - dotInkOffset * s;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pens) {
    p.x = x0 + p.pen * s;
    const b = inkBounds(FONT.glyphs[p.ch].path);
    if (b.minX === Infinity) continue; // a blank glyph contributes no ink
    minX = Math.min(minX, p.x + b.minX * s);
    maxX = Math.max(maxX, p.x + b.maxX * s);
    // y is flipped: font y-up, SVG y-down about the baseline
    minY = Math.min(minY, SPEC.baseline - b.maxY * s);
    maxY = Math.max(maxY, SPEC.baseline - b.minY * s);
  }
  return { pens, scale: s, ink: { minX, maxX, minY, maxY } };
}

function inkBounds(cmds) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of cmds) {
    for (let i = 1; i < c.length; i += 2) {
      minX = Math.min(minX, c[i]); maxX = Math.max(maxX, c[i]);
      minY = Math.min(minY, c[i + 1]); maxY = Math.max(maxY, c[i + 1]);
    }
  }
  return { minX, maxX, minY, maxY };
}

/** Emit one glyph as an SVG path, transformed by (s, 0, 0, -s, x, baseline). */
function glyphPath(ch, x, s) {
  const B = SPEC.baseline;
  return FONT.glyphs[ch].path
    .map((c) => {
      if (c[0] === 'Z') return 'Z';
      const parts = [];
      for (let i = 1; i < c.length; i += 2) parts.push(num(x + c[i] * s), num(B - c[i + 1] * s));
      return c[0] + parts.join(' ');
    })
    .join('');
}

// ---------------------------------------------------------------- generate

/**
 * Build a complete lockup SVG.
 * `variant` is light | dark | mono; `accent` recolours the LETTERS only, never the dot.
 */
export function generate(suffix, { variant = 'mono', accent = null, noHex = false, ink: inkOverride = null } = {}) {
  const base = SPEC.variants[variant];
  if (!base) throw new Error(`unknown variant ${variant}, expected ${Object.keys(SPEC.variants).join(' | ')}`);
  // An app may carry its own wordmark ink (nimiq.ninja ships #1A1030, not the fleet navy).
  // That is a sub-brand decision, so it is preserved rather than normalised.
  const v = inkOverride ? { ...base, ink: inkOverride } : base;

  const { pens, scale, ink } = layout(suffix);
  const { hexagon, logotype } = artwork();
  const H = SPEC.logoSpace.height;

  // Wordmark-only. Some surfaces (andjroo.com/apps) pair the wordmark with the app's OWN
  // hexagon as a separate image, so the mark must not carry the Nimiq one. Everything shifts
  // left by the logotype's ink start, putting its ink on x=0.
  const shift = noHex ? -SPEC.logotypeInkStart : 0;
  const vbW = Math.round((ink.maxX + shift) * 1000) / 1000;

  const dot = pens[0];
  const dotPath = glyphPath('.', dot.x + shift, scale);
  const letters = pens.slice(1).map((p) => glyphPath(p.ch, p.x + shift, scale)).join('');

  const mono = variant === 'mono';
  const gid = `nq-${suffix}-hex`;
  const g = SPEC.artwork.gradient;
  const defs = mono
    ? ''
    : `<defs><radialGradient id="${gid}" cx="0" cy="0" r="1" gradientTransform="${g.gradientTransform}" gradientUnits="userSpaceOnUse">` +
      g.stops.map((s) => `<stop${s.offset ? ` offset="${s.offset}"` : ''} stop-color="${s.color}"/>`).join('') +
      `</radialGradient></defs>`;

  const header =
    `<!-- NIMIQ.${suffix} lockup${noHex ? ', wordmark only' : ''}. GENERATED by \`nq lockup ${suffix}\`; regenerate rather than hand-edit.\n` +
    `     The hexagon and NIMIQ logotype are verbatim Nimiq artwork. ".${suffix}" is OUTLINED from\n` +
    `     Mulish ${SPEC.suffix.weight} at the logotype's ${SPEC.suffix.tracking}em tracking, so it needs no font to render and\n` +
    `     reads at the same density as NIMIQ. The dot is its own path and carries the wordmark's\n` +
    `     colour; only the letters take an accent. Verify with \`nq lockup check <file>\`. -->\n`;

  return (
    header +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${H}" width="${Math.round(vbW * 4)}" height="${H * 4}" fill="none" role="img" aria-label="NIMIQ.${suffix}">` +
    (noHex ? '' : defs) +
    (noHex ? '' : `<path class="nq-hex" fill="${mono ? v.hexagon : `url(#${gid})`}" d="${hexagon}"/>`) +
    `<path class="nq-wordmark" fill="${v.ink}"${noHex ? ` transform="translate(${num(shift)} 0)"` : ''} d="${logotype}"/>` +
    `<path class="nq-dot" fill="${v.ink}" d="${dotPath}"/>` +
    `<path class="nq-suffix" fill="${accent || v.ink}" d="${letters}"/>` +
    `</svg>\n`
  );
}

/**
 * Outline an arbitrary text run at an arbitrary size and baseline.
 *
 * The canonical lockup above assumes the 76x18 logo space. Some marks are built on a different
 * official artwork at a different scale (nimiq.sale sits on NIMIQ WALLET, 127x16), so they need
 * the same typography at their own geometry. This is the primitive for that: same font, same
 * tracking rule, caller's coordinates. Returns one path `d`.
 */
export function outlineRun(text, { size, baseline, x = 0, tracking = SPEC.suffix.tracking } = {}) {
  if (!size || baseline === undefined) throw new Error('outlineRun needs { size, baseline }');
  for (const ch of text) {
    if (!FONT.glyphs[ch]) throw new Error(`no glyph for ${JSON.stringify(ch)}; the set is lowercase + digits + "."`);
  }
  const s = size / FONT.unitsPerEm;
  const trackUnits = tracking * FONT.unitsPerEm;
  let pen = 0, out = '';
  for (const ch of text) {
    out += FONT.glyphs[ch].path
      .map((c) => {
        if (c[0] === 'Z') return 'Z';
        const parts = [];
        for (let i = 1; i < c.length; i += 2) {
          parts.push(num(x + (pen + c[i]) * s), num(baseline - c[i + 1] * s));
        }
        return c[0] + parts.join(' ');
      })
      .join('');
    pen += FONT.glyphs[ch].advance + trackUnits;
  }
  return out;
}

/** Ink bounds of what outlineRun would emit, so a caller can align to ink rather than pen. */
export function runInk(text, opts) {
  return svgPathBounds(outlineRun(text, opts));
}

// ---------------------------------------------------------------- check

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', 'build']);
const SCAN_EXT = new Set(['.svg', '.html', '.htm', '.js', '.mjs', '.ts', '.vue', '.jsx', '.tsx']);

function walk(target, out = []) {
  const st = statSync(target);
  if (st.isFile()) { out.push(target); return out; }
  for (const name of readdirSync(target)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(target, name);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

/** The NIMIQ logotype's own ink width, which is how a file's scale is recovered. */
const LOGOTYPE_INK_W = 47.952;

/** Parse the transform forms the fleet actually uses: translate(x[ ,y]) and scale(s[ ,s]). */
function parseTransform(attrs) {
  let tx = 0, ty = 0, sx = 1, sy = 1;
  const t = (attrs.match(/transform="([^"]+)"/) || [])[1];
  if (!t) return { tx, ty, sx, sy };
  const tr = t.match(/translate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/);
  if (tr) { tx = parseFloat(tr[1]); ty = parseFloat(tr[2] ?? '0'); }
  const sc = t.match(/scale\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/);
  if (sc) { sx = parseFloat(sc[1]); sy = parseFloat(sc[2] ?? sc[1]); }
  return { tx, ty, sx, sy };
}

function applyTransform(b, { tx, ty, sx, sy }) {
  if (!b) return null;
  const xs = [b.minX * sx + tx, b.maxX * sx + tx];
  const ys = [b.minY * sy + ty, b.maxY * sy + ty];
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Which suffix is this? The name is stated in the file far more reliably than geometry shows it. */
function suffixOf(src, file) {
  const aria = src.match(/aria-label="NIMIQ\.([a-z0-9]+)"/i);
  if (aria) return aria[1].toLowerCase();
  const fname = (file || '').match(/nimiq[-.]([a-z0-9]+)[-.](?:lockup|wordmark|logo)/i);
  if (fname && fname[1] !== 'lockup') return fname[1].toLowerCase();
  return null;
}

/**
 * Measure every lockup in a file.
 *
 * Two shapes exist in the wild and both are checked: outlined paths (correct form) and live
 * <text> (wrong regardless of spacing, because it drifts wherever Mulish is missing).
 *
 * Everything is measured RELATIVE to the logotype's own ink, never against absolute viewBox
 * coordinates. Fleet files translate and scale the mark freely, so an absolute test reports
 * failures that are only a different origin.
 */
export function inspectSource(src, file = '') {
  const found = [];
  const name = suffixOf(src, file);

  // Live <text> suffixes, e.g. nimiq.sale. Unescape first: these are often inside a JS string.
  //
  // Detected by SHAPE, a <text> holding just "." followed by a <text> holding a lowercase word,
  // rather than by the logotype path. nimiq.sale rescales its whole mark, so it carries neither
  // the canonical hexagon nor the canonical logotype and a marker-based scan misses it entirely.
  const flat = src.replace(/\\"/g, '"').replace(/\\n/g, '\n');
  const texts = [...flat.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
    .map((m) => ({ attrs: m[1], text: m[2].trim() }));
  for (let k = 0; k < texts.length - 1; k++) {
    if (texts[k].text !== '.') continue;
    const word = texts[k + 1];
    if (!/^[a-z0-9]{2,}$/.test(word.text)) continue;
    const size = parseFloat((word.attrs.match(/font-size="([\d.]+)"/) || [])[1] || '0');
    const ls = parseFloat((word.attrs.match(/letter-spacing="([-\d.]+)"/) || [])[1] || '0');
    const em = size ? ls / size : null;
    found.push({
      kind: 'live-text',
      text: word.text,
      ok: false,
      reason:
        `".${word.text}" is live <text>${em === null ? '' : ` tracked ${em.toFixed(4)}em`}, so it renders ` +
        `differently wherever Mulish is missing${em !== null && Math.abs(em - SPEC.suffix.tracking) > SPEC.tolerance.trackingEm ? ` and the tracking is off spec (${SPEC.suffix.tracking}em)` : ''}. Outline it`,
    });
    break; // one finding per file; every copy has the same fix
  }
  if (found.length) return found;

  // Outlined form, generated-marker path. Any mark carrying an `nq-suffix` path is checkable
  // without finding a logotype at all, which matters because not every fleet mark is built on
  // the canonical 76x18 artwork: nimiq.sale sits on NIMIQ WALLET at its own scale, so a
  // logotype-anchored check skips it entirely.
  //
  // The test is the run's ink ASPECT RATIO, width over height. For a fixed string at a fixed
  // tracking that ratio is invariant to scale and position, so it can be compared against a
  // generated reference with no idea what size the file is drawn at.
  if (!src.includes(LOGOTYPE_MARKER)) {
    const suf = [...src.matchAll(/<path\b([^>]*?)d="([^"]+)"([^>]*?)\/?>/g)]
      .map((m) => ({ attrs: m[1] + m[3], d: m[2] }))
      .find((p) => /class="[^"]*\bnq-suffix\b/.test(p.attrs));
    if (!suf || !name || ![...name].every((c) => FONT.glyphs[c])) return found;
    const b = svgPathBounds(suf.d);
    if (!b || b.maxY === b.minY || name.length < 2) return found;
    const got = (b.maxX - b.minX) / (b.maxY - b.minY);

    // How far off spec is this run? Measured for each casing the file might actually be drawn
    // in, because the name comes from an aria-label or a filename and neither records case:
    // nimiq.sale labels all four of its files "nimiq.sale" and two of them render "SALE",
    // whose caps-only ink is a different aspect ratio from lowercase "sale" entirely.
    const errFor = (word) => {
      const ref = runInk(word, { size: 100, baseline: 0 });
      const want = (ref.maxX - ref.minX) / (ref.maxY - ref.minY);
      const bumped = runInk(word, { size: 100, baseline: 0, tracking: SPEC.suffix.tracking + 0.01 });
      const ratioPerEm = ((bumped.maxX - bumped.minX) / (bumped.maxY - bumped.minY) - want) / 0.01;
      return ratioPerEm ? (got - want) / ratioPerEm : Infinity;
    };
    const candidates = [name, name.toUpperCase()]
      .filter((w, i, a) => a.indexOf(w) === i && [...w].every((c) => FONT.glyphs[c]))
      .map((w) => ({ w, err: errFor(w) }));
    const best = candidates.reduce((a, c) => (Math.abs(c.err) < Math.abs(a.err) ? c : a));

    const ok = Math.abs(best.err) <= SPEC.tolerance.trackingEm;
    found.push({
      kind: 'outlined',
      text: name,
      ok,
      trackErr: best.err,
      reason: ok ? null
        : `the ".${best.w}" run is ${best.err > 0 ? 'wider' : 'tighter'} than spec by ${Math.abs(best.err).toFixed(4)}em; ` +
          `it must be tracked at ${SPEC.suffix.tracking}em`,
    });
    return found;
  }
  const paths = [...src.matchAll(/<path\b([^>]*?)d="([^"]+)"([^>]*?)\/?>/g)].map((m) => ({
    attrs: m[1] + m[3],
    d: m[2],
  }));
  const i = paths.findIndex((p) => p.d.startsWith(LOGOTYPE_MARKER));
  if (i === -1) return found;

  const logo = paths[i];
  const logoB = applyTransform(svgPathBounds(logo.d), parseTransform(logo.attrs));
  if (!logoB) return found;
  const scale = (logoB.maxX - logoB.minX) / LOGOTYPE_INK_W; // 1 for a normal 76x18 file
  const qEnd = logoB.maxX;

  // The suffix is whatever follows the logotype, minus the hexagon.
  const rest = paths.slice(i + 1)
    .filter((p) => !p.d.startsWith('M19.964'))
    .map((p) => ({ ...p, b: applyTransform(svgPathBounds(p.d), parseTransform(p.attrs)) }))
    .filter((p) => p.b && p.b.minX >= qEnd - 1 * scale);
  if (!rest.length) return found; // plain NIMIQ, no suffix: nothing to check

  // The dot: labelled if the file says so, otherwise the small mark nearest the Q.
  const labelled = rest.find((p) => /class="[^"]*\b(nq-)?dot\b[^"]*"/.test(p.attrs));
  const dot = labelled || rest.find((p) => (p.b.maxX - p.b.minX) < 3.2 * scale);
  if (!dot) return found;
  const letters = rest.filter((p) => p !== dot && p.b.minX > dot.b.minX);

  // Gap 1: Q to dot. Normalised by scale so a resized file is judged the same as a 76-wide one.
  const gapQD = (dot.b.minX - qEnd) / scale;
  const expectedGapQD = SPEC.suffix.periodInkLeft - SPEC.logotypeInkEnd;
  const gapErr = (gapQD - expectedGapQD) / SPEC.suffix.size;

  // Gap 2: the run's tracking, recovered from its total ink width against a generated one.
  let trackErr = null;
  if (letters.length && name && FONT.glyphs[name[0]] && [...name].every((c) => FONT.glyphs[c])) {
    const lb = letters.reduce((a, p) => ({
      minX: Math.min(a.minX, p.b.minX), maxX: Math.max(a.maxX, p.b.maxX),
    }), { minX: Infinity, maxX: -Infinity });
    const model = layout(name);
    const modelLetters = model.pens.slice(1);
    if (modelLetters.length) {
      const first = modelLetters[0], last = modelLetters[modelLetters.length - 1];
      const fb = inkBounds(FONT.glyphs[first.ch].path), lbb = inkBounds(FONT.glyphs[last.ch].path);
      const expectedW = (last.x + lbb.maxX * model.scale) - (first.x + fb.minX * model.scale);
      trackErr = ((lb.maxX - lb.minX) / scale - expectedW) / SPEC.suffix.size;
    }
  }

  const tol = SPEC.tolerance;
  const gapBad = Math.abs(gapErr) > tol.trackingEm;
  const trackBad = trackErr !== null && Math.abs(trackErr) > tol.trackingEm;
  found.push({
    kind: 'outlined',
    text: name,
    ok: !gapBad && !trackBad,
    gapQD, gapErr, trackErr,
    reason: gapBad
      ? `Q to dot is ${gapQD.toFixed(4)}, spec is ${expectedGapQD.toFixed(4)} (off by ${gapErr > 0 ? '+' : ''}${gapErr.toFixed(4)}em)`
      : trackBad
        ? `the ".${name}" run is ${trackErr > 0 ? 'wider' : 'tighter'} than spec by ${Math.abs(trackErr).toFixed(4)}em; ` +
          `it must be tracked at ${SPEC.suffix.tracking}em to match NIMIQ`
        : null,
  });
  return found;
}

/**
 * Bounds of an SVG path, over the control points.
 *
 * Scans character by character rather than pre-tokenising, because arc FLAGS are single
 * digits that may be packed against the next number: "a1.69 1.69 0 0014.299 0" carries
 * large-arc=0, sweep=0, x=14.299 in one run of characters. A regex tokeniser reads that as
 * the single number 14.299, desyncs the operand stream, and eventually runs off the end of
 * the path returning NaN. The Nimiq logotype contains arcs, so this is not hypothetical: it
 * silently NaN'd every measurement of the real artwork.
 *
 * Control-point bounds overshoot a curve's true extent, which is fine here. Every number this
 * is compared against is produced the same way, and the suffix outlines this actually gates on
 * are made of M/L/C/Z with on-curve endpoints.
 */
export function svgPathBounds(d) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let x = 0, y = 0, sx = 0, sy = 0, seen = false, i = 0, cmd = '';
  const put = (px, py) => {
    seen = true;
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  };
  const ws = () => { while (i < d.length && (d[i] === ' ' || d[i] === ',' || d[i] === '\n' || d[i] === '\t' || d[i] === '\r')) i++; };
  const num = () => {
    ws();
    const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(i));
    if (!m) return NaN;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const flag = () => { ws(); const c = d[i]; i++; return c === '1' ? 1 : 0; };

  while (i < d.length) {
    ws();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i])) { cmd = d[i]; i++; ws(); }
    if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    if (C === 'Z') { x = sx; y = sy; cmd = ''; continue; }
    if (i >= d.length) break;

    if (C === 'M' || C === 'L' || C === 'T') {
      const nx = num(), ny = num();
      if (Number.isNaN(nx) || Number.isNaN(ny)) break;
      x = rel ? x + nx : nx; y = rel ? y + ny : ny;
      if (C === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; } // an implicit repeat of M is L
      put(x, y);
    } else if (C === 'H') { const n = num(); if (Number.isNaN(n)) break; x = rel ? x + n : n; put(x, y); }
    else if (C === 'V') { const n = num(); if (Number.isNaN(n)) break; y = rel ? y + n : n; put(x, y); }
    else if (C === 'C') {
      const a = num(), b = num(), c = num(), dd = num(), e = num(), f = num();
      if (Number.isNaN(f)) break;
      put(rel ? x + a : a, rel ? y + b : b); put(rel ? x + c : c, rel ? y + dd : dd);
      x = rel ? x + e : e; y = rel ? y + f : f; put(x, y);
    } else if (C === 'S' || C === 'Q') {
      const a = num(), b = num(), c = num(), dd = num();
      if (Number.isNaN(dd)) break;
      put(rel ? x + a : a, rel ? y + b : b);
      x = rel ? x + c : c; y = rel ? y + dd : dd; put(x, y);
    } else if (C === 'A') {
      num(); num(); num();          // rx, ry, rotation
      flag(); flag();               // large-arc, sweep: single digits, possibly packed
      const e = num(), f = num();
      if (Number.isNaN(f)) break;
      x = rel ? x + e : e; y = rel ? y + f : f; put(x, y);
    } else { i++; }
  }
  return seen ? { minX, maxX, minY, maxY } : null;
}

export function check(targets) {
  const files = targets.flatMap((t) => {
    const p = resolve(t);
    if (!existsSync(p)) throw new Error(`no such path: ${t}`);
    return walk(p);
  });
  const results = [];
  for (const f of files) {
    let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
    for (const hit of inspectSource(src, f)) results.push({ file: f, ...hit });
  }
  return results;
}

// ---------------------------------------------------------------- cli

export async function cmdLockup(args, flags = {}) {
  const [sub, ...rest] = args;

  if (sub === 'run') {
    const [text] = rest;
    if (!text) throw new Error('nq lockup run <text> --size <n> --baseline <n> [--x <n>] [--track <em>]');
    const size = parseFloat(flags.size), baseline = parseFloat(flags.baseline);
    if (!size || Number.isNaN(baseline)) throw new Error('nq lockup run needs --size and --baseline');
    const d = outlineRun(text, {
      size, baseline,
      x: flags.x ? parseFloat(flags.x) : 0,
      tracking: flags.track ? parseFloat(flags.track) : SPEC.suffix.tracking,
    });
    process.stdout.write(d + '\n');
    return 0;
  }

  if (sub === 'check') {
    const targets = rest.length ? rest : ['.'];
    const results = check(targets);
    const bad = results.filter((r) => !r.ok);
    if (!results.length) {
      console.log('no NIMIQ.<suffix> lockups found in ' + targets.join(', '));
      return 0;
    }
    for (const r of results) {
      const name = relative(process.cwd(), r.file) || r.file;
      if (r.ok) console.log(`  ok    ${name}${r.text ? `  NIMIQ.${r.text}` : ''}`);
      else console.log(`  FAIL  ${name}${r.text ? `  NIMIQ.${r.text}` : ''}\n          ${r.reason}`);
    }
    console.log(`\n${results.length - bad.length}/${results.length} on spec.`);
    if (bad.length) {
      console.log(`Regenerate a failing mark with:  nq lockup <suffix> --variant <light|dark|mono>`);
    }
    return bad.length ? 1 : 0;
  }

  if (!sub || sub.startsWith('-')) {
    console.log(`nq lockup <suffix> [--variant light|dark|mono] [--accent #RRGGBB] [--ink #RRGGBB] [--no-hex]
nq lockup check <path...>

  nq lockup blog --variant mono        emit the NIMIQ.blog mark
  nq lockup check ~/Projects           verify every lockup under a tree (exit 1 on failure)

The suffix is set in Mulish ${SPEC.suffix.weight} at the logotype's ${SPEC.suffix.tracking}em tracking, with the
period's ink on ${SPEC.suffix.periodInkLeft}. Those two numbers are the whole spec; see
assets/lockup/spec.json for where each one comes from.`);
    return sub ? 0 : 1;
  }

  const suffix = sub.replace(/^\./, '').toLowerCase();
  if (!/^[a-z0-9]+$/.test(suffix)) throw new Error(`suffix must be lowercase letters or digits: ${sub}`);
  const variant = flags.variant || (flags.light && 'light') || (flags.dark && 'dark') || 'mono';
  const accent = flags.accent || null;
  if (accent && variant === 'light' && /^#e9b213$/i.test(accent)) {
    console.error('refusing: gold on a light surface is 1.94:1 and fails WCAG at every size');
    return 1;
  }
  process.stdout.write(generate(suffix, { variant, accent, noHex: !!flags.noHex, ink: flags.ink || null }));
  return 0;
}

export { SPEC, FONT, LOGOTYPE_MARKER };
