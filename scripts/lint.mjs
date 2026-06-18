// nq lint — render a page (file or URL) and enforce the Nimiq brand rules + breathability.
//
// Two layers, both deterministic and calibrated against the measured nimiq.com envelope
// (see LINT.md for the calibration data and thresholds):
//   ERRORS   — unambiguous off-brand slop. Hard-fail (exit 1). Some auto-fixable with --fix.
//   WARNINGS — breathability / density advisories. Calibrated to ~80% reality, never block.
//
// Mirrors scripts/verify.mjs: dynamic-imports playwright (the render harness), no new runtime dep.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Brand truth, extracted from assets/css/modern/spacing.css + the color table ──
// Curated fluid spacing scale (desktop max of each named step). Sub-8px is optical, not layout.
const SPACING_SCALE = [8, 12, 16, 24, 32, 40, 48, 72, 80, 96, 144, 200];
// Brand color anchors (base RGB; alpha is ignored — opacity IS a legit Nimiq technique).
const ANCHORS = {
  navy: [31, 35, 72], navyDark: [23, 29, 46], navyCorner: [38, 1, 51],
  lightBlue: [5, 130, 202], blue: [38, 93, 215],
  gold: [233, 178, 19], goldGrad: [236, 153, 28], orange: [252, 135, 2],
  green: [33, 188, 165], greenGrad: [65, 163, 142], red: [217, 68, 50],
  white: [255, 255, 255],
  // secondary palette (legacy nimiq-style: --nimiq-purple/pink/light-green/brown + gradient starts)
  purple: [95, 75, 139], purpleGrad: [77, 76, 150],
  pink: [250, 114, 104], pinkGrad: [224, 81, 107],
  lightGreen: [136, 176, 75], lightGreenGrad: [112, 176, 105],
  brown: [121, 85, 72], brownGrad: [114, 65, 71],
};
// Third-party brand logos you cannot recolor — exempt from the palette rule.
const SOCIAL = {
  discord: [88, 101, 242], telegram: [42, 171, 238], twitter: [29, 161, 242], x: [0, 0, 0],
  youtube: [255, 0, 0], facebook: [24, 119, 242], whatsapp: [37, 211, 102], linkedin: [10, 102, 194],
  reddit: [255, 69, 0], github: [24, 23, 23], instagram: [225, 48, 108], mastodon: [99, 100, 255],
  medium: [0, 0, 0], tiktok: [37, 244, 238],
};
// Thresholds (calibrated — see LINT.md).
const MEASURE_WARN_CH = 90;        // nimiq.com p90 paragraph ≈ 84ch, max 104ch → warn, don't fail
const SECTION_INK_WARN = 18;       // nimiq.com pages run 5–12% page ink; a band >18% reads dense
const PALETTE_DELTA = 55;          // RGB distance from nearest brand anchor to count as off-palette
const SOCIAL_DELTA = 32;           // proximity to a known social color → exempt
const FONT_SPRAWL_WARN = 10;       // distinct text sizes; calm app ≈ 4, busy marketing ≈ 12

function pageProbe({ SPACING_SCALE, ANCHORS }) {
  const TOL = 1.5;
  const onScale = (v) => SPACING_SCALE.some((s) => Math.abs(v - s) <= TOL);
  const cv = document.createElement('canvas').getContext('2d');
  const toRGB = (c) => {
    cv.fillStyle = '#000'; try { cv.fillStyle = c; } catch { return null; }
    const v = cv.fillStyle;
    if (v[0] === '#') { const n = parseInt(v.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = v.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2]];
  };
  // neutral = low-saturation. Nimiq grays carry a deliberate blue/violet spin, so test
  // saturation relative to lightness, not a flat channel spread.
  const gray = (rgb) => { const mx = Math.max(...rgb), mn = Math.min(...rgb); return mx - mn < 14 || (mx > 0 && (mx - mn) / mx < 0.2); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const nearest = (rgb, set) => { let best = Infinity, name = ''; for (const [k, v] of Object.entries(set)) { const d = dist(rgb, v); if (d < best) { best = d; name = k; } } return { d: Math.round(best), name }; };
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const directText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();

  const o = { dashes: [], titlePeriods: [], glass: [], inputBorders: [], uppercase: [], offPalette: {}, wideText: [], offScale: {}, onScaleN: 0, scaleN: 0, denseSections: [], fontSizes: {}, foldColors: new Set() };

  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || el.closest('script,style')) continue;   // skip decorative SVG fields + non-rendered
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const txt = directText(el);
    const px = (s) => Math.round(parseFloat(s) || 0);
    const inCode = el.closest('code,pre,kbd');

    if (txt && !inCode && /[—–]/.test(txt)) o.dashes.push(txt.slice(0, 70));

    const isTitle = /^h[1-4]$/.test(tag) || el.matches('button,.nq-button,[class*="title" i],[class*="heading" i],[class*="headline" i]');
    // trailing period on a title — but not "..." and not abbreviations (p.a., e.g., U.S.)
    if (isTitle && txt && /[a-z0-9)]\.$/i.test(txt) && !/\.\.\.$/.test(txt) && !/\.[a-z]?\.$/i.test(txt)) o.titlePeriods.push(`<${tag}> ${txt.slice(0, 60)}`);

    // glassmorphism = a TRANSLUCENT surface with a backdrop blur (the frosted-glass card).
    // A near-opaque panel with a faint backdrop blur is a solid surface, not glass — don't flag it.
    if (cs.backdropFilter && cs.backdropFilter !== 'none' && /blur\(/.test(cs.backdropFilter)) {
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/); const a = m ? (parseFloat(m[1].split(',')[3]) ?? 1) : 1;
      const r = el.getBoundingClientRect();
      if (a >= 0.1 && a <= 0.85 && r.width * r.height > 4000) o.glass.push(`<${tag}> backdrop-blur over ${Math.round(a * 100)}% bg`);
    }
    if (['input', 'textarea', 'select'].includes(tag) && cs.borderStyle !== 'none' && px(cs.borderTopWidth) > 0) o.inputBorders.push(`<${tag}> border ${cs.borderTopWidth}`);
    if (cs.textTransform === 'uppercase' && txt && !el.matches('.nq-button,.nq-button-s,button')) o.uppercase.push(`<${tag}> ${txt.slice(0, 40)}`);

    const checkColor = (c) => { const rgb = toRGB(c); if (!rgb || gray(rgb)) return; const b = nearest(rgb, ANCHORS); if (b.d <= 55) return; const key = `rgb(${rgb.join(',')})`; (o.offPalette[key] ??= { n: 0, near: b.name, d: b.d, rgb }).n++; };
    if (txt && !inCode) checkColor(cs.color);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') checkColor(cs.backgroundColor);

    for (const prop of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
      const v = px(cs[prop]); if (v >= 8 && v <= 400) { o.scaleN++; if (onScale(v)) o.onScaleN++; else o.offScale[v] = (o.offScale[v] || 0) + 1; }
    }
    if ((tag === 'p' || el.matches('[class*="text" i],[class*="body" i],[class*="desc" i]')) && txt.length > 60 && el.children.length === 0) {
      const fs = px(cs.fontSize) || 16; const r = el.getBoundingClientRect(); const ch = Math.round(r.width / (fs * 0.5));
      if (ch > 88) o.wideText.push({ ch, snippet: txt.slice(0, 50) });
    }
    if (txt) { const fs = px(cs.fontSize); if (fs) o.fontSizes[fs] = (o.fontSizes[fs] || 0) + 1; }
    const r = el.getBoundingClientRect(); if (r.top < 1024 && r.bottom > 0 && txt && !inCode) o.foldColors.add(cs.color);
  }

  // per-section text-ink ratio (full-width bands)
  const vw = innerWidth;
  const leaves = [...document.querySelectorAll('body *')].filter((el) => !el.closest('svg') && visible(el) && el.children.length === 0 && directText(el)).map((el) => el.getBoundingClientRect());
  for (const el of document.querySelectorAll('section,main > div,body > div,[class*="section" i],[class*="band" i]')) {
    if (el.closest('svg') || !visible(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < vw * 0.7 || r.height < 220) continue;
    let ink = 0; for (const lr of leaves) { const cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2; if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) ink += lr.width * lr.height; }
    const pct = Math.round((ink / (r.width * r.height)) * 1000) / 10;
    if (pct > 18) o.denseSections.push({ pct, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().trim().split(/\s+/)[0]?.slice(0, 24) || '', h: Math.round(r.height) });
  }
  o.foldColors = o.foldColors.size;
  return o;
}

// ── conservative source --fix (text-level only; geometry fixes are render-mapped, see LINT.md) ──
function fixSource(src) {
  const fixes = [];
  // strip scripts/styles/comments from consideration by fixing only text between tags
  const replaceText = (s, fn) => s.replace(/>([^<]+)</g, (m, text) => '>' + fn(text) + '<');
  let out = src;
  // 1. em/en dashes in visible text → comma
  out = replaceText(out, (t) => t.replace(/\s*[—–]\s*/g, (d) => { fixes.push('dash→comma'); return ', '; }));
  // 2. trailing period on h1–h4 display titles
  out = out.replace(/(<h[1-4][^>]*>)([\s\S]*?[a-z0-9)])\.(\s*<\/h[1-4]>)/gi, (m, a, b, c) => { fixes.push('title-period'); return a + b + c; });
  return { out, fixes };
}

export async function lint(target, opts = {}) {
  if (!target) throw new Error('nq lint <file.html | url> [--fix]');
  const isUrl = /^https?:\/\//.test(target);
  const filePath = isUrl ? null : resolve(target);
  if (!isUrl && !existsSync(filePath)) throw new Error(`no such file: ${target}`);
  const url = isUrl ? target : pathToFileURL(filePath).href;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const out = (s = '') => console.log(s);
  let errorCount = 0, warnCount = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);
    // dismiss a language-picker splash (e.g. nimiq.tech) before measuring
    try { const en = page.locator('button.flag-btn', { hasText: 'English' }).first(); if (await en.count()) { await en.click({ timeout: 3000 }); await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(1000); } } catch {}
    await page.evaluate(async () => { const s = innerHeight * 0.8; for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 350)); });
    const r = await page.evaluate(pageProbe, { SPACING_SCALE, ANCHORS });

    // social-icon exemption (run in Node — SOCIAL anchors aren't in the page context)
    const socialName = (rgb) => { let best = Infinity, name = null; for (const [k, v] of Object.entries(SOCIAL)) { const d = Math.hypot(rgb[0] - v[0], rgb[1] - v[1], rgb[2] - v[2]); if (d < best) { best = d; name = k; } } return best <= SOCIAL_DELTA ? name : null; };
    for (const v of Object.values(r.offPalette)) v.social = socialName(v.rgb);

    // classify
    const offPal = Object.entries(r.offPalette).filter(([, v]) => !v.social);   // social icons exempt
    const exemptSocial = Object.entries(r.offPalette).filter(([, v]) => v.social);
    const errs = [
      ['em/en dashes in copy', r.dashes.length, r.dashes[0], '--fix'],
      ['periods on titles / CTAs', r.titlePeriods.length, r.titlePeriods[0], '--fix'],
      ['glassmorphism', r.glass.length, r.glass[0], 'manual'],
      ['borders on inputs', r.inputBorders.length, r.inputBorders[0], 'use inset box-shadow'],
      ['off-palette colors', offPal.length, offPal[0] && `${offPal[0][0]} (nearest ${offPal[0][1].near}, Δ${offPal[0][1].d})`, 'manual'],
    ];
    errorCount = errs.reduce((n, e) => n + e[1], 0);

    const scalePct = r.scaleN ? Math.round((r.onScaleN / r.scaleN) * 1000) / 10 : 100;
    const topOff = Object.entries(r.offScale).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const sizes = Object.keys(r.fontSizes).map(Number).sort((a, b) => a - b);
    const warns = [
      ['body text wider than ~88ch', r.wideText.length, r.wideText.length && `worst ${Math.max(...r.wideText.map((w) => w.ch))}ch`],
      ['dense sections (>18% text ink)', r.denseSections.length, r.denseSections.slice(0, 4).map((d) => `${d.pct}% <${d.tag}.${d.cls}>`).join('  ')],
      ['off-scale spacing (snap to scale)', topOff.length, `${scalePct}% on-scale · ${topOff.map(([v, n]) => `${v}px×${n}`).join(' ')}`],
      ['type-scale sprawl', sizes.length > FONT_SPRAWL_WARN ? sizes.length : 0, `${sizes.length} sizes [${sizes.join(',')}]`],
      ['uppercased non-button text (eyebrow smell)', r.uppercase.length, r.uppercase[0]],
    ];
    warnCount = warns.reduce((n, w) => n + (w[1] ? 1 : 0), 0);

    if (opts.json) { out(JSON.stringify({ url, errorCount, warnCount, raw: r, exemptSocial: exemptSocial.map(([c, v]) => ({ color: c, icon: v.social })) }, null, 2)); return { errorCount, warnCount }; }

    out(`\n══════ nq lint — ${target} ══════\n`);
    out('ERRORS  (off-brand — must fix to pass)');
    for (const [label, n, eg, how] of errs) out(`  ${n ? '✗' : '✓'} ${label.padEnd(30)} ${n}` + (n && eg ? `   e.g. ${eg}` : '') + (n ? `   [${how}]` : ''));
    if (exemptSocial.length) out(`  · ${'exempt social-icon colors'.padEnd(30)} ${exemptSocial.length}   (${exemptSocial.map(([, v]) => v.social).join(', ')})`);
    out('\nWARNINGS  (breathability / density — advisory, calibrated to nimiq.com)');
    for (const [label, n, detail] of warns) out(`  ${n ? '!' : '·'} ${label.padEnd(36)} ${n ? detail : 'ok'}`);
    out(`  · ${'distinct text colors above fold'.padEnd(36)} ${r.foldColors}`);

    if (opts.fix && !isUrl) {
      const src = await readFile(filePath, 'utf8');
      const { out: fixed, fixes } = fixSource(src);
      if (fixes.length) {
        await writeFile(filePath, fixed);
        const counts = fixes.reduce((m, f) => ((m[f] = (m[f] || 0) + 1), m), {});
        out(`\n  --fix applied: ${Object.entries(counts).map(([k, v]) => `${k} ×${v}`).join(', ')} → re-run to confirm.`);
      } else out('\n  --fix: nothing auto-fixable in source (geometry fixes are manual — see report).');
    } else if (opts.fix && isUrl) out('\n  --fix only works on local files, not URLs.');

    out(`\n${errorCount} error(s), ${warnCount} warning category(ies).` + (errorCount ? '  FAIL' : '  clean pass ✓') + '\n');
  } finally {
    await browser.close();
  }
  return { errorCount, warnCount };
}
