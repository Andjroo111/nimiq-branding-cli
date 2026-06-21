// nq lint — render a page (file or URL) and enforce the Nimiq brand rules + breathability.
//
// Two layers, both deterministic and calibrated against the measured nimiq.com envelope
// (see LINT.md for the calibration data and thresholds):
//   ERRORS   — unambiguous off-brand slop / a11y failures. Hard-fail (exit 1). Some auto-fixable.
//   WARNINGS — breathability, depth/motion, density advisories. Calibrated to reality, never block.
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
// Radius scale (measured live): tiny chips 3/4, small 6, marketing card 8, app card 10, icon tile 12.
// Anything else that isn't a full pill (>=500) or a circle (50%) is off-scale.
const RADIUS_SCALE = [3, 4, 6, 8, 10, 12];
// Brand color anchors (base RGB; alpha is ignored — opacity IS a legit Nimiq technique).
const ANCHORS = {
  navy: [31, 35, 72], navyDark: [23, 29, 46], navyCorner: [38, 1, 51],
  lightBlue: [5, 130, 202], blue: [38, 93, 215], lightBlueOnDark: [12, 166, 254],
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
const SOCIAL_DELTA = 32;           // proximity to a known social color → exempt
const FONT_SPRAWL_WARN = 12;       // distinct text sizes; calm app ≈ 4, busy marketing ≈ 12

function pageProbe({ SPACING_SCALE, ANCHORS, RADIUS_SCALE }) {
  const TOL = 1.5;
  const onScale = (v) => SPACING_SCALE.some((s) => Math.abs(v - s) <= TOL);
  const cv = document.createElement('canvas').getContext('2d');
  const toRGBA = (c) => {
    if (!c) return null;
    cv.fillStyle = '#000'; try { cv.fillStyle = c; } catch { return null; }
    const v = cv.fillStyle;
    if (v[0] === '#') { const n = parseInt(v.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
    const m = v.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1];
  };
  const toRGB = (c) => { const r = toRGBA(c); return r ? r.slice(0, 3) : null; };
  const px = (s) => Math.round(parseFloat(s) || 0);
  // neutral = low-saturation. Nimiq grays carry a deliberate blue/violet spin, so test
  // saturation relative to lightness, not a flat channel spread.
  const gray = (rgb) => { const mx = Math.max(...rgb), mn = Math.min(...rgb); return mx - mn < 14 || (mx > 0 && (mx - mn) / mx < 0.2); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const nearest = (rgb, set) => { let best = Infinity, name = ''; for (const [k, v] of Object.entries(set)) { const d = dist(rgb, v); if (d < best) { best = d; name = k; } } return { d: Math.round(best), name }; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const relLum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const contrast = (a, b) => { const L1 = relLum(a), L2 = relLum(b); return Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100; };
  const hue = (rgb) => { const [r, g, b] = rgb.map((x) => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return -1; let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
  const sat = (rgb) => { const mx = Math.max(...rgb), mn = Math.min(...rgb); return mx ? (mx - mn) / mx : 0; };
  const isBlueFamily = (rgb) => { const h = hue(rgb); return h >= 195 && h <= 250 && sat(rgb) > 0.25; };
  // effective background behind an element: first opaque ancestor bg, or darkest gradient color
  const effBg = (el) => {
    let e = el;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const bc = toRGBA(cs.backgroundColor);
      if (bc && bc[3] >= 0.5) return bc.slice(0, 3);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        const cols = (cs.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || []).map(toRGB).filter(Boolean);
        if (cols.length) return cols.reduce((d, c) => relLum(c) < relLum(d) ? c : d);
      }
      e = e.parentElement;
    }
    return [255, 255, 255];
  };
  // like effBg but reports whether a real background was actually found. Heroes paint their
  // gradient on a separate absolutely-positioned layer, so the text's ancestors are transparent
  // and we'd wrongly default to white — `found:false` lets the contrast check skip those.
  const effBgF = (el) => {
    let e = el;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const bc = toRGBA(cs.backgroundColor);
      if (bc && bc[3] >= 0.5) return { rgb: bc.slice(0, 3), found: true };
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        const cols = (cs.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || []).map(toRGB).filter(Boolean);
        if (cols.length) return { rgb: cols.reduce((d, c) => relLum(c) < relLum(d) ? c : d), found: true };
      }
      e = e.parentElement;
    }
    return { rgb: [255, 255, 255], found: false };
  };
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const directText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const matchAny = (el, sel) => { try { return el.closest(sel); } catch { return null; } };
  // rendered line geometry of an element's own text — Range over each word, group by line-top.
  // returns [lineCount, wordsOnLastLine] so callers can detect both wraps and orphaned words.
  const lineInfo = (el) => {
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!node) return [1, 1];
    const words = node.textContent.trim().split(/\s+/);
    if (words.length < 2) return [1, 1];
    const range = document.createRange(); const tops = []; let idx = 0;
    for (const w of words) {
      const start = node.textContent.indexOf(w, idx); if (start < 0) continue;
      range.setStart(node, start); range.setEnd(node, start + w.length);
      const rr = range.getClientRects()[0]; if (rr) tops.push(Math.round(rr.top));
      idx = start + w.length;
    }
    if (!tops.length) return [1, 1];
    const uniq = [...new Set(tops)].sort((a, b) => a - b);
    const last = uniq[uniq.length - 1];
    return [uniq.length, tops.filter((t) => Math.abs(t - last) <= 2).length];
  };

  const o = {
    dashes: [], titlePeriods: [], glass: [], inputBorders: [], uppercase: [], offPalette: {},
    wideText: [], offScale: {}, onScaleN: 0, scaleN: 0, denseSections: [], fontSizes: {}, foldColors: new Set(),
    blueOnDark: [], nonPill: [], flatColorBtn: [], wrongAnchor: [], wrongEase: [],
    offRadius: {}, harshShadow: [], linkUnderline: [], addrNotMono: [], goldIcon: [],
    fauxWeight: [], tightTrack: [], headingNoBalance: [], orphanLine: [],
    tightLeadingH: [], tightLeadingBody: [], offFont: {},
    blackBg: [], accentStripe: [], greenAction: [], dupGradIds: [], genericIcon: [], featherIcon: [],
    bakedIcon: [], duotoneBlack: [], modalBlack: [], flatNavySection: [], glowShadow: [], fontsNotLoaded: false, noFocusRing: false,
    lowContrast: [], h1Count: 0, unconstrained: [], amountColor: [], addrStructure: [], pulseDot: [],
    noReducedMotion: false, hasInfiniteAnim: false, noViewport: false, clippedText: [], distortedImg: [], noAltImg: [],
  };

  for (const el of document.querySelectorAll('body *')) {
    if (matchAny(el, 'svg') || matchAny(el, 'script,style')) continue;   // skip decorative SVG fields + non-rendered
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const txt = directText(el);
    const inCode = matchAny(el, 'code,pre,kbd');
    const r = el.getBoundingClientRect();
    const fg = toRGB(cs.color);
    const isBtn = el.matches('button,[role="button"],.nq-button,[class*="btn" i],[class*="pill" i]');

    if (txt && !inCode && /[—–]/.test(txt)) o.dashes.push(txt.slice(0, 70));

    const isTitle = /^h[1-4]$/.test(tag) || el.matches('button,.nq-button,[class*="title" i],[class*="heading" i],[class*="headline" i]');
    // a display title / CTA ends clean; exempt full sentences (comma/colon/semicolon = descriptive
    // lead marked as a heading, which nimiq.com/about does and ends with a period legitimately).
    if (isTitle && txt && /[a-z0-9)]\.$/i.test(txt) && !/\.\.\.$/.test(txt) && !/\.[a-z]?\.$/i.test(txt) && !/[,:;]/.test(txt)) o.titlePeriods.push(`<${tag}> ${txt.slice(0, 60)}`);

    // HEADLINE TYPOGRAPHY — faux-black weight, tight negative tracking, orphaned wraps.
    // Calibrated to nimiq.com: every heading renders at weight 600/700, letter-spacing 0,
    // and text-wrap:balance. So weight ≥800, any meaningful negative tracking, or a multi-line
    // heading that DIDN'T opt into balance/pretty is off-brand. Buttons excluded (legit bold).
    const isHeadingEl = /^h[1-4]$/.test(tag) || el.matches('[class*="title" i],[class*="heading" i],[class*="headline" i]');
    if (isHeadingEl && txt) {
      const fs = px(cs.fontSize);
      if (fs >= 24 && +cs.fontWeight >= 800) o.fauxWeight.push(`<${tag}> weight ${cs.fontWeight} @ ${fs}px "${txt.slice(0, 28)}"`);
      if (fs >= 24 && cs.lineHeight !== 'normal') { const lhR = px(cs.lineHeight) / fs; if (lhR <= 1.05 || lhR >= 1.5) o.tightLeadingH.push(`<${tag}> line-height ${lhR.toFixed(2)} @ ${fs}px "${txt.slice(0, 22)}"`); }
      if (fs >= 24 && cs.textTransform !== 'uppercase') {
        const lsRaw = parseFloat(cs.letterSpacing);
        if (!Number.isNaN(lsRaw) && lsRaw / fs <= -0.01) o.tightTrack.push(`<${tag}> ${(lsRaw / fs).toFixed(3)}em @ ${fs}px "${txt.slice(0, 24)}"`);
      }
      if (fs >= 20) {
        const tw = cs.textWrap || cs.textWrapStyle || cs.textWrapMode || '';
        const lc = lineInfo(el)[0];
        if (!/balance|pretty/.test(tw) && lc >= 2) o.headingNoBalance.push(`<${tag}> ${lc} lines, no text-wrap:balance "${txt.slice(0, 24)}"`);
      }
    }

    // ORPHAN — any prominent text block (≥20px) that wraps and strands a single word on its last
    // line. nimiq.com has ZERO of these (headings use text-wrap:balance; nothing orphans), so this
    // is calibrated to 0 on the reference. Leaf elements only = measure the real text-painter.
    if (txt && el.children.length === 0 && !inCode && px(cs.fontSize) >= 20) {
      const [lc, lw] = lineInfo(el);
      if (lc >= 2 && lw === 1) o.orphanLine.push(`<${tag}> ${lc} lines, last word alone "${txt.slice(0, 38)}"`);
    }

    // glassmorphism = a TRANSLUCENT surface with a backdrop blur (the frosted-glass card).
    if (cs.backdropFilter && cs.backdropFilter !== 'none' && /blur\(/.test(cs.backdropFilter)) {
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/); const a = m ? (parseFloat(m[1].split(',')[3]) ?? 1) : 1;
      if (a >= 0.1 && a <= 0.85 && r.width * r.height > 4000) o.glass.push(`<${tag}> backdrop-blur over ${Math.round(a * 100)}% bg`);
    }
    if (['input', 'textarea', 'select'].includes(tag) && cs.borderStyle !== 'none' && px(cs.borderTopWidth) > 0) o.inputBorders.push(`<${tag}> border ${cs.borderTopWidth}`);

    // uppercase — recalibrated: short GREY section eyebrows (THE APPS / TRUSTED BY) are fine.
    // Flag only LONG caps (a whole heading shouted), COLORED caps (saturated brand color), or pill caps.
    // NIM addresses + short alphanumeric codes (NQ42, L51C) are uppercase by nature, not eyebrows
    const addrLike = /^NQ[0-9A-Z]/.test(txt) || /([0-9A-Z]{4}\s){2,}/.test(txt) || (/^[0-9A-Z]{2,6}$/.test(txt) && /\d/.test(txt));
    if (cs.textTransform === 'uppercase' && txt && !addrLike && !el.matches('.nq-button,.nq-button-s,button')) {
      const colored = fg && !gray(fg);
      const pill = px(cs.borderRadius) >= 100 && toRGBA(cs.backgroundColor)?.[3] > 0.2;
      if (txt.length > 24 || colored || pill) o.uppercase.push(`<${tag}> ${txt.slice(0, 40)}${colored ? ' [colored]' : pill ? ' [pill]' : ' [long]'}`);
    }

    const checkColor = (c) => { const rgb = toRGB(c); if (!rgb || gray(rgb)) return; const b = nearest(rgb, ANCHORS); if (b.d <= 55) return; const key = `rgb(${rgb.join(',')})`; (o.offPalette[key] ??= { n: 0, near: b.name, d: b.d, rgb }).n++; };
    if (txt && !inCode) checkColor(cs.color);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') checkColor(cs.backgroundColor);

    // BLUE ON DARK (ERROR): blue-family TEXT on a navy/dark surface below the AA contrast floor.
    // #0CA6FE (the on-dark variant) passes 5.68 and is NOT flagged; raw #0582CA/#265DD7 fail.
    if (txt && !inCode && fg && isBlueFamily(fg)) {
      const bg = effBg(el);
      if (relLum(bg) < 0.12) {
        const fs = px(cs.fontSize), bold = +cs.fontWeight >= 600;
        const large = fs >= 24 || (fs >= 19 && bold);
        const ratio = contrast(fg, bg);
        if (ratio < (large ? 3.0 : 4.5)) o.blueOnDark.push({ tag, fg: `rgb(${fg.join(',')})`, bg: `rgb(${bg.join(',')})`, ratio, snippet: txt.slice(0, 40) });
      }
    }

    // GENERAL TEXT CONTRAST (WARNING, WCAG AA) — only where the background is actually determinable
    // (effBgF.found), skipping ratio<1.6 = an undetectable layered-hero bg, not a real defect.
    // NOTE: nimiq.com itself ships sub-AA secondary grey (≈2.37:1), so this WARNS, never gates.
    if (txt && !inCode && fg && el.children.length === 0 && (toRGBA(cs.color)?.[3] ?? 1) > 0.3) {
      const cb = effBgF(el);
      if (cb.found) {
        const fsc = px(cs.fontSize), large = fsc >= 24 || (fsc >= 18.66 && +cs.fontWeight >= 700);
        const ratio = contrast(fg, cb.rgb);
        if (ratio >= 1.6 && ratio < (large ? 3.0 : 4.5)) o.lowContrast.push({ ratio, fg: `rgb(${fg.join(',')})`, bg: `rgb(${cb.rgb.map((x) => Math.round(x)).join(',')})`, fs: fsc, snippet: txt.slice(0, 26) });
      }
    }

    // NIM amount / %-change semantic color (WARNING): incoming +N green; outgoing −N NIM navy;
    // %-change green up / red down (skill Addresses). Only fires on wallet/POS surfaces.
    if (txt && !inCode && fg) {
      const m = txt.trim().match(/^([+\-−])\s?[\d][\d.,  ]*\s?(NIM|%)$/i);
      if (m) {
        const up = m[1] === '+', pct = /%$/.test(txt.trim());
        const greenish = dist(fg, ANCHORS.green) < 60 || (hue(fg) >= 140 && hue(fg) <= 178 && sat(fg) > 0.2);
        const reddish = dist(fg, ANCHORS.red) < 70 || (hue(fg) <= 18 && sat(fg) > 0.35);
        const navyish = gray(fg) || dist(fg, ANCHORS.navy) < 70;
        const ok = up ? greenish : (pct ? reddish : (navyish || reddish));
        if (!ok) o.amountColor.push(`"${txt.slice(0, 18)}" ${up ? 'increase not green' : pct ? 'decrease not red' : 'outgoing not navy/red'}`);
      }
    }

    // live address structure (WARNING): a display NIM address (≥20px) must be uppercase + chunked
    // into the 3×3 grid, not one flat lowercased string (skill Addresses).
    if (txt && /^NQ[0-9A-Z]{2}(\s?[0-9A-Z]{4}){8}$/i.test(txt.replace(/\s+/g, ' ').trim()) && px(cs.fontSize) >= 20) {
      if (txt !== txt.toUpperCase()) o.addrStructure.push(`address not uppercase "${txt.slice(0, 22)}…"`);
      else if (el.children.length === 0) o.addrStructure.push('address as one flat string (use the 3×3 grid)');
    }

    // any infinite animation on the page → feeds the reduced-motion check at the end of the probe
    if (cs.animationName && cs.animationName !== 'none' && /(^|,)\s*infinite\s*(,|$)/.test(cs.animationIterationCount)) o.hasInfiniteAnim = true;
    // clipped / truncated text — ellipsis (or overflow:hidden + nowrap) cutting text off, no title fallback
    if (txt && el.children.length === 0) {
      const ell = cs.textOverflow === 'ellipsis' || (cs.overflowX !== 'visible' && cs.whiteSpace === 'nowrap');
      if (ell && el.scrollWidth > el.clientWidth + 2 && !el.title) o.clippedText.push(`<${tag}> "${txt.slice(0, 24)}" cut off (no title)`);
    }
    // pulsing "live" dot (slop): a small round element on an infinite animation that isn't a spinner.
    if (cs.animationName && cs.animationName !== 'none' && /(^|,)\s*infinite\s*(,|$)/.test(cs.animationIterationCount) && r.width <= 28 && r.height <= 28) {
      const round = cs.borderRadius.includes('50%') || px(cs.borderRadius) >= Math.min(r.width, r.height) / 2 - 1;
      if (round && !matchAny(el, '[class*="spin" i],[class*="load" i],[class*="progress" i],[class*="skeleton" i]')) o.pulseDot.push(`<${tag}> infinite pulse on a ${Math.round(r.width)}×${Math.round(r.height)} dot`);
    }

    // BUTTON shape + fill + gradient anchor
    if (isBtn && txt && r.width >= 80 && r.height >= 26 && !el.matches('.nq-button-s')) {
      const rad = px(cs.borderRadius);
      // nav/header text triggers aren't pills; only flag standalone action buttons
      if (rad < Math.min(r.height / 2 - 3, 24) && rad < 500 && !matchAny(el, 'nav,header')) o.nonPill.push(`<${tag}> r=${rad}px "${txt.slice(0, 24)}"`);
      const bgRgb = toRGB(cs.backgroundColor); const bgA = toRGBA(cs.backgroundColor)?.[3] ?? 0;
      const brandFill = bgRgb && bgA > 0.5 && !gray(bgRgb) && nearest(bgRgb, ANCHORS).d < 60 && relLum(bgRgb) < 0.7 && nearest(bgRgb, ANCHORS).name !== 'white';
      if (brandFill && cs.backgroundImage === 'none') o.flatColorBtn.push(`<${tag}> flat ${cs.backgroundColor} "${txt.slice(0, 20)}"`);
      // green = success ONLY (rule 5): an action/retry button must not be green-filled
      if (/\b(retry|try again|reload|continue|next|get started|submit|sign ?up|learn more)\b/i.test(txt) && !/\b(success|done|paid|complete|confirm)\b/i.test(txt)) {
        const grads = (cs.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || []).map(toRGB).filter(Boolean);
        const fill = (bgA > 0.5 ? bgRgb : null) || grads[0];
        if (fill && (dist(fill, ANCHORS.green) < 55 || dist(fill, ANCHORS.greenGrad) < 55)) o.greenAction.push(`<${tag}> green "${txt.slice(0, 22)}"`);
      }
      if (/gradient/.test(cs.backgroundImage)) {
        if (/linear-gradient/.test(cs.backgroundImage)) o.wrongAnchor.push(`<${tag}> linear-gradient (use radial)`);
        else if (!/(bottom right|100% 100%|100%100%|at 100%)/.test(cs.backgroundImage)) o.wrongAnchor.push(`<${tag}> radial not bottom-right`);
      }
    }
    // wrong ease — the Material/Tailwind default leaking onto an interactive transition
    if (isBtn && px(cs.transitionDuration) >= 0 && parseFloat(cs.transitionDuration) > 0) {
      if (/cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/.test(cs.transitionTimingFunction)) o.wrongEase.push(`<${tag}> material ease (use cubic-bezier(.25,0,0,1))`);
    }

    // radius off-scale (only on real surfaces: has bg, shadow, or border)
    const hasSurface = (toRGBA(cs.backgroundColor)?.[3] > 0.05) || cs.boxShadow !== 'none' || cs.borderStyle !== 'none' && px(cs.borderTopWidth) > 0;
    if (hasSurface && cs.borderTopLeftRadius && !cs.borderTopLeftRadius.includes('%')) {
      const rad = px(cs.borderTopLeftRadius);
      const pill = rad >= 500 || rad >= r.height / 2 - 2;
      if (rad > 0 && !pill && !RADIUS_SCALE.some((s) => Math.abs(rad - s) <= 1)) o.offRadius[rad] = (o.offRadius[rad] || 0) + 1;
    }
    // harsh near-black shadow (Nimiq shadows are soft, low-alpha, navy-tinted)
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      const m = cs.boxShadow.match(/rgba\(0,\s*0,\s*0,\s*([0-9.]+)\)/);
      if (m && parseFloat(m[1]) > 0.22) o.harshShadow.push(`<${tag}> rgba(0,0,0,${m[1]})`);
    }
    // colored "glow" shadow (slop): Nimiq elevation is navy/black low-alpha, never a saturated glow.
    // The luminance gate (>0.15) excludes the brand's dark navy shadow (lum ≈ 0.02) so only a bright
    // gold/green/blue glow trips it.
    for (const shadowProp of [cs.boxShadow, /drop-shadow/.test(cs.filter) ? cs.filter : '']) {
      if (!shadowProp || shadowProp === 'none') continue;
      for (const c of shadowProp.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || []) {
        const rgb = toRGB(c); if (rgb && !gray(rgb) && sat(rgb) > 0.4 && relLum(rgb) > 0.15 && nearest(rgb, ANCHORS).d < 80) { o.glowShadow.push(`<${tag}> ${c} glow`); break; }
      }
    }
    // modal/overlay scrim must be navy, not black (rule 11): a full-viewport fixed translucent layer
    // whose base is near-neutral black (r≈g≈b, all low) — navy (b≫r) is excluded.
    if (cs.position === 'fixed') { const a = toRGBA(cs.backgroundColor); if (a && a[3] > 0.1 && a[3] < 0.95 && r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && Math.max(a[0], a[1], a[2]) <= 40 && Math.abs(a[0] - a[2]) < 12) o.modalBlack.push(`<${tag}> overlay rgba(${a.slice(0, 3).map((x) => Math.round(x)).join(',')},${a[3].toFixed(2)})`); }
    // pure-black surface (rule 6): Nimiq dark is navy #1F2348 / #171D2E, never #000 / near-black
    if (!inCode) { const bgA2 = toRGBA(cs.backgroundColor); if (bgA2 && bgA2[3] >= 0.5 && r.width * r.height > 4000 && Math.max(bgA2[0], bgA2[1], bgA2[2]) <= 12) o.blackBg.push(`<${tag}> rgb(${bgA2.slice(0, 3).map((x) => Math.round(x)).join(',')})`); }
    // one-sided vertical accent stripe on a card (rule 19): left/right edge ≥3px colored, opposite 0
    if (r.width * r.height > 5000 && (toRGBA(cs.backgroundColor)?.[3] > 0.05 || cs.boxShadow !== 'none')) {
      for (const [side, opp] of [['Left', 'Right'], ['Right', 'Left']]) {
        if (px(cs[`border${side}Width`]) >= 3 && px(cs[`border${opp}Width`]) === 0) {
          const bc = toRGB(cs[`border${side}Color`]); if (bc && !gray(bc) && nearest(bc, ANCHORS).d < 90) { o.accentStripe.push(`<${tag}> border-${side.toLowerCase()} ${px(cs[`border${side}Width`])}px`); break; }
        }
      }
    }
    // link styling — underlined body anchors (Nimiq links are bold, no underline)
    if (tag === 'a' && txt && !matchAny(el, 'nav,header,footer') && cs.textDecorationLine.includes('underline')) o.linkUnderline.push(`"${txt.slice(0, 30)}"`);
    // data formatting — NIM-address-looking text not in a mono font
    if (txt && /([0-9A-Z]{4}\s){3,}[0-9A-Z]{4}/.test(txt) && !/mono|fira/i.test(cs.fontFamily)) o.addrNotMono.push(`"${txt.slice(0, 30)}…" in ${cs.fontFamily.split(',')[0]}`);

    for (const prop of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
      const v = px(cs[prop]); if (v >= 8 && v <= 400) { o.scaleN++; if (onScale(v)) o.onScaleN++; else o.offScale[v] = (o.offScale[v] || 0) + 1; }
    }
    if ((tag === 'p' || el.matches('[class*="text" i],[class*="body" i],[class*="desc" i]')) && txt.length > 60 && el.children.length === 0) {
      const fs = px(cs.fontSize) || 16; const ch = Math.round(r.width / (fs * 0.5));
      if (ch > 88) o.wideText.push({ ch, snippet: txt.slice(0, 50) });
      if (cs.lineHeight !== 'normal' && px(cs.lineHeight) / fs < 1.35) o.tightLeadingBody.push(`${(px(cs.lineHeight) / fs).toFixed(2)} @ ${fs}px "${txt.slice(0, 38)}"`);
      // unconstrained text column (rule: cap the measure) — nimiq's wide copy always sets a max-width
      if (cs.maxWidth === 'none' && r.width > 760) o.unconstrained.push({ w: Math.round(r.width), ch, snippet: txt.slice(0, 40) });
    }
    if (txt) { const fs = px(cs.fontSize); if (fs) o.fontSizes[fs] = (o.fontSizes[fs] || 0) + 1; }
    // font-family — Nimiq text is Mulish (+ Fira Mono for data). A named third-party face is off-brand.
    if (txt && !inCode) { const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase(); if (fam && !/^(mulish|muli|fira mono|fira code|fira sans|inherit)$/.test(fam)) o.offFont[fam] = (o.offFont[fam] || 0) + 1; }
    if (r.top < 1024 && r.bottom > 0 && txt && !inCode) o.foldColors.add(cs.color);
  }

  // gold-tinted UI icons (gold is brand-mark only). Look at svg/icon elements (skipped above).
  for (const el of document.querySelectorAll('svg,[class*="icon" i]')) {
    if (!visible(el)) continue;
    if (matchAny(el, '[class*="logo" i],[class*="brand" i],[class*="hex" i],[class*="pay" i],[class*="badge" i],[aria-label*="nimiq" i]')) continue;
    const cs = getComputedStyle(el);
    for (const c of [cs.color, cs.fill]) { const rgb = toRGB(c); if (rgb && dist(rgb, ANCHORS.gold) < 42) { o.goldIcon.push(`<${el.tagName.toLowerCase()}> gold-tinted icon`); break; } }
    // Lucide/Feather/Tabler fingerprint: a 24×24 viewBox where EVERY path is 2px stroke + fill:none.
    // Nimiq's own 24×24 icon (close.svg) is a FILLED path, so it can't match this composite.
    if (el.tagName.toLowerCase() === 'svg' && el.getAttribute('viewBox') === '0 0 24 24' && cs.fill === 'none') {
      const draw = [...el.querySelectorAll('path,line,polyline,polygon,circle,rect')];
      if (draw.length >= 2 && draw.every((p) => getComputedStyle(p).strokeWidth === '2px')) o.featherIcon.push('<svg> 24×24 + uniform 2px stroke + fill:none (Lucide/Feather default)');
    }
    // baked-color + black-outline duotone — Nimiq mono icons paint via `currentColor`, never a
    // literal hex (skill Icons). Icon-role = small square SVG, not an identicon/flag/chart/logo and
    // with no gradient/image def (those are meant to be multi-colored).
    if (el.tagName.toLowerCase() === 'svg') {
      const ir = el.getBoundingClientRect();
      const small = ir.width <= 130 && ir.height <= 130 && Math.abs(ir.width - ir.height) < Math.max(ir.width, ir.height, 1) * 0.5;
      const decorative = matchAny(el, '[class*="identicon" i],[class*="flag" i],[class*="qr" i],[class*="chart" i],[class*="honeycomb" i],[class*="avatar" i]') || el.querySelector('linearGradient,radialGradient,image,pattern');
      if (small && !decorative) {
        const isLit = (v) => { v = (v || '').trim().toLowerCase(); return v && v !== 'none' && v !== 'currentcolor' && v !== 'inherit' && v !== 'transparent' && !/^url\(/.test(v) && !/^(#fff|#ffffff|white|rgb\(255,\s*255,\s*255\))$/.test(v); };
        let baked = false, hasBlack = false, hasColor = false;
        for (const p of [el, ...el.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')]) {
          for (const attr of ['fill', 'stroke']) {
            const v = p.getAttribute && p.getAttribute(attr);
            if (isLit(v)) { baked = true; const rgb = toRGB(v); if (rgb) { if (Math.max(...rgb) <= 40) hasBlack = true; else if (!gray(rgb)) hasColor = true; } }
          }
        }
        if (baked) o.bakedIcon.push(`<svg ${(el.getAttribute('class') || '').slice(0, 22)}> baked fill (use currentColor)`);
        if (hasBlack && hasColor) o.duotoneBlack.push('<svg> black layer on a colored icon (duotone = same color @0.4)');
      }
    }
  }

  // generic / off-brand icon SETS (Lucide, Feather, Font Awesome, Material, Bootstrap, Tabler…).
  // Nimiq ships its own SVGs under `nq-icon`; it never emits a library class (verified 0 in registry).
  const ICON_LIB = /(^|\s)(lucide|feather|fa-(solid|regular|light|thin|brands|duotone)|fas|far|fal|fab|fad|bi-|mdi-|ph-|tabler|ti-|ion-|ionicon|remixicon|ri-|material-icons|material-symbols|octicon|glyphicon)(\b|-)/i;
  const ICON_OK = /\b(nq-icon|flag-icon|flag-icons|fi-)\b/;
  const seenGeneric = new Set();
  for (const el of document.querySelectorAll('svg,i,span,[class*="icon" i],[data-lucide],[data-feather],[data-icon]')) {
    if (!visible(el)) continue;
    const cls = `${el.getAttribute('class') || ''}`;
    const libClass = ICON_LIB.test(cls) && !ICON_OK.test(cls);
    const libData = el.hasAttribute('data-lucide') || el.hasAttribute('data-feather');
    const ligature = /material-icons|material-symbols/i.test(cls) && el.children.length === 0 && /^[a-z][a-z_]{1,}$/i.test((el.textContent || '').trim());
    if (libClass || libData || ligature) { const key = cls || el.tagName; if (!seenGeneric.has(key)) { seenGeneric.add(key); o.genericIcon.push(`<${el.tagName.toLowerCase()} class="${cls.slice(0, 28)}">`); } }
  }

  // duplicate gradient ids — only a REAL bug when defs sharing one id have DIFFERENT stops (then a
  // later SVG paints the first def's gradient). nimiq.com repeats IDENTICAL icon gradients under the
  // same id (Figma export) and renders fine, so compare stop colors+offsets, not raw id counts.
  const gradById = {};
  for (const g of document.querySelectorAll('linearGradient[id],radialGradient[id]')) {
    const sig = [...g.querySelectorAll('stop')].map((s) => `${getComputedStyle(s).stopColor || s.getAttribute('stop-color') || ''}@${s.getAttribute('offset') || ''}`).join(',');
    (gradById[g.id] ??= new Set()).add(sig);
  }
  o.dupGradIds = Object.entries(gradById).filter(([, sigs]) => sigs.size > 1).map(([id, sigs]) => `#${id} (${sigs.size} differing defs)`);

  // heading hierarchy — exactly one <h1> per page. (Level SKIPS are NOT checked: nimiq.com/about
  // jumps h1→h4 for styling, so a no-skip rule would flag the reference.)
  o.h1Count = [...document.querySelectorAll('h1')].filter((e) => visible(e)).length;

  // images — distortion (displayed ratio ≠ natural, not object-fit-preserved, not a full-bleed hero)
  // and missing alt on raster CONTENT images (SVG illustrations + alt="" decoratives are exempt).
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    const ir = img.getBoundingClientRect();
    const src = img.currentSrc || img.getAttribute('src') || '';
    if (img.naturalWidth && img.naturalHeight && ir.width < innerWidth * 0.7) {
      const of = getComputedStyle(img).objectFit;
      if (!/cover|contain|scale-down/.test(of)) {
        const skew = Math.abs((ir.width / ir.height) - (img.naturalWidth / img.naturalHeight)) / (img.naturalWidth / img.naturalHeight);
        if (skew > 0.08) o.distortedImg.push(`${src.split('/').pop().slice(0, 20)} ${Math.round(skew * 100)}% skew (${of})`);
      }
    }
    if (!img.hasAttribute('alt') && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(src)) o.noAltImg.push(`${src.split('/').pop().slice(0, 24)} ${Math.round(ir.width)}×${Math.round(ir.height)}`);
  }

  // per-section text-ink ratio (full-width bands)
  const vw = innerWidth;
  const leaves = [...document.querySelectorAll('body *')].filter((el) => !matchAny(el, 'svg') && visible(el) && el.children.length === 0 && directText(el)).map((el) => el.getBoundingClientRect());
  for (const el of document.querySelectorAll('section,main > div,body > div,[class*="section" i],[class*="band" i]')) {
    if (matchAny(el, 'svg') || !visible(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < vw * 0.7 || r.height < 220) continue;
    // flat-fill navy/colored section (rule 7): a full-width band solid-filled in a brand color with
    // NO gradient — Nimiq colored bands use the bottom-right radial. Grey/white cards are exempt.
    const scs = getComputedStyle(el); const sbg = toRGB(scs.backgroundColor); const sbgA = toRGBA(scs.backgroundColor)?.[3] ?? 0;
    if (sbgA > 0.85 && sbg && !gray(sbg) && relLum(sbg) < 0.5 && scs.backgroundImage === 'none') { const nb = nearest(sbg, ANCHORS); if (nb.d < 60 && nb.name !== 'white') o.flatNavySection.push(`<${el.tagName.toLowerCase()}> flat ${scs.backgroundColor}`); }
    let ink = 0; for (const lr of leaves) { const cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2; if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) ink += lr.width * lr.height; }
    const pct = Math.round((ink / (r.width * r.height)) * 1000) / 10;
    if (pct > 18) o.denseSections.push({ pct, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().trim().split(/\s+/)[0]?.slice(0, 24) || '', h: Math.round(r.height) });
  }
  o.foldColors = o.foldColors.size;

  // Mulish must actually load (rule 9) — a declared family that 404s falls back to a system font.
  o.fontsNotLoaded = !document.fonts.check('1em Mulish') && !document.fonts.check('1em Muli');
  // focus ring removed without a :focus-visible restore (a11y). Scan accessible stylesheets only;
  // cross-origin CDN sheets throw on .cssRules and are skipped (so we never guess).
  let killsOutline = false, restoresFocus = false;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      const sel = rule.selectorText, st = rule.style; if (!sel || !st) continue;
      if (/:focus(-visible)?\b/.test(sel) && ((st.outlineStyle && st.outlineStyle !== 'none') || parseFloat(st.outlineWidth) > 0 || (st.boxShadow && st.boxShadow !== 'none') || st.borderColor || st.border)) restoresFocus = true;
      if (/(^|[\s,])(a|button|input|select|textarea|\*|\[tabindex\]|:focus)([\s,:>[]|$)/i.test(sel) && /outline\s*:\s*(none|0)/i.test(st.cssText)) killsOutline = true;
    }
  }
  o.noFocusRing = killsOutline && !restoresFocus;

  // reduced-motion: infinite animation present but NO @media (prefers-reduced-motion) rule anywhere
  // (cross-origin sheets throw on .cssRules and are skipped). nimiq.com ships the rule → not flagged.
  let reducedMotionRule = false;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) { if (/prefers-reduced-motion/i.test(rule.cssText || '')) { reducedMotionRule = true; break; } }
    if (reducedMotionRule) break;
  }
  o.noReducedMotion = o.hasInfiniteAnim && !reducedMotionRule;
  // viewport meta — only on a full page (has a <head><title>), so component fragments aren't flagged
  o.noViewport = !!document.querySelector('head > title') && !document.querySelector('meta[name="viewport"]');
  return o;
}

// mobile probe at 390px — overflow, sub-44px tap targets, tiny text
function mobileProbe() {
  const px = (s) => Math.round(parseFloat(s) || 0);
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const overflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
  const smallTargets = []; const tiny = new Set();
  // only real controls — buttons, inputs, link-buttons. Inline text links aren't tap targets.
  for (const el of document.querySelectorAll('button,input,select,[role="button"],a[class*="btn" i],a[class*="button" i],a[class*="pill" i],a.nq-button')) {
    if (!vis(el)) continue; const r = el.getBoundingClientRect();
    const txt = el.textContent.trim();
    if (r.height < 30 || r.width < 20) smallTargets.push(`<${el.tagName.toLowerCase()}> ${Math.round(r.width)}×${Math.round(r.height)} "${txt.slice(0, 18)}"`);
  }
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const t = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (t && px(getComputedStyle(el).fontSize) < 12) tiny.add(el.tagName.toLowerCase());
  }
  return { overflowPx, smallTargets: smallTargets.slice(0, 6), smallTargetN: smallTargets.length, tinyText: tiny.size };
}

// ── conservative source --fix (text-level only; geometry fixes are render-mapped, see LINT.md) ──
function fixSource(src) {
  const fixes = [];
  const replaceText = (s, fn) => s.replace(/>([^<]+)</g, (m, text) => '>' + fn(text) + '<');
  let out = src;
  out = replaceText(out, (t) => t.replace(/\s*[—–]\s*/g, () => { fixes.push('dash→comma'); return ', '; }));
  out = out.replace(/(<h[1-4][^>]*>)([\s\S]*?[a-z0-9)])\.(\s*<\/h[1-4]>)/gi, (m, a, b, c) => { fixes.push('title-period'); return a + b + c; });
  // Inject the balance/pretty rule nimiq.com applies to EVERY heading — the mechanical cure for
  // orphaned-title line breaks. Non-destructive (only affects wrapping), and only added once.
  if (!/text-wrap\s*:\s*(balance|pretty)/i.test(out)) {
    const block = '\n<style>/* nq --fix: nimiq balances headings + prettifies body so no line strands a lone word */\nh1,h2,h3,h4{text-wrap:balance}\np,li,blockquote,figcaption{text-wrap:pretty}</style>\n';
    if (/<\/head>/i.test(out)) { out = out.replace(/<\/head>/i, block + '</head>'); fixes.push('text-wrap:balance'); }
    else if (/<body[^>]*>/i.test(out)) { out = out.replace(/(<body[^>]*>)/i, `$1${block}`); fixes.push('text-wrap:balance'); }
  }
  return { out, fixes };
}

export async function lint(target, opts = {}) {
  if (!target) throw new Error('nq lint <file.html | url> [--fix]');
  const isUrl = /^https?:\/\//.test(target);
  const filePath = isUrl ? null : resolve(target);
  if (!isUrl && !existsSync(filePath)) throw new Error(`no such file: ${target}`);
  const url = isUrl ? target : pathToFileURL(filePath).href;

  const { launchChromium } = await import('./_browser.mjs');
  const browser = await launchChromium('nq lint');
  const out = (s = '') => console.log(s);
  let errorCount = 0, warnCount = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);
    // dismiss a language-picker splash (e.g. nimiq.tech) before measuring
    try { const en = page.locator('button.flag-btn', { hasText: 'English' }).first(); if (await en.count()) { await en.click({ timeout: 3000 }); await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(1000); } } catch {}
    await page.evaluate(async () => { const s = innerHeight * 0.8; for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 350)); });
    const r = await page.evaluate(pageProbe, { SPACING_SCALE, ANCHORS, RADIUS_SCALE });
    // responsive sweep — overflow / tap-targets / tiny-text across standard breakpoints. The 1440
    // desktop pass above already covered the wide end; overflow at ANY intermediate width is the
    // "no-man's-land" bug a fixed 390+1440 check misses. nimiq.com is overflow-clean at every width.
    const SWEEP = [360, 414, 768, 1024, 1280];
    const sweep = [];
    for (const w of SWEEP) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(350);
      await page.evaluate(async () => { const s = innerHeight * 0.8; for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 120)); });
      sweep.push({ w, ...(await page.evaluate(mobileProbe)) });
    }
    const overflowAt = sweep.filter((s) => s.overflowPx > 4);
    const tapWorst = sweep.reduce((a, s) => (s.smallTargetN > a.smallTargetN ? s : a), sweep[0]);
    const tinyWorst = sweep.reduce((a, s) => (s.tinyText > a.tinyText ? s : a), sweep[0]);

    // social-icon exemption (run in Node — SOCIAL anchors aren't in the page context)
    const socialName = (rgb) => { let best = Infinity, name = null; for (const [k, v] of Object.entries(SOCIAL)) { const d = Math.hypot(rgb[0] - v[0], rgb[1] - v[1], rgb[2] - v[2]); if (d < best) { best = d; name = k; } } return best <= SOCIAL_DELTA ? name : null; };
    for (const v of Object.values(r.offPalette)) v.social = socialName(v.rgb);

    const offPal = Object.entries(r.offPalette).filter(([, v]) => !v.social);
    const exemptSocial = Object.entries(r.offPalette).filter(([, v]) => v.social);
    const errs = [
      ['em/en dashes in copy', r.dashes.length, r.dashes[0], '--fix'],
      ['periods on titles / CTAs', r.titlePeriods.length, r.titlePeriods[0], '--fix'],
      ['glassmorphism', r.glass.length, r.glass[0], 'manual'],
      ['borders on inputs', r.inputBorders.length, r.inputBorders[0], 'inset box-shadow'],
      ['off-palette colors', offPal.length, offPal[0] && `${offPal[0][0]} (≈${offPal[0][1].near}, Δ${offPal[0][1].d})`, 'manual'],
      ['low-contrast blue/navy text on dark', r.blueOnDark.length, r.blueOnDark[0] && `${r.blueOnDark[0].fg} on ${r.blueOnDark[0].bg} = ${r.blueOnDark[0].ratio}:1 "${r.blueOnDark[0].snippet}"`, 'white / #0CA6FE'],
      ['generic icon set (Lucide / FA / Material…)', r.genericIcon.length, r.genericIcon[0], 'use nq-icon SVGs'],
      ['duplicate gradient id (SVGs misrender)', r.dupGradIds.length, r.dupGradIds[0], 'unique ids'],
      ['pure-black surface (rule 6)', r.blackBg.length, r.blackBg[0], 'navy #1F2348'],
      ['one-sided accent stripe (rule 19)', r.accentStripe.length, r.accentStripe[0], 'uniform border'],
    ];
    errorCount = errs.reduce((n, e) => n + e[1], 0);

    const scalePct = r.scaleN ? Math.round((r.onScaleN / r.scaleN) * 1000) / 10 : 100;
    const topOff = Object.entries(r.offScale).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topRad = Object.entries(r.offRadius).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sizes = Object.keys(r.fontSizes).map(Number).sort((a, b) => a - b);
    const offFont = Object.entries(r.offFont).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
    const warns = [
      ['body text wider than ~88ch', r.wideText.length, r.wideText.length && `worst ${Math.max(...r.wideText.map((w) => w.ch))}ch`],
      ['dense sections (>18% text ink)', r.denseSections.length, r.denseSections.slice(0, 4).map((d) => `${d.pct}% <${d.tag}.${d.cls}>`).join('  ')],
      ['off-scale spacing (snap to scale)', topOff.length, `${scalePct}% on-scale · ${topOff.map(([v, n]) => `${v}px×${n}`).join(' ')}`],
      ['type-scale sprawl', sizes.length > FONT_SPRAWL_WARN ? sizes.length : 0, `${sizes.length} sizes [${sizes.join(',')}]`],
      ['faux-black headline weight (≥800; nimiq ≤700)', r.fauxWeight.length, r.fauxWeight[0]],
      ['tight negative heading tracking (nimiq = 0)', r.tightTrack.length, r.tightTrack[0]],
      ['wrapping heading w/o text-wrap: balance', r.headingNoBalance.length, r.headingNoBalance[0]],
      ['orphaned last word (1-word final line)', r.orphanLine.length, r.orphanLine[0]],
      ['heading line-height off (nimiq 1.25–1.3)', r.tightLeadingH.length, r.tightLeadingH[0]],
      ['cramped body line-height (<1.35; nimiq 1.5)', r.tightLeadingBody.length, r.tightLeadingBody[0]],
      ['non-brand font on text (Mulish / Fira only)', offFont.length, offFont.map(([f, n]) => `${f}×${n}`).join(' ')],
      ['text contrast below WCAG AA', r.lowContrast.length, r.lowContrast.length && `worst ${Math.min(...r.lowContrast.map((c) => c.ratio))}:1 — ${r.lowContrast[0].fg} on ${r.lowContrast[0].bg} @ ${r.lowContrast[0].fs}px`],
      ['multiple <h1> on the page', r.h1Count > 1 ? r.h1Count : 0, r.h1Count > 1 ? `${r.h1Count} h1 elements` : ''],
      ['unconstrained text column (set max-width)', r.unconstrained.length, r.unconstrained[0] && `${r.unconstrained[0].w}px (${r.unconstrained[0].ch}ch)`],
      ['NIM amount wrong semantic color', r.amountColor.length, r.amountColor[0]],
      ['address not uppercase / flat (use 3×3 grid)', r.addrStructure.length, r.addrStructure[0]],
      ['pulsing "live" dot animation', r.pulseDot.length, r.pulseDot[0]],
      ['uppercase eyebrow (colored / long / pill)', r.uppercase.length, r.uppercase[0]],
      ['non-pill action buttons', r.nonPill.length, r.nonPill[0]],
      ['flat-fill colored button (needs gradient)', r.flatColorBtn.length, r.flatColorBtn[0]],
      ['wrong gradient anchor (not bottom-right)', r.wrongAnchor.length, r.wrongAnchor[0]],
      ['non-Nimiq easing on buttons', r.wrongEase.length, r.wrongEase[0]],
      ['off-scale border-radius', topRad.length, topRad.map(([v, n]) => `${v}px×${n}`).join(' ')],
      ['harsh near-black shadow', r.harshShadow.length, r.harshShadow[0]],
      ['underlined links (use bold, no underline)', r.linkUnderline.length, r.linkUnderline[0]],
      ['NIM address not in Fira Mono', r.addrNotMono.length, r.addrNotMono[0]],
      ['gold-tinted UI icon (gold = logo only)', r.goldIcon.length, r.goldIcon[0]],
      ['feather/lucide-style stroke icon (inlined)', r.featherIcon.length, r.featherIcon[0]],
      ['baked-color icon (use currentColor)', r.bakedIcon.length, r.bakedIcon[0]],
      ['black-outline duotone icon', r.duotoneBlack.length, r.duotoneBlack[0]],
      ['green action / retry button (green = success)', r.greenAction.length, r.greenAction[0]],
      ['colored glow shadow (navy elevation only)', r.glowShadow.length, r.glowShadow[0]],
      ['black modal overlay (use navy rgba)', r.modalBlack.length, r.modalBlack[0]],
      ['flat-fill navy/colored section (use radial)', r.flatNavySection.length, r.flatNavySection[0]],
      ['focus outline removed w/o :focus-visible', r.noFocusRing ? 1 : 0, r.noFocusRing ? 'add a :focus-visible ring' : ''],
      ['Mulish not loaded (system-font fallback)', r.fontsNotLoaded ? 1 : 0, r.fontsNotLoaded ? 'load Mulish' : ''],
      ['horizontal overflow at a breakpoint', overflowAt.length, overflowAt.map((s) => `${s.w}px:${s.overflowPx}px`).join(' ')],
      ['tap targets < 36px (any breakpoint)', tapWorst.smallTargetN, tapWorst.smallTargetN ? `@${tapWorst.w}px ${tapWorst.smallTargets[0] || ''}` : ''],
      ['text smaller than 12px (any breakpoint)', tinyWorst.tinyText, tinyWorst.tinyText ? `@${tinyWorst.w}px, ${tinyWorst.tinyText} type(s)` : ''],
      ['no prefers-reduced-motion (infinite anim)', r.noReducedMotion ? 1 : 0, r.noReducedMotion ? 'add @media (prefers-reduced-motion: reduce)' : ''],
      ['missing viewport meta tag', r.noViewport ? 1 : 0, r.noViewport ? 'add <meta name="viewport" content="width=device-width…">' : ''],
      ['clipped / truncated text (no title)', r.clippedText.length, r.clippedText[0]],
      ['distorted image (wrong aspect ratio)', r.distortedImg.length, r.distortedImg[0]],
      ['content image missing alt (raster)', r.noAltImg.length, r.noAltImg[0]],
    ];
    warnCount = warns.reduce((n, w) => n + (w[1] ? 1 : 0), 0);

    if (opts.json) { out(JSON.stringify({ url, errorCount, warnCount, raw: r, responsive: sweep, exemptSocial: exemptSocial.map(([c, v]) => ({ color: c, icon: v.social })) }, null, 2)); return { errorCount, warnCount }; }

    out(`\n══════ nq lint — ${target} ══════\n`);
    out('ERRORS  (off-brand / a11y — must fix to pass)');
    for (const [label, n, eg, how] of errs) out(`  ${n ? '✗' : '✓'} ${label.padEnd(34)} ${n}` + (n && eg ? `   e.g. ${eg}` : '') + (n ? `   [${how}]` : ''));
    if (exemptSocial.length) out(`  · ${'exempt social-icon colors'.padEnd(34)} ${exemptSocial.length}   (${exemptSocial.map(([, v]) => v.social).join(', ')})`);
    out('\nWARNINGS  (breathability · depth/motion · mobile — advisory, calibrated to nimiq.com)');
    for (const [label, n, detail] of warns) out(`  ${n ? '!' : '·'} ${label.padEnd(42)} ${n ? detail : 'ok'}`);
    out(`  · ${'distinct text colors above fold'.padEnd(42)} ${r.foldColors}`);

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
