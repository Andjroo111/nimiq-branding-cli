// bottom-nav — hydration for the fleet's bottom bar.
//
// Extracted from Hashmark's app/src/client/ui/bottom-nav.ts (2026-08-12).
//
// THIS MODULE NEVER BUILDS A TAB. The tabs are real markup in the host page,
// which is the property everything else here depends on: the bar paints on the
// first frame AND the elements exist before any module runs, so per-tab modules
// (a notification bell, an overflow menu) can attach to their own tab with no
// boot-order coupling. Nobody has to mount before anybody else and nobody
// clears a slot another module filled. A component that built its own DOM at
// mount would destroy that, so this one only hydrates.
//
// The ONE thing it does create is the icicle seam, and only because every mark
// in it is aria-hidden decoration: a reader with JS off loses a border and
// keeps the whole bar. Nothing that carries meaning belongs there.

/** The drip curve, verbatim from nimiq.cool's brand-chrome seam.
 *
 *  ONE definition: the stroke below and the CSS mask in bottom-nav.css are both
 *  generated from this, so the two cannot drift. The seam it comes from had to
 *  say "if this ever changes the mask has to change with it", because the mask
 *  was a second hand-encoded copy in the stylesheet. Here the module writes the
 *  mask, so there is nothing to keep in step.
 *
 *  The drips hang DOWN, unturned, even though the bar is at the bottom of the
 *  screen. Turning them up was tried and reads as bumps, not ice: a drip is
 *  wide at the root and tapers, so upside down it is a blob. Hanging them into
 *  the seam band costs nothing, because the band sits ABOVE the tabs by
 *  construction (`padding-top: var(--bnav-seam-h)`) and the deepest tongue
 *  stops short of them. */
const SEAM_PATH =
  'M0 21 H10 C 21 21, 16 72, 27 72 C 39 72, 34 21, 45 21 H 76 C 86 21, 85 44, 94 44 ' +
  'C 103 44, 102 21, 111 21 H 121 C 134 21, 126 90, 139 90 C 153 90, 146 21, 158 21 ' +
  'H 170 C 179 21, 178 63, 187 63 C 197 63, 195 21, 205 21 H 211 C 222 21, 217 79, 228 79 ' +
  'C 240 79, 235 21, 246 21 H 279 C 288 21, 287 38, 295 38 C 304 38, 302 21, 311 21 ' +
  'H 318 C 331 21, 323 95, 337 95 C 352 95, 344 21, 356 21 H 372 C 382 21, 380 57, 390 57 ' +
  'C 400 57, 398 21, 408 21 H 414 C 426 21, 420 84, 432 84 C 445 84, 439 21, 451 21 H 480';

/** Re-tuned against WHITE, not copied from the hero seam. The hero's cyan pair
 *  is bright on a deep violet radial and near-invisible on a white bar; these
 *  three are the Nimiq anchors that survive a white backdrop. Each stop walks
 *  the same three-colour ring, offset by one, so the light travels along the
 *  drip instead of the whole line pulsing at once. */
const SEAM_STOPS = [
  ['0%', '#0582CA', '#0582CA;#265DD7;#5F4B8B;#0582CA'],
  ['50%', '#265DD7', '#265DD7;#5F4B8B;#0582CA;#265DD7'],
  ['100%', '#5F4B8B', '#5F4B8B;#0582CA;#265DD7;#5F4B8B'],
];

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

let seamCount = 0;

const tabsOf = (nav) => Array.from(nav.querySelectorAll('.bnav-tab'));

/** Path of a route as this module compares them: no trailing slash, no query,
 *  no fragment. `/` and `/explorer/` become '' and '/explorer'. */
function normalizePath(p) {
  return p.replace(/index\.html$/, '').replace(/\/+$/, '');
}

/**
 * Which tab a location lights, by EXACT match against each tab's own href.
 *
 * Exact, never prefix: `/` is a prefix of every path, so prefix matching lights
 * Home everywhere. An unlisted route lights NOTHING, which is honest -- you are
 * not "in" a tab there, and a false highlight is worse than none.
 *
 * Exact is also why an app with sub-routes under a tab (a per-category feed,
 * a detail page that should keep its section lit) passes its own `resolve`.
 * That is a routing question and routing is the consumer's.
 *
 * The bar is hash-routed or path-routed, never both, and its own tabs decide
 * which. See below for why reading the location instead got it wrong.
 */
export function defaultResolve(nav, loc = location) {
  // A tab with no href is a <button> that opens a panel. Not a route, so it can
  // never be the answer here.
  const tabs = tabsOf(nav).filter((el) => el.getAttribute('href'));

  // ONE ROUTING MODE PER BAR, decided by the tabs rather than by the location.
  // A hash-routed app's PATH never changes, so comparing paths there matches
  // every tab that has one, at every route: mixing the two comparisons lit the
  // wrong tab the moment a hash tab and a path tab shared a bar. A bar that
  // genuinely mixes both is a routing question, so it passes its own resolve.
  if (tabs.some((el) => el.getAttribute('href').startsWith('#'))) {
    const hash = loc.hash || '#/';
    for (const el of tabs) {
      const href = el.getAttribute('href');
      if (!href.startsWith('#')) continue;
      if ((href === '#' ? '#/' : href) === hash) return el.dataset.tab ?? null;
    }
    return null;
  }

  const here = normalizePath(loc.pathname);
  for (const el of tabs) {
    let path;
    try { path = normalizePath(new URL(el.getAttribute('href'), loc.href).pathname); } catch { continue; }
    if (path === here) return el.dataset.tab ?? null;
  }
  return null;
}

/**
 * Paint `aria-current` on the tab matching the current route.
 *
 * A tab carrying `aria-expanded` is SKIPPED, always. Those tabs open a panel
 * over the page rather than navigating, so the route underneath them is still
 * the current one and they can never be aria-current. They light off
 * `aria-expanded` instead, which their own modules already toggle and which
 * bottom-nav.css gives the same treatment. Enforcing it here rather than
 * trusting the resolver is the difference between a rule and a convention:
 * the bug this replaces shipped because the second half was left to habit.
 */
export function syncBottomNavActive(nav, resolve = defaultResolve) {
  if (!nav) return;
  const want = resolve(nav);
  for (const el of tabsOf(nav)) {
    const routable = !el.hasAttribute('aria-expanded');
    if (routable && el.dataset.tab && el.dataset.tab === want) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  }
}

/**
 * Publish the bar's RENDERED height as `--bottom-nav-h`.
 *
 * Anything that has to sit clear of the bar reads it: the page's bottom
 * padding so the last card can scroll past, a menu that opens above the bar, a
 * floating widget whose corner would otherwise land on a tab. Custom properties
 * inherit through a shadow boundary, which is the only reason a widget in one
 * can read it at all.
 *
 * Measured rather than typed in: a remembered number is invalidated by every
 * change to the bar's contents, silently, and the safe-area inset alone makes
 * it device-dependent. ResizeObserver catches content-driven changes a resize
 * listener misses; the listener is the fallback where it is unavailable.
 */
function syncBottomNavHeight(nav) {
  const apply = () => {
    // CEIL. Everything reading this sits ABOVE the bar via
    // `bottom: calc(var(--bottom-nav-h) + N)`, so understating the height
    // slides those surfaces DOWN and tucks a sub-pixel of toast, menu or
    // footer under the bar. Ceiling can only ever add a hair of clearance,
    // which nobody can see.
    const h = Math.ceil(nav.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--bottom-nav-h', h + 'px');
  };
  apply();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(apply).observe(nav);
  else if (typeof window !== 'undefined') window.addEventListener('resize', apply);
  // The labels inherit the host's face, which is usually a webfont; the bar's
  // height changes when it swaps in.
  const fonts = document.fonts;
  if (fonts && fonts.ready) void fonts.ready.then(apply);
}

/**
 * Mount the icicle seam on a bar that asked for it, and hand the CSS mask the
 * same curve the stroke uses.
 *
 * EVERY SEAM GETS ITS OWN GRADIENT ID. A duplicate gradient id across two SVGs
 * on one page is an `nq lint` error and a real rendering bug: the second
 * silently adopts the first one's stops. Hand-naming worked exactly until
 * someone forgot, so the id is generated.
 *
 * Idempotent, because a host that re-renders its shell would otherwise stack
 * seams.
 */
export function mountIcicleSeam(nav) {
  if (!nav || nav.querySelector('.bnav-seam')) return;
  const id = 'bnavSeam' + ++seamCount;

  // The mask, from the same path. Encoded rather than templated into the
  // stylesheet so the curve has exactly one author.
  const filled = SEAM_PATH + ' V 100 H 0 Z';
  const maskSvg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 100' preserveAspectRatio='none'>" +
    "<path fill='#fff' d='" + filled + "'/></svg>";
  nav.style.setProperty('--bnav-seam-mask', 'url("data:image/svg+xml,' + encodeURIComponent(maskSvg) + '")');

  const wrap = document.createElement('div');
  wrap.className = 'bnav-seam';
  wrap.setAttribute('aria-hidden', 'true');

  const svg = svgEl('svg', { viewBox: '0 0 480 100', preserveAspectRatio: 'none' });
  const defs = svgEl('defs');
  const grad = svgEl('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
  for (const [offset, color, values] of SEAM_STOPS) {
    const stop = svgEl('stop', { offset, 'stop-color': color });
    stop.append(svgEl('animate', {
      attributeName: 'stop-color', values, dur: '10s', repeatCount: 'indefinite',
    }));
    grad.append(stop);
  }
  // The whole ramp slides as well as cycling, so the light travels along the
  // drip rather than the line changing colour in place.
  grad.append(svgEl('animate', { attributeName: 'x1', values: '0%;-30%;0%', dur: '14s', repeatCount: 'indefinite' }));
  grad.append(svgEl('animate', { attributeName: 'x2', values: '100%;130%;100%', dur: '14s', repeatCount: 'indefinite' }));
  defs.append(grad);
  svg.append(defs, svgEl('path', {
    class: 'bnav-seam__line', d: SEAM_PATH, stroke: 'url(#' + id + ')',
  }));
  wrap.append(svg);
  nav.prepend(wrap);
}

/** Gutter kept between a panel and the window edge when it has to be clamped. */
const PANEL_GUTTER = 12;

/**
 * Centre an open panel over the tab that opened it.
 *
 * Panels used to pin to `right: 12px`, i.e. to the WINDOW's edge, while the bar
 * is `max-width: 880px; margin: 0 auto`. On a wide screen that puts the bar in
 * a centred column and its panels out at the far right: measured at 1100px, one
 * panel's centre sat 238px from its own tab's, so it read as an unrelated card
 * rather than as something that tab produced. Centring on the trigger fixes
 * phone and desktop with one rule instead of a per-breakpoint offset that would
 * need re-tuning whenever the bar's column or tab count changes -- which is
 * exactly why this belongs to the bar and not to each panel.
 *
 * Clamped to the viewport, because centring alone puts a wide panel off-screen
 * when its tab is near an edge. The clamp wins over the centring on purpose: a
 * panel slightly off its tab is a cosmetic miss, a panel half off-screen is a
 * broken one.
 *
 * MUST be called while the panel is visible. A hidden element measures 0 wide,
 * which would centre it on the trigger as if it were a point.
 */
export function anchorPanelToTab(panel, trigger) {
  // Layout-free runtimes (no-DOM test runners, SSR) have no geometry to read.
  // Bail rather than throw: this is presentation, and taking the menu's open
  // path down with it would turn a cosmetic feature into a broken control.
  if (
    typeof trigger.getBoundingClientRect !== 'function' ||
    typeof panel.getBoundingClientRect !== 'function' ||
    !panel.style
  ) {
    return;
  }
  const t = trigger.getBoundingClientRect();
  const w = panel.getBoundingClientRect().width;
  if (!w) return;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const centred = t.left + t.width / 2 - w / 2;
  const clamped = Math.max(PANEL_GUTTER, Math.min(centred, vw - w - PANEL_GUTTER));
  panel.style.left = Math.round(clamped) + 'px';
  panel.style.right = 'auto';
}

/**
 * Hydrate the static bar.
 *
 * Returns false when there is no DOM or no bar in the shell (an older cached
 * page), which must stay survivable: the app is fully usable without it and
 * every destination is still reachable by its own link.
 *
 * @param {object}   [opts]
 * @param {string}   [opts.id='bottom-nav']  id of the <nav> in the host page
 * @param {Function} [opts.resolve]          (nav) => tab name or null
 * @param {boolean}  [opts.seam]             force the icicle on or off;
 *                                           default follows the class
 */
export function mountBottomNav(opts = {}) {
  if (typeof document === 'undefined') return false;
  const nav = document.getElementById(opts.id ?? 'bottom-nav');
  if (!nav) return false;
  const resolve = opts.resolve ?? defaultResolve;
  const seam = opts.seam ?? nav.classList.contains('bottom-nav--icicle');
  if (seam) {
    nav.classList.add('bottom-nav--icicle');
    mountIcicleSeam(nav);
  }
  syncBottomNavHeight(nav);
  syncBottomNavActive(nav, resolve);
  // A host router already re-renders on navigation; this only repaints the
  // indicator, so it is a pair of cheap listeners rather than a hook into the
  // router. popstate covers path routing, hashchange covers hash routing, and
  // an app on one simply never fires the other.
  window.addEventListener('hashchange', () => syncBottomNavActive(nav, resolve));
  window.addEventListener('popstate', () => syncBottomNavActive(nav, resolve));
  return true;
}
