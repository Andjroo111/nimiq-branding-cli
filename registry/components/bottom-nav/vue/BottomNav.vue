<script setup>
/**
 * BottomNav — the fleet's bottom bar, Vue 3.
 *
 * Extracted from Hashmark's shipped bar. The HTML variant is the reference
 * implementation; this is the same bar, the same active-state rule and the same
 * seam, wearing a Vue interface.
 *
 * THE TABS COME FROM THE DEFAULT SLOT, and that is the whole point: the
 * component owns the bar, never how many tabs there are or what they do. Write
 * them in YOUR template:
 *
 *   <BottomNav>
 *     <a class="bnav-tab" href="/" data-tab="home">
 *       <span class="bnav-glyph" aria-hidden="true"><svg .../></span>
 *       <span class="bnav-label">Home</span>
 *     </a>
 *     <button type="button" class="bnav-tab" data-tab="more"
 *             aria-haspopup="true" :aria-expanded="String(open)">...</button>
 *   </BottomNav>
 *
 * ONE HONEST DELTA FROM THE HTML VARIANT. Static-HTML-first is why the plain
 * build exists: the tabs are real markup in the shell, so they are in the DOM
 * before any module runs and per-tab modules attach with no boot-order
 * coupling. Vue builds its DOM at mount, so that property is NOT available
 * here. What survives is the half that is this component's to give: the tabs
 * are declared in the CONSUMER's template and passed through untouched, so
 * nothing here can clear a slot another feature filled. If an app depends on
 * the tabs existing before its own modules boot, use the HTML variant. That is
 * a real reason to reject this one, not a detail to work around.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  /** Swap the straight top hairline for the icicle seam. */
  icicle: { type: Boolean, default: false },
  /** (navEl) => tab name or null. Default matches each tab's own href exactly. */
  resolve: { type: Function, default: null },
  /** The <nav>'s accessible name. */
  label: { type: String, default: 'Main' },
  /** Height of the seam band. Only read when `icicle` is set. */
  seamHeight: { type: String, default: '40px' },
});

/** The drip curve. ONE definition, shared by the stroke and the mask below. */
const SEAM_PATH =
  'M0 21 H10 C 21 21, 16 72, 27 72 C 39 72, 34 21, 45 21 H 76 C 86 21, 85 44, 94 44 ' +
  'C 103 44, 102 21, 111 21 H 121 C 134 21, 126 90, 139 90 C 153 90, 146 21, 158 21 ' +
  'H 170 C 179 21, 178 63, 187 63 C 197 63, 195 21, 205 21 H 211 C 222 21, 217 79, 228 79 ' +
  'C 240 79, 235 21, 246 21 H 279 C 288 21, 287 38, 295 38 C 304 38, 302 21, 311 21 ' +
  'H 318 C 331 21, 323 95, 337 95 C 352 95, 344 21, 356 21 H 372 C 382 21, 380 57, 390 57 ' +
  'C 400 57, 398 21, 408 21 H 414 C 426 21, 420 84, 432 84 C 445 84, 439 21, 451 21 H 480';

/** Re-tuned against WHITE, not copied from the hero seam this comes from: the
 *  hero's cyan pair is bright on a deep violet radial and near-invisible on a
 *  white bar. Each stop walks the same ring offset by one, so the light travels
 *  along the drip instead of the whole line pulsing at once. */
const SEAM_STOPS = [
  { offset: '0%', color: '#0582CA', values: '#0582CA;#265DD7;#5F4B8B;#0582CA' },
  { offset: '50%', color: '#265DD7', values: '#265DD7;#5F4B8B;#0582CA;#265DD7' },
  { offset: '100%', color: '#5F4B8B', values: '#5F4B8B;#0582CA;#265DD7;#5F4B8B' },
];

// EVERY SEAM GETS ITS OWN GRADIENT ID, minted per instance. A duplicate
// gradient id across two SVGs on one page is an nq lint error and a real
// rendering bug: the second silently adopts the first one's stops.
let seamCount = 0;
const gradId = `bnavSeam${++seamCount}`;

// The mask is generated from the SAME path, so the curve has one author.
const seamMask = computed(() => {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 100' preserveAspectRatio='none'>" +
    `<path fill='#fff' d='${SEAM_PATH} V 100 H 0 Z'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
});

const navStyle = computed(() =>
  props.icicle ? { '--bnav-seam-h': props.seamHeight, '--bnav-seam-mask': seamMask.value } : {});

const nav = ref(null);

/** Which tab a location lights, by EXACT match against each tab's own href.
 *  Exact, never prefix: `/` prefixes every path, so prefix matching lights Home
 *  everywhere. An unlisted route lights NOTHING, which is honest. An app with
 *  sub-routes under a tab passes its own `resolve`. */
function defaultResolve(el) {
  const norm = (p) => p.replace(/index\.html$/, '').replace(/\/+$/, '');
  // A tab with no href is a <button> that opens a panel; never a route.
  const tabs = [...el.querySelectorAll('.bnav-tab')].filter((t) => t.getAttribute('href'));
  // ONE ROUTING MODE PER BAR, decided by the tabs rather than by the location.
  // A hash-routed app's PATH never changes, so comparing paths there matches
  // every tab that has one, at every route. A bar that genuinely mixes both is
  // a routing question, so it passes its own resolve.
  if (tabs.some((t) => t.getAttribute('href').startsWith('#'))) {
    const hash = location.hash || '#/';
    for (const tab of tabs) {
      const href = tab.getAttribute('href');
      if (!href.startsWith('#')) continue;
      if ((href === '#' ? '#/' : href) === hash) return tab.dataset.tab ?? null;
    }
    return null;
  }
  const here = norm(location.pathname);
  for (const tab of tabs) {
    try {
      if (norm(new URL(tab.getAttribute('href'), location.href).pathname) === here) return tab.dataset.tab ?? null;
    } catch { /* not a URL this bar can route */ }
  }
  return null;
}

/**
 * Paint `aria-current` on the tab matching the current route.
 *
 * A tab carrying `aria-expanded` is SKIPPED, always. Those tabs open a panel
 * over the page rather than navigating, so the route underneath them is still
 * the current one and they can never be aria-current. They light off
 * `aria-expanded`, which the consumer already binds and which the stylesheet
 * gives the same treatment. Enforcing it here rather than trusting the resolver
 * is the difference between a rule and a convention: the bug this replaces
 * shipped because the second half was left to habit.
 */
function syncActive() {
  const el = nav.value;
  if (!el) return;
  const want = (props.resolve ?? defaultResolve)(el);
  for (const tab of el.querySelectorAll('.bnav-tab')) {
    const routable = !tab.hasAttribute('aria-expanded');
    if (routable && tab.dataset.tab && tab.dataset.tab === want) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
}

/**
 * Publish the bar's RENDERED height as `--bottom-nav-h`.
 *
 * Anything that has to sit clear of the bar reads it. Measured rather than
 * typed in: a remembered number is invalidated by every change to the bar's
 * contents, silently, and the safe-area inset alone makes it device-dependent.
 * CEIL, because everything reading it sits ABOVE the bar, so understating the
 * height tucks a sub-pixel of menu or footer underneath.
 */
let ro = null;
function syncHeight() {
  const el = nav.value;
  if (!el) return;
  const h = Math.ceil(el.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty('--bottom-nav-h', `${h}px`);
}

onMounted(() => {
  syncHeight();
  syncActive();
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(syncHeight);
    ro.observe(nav.value);
  } else {
    window.addEventListener('resize', syncHeight);
  }
  document.fonts?.ready?.then(syncHeight);
  // A router already re-renders on navigation; this only repaints the
  // indicator, so it is two cheap listeners rather than a router hook.
  window.addEventListener('hashchange', syncActive);
  window.addEventListener('popstate', syncActive);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  window.removeEventListener('resize', syncHeight);
  window.removeEventListener('hashchange', syncActive);
  window.removeEventListener('popstate', syncActive);
});

defineExpose({ syncActive });
</script>

<template>
    <nav
        ref="nav"
        class="bottom-nav"
        :class="{ 'bottom-nav--icicle': icicle }"
        :style="navStyle"
        :aria-label="label"
    >
        <!-- Decoration only. Every mark here is aria-hidden, which is the sole
             reason a bar that owes its tabs to real markup may draw this one
             thing itself. -->
        <div v-if="icicle" class="bnav-seam" aria-hidden="true">
            <svg viewBox="0 0 480 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient :id="gradId" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop v-for="s in SEAM_STOPS" :key="s.offset" :offset="s.offset" :stop-color="s.color">
                            <animate attributeName="stop-color" :values="s.values" dur="10s" repeatCount="indefinite" />
                        </stop>
                        <!-- The ramp slides as well as cycling, so the light
                             travels along the drip rather than the line
                             changing colour in place. -->
                        <animate attributeName="x1" values="0%;-30%;0%" dur="14s" repeatCount="indefinite" />
                        <animate attributeName="x2" values="100%;130%;100%" dur="14s" repeatCount="indefinite" />
                    </linearGradient>
                </defs>
                <path class="bnav-seam__line" :d="SEAM_PATH" :stroke="`url(#${gradId})`" />
            </svg>
        </div>

        <!-- YOUR tabs. See the block comment above for the contract. -->
        <slot />
    </nav>
</template>

<!-- UNSCOPED ON PURPOSE. The tabs are the consumer's own elements arriving
     through the slot, so scoped rules would need :slotted() on every one of
     them, and the one-lit-at-a-time rule below is a :has() selector that
     :slotted() cannot express. A bottom bar is app chrome and there is exactly
     one per app, so a global stylesheet is what it wants anyway. This block is
     html/bottom-nav.css verbatim; keep the two in step. -->
<style>
/* ==========================================================================
   bottom-nav — the fleet's bottom bar
   --------------------------------------------------------------------------
   Extracted from Hashmark's shipped bar (app/public/brand.css + the .bottom-nav
   block in app/public/index.html, 2026-08-12). Geometry, the active-state rule
   and the safe-area inset are that bar's, verbatim.

   WHAT THIS OWNS: the bar's layout, the tab's markup contract, the active-state
   rule, the safe-area inset, and the top border.

   WHAT IT DOES NOT OWN: how many tabs there are, what they are, or what they
   do. Hashmark runs Home / Search / Alerts / More; nimiq.cool runs Home /
   Profile / Explorer / More. Those are consumer choices and nothing here may
   encode either. Colour and type are host tokens for the same reason: every
   value below is a custom property with a Nimiq default, so an app on its own
   palette overrides six declarations rather than forking the file.

   STATIC-HTML-FIRST. The tabs are real markup in the host page, so the bar
   paints on the first frame AND the elements exist before any module runs.
   That is what lets per-tab modules (a notification bell, an overflow menu)
   attach to their own tab with no boot-order coupling: nobody has to mount
   before anybody else, and nobody clears a slot another module filled.
   bottom-nav.js only hydrates what is already there.
   ========================================================================== */

:root {
  /* The bar's RENDERED height, republished by bottom-nav.js. Read it for any
     surface that has to sit clear of the bar: the page's bottom padding, a
     menu that opens above it, a floating widget. The 56px here is the value
     the FIRST paint uses, before the script has measured; a remembered number
     is invalidated by every change to the bar's contents, silently, and the
     safe-area inset alone makes the real one device-dependent. */
  --bottom-nav-h: 56px;

  /* Host tokens. Defaults are Nimiq: white surface, navy ink at the wallet's
     text-opacity ladder steps, Nimiq light blue for the active mark. */
  --bnav-surface: #ffffff;
  --bnav-border: rgba(31, 35, 72, .12);
  --bnav-ink: #1f2348;
  --bnav-ink-muted: rgba(31, 35, 72, .6);
  --bnav-active: #0582ca;
  --bnav-focus: #0582ca;
  --bnav-max-width: 880px;
  --bnav-min-height: 56px;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9990;
  display: flex;
  align-items: stretch;
  /* The tabs sit in the same column as the page's main content on desktop, so
     a wide screen gets a centred row rather than four icons stranded at the
     far edges. */
  max-width: var(--bnav-max-width);
  margin: 0 auto;
  border-top: 1px solid var(--bnav-border);
  background: var(--bnav-surface);
  /* Clears the iOS home indicator without the tabs growing to meet it. */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* The explorer-style router hides sections with the `hidden` attribute, which
   is only the UA's `display: none` and LOSES to the `display: flex` above. Any
   component that declares a display owes its own [hidden] rule. */
.bottom-nav[hidden] { display: none; }

.bnav-tab {
  /* NOT INHERITED FROM THE SOURCE, and the reason it is here is the bug this
     extraction found. The source bar reads `min-height: 56px` and its app ships
     `* { box-sizing: border-box }` a thousand lines earlier, so 56 is the tab's
     TOTAL height. Dropped into a host without that reset, content-box adds the
     12px of padding on top and the bar renders 68px: not the shipped bar, and
     the 56px first-paint default for --bottom-nav-h is wrong for the whole
     first frame. A registry component cannot depend on the host's reset, so it
     states the box model it was measured in. */
  box-sizing: border-box;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: var(--bnav-min-height);
  padding: 6px 4px;
  border: none;
  background: transparent;
  color: var(--bnav-ink-muted);
  /* Type is the host's. A bar that picks its own face is a bar that fights
     every app it lands in. */
  font-family: inherit;
  font-weight: 600;
  font-size: 11px;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}

.bnav-glyph { display: inline-flex; }
.bnav-glyph svg { width: 22px; height: 22px; }
.bnav-tab:hover { color: var(--bnav-ink); }
.bnav-tab:active { transform: scale(.96); }
.bnav-tab:focus-visible { outline: 2px solid var(--bnav-focus); outline-offset: -3px; }

/* ---------- active state -------------------------------------------------
   The glyph takes the accent and the label goes full strength. No pill, no
   rule, no dot.

   Two shapes were tried in the source bar and both read as debris rather than
   as state. A 2px rule along the tab's top edge sat on the bar's own border
   and looked like a stray dash on the card behind it. A pill behind the glyph
   was worse: it hugs a 22px icon while the label sits outside it, so the tab
   reads as an icon in a box with unrelated text underneath.

   The tab already HAS a shape that can carry state, which is its own contents.
   Lighting them up needs no new geometry, and nothing can clip or misalign
   because nothing was added.

   NOT hue alone: the label also steps from muted to full ink and gains weight,
   so the active tab is legible as a contrast difference with the colour
   ignored entirely.

   TWO KINDS OF ACTIVE, ONE TREATMENT. `aria-current` is the ROUTE you are on.
   `aria-expanded` is a panel this tab has OPEN, which is not a route and so can
   never be aria-current. Splitting the attributes is correct semantics, but
   leaving the second one unstyled means half the bar never lights at all: in
   the source bar, tapping More opened a menu while the tab it came from stayed
   grey. Both selectors or neither. */
.bnav-tab[aria-current='page'],
.bnav-tab[aria-expanded='true'] { color: var(--bnav-ink); }
.bnav-tab[aria-current='page'] .bnav-glyph,
.bnav-tab[aria-expanded='true'] .bnav-glyph { color: var(--bnav-active); }
.bnav-tab[aria-current='page'] .bnav-label,
.bnav-tab[aria-expanded='true'] .bnav-label { font-weight: 800; }

/* ONE lit tab at a time. The two states above are independent, so they fire
   together: sitting on Home with a panel open lights BOTH, which reads as a
   broken toggle rather than as two different kinds of active.

   The open panel wins, because it is what the user just did and what is on
   screen over everything else. The route tab steps back to its rest style and
   lights again the moment the panel closes, since nothing about the route
   changed underneath.

   `:has()` keeps this in CSS. The alternative was having each panel module
   reach into the bar to clear the other tab, which is the boot-order coupling
   the static-markup design deliberately removed. */
.bottom-nav:has(.bnav-tab[aria-expanded='true']) .bnav-tab[aria-current='page'] {
  color: var(--bnav-ink-muted);
}
.bottom-nav:has(.bnav-tab[aria-expanded='true']) .bnav-tab[aria-current='page'] .bnav-glyph {
  color: currentColor;
}
.bottom-nav:has(.bnav-tab[aria-expanded='true']) .bnav-tab[aria-current='page'] .bnav-label {
  font-weight: 600;
}

/* ==========================================================================
   BORDER VARIANT: the icicle seam
   --------------------------------------------------------------------------
   The default above is a straight hairline and that is what every consumer
   gets unless it asks for this.

   THE GRADIENT IS HALF THE MARK. The seam this is lifted from (nimiq.cool's
   brand-chrome) is a bright cyan line tuned against --front-grad, a radial
   whose corner is Nimiq blue. Moved onto a flatter backdrop the identical
   path, viewBox, stroke and glow read DULL, which is the bug that shipped
   once already. A WHITE bar is a third backdrop again, so the stops, the
   stroke weight and the glow below are RE-TUNED, not copied:

     stops   #0CA6FE / #5CC0F5 (bright on deep violet)  ->  #0582CA / #265DD7 /
             #5F4B8B. The cyan pair is near-invisible on white; the three
             Nimiq anchors that survive a white backdrop are light blue, blue
             and purple, and keeping purple keeps the violet the cool brand
             carries.
     stroke  7px -> 3px. Seven pixels is a hero's edge; on a 56px bar it reads
             as a rule, not a seam.
     glow    8px blue haze at .45 -> 2px at .35. A wide glow on a dark ground
             is light; on white it is smudge.

   THE DRIPS STILL HANG DOWN, on a bar that sits at the bottom of the screen.
   Turning them up so they grew out of the bar was tried and reads as bumps: a
   drip is wide at the root and tapers, so inverted it is a blob. Left hanging,
   they cut into the seam BAND, which is above the tabs by construction, and the
   page shows through the notches. The bar's face is never touched.

   THE PATH EXISTS ONCE, in bottom-nav.js, which also writes the mask below from
   it. The seam this is lifted from had to warn that the stylesheet held a
   second hand-encoded copy of the same curve; here there is nothing to keep in
   step. */
.bottom-nav--icicle {
  border-top: 0;
  background: transparent;
  padding-top: var(--bnav-seam-h, 40px);
}

/* The surface moves to a pseudo-element because a CSS mask clips CHILDREN, and
   the seam's stroke is a child that must not be clipped by its own curve. */
.bottom-nav--icicle::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--bnav-surface);
  /* Layer 1 is the drip curve over the seam band; layer 2 is the solid rest of
     the bar. They overlap by 1px on purpose: butted exactly, a hairline of the
     page shows through the seam.

     `--bnav-seam-mask` is written by bottom-nav.js from the same SEAM_PATH the
     stroke uses, so the curve is authored ONCE instead of living here as a
     second hand-encoded copy that drifts. The fallback is a plain solid, so a
     page whose script never ran gets an honest square bar rather than a hole
     where the surface should be. */
  -webkit-mask:
    var(--bnav-seam-mask, linear-gradient(#000, #000)) top center / 100% var(--bnav-seam-h, 40px) no-repeat,
    linear-gradient(#000, #000) 0 calc(var(--bnav-seam-h, 40px) - 1px) / 100% 100% no-repeat;
  mask:
    var(--bnav-seam-mask, linear-gradient(#000, #000)) top center / 100% var(--bnav-seam-h, 40px) no-repeat,
    linear-gradient(#000, #000) 0 calc(var(--bnav-seam-h, 40px) - 1px) / 100% 100% no-repeat;
}

/* The tabs ride above the masked surface. */
.bottom-nav--icicle > .bnav-tab { position: relative; z-index: 1; }

/* The glowing line: its own absolutely-positioned svg, mounted by
   bottom-nav.js so its gradient id can be GENERATED. A duplicate gradient id
   across two SVGs on one page is an nq lint error and a real rendering bug --
   the second silently adopts the first one's stops -- and hand-naming worked
   exactly until someone forgot. Mounting from JS is only acceptable because
   every mark here is aria-hidden decoration; nothing that carries meaning goes
   in that module. */
.bnav-seam {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: var(--bnav-seam-h, 40px);
  z-index: 2;
  pointer-events: none;
}
.bnav-seam svg { display: block; width: 100%; height: 100%; }
.bnav-seam__line {
  fill: none;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 2px rgba(5, 130, 202, .35));
}

/* The colour cycle is SMIL, because a CSS gradient cannot animate its own
   stops. It is decoration, so it goes when asked. */
@media (prefers-reduced-motion: reduce) {
  .bnav-seam__line animate { display: none; }
  .bnav-tab { transition: none; }
}
</style>
