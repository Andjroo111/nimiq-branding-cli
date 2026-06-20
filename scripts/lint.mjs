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
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const directText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const matchAny = (el, sel) => { try { return el.closest(sel); } catch { return null; } };

  const o = {
    dashes: [], titlePeriods: [], glass: [], inputBorders: [], uppercase: [], offPalette: {},
    wideText: [], offScale: {}, onScaleN: 0, scaleN: 0, denseSections: [], fontSizes: {}, foldColors: new Set(),
    blueOnDark: [], nonPill: [], flatColorBtn: [], wrongAnchor: [], wrongEase: [],
    offRadius: {}, harshShadow: [], linkUnderline: [], addrNotMono: [], goldIcon: [],
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
    if (isTitle && txt && /[a-z0-9)]\.$/i.test(txt) && !/\.\.\.$/.test(txt) && !/\.[a-z]?\.$/i.test(txt)) o.titlePeriods.push(`<${tag}> ${txt.slice(0, 60)}`);

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

    // BUTTON shape + fill + gradient anchor
    if (isBtn && txt && r.width >= 80 && r.height >= 26 && !el.matches('.nq-button-s')) {
      const rad = px(cs.borderRadius);
      // nav/header text triggers aren't pills; only flag standalone action buttons
      if (rad < Math.min(r.height / 2 - 3, 24) && rad < 500 && !matchAny(el, 'nav,header')) o.nonPill.push(`<${tag}> r=${rad}px "${txt.slice(0, 24)}"`);
      const bgRgb = toRGB(cs.backgroundColor); const bgA = toRGBA(cs.backgroundColor)?.[3] ?? 0;
      const brandFill = bgRgb && bgA > 0.5 && !gray(bgRgb) && nearest(bgRgb, ANCHORS).d < 60 && relLum(bgRgb) < 0.7 && nearest(bgRgb, ANCHORS).name !== 'white';
      if (brandFill && cs.backgroundImage === 'none') o.flatColorBtn.push(`<${tag}> flat ${cs.backgroundColor} "${txt.slice(0, 20)}"`);
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
    }
    if (txt) { const fs = px(cs.fontSize); if (fs) o.fontSizes[fs] = (o.fontSizes[fs] || 0) + 1; }
    if (r.top < 1024 && r.bottom > 0 && txt && !inCode) o.foldColors.add(cs.color);
  }

  // gold-tinted UI icons (gold is brand-mark only). Look at svg/icon elements (skipped above).
  for (const el of document.querySelectorAll('svg,[class*="icon" i]')) {
    if (!visible(el)) continue;
    if (matchAny(el, '[class*="logo" i],[class*="brand" i],[class*="hex" i],[class*="pay" i],[class*="badge" i],[aria-label*="nimiq" i]')) continue;
    const cs = getComputedStyle(el);
    for (const c of [cs.color, cs.fill]) { const rgb = toRGB(c); if (rgb && dist(rgb, ANCHORS.gold) < 42) { o.goldIcon.push(`<${el.tagName.toLowerCase()}> gold-tinted icon`); break; } }
  }

  // per-section text-ink ratio (full-width bands)
  const vw = innerWidth;
  const leaves = [...document.querySelectorAll('body *')].filter((el) => !matchAny(el, 'svg') && visible(el) && el.children.length === 0 && directText(el)).map((el) => el.getBoundingClientRect());
  for (const el of document.querySelectorAll('section,main > div,body > div,[class*="section" i],[class*="band" i]')) {
    if (matchAny(el, 'svg') || !visible(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < vw * 0.7 || r.height < 220) continue;
    let ink = 0; for (const lr of leaves) { const cx = lr.left + lr.width / 2, cy = lr.top + lr.height / 2; if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) ink += lr.width * lr.height; }
    const pct = Math.round((ink / (r.width * r.height)) * 1000) / 10;
    if (pct > 18) o.denseSections.push({ pct, tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().trim().split(/\s+/)[0]?.slice(0, 24) || '', h: Math.round(r.height) });
  }
  o.foldColors = o.foldColors.size;
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
    // second pass at mobile width (no reload — resize + re-measure)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const mob = await page.evaluate(mobileProbe);

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
    ];
    errorCount = errs.reduce((n, e) => n + e[1], 0);

    const scalePct = r.scaleN ? Math.round((r.onScaleN / r.scaleN) * 1000) / 10 : 100;
    const topOff = Object.entries(r.offScale).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topRad = Object.entries(r.offRadius).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sizes = Object.keys(r.fontSizes).map(Number).sort((a, b) => a - b);
    const warns = [
      ['body text wider than ~88ch', r.wideText.length, r.wideText.length && `worst ${Math.max(...r.wideText.map((w) => w.ch))}ch`],
      ['dense sections (>18% text ink)', r.denseSections.length, r.denseSections.slice(0, 4).map((d) => `${d.pct}% <${d.tag}.${d.cls}>`).join('  ')],
      ['off-scale spacing (snap to scale)', topOff.length, `${scalePct}% on-scale · ${topOff.map(([v, n]) => `${v}px×${n}`).join(' ')}`],
      ['type-scale sprawl', sizes.length > FONT_SPRAWL_WARN ? sizes.length : 0, `${sizes.length} sizes [${sizes.join(',')}]`],
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
      ['mobile horizontal overflow @390px', mob.overflowPx > 4 ? 1 : 0, `${mob.overflowPx}px`],
      ['mobile tap targets < 36px', mob.smallTargetN, mob.smallTargets[0]],
      ['text smaller than 12px @390px', mob.tinyText, `${mob.tinyText} element type(s)`],
    ];
    warnCount = warns.reduce((n, w) => n + (w[1] ? 1 : 0), 0);

    if (opts.json) { out(JSON.stringify({ url, errorCount, warnCount, raw: r, mobile: mob, exemptSocial: exemptSocial.map(([c, v]) => ({ color: c, icon: v.social })) }, null, 2)); return { errorCount, warnCount }; }

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
