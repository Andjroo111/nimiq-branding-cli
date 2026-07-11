<!--
  AppFooterCommunity: the FEATURED fleet app footer — the flagship community
  footer generalized from Andjroo's nimiq.school CommunityFooter.vue
  (redesign driver: Andjroo, 2026-07-10, "use something that looks a lot more
  like the actual brand footer, you can see it in my nimiq.school app").

  Two stacked surfaces:
    1. White community band: two-line "Built by the community / for the
       community" title (slot), the light-blue "Visit nimiq.com" pill, and a
       full-bleed honeycomb lattice of faint gray rounded flat-top hexagons
       (per-cell opacity, offset columns, bleeds off both edges) carrying four
       brand-colored community hexes: Nimiq Forum (gold radial), Discord,
       Telegram, GitHub.
    2. Navy strip (bottom-right radial, rule 7): the app's OWN lockup (icon
       slot + appName wordmark), the independent-project disclaimer (slot),
       and an optional quiet Status / Source / version line (links slot).

  Glyphs are the REAL Nimiq icon-set mono logos (logos-{nimiq-forum,discord,
  telegram,github}-mono.svg), paths inlined verbatim; the fallback lockup icon
  is the Nimiq icon-set globe-with-check (nimiq--globe-filled +
  nimiq--check-thin). Its gradient id is minted per instance via a module
  counter, so several footers on one page can never collide (rule 3).

  props:
    appName       string  (required): the "nimiq.appname" wordmark text
    githubHref    string  (required): the CONSUMING app's own repository
    ctaLabel?     string  (default 'Visit nimiq.com')
    ctaHref?      string  (default https://nimiq.com)
    forumHref?    string  (default https://forum.nimiq.community)
    discordHref?  string  (default https://discord.gg/nimiq)
    telegramHref? string  (default https://t.me/Nimiq)
    Community defaults verified against live nimiq.com; do not invent links.

  slots (all optional, all localizable):
    title      : band title. Default two lines, NO period (rule 16).
    icon       : the lockup icon (27px, rides currentColor at white-92%).
                 Default = globe-with-check. Swap in your app's own mark.
    disclaimer : navy-strip line. Default the independent-project sentence;
                 this is a body sentence, so periods are correct here.
    links      : quiet second line (Status / Source / version). Anchors are
                 styled white-50%, hover white, bold 600 (rule 21); wrap a
                 version string in <span class="afc-version"> for Fira Mono.

  Static flow, never position:fixed; margin-top:auto pins it to the bottom of
  a flex-column page. All custom CSS in px (@nimiq/style sets html{font-size:8px}).
  The slim single-row attribution variant lives in AppFooter.vue.
-->
<script lang="ts">
// Module-level counter: mints a unique SVG gradient id per instance (rule 3).
let afcInstances = 0
</script>

<script setup lang="ts">
withDefaults(defineProps<{
  appName: string
  githubHref: string
  ctaLabel?: string
  ctaHref?: string
  forumHref?: string
  discordHref?: string
  telegramHref?: string
}>(), {
  ctaLabel: 'Visit nimiq.com',
  ctaHref: 'https://nimiq.com',
  forumHref: 'https://forum.nimiq.community',
  discordHref: 'https://discord.gg/nimiq',
  telegramHref: 'https://t.me/Nimiq',
})

const checkGradId = `afc-check-grad-${++afcInstances}`

// ---- Honeycomb lattice (verbatim from the nimiq.school reference) ----------
// Column-major, top to bottom. Odd columns are offset (dropped half a hex) so
// the flat-top cells interlock. Each faint cell carries its OWN opacity (the
// number), giving the organic per-hex fade of the nimiq.com bg-hexagons asset.
// Socials sit in the center columns so they stay on-screen at any width:
// Discord + Telegram are the ONE touching pair, set diagonally; Forum
// (mid-left) and GitHub (lower-right) each stand alone.
type SocialTone = 'forum' | 'discord' | 'telegram' | 'github'
type Cell = number | SocialTone

const isSocial = (cell: Cell): cell is SocialTone => typeof cell === 'string'

const LAYOUT: ReadonlyArray<{ offset: boolean; cells: Cell[] }> = [
  { offset: false, cells: [0.16, 0.34, 0.13] },
  { offset: true, cells: [0.46, 0.22] },
  { offset: false, cells: [0.26, 0.55, 0.18] },
  { offset: true, cells: [0.14, 0.4] },
  { offset: false, cells: [0.3, 'forum', 0.2] },
  { offset: true, cells: [0.52, 0.16] },
  { offset: false, cells: ['discord', 0.28, 0.2] },
  { offset: true, cells: ['telegram', 0.48] },
  { offset: false, cells: [0.36, 0.15, 'github'] },
  { offset: true, cells: [0.54, 0.24] },
  { offset: false, cells: [0.17, 0.42, 0.3] },
  { offset: true, cells: [0.34, 0.13] },
  { offset: false, cells: [0.44, 0.2, 0.36] },
]
</script>

<template>
  <footer class="app-footer-community">
    <!-- White community band: title, CTA pill, full-bleed honeycomb lattice -->
    <section class="afc-band">
      <h2 class="afc-title"><slot name="title">Built by the community<br>for the community</slot></h2>
      <a class="afc-cta" :href="ctaHref" target="_blank" rel="noopener">
        {{ ctaLabel }}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h10.4M8.6 3.6 13 8l-4.4 4.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
      <nav class="afc-comb" aria-label="Nimiq community">
        <div
          v-for="(col, c) in LAYOUT"
          :key="c"
          class="afc-col"
          :class="{ 'afc-col--offset': col.offset }"
        >
          <template v-for="(tone, h) in col.cells">
            <a
              v-if="isSocial(tone)"
              :key="`s${c}-${h}`"
              class="afc-hex afc-social"
              :class="`afc-social--${tone}`"
              :href="tone === 'forum' ? forumHref : tone === 'discord' ? discordHref : tone === 'telegram' ? telegramHref : githubHref"
              target="_blank"
              rel="noopener"
              :aria-label="tone === 'forum' ? 'Nimiq Forum' : tone === 'discord' ? 'Nimiq Discord' : tone === 'telegram' ? 'Nimiq Telegram' : `${appName} on GitHub`"
              :title="tone === 'forum' ? 'Nimiq Forum' : tone === 'discord' ? 'Nimiq Discord' : tone === 'telegram' ? 'Nimiq Telegram' : `${appName} on GitHub`"
            >
              <svg v-if="tone === 'forum'" width="71" height="61" viewBox="0 0 21 18" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M14.3 18c.6 0 1.156-.32 1.456-.844l4.207-7.312a1.69 1.69 0 00.002-1.688L15.76.844A1.69 1.69 0 0014.3 0H5.906A1.69 1.69 0 004.45.84L.748 7.248l-.523.908a1.7 1.7 0 000 1.684l4.224 7.313A1.68 1.68 0 005.905 18zm-5.416-5.107a5.6 5.6 0 001.62.232c2.687 0 4.878-1.875 4.878-4.125s-2.191-4.125-4.878-4.125C7.818 4.875 5.627 6.75 5.627 9a3.75 3.75 0 001.35 2.85l-.974 1.995a.225.225 0 00.09.292.21.21 0 00.187 0z"/></svg>
              <svg v-else-if="tone === 'discord'" width="74" height="58" viewBox="0 0 18 14" fill="none" aria-hidden="true"><path fill="currentColor" d="M15.247 1.167A14.7 14.7 0 0011.534 0c-.16.29-.347.678-.476.988a13.6 13.6 0 00-4.115 0A11 11 0 006.462 0a14.6 14.6 0 00-3.716 1.17C.396 4.72-.241 8.184.077 11.597a14.8 14.8 0 004.554 2.334q.555-.763.976-1.606a9.6 9.6 0 01-1.536-.748q.192-.143.376-.298c2.962 1.385 6.18 1.385 9.106 0q.184.154.376.298a9.6 9.6 0 01-1.539.749c.282.564.608 1.102.976 1.606a14.8 14.8 0 004.557-2.335c.373-3.957-.639-7.388-2.676-10.43M6.01 9.497c-.889 0-1.618-.83-1.618-1.84s.714-1.842 1.618-1.842 1.634.83 1.618 1.842c.002 1.01-.713 1.84-1.618 1.84m5.98 0c-.89 0-1.618-.83-1.618-1.84s.713-1.842 1.618-1.842c.904 0 1.633.83 1.618 1.842 0 1.01-.714 1.84-1.618 1.84"/></svg>
              <svg v-else-if="tone === 'telegram'" width="68" height="60" viewBox="0 0 18 16" fill="none" aria-hidden="true"><path fill="currentColor" d="M16.785.1.84 6.247c-1.088.438-1.08 1.045-.2 1.316L4.735 8.84l9.472-5.976c.448-.273.857-.126.52.172L7.054 9.962H7.05h.002l-.283 4.22c.414 0 .597-.19.829-.413l1.988-1.934 4.136 3.055c.762.42 1.31.204 1.5-.706L17.938 1.39C18.216.276 17.513-.229 16.785.1"/></svg>
              <svg v-else width="68" height="68" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path fill="currentColor" d="M9 0a9 9 0 00-2.845 17.54c.45.082.615-.196.615-.434 0-.214-.009-.923-.012-1.675-2.504.544-3.032-1.062-3.032-1.062-.41-1.04-1-1.317-1-1.317-.816-.559.062-.547.062-.547.904.063 1.38.927 1.38.927.802 1.376 2.105.978 2.618.749.081-.582.314-.98.572-1.204-2-.228-4.1-1-4.1-4.447 0-.983.351-1.786.927-2.416-.094-.227-.402-1.142.087-2.382 0 0 .756-.242 2.475.923.718-.2 1.488-.3 2.253-.303a8.7 8.7 0 012.255.303c1.717-1.165 2.472-.923 2.472-.923.49 1.24.182 2.155.088 2.382.577.63.926 1.433.926 2.416 0 3.456-2.105 4.217-4.109 4.44.323.28.61.827.61 1.667 0 1.204-.01 2.173-.01 2.47 0 .239.162.52.618.43A9 9 0 0018 9a9 9 0 00-9-9M3.371 12.82c-.02.045-.09.058-.154.027-.065-.029-.102-.09-.081-.135s.09-.059.155-.028.103.091.08.136m.443.395c-.043.04-.127.021-.184-.042-.059-.062-.07-.146-.026-.187.044-.04.125-.02.184.042.06.063.07.147.026.187m.304.505c-.056.039-.146.003-.202-.077-.055-.08-.055-.176.002-.215.056-.038.144-.004.2.076.056.081.056.177 0 .216m.513.586c-.05.054-.154.04-.231-.035-.079-.072-.1-.175-.051-.23.05-.054.155-.039.233.035.078.072.102.176.049.23m.664.197c-.022.07-.123.103-.225.073s-.168-.114-.148-.185.123-.104.226-.072c.101.03.168.113.147.184m.755.084c.003.074-.084.136-.19.137-.108.003-.195-.057-.197-.13 0-.075.085-.136.193-.138.107-.002.194.057.194.131m.742-.028c.013.072-.061.147-.167.166-.105.02-.202-.025-.215-.097-.013-.074.063-.149.167-.168.107-.018.202.025.215.099"/></svg>
            </a>
            <span
              v-else
              :key="`t${c}-${h}`"
              class="afc-hex afc-hex--faint"
              :style="{ opacity: tone }"
              aria-hidden="true"
            />
          </template>
        </div>
      </nav>
    </section>

    <!-- Navy strip: app lockup + independent-project disclaimer + quiet dev links -->
    <section class="afc-dark">
      <div class="afc-brand">
        <slot name="icon">
          <svg class="afc-brand-icon" viewBox="0 0 24 24" role="img" :aria-label="appName">
            <g transform="translate(1.4 1.6) scale(1.6)">
              <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M.248 4.27A6.1 6.1 0 000 6c0 .601.087 1.182.248 1.73H2.69A12 12 0 012.57 6c0-.629.043-1.204.119-1.73zm.33-.866h2.275C3.15 2.135 3.65 1.207 4.162.542q.174-.225.347-.41A6.03 6.03 0 00.577 3.403M6 0q-.091.055-.22.146a4.6 4.6 0 00-.942.928c-.408.53-.828 1.282-1.102 2.33h4.528c-.274-1.048-.694-1.8-1.102-2.33A4.6 4.6 0 006.22.146 3 3 0 006 0m2.443 4.27H3.557A11 11 0 003.429 6c0 .638.046 1.214.128 1.73h4.886c.082-.516.128-1.092.128-1.73s-.046-1.214-.128-1.73m.867 3.46c.076-.526.119-1.101.119-1.73s-.043-1.204-.119-1.73h2.441A6.1 6.1 0 0112 6a6.1 6.1 0 01-.248 1.73zm-1.046.866H3.736c.274 1.048.694 1.8 1.102 2.33.347.45.69.746.942.928q.129.092.22.146.091-.055.22-.146a4.6 4.6 0 00.942-.927c.408-.53.828-1.283 1.102-2.33M4.509 11.87a6 6 0 01-.347-.411c-.512-.665-1.01-1.593-1.31-2.862H.578A6.03 6.03 0 004.51 11.87m2.982 0q.173-.185.347-.411c.512-.665 1.01-1.593 1.31-2.862h2.275A6.03 6.03 0 017.49 11.87m3.932-8.465H9.147C8.85 2.135 8.35 1.207 7.838.542a6 6 0 00-.347-.41 6.03 6.03 0 013.932 3.272"/>
            </g>
            <circle cx="18.4" cy="18.4" r="6" fill="#1f2348"/>
            <circle cx="18.4" cy="18.4" r="4.8" :fill="`url(#${checkGradId})`"/>
            <g transform="translate(15.3 15.3) scale(0.52)">
              <path fill="#fff" d="M11.687.14a.75.75 0 00-1.046.173l-7.018 9.79-2.342-2.346A.75.75 0 10.22 8.818l2.967 2.969a.762.762 0 001.14-.093L11.86 1.188A.75.75 0 0011.687.14"/>
            </g>
            <defs>
              <linearGradient :id="checkGradId" x1="13.6" y1="13.6" x2="23.2" y2="23.2" gradientUnits="userSpaceOnUse">
                <stop stop-color="#21bca5"/>
                <stop offset="1" stop-color="#0e9b86"/>
              </linearGradient>
            </defs>
          </svg>
        </slot>
        <span class="afc-brand-name">{{ appName }}</span>
      </div>
      <p class="afc-line"><slot name="disclaimer">An independent community project. Not affiliated with Team Nimiq.</slot></p>
      <nav v-if="$slots.links" class="afc-links" aria-label="App links"><slot name="links" /></nav>
    </section>
  </footer>
</template>

<style scoped>
/* Custom CSS in px — @nimiq/style sets html { font-size: 8px }. */

.app-footer-community {
  /* pins to the bottom of a flex-column page; computes to 0 in normal block flow */
  margin-top: auto;
  width: 100%;
  font-family: 'Mulish', 'Muli', system-ui, sans-serif;
}

/* ===== White community band ===== */
.afc-band {
  background: #fff;
  text-align: center;
  overflow: hidden; /* clips the honeycomb that bleeds off both edges */
  padding: 80px 0 64px;
}

.afc-title {
  margin: 0 auto 28px;
  padding: 0 24px;
  max-width: 640px;
  color: #1f2348;
  font-size: clamp(28px, 3.4vw, 36px);
  line-height: 1.25;
  font-weight: 700;
  /* nimiq.com applies balance to every heading; the title is deliberately two-line */
  text-wrap: balance;
}

/* Light-blue CTA pill, calibrated against the nimiq.com 'Community →' pill
   (style shared with the registry honeycomb-band component). */
.afc-cta {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 38px;
  padding: 0 21px;
  border-radius: 999px;
  background: radial-gradient(100% 100% at bottom right, #265dd7, #0582ca);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.1px;
  text-decoration: none;
  transition: background 0.3s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}
.afc-cta:hover,
.afc-cta:focus {
  background: radial-gradient(100% 100% at bottom right, #2355c4, #0071c3);
}
.afc-cta svg { display: block; }

/* ===== Community honeycomb lattice ===== */
/* Rounded flat-top hexagons (SVG mask) in offset flex columns. Every dimension
   derives from --w, so the SAME complete honeycomb renders at every width; it
   just shrinks on phones, never collapsing to a flat row. Wider than the band
   on purpose: centered on the band's midline and bled off BOTH edges. */
.afc-comb {
  --w: 108px;                                   /* hex width */
  --h: calc(var(--w) * 110 / 120);              /* hex height (mask aspect) */
  --gap: calc(var(--w) / 12);                   /* vertical gap inside a column */
  --xover: calc(var(--w) * 0.075);              /* horizontal overlap into notches */
  --offset: calc((var(--h) + var(--gap)) / 2);  /* half-pitch drop for offset cols */
  display: flex;
  align-items: flex-start;
  width: max-content;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  margin: 28px 0 0;
}
.afc-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap);
  margin: 0 calc(var(--xover) * -1);
}
.afc-col--offset {
  margin-top: var(--offset);
}

/* Rounded flat-top hexagon (smooth corners), shape via SVG mask. */
.afc-hex {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--w);
  height: var(--h);
  flex-shrink: 0;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'%3E%3Cpath d='M35,3 L85,3 Q90,3 93,8 L118,47 Q121,52 118,57 L93,97 Q90,102 85,102 L35,102 Q30,102 27,97 L2,57 Q-1,52 2,47 L27,8 Q30,3 35,3 Z' fill='black'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'%3E%3Cpath d='M35,3 L85,3 Q90,3 93,8 L118,47 Q121,52 118,57 L93,97 Q90,102 85,102 L35,102 Q30,102 27,97 L2,57 Q-1,52 2,47 L27,8 Q30,3 35,3 Z' fill='black'/%3E%3C/svg%3E");
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  transition: background-color 0.3s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1)),
              transform 0.35s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}

/* One neutral gray; each cell carries its OWN opacity (set inline from LAYOUT),
   giving the organic per-hex fade of the nimiq.com bg-hexagons honeycomb
   (whose 55 hexes range opacity .01-.06) instead of a flat uniform tint. */
.afc-hex--faint { background-color: #b0b4c4; }

/* The four community links — brand-colored cells embedded in the lattice.
   Third-party brand colors, exempt from the palette rule. */
.afc-social {
  color: #fff;
  cursor: pointer;
}
.afc-social svg {
  display: block;
  width: calc(var(--w) * 0.42);
  height: auto;
}
.afc-social:hover,
.afc-social:focus {
  transform: scale(1.08);
  z-index: 1;
}
/* Nimiq gold gradient — brand accent for the Nimiq Forum */
.afc-social--forum {
  background-image: radial-gradient(100% 100% at bottom right, #ec991c, #e9b213);
}
.afc-social--discord { background-color: #5865f2; }
.afc-social--telegram { background-color: #2aabee; }
.afc-social--github { background-color: #24292f; }

/* Mobile: shrink the hex so the SAME complete honeycomb fits — never a flat row. */
@media (max-width: 768px) {
  .afc-band { padding: 60px 0 44px; }
  .afc-title { font-size: 24px; }
  .afc-comb { --w: 92px; margin-top: 20px; }
}
@media (max-width: 450px) {
  .afc-comb { --w: 80px; }
}

/* ===== Navy strip ===== */
.afc-dark {
  /* System navy — the bottom-right radial, never a flat fill (rule 7).
     Consumes --nimiq-blue-bg when nimiq-style is loaded; self-contained fallback. */
  background-color: #1f2348;
  background-image: var(--nimiq-blue-bg, radial-gradient(100% 100% at bottom right, #260133, #1f2348));
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 44px 24px calc(44px + env(safe-area-inset-bottom));
  font-size: 13.5px;
  line-height: 1.6;
}

/* Brand lockup: the app's own icon + "nimiq.appname" wordmark.
   :slotted() sizes a consumer-provided icon the same as the default. */
.afc-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 16px;
}
.afc-brand-icon,
.afc-brand :slotted(svg),
.afc-brand :slotted(img) {
  width: 27px;
  height: 27px;
  color: rgba(255, 255, 255, 0.92);
  flex-shrink: 0;
}
.afc-brand-name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: #fff;
}

/* Disclaimer: a body sentence (periods belong here, not on titles). */
.afc-line {
  margin: 0 auto;
  max-width: 34ch;
  text-wrap: balance;
}
.afc-line :slotted(b),
.afc-line b { color: #fff; font-weight: 700; }

/* Optional quiet second line: Status / Source / version (rule 21 links). */
.afc-links {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  column-gap: 20px;
  row-gap: 8px;
  font-size: 13px;
  line-height: 1;
}
.afc-links :slotted(a) {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}
.afc-links :slotted(a:hover),
.afc-links :slotted(a:focus-visible) {
  color: #fff;
}
/* version string is a technical value: Fira Mono when loaded, any mono otherwise */
.afc-links :slotted(.afc-version) {
  font-family: 'Fira Mono', monospace;
  font-size: 12px;
}
</style>
