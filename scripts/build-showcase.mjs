// Build showcase.html — every registry component on one page, assembled from the
// pixel-verified html/<name>.{html,css} snippets, with how-Nimiq-uses-it notes.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = join(ROOT, 'registry', 'components');

// Display order + how the real Nimiq apps use each piece.
const TILES = [
  ['identicon', 'Every address gets a deterministic hexagon avatar generated from the address itself — account lists, contact book, transaction rows. No profile pictures anywhere in the wallet.'],
  ['address-display', 'The receive modal and account details render addresses as 9 four-character chunks in Fira Mono, so two addresses can be compared at a glance.'],
  ['copyable', 'Wraps addresses and hashes everywhere — click anywhere on it to copy, with a light-blue tint on hover and an animated “Copied” bubble as feedback.'],
  ['address-input', 'Recipient entry in the send flow: a 3×3 block grid that auto-formats while you type and validates the checksum live. Shakes on invalid paste.'],
  // NOTE: label-input must come before amount-input/amount-with-fee in the DOM —
  // upstream AmountInput renders an internal .label-input form, and the label-input
  // snippet script binds to the FIRST .label-input in the document.
  ['label-input', 'Naming accounts and addresses during onboarding and in settings; the input grows and shrinks with its content.'],
  ['amount', 'Every NIM value in the wallet — balances, transaction rows — formatted from the smallest unit (luna) with thin-space digit grouping.'],
  ['fiat-amount', 'Transaction history and the send flow show the fiat equivalent with an optimized currency symbol ($, not USD) and only as many decimals as needed.'],
  ['amount-input', 'The big send-amount field: width auto-fits the number and the font shrinks as the value grows, ticker rendered beside it.'],
  ['amount-with-fee', 'The complete send-flow amount widget: the input above plus a secondary line for fee, approximate fiat value, or an “Insufficient balance” error.'],
  ['select-bar', 'The fee selector in the wallet’s BTC send modal — free / standard / express. Everything up to the selection takes the selected color.'],
  ['slider-toggle', 'The NIM/BTC currency switcher and list filters in the wallet — a white pill slides under the active option.'],
  ['qr-code', 'The receive modal and payment requests. The light-blue radial gradient fill on rounded modules is a Nimiq brand signature.'],
  ['tooltip', 'Explains fees, balances and validator scores throughout the wallet — dark navy gradient box with a positioned arrow.'],
  ['status-alert', 'Nimiq’s callout pattern (from the nimiq-ui docs theme): tinted background, tonal outline, uppercase icon title. note/tip/warning/caution map to info/success/warning/error.'],
  ['loading-spinner', 'The hexagon spinner — shown while the wallet syncs consensus, loads transactions, or waits on a swap. Two dashed hexagon strokes chase each other.'],
  ['close-button', 'The circled × in the corner of every modal and overlay in the wallet and hub.'],
  ['consensus-icon', 'The network indicator in the wallet sidebar — globe with a green check once consensus is established, animated sync globe while connecting.'],
  ['timer', 'The circular countdown from Hub checkout — how long the payment window or quoted rate is still valid.'],
  ['toast-notification', 'The wallet’s bottom-right toasts (from the swap flow): blue while a swap is running (“don’t close your wallet!”), green on success, orange on error.', { wide: true, contain: true }],
  ['account-list', 'The account chooser in Hub flows — identicon, label and NIM balance per row. Tap a row to pick the account that pays.', { wide: true }],
  ['account-ring', 'The ring of identicons representing your logged-in accounts — used by the Hub as the “all my accounts” glyph.'],
  ['payment-info-line', 'The header line of Hub checkout: amount being paid, the merchant’s name, and the countdown until the rate expires.', { wide: true }],
  ['status-screen', 'The Hub’s full-card status overlay — every checkout and signing flow ends on this green success (or red error) screen inside the standard card.', { wrapSmallPage: true }],
  ['buttons', 'The @nimiq/style button system: uppercase pills with radial-gradient fills. Navy/light-blue for CTAs, green only to confirm success, red only for destructive actions.'],
  ['card', 'The base nq-card container — header, body, footer — used across the hub and marketing sites for any grouped content.'],
  // Supporting elements (wallet + nimiq.com marketing) — 2026-06-11 batch.
  ['backup-banner', 'Pinned to the top of the wallet&rsquo;s account overview until the recovery words are exported — the orange &ldquo;there is no forgot password&rdquo; warning with the Backup&rarr; pill.', { wide: true }],
  ['search-bar', 'Filters the wallet&rsquo;s transaction history — the pill expands and turns light-blue on focus and reveals a clear cross while a query is typed.'],
  ['account-header', 'The top of every wallet address view: big identicon, label + chunked address, NIM balance, and the search / Stake / Send / Receive action row with the green staking CTA tooltip.', { wide: true }],
  ['transaction-list', 'The wallet&rsquo;s transaction history — month headers, stacked day/month dates, peer identicons, and incoming amounts in the green tinted pill over the loading fiat placeholder.', { wide: true }],
  ['swap-balance-bar', 'The Swap Currencies modal&rsquo;s distribution bar — drag the handle to split your total value between assets; the orange hatched segment is the incoming BTC change.', { wide: true }],
  ['price-chart', 'The wallet sidebar&rsquo;s price sparklines — NIM with the 24H badge, BTC below it — ticker, fiat price and green 24h change on the navy sidebar.'],
  ['balance-distribution', 'The wallet sidebar&rsquo;s donut: one rounded arc per currency sized by its share of the account&rsquo;s total fiat value, with the Swap pill rendered below it.'],
  ['hero-section', 'The nimiq.com home hero — purple radial sky, floating hexagons, the &ldquo;Create Wallet&rdquo; pill, WORKS WITH partner row and the dotted globe cresting at the bottom.', { wide: true }],
  ['app-showcase-card', 'nimiq.com&rsquo;s THE APPS section — every app gets this card: gold hexagon icon chip, copy, and a device mock clipped at the card edge (wide variant for the wallet).', { wide: true }],
  ['honeycomb-band', 'nimiq.com&rsquo;s community section — flat-top hexagon mosaic in light grays with the YouTube, X and Facebook hexes and the blue Community pill.', { wide: true }],
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

let styles = '';
let tiles = '';
for (const [name, usage, opts = {}] of TILES) {
  const htmlPath = join(C, name, 'html', `${name}.html`);
  const cssPath = join(C, name, 'html', `${name}.css`);
  if (!existsSync(htmlPath)) { console.warn(`skip tile ${name}: no snippet`); continue; }
  const meta = JSON.parse(await readFile(join(C, name, 'meta.json'), 'utf8'));
  let snippet = await readFile(htmlPath, 'utf8');
  if (opts.wrapSmallPage) snippet = `<div class="small-page nq-card" style="position:relative;margin:0">${snippet}</div>`;
  if (existsSync(cssPath)) styles += `\n/* === ${name} === */\n` + await readFile(cssPath, 'utf8');
  tiles += `
    <div class="tile ${opts.wide ? 'wide' : ''}" id="${name}">
      <div class="tile-stage ${name === 'tooltip' ? 'stage-tall-top' : ''} ${opts.contain ? 'stage-contain' : ''}">${snippet}</div>
      <div class="tile-info">
        <h3>${esc(meta.name)} <span class="verified-badge">pixel-verified</span></h3>
        <p class="purpose">${esc(meta.purpose)}</p>
        <p class="usage"><strong>How Nimiq uses it:</strong> ${usage}</p>
      </div>
    </div>`;
}

// Composite exhibit: small-page + page-header + page-body + page-footer composed
// the way every Wallet/Hub/Keyguard flow composes them.
for (const n of ['small-page', 'page-header', 'page-body', 'page-footer']) {
  const cssPath = join(C, n, 'html', `${n}.css`);
  if (existsSync(cssPath)) styles += `\n/* === ${n} === */\n` + await readFile(cssPath, 'utf8');
}

const composite = `
  <div class="small-page nq-card">
    <div class="page-header nq-card-header has-progress-indicator">
      <div class="progress-indicator">
        <div class="indicator active"></div><div class="indicator active"></div><div class="indicator active"></div>
        <div class="indicator"></div><div class="indicator"></div><div class="indicator"></div>
      </div>
      <a class="page-header-back-button nq-icon" href="javascript:void(0)" title="Go back">
        <svg class="nq-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 4.5 6 12l7.5 7.5M6.75 12H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
      <h1 class="nq-h1">Send Transaction</h1>
    </div>
    <div class="page-body nq-card-body composite-body">
      <div class="identicon" data-address="NQ87 0000 0000 0000 0000 0000 0000 0000 0001" style="width:72px"><img alt=""></div>
      <div class="address-display format-nimiq">
        <span class="chunk">NQ87<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0000<span class="space">&nbsp;</span></span><span class="chunk">0001<span class="space">&nbsp;</span></span>
      </div>
      <p class="nq-text" style="text-align:center">You are sending <span class="amount">12&#8239;345.67 <span class="currency nim">NIM</span></span></p>
    </div>
    <div class="page-footer nq-card-footer">
      <button class="nq-button light-blue">Send</button>
    </div>
  </div>`;

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nimiq Component Registry — Showcase</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Fira+Mono:400,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/legacy/nimiq-style.min.css">
<style>
body { font-family: 'Mulish', 'Muli', system-ui, sans-serif !important; background: #F8F8F8; margin: 0; }

/* hero */
.hero { background-image: radial-gradient(100% 100% at bottom right, #260133, #1F2348); color: #fff; padding: 72px 32px 64px; text-align: center; }
.hero svg { margin-bottom: 24px; }
.hero h1 { font-size: 34px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px; }
.hero p { font-size: 17px; color: rgba(255,255,255,0.6); max-width: 640px; margin: 0 auto; line-height: 1.6; }
.hero .pill { display: inline-block; margin-top: 24px; background: rgba(233,178,19,0.15); color: #E9B213; font-weight: 700; font-size: 13px; padding: 8px 18px; border-radius: 500px; }

.section-title { max-width: 1280px; margin: 64px auto 8px; padding: 0 32px; font-size: 22px; font-weight: 800; color: #1F2348; }
.section-sub { max-width: 1280px; margin: 0 auto 28px; padding: 0 32px; color: rgba(31,35,72,0.5); font-size: 15px; line-height: 1.6; }

/* composite exhibit */
.composite-wrap { display: flex; flex-wrap: wrap; gap: 40px; align-items: center; justify-content: center; max-width: 1280px; margin: 0 auto; padding: 24px 32px 8px; }
.composite-body { align-items: center; display: flex; flex-direction: column; gap: 16px; justify-content: center; }
.composite-notes { max-width: 460px; }
.composite-notes li { color: rgba(31,35,72,0.75); font-size: 15px; line-height: 1.65; margin-bottom: 14px; }
.composite-notes b { color: #1F2348; }

/* grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 28px; max-width: 1280px; margin: 0 auto; padding: 16px 32px 80px; }
.tile { background: #fff; border-radius: 10px; box-shadow: 0 4px 28px rgba(0,0,0,0.111); display: flex; flex-direction: column; overflow: hidden; }
.tile-stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 44px 32px; min-height: 190px; background: #fff; }
.stage-tall-top { padding-top: 110px; }
.tile-info { border-top: 1px solid rgba(31,35,72,0.08); padding: 22px 28px 26px; }
.tile-info h3 { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #1F2348; font-family: 'Fira Mono', monospace; }
.verified-badge { font-family: 'Mulish', sans-serif; font-size: 11px; font-weight: 700; color: #21BCA5; background: rgba(33,188,165,0.1); border-radius: 500px; padding: 3px 10px; vertical-align: 2px; margin-left: 6px; }
.tile-info .purpose { margin: 0 0 10px; color: rgba(31,35,72,0.5); font-size: 13.5px; line-height: 1.55; }
.tile-info .usage { margin: 0; color: rgba(31,35,72,0.8); font-size: 14px; line-height: 1.6; }
.tile-info .usage strong { color: #0582CA; font-weight: 700; }

/* footer */
.page-footer-band { background-image: radial-gradient(100% 100% at bottom right, #260133, #1F2348); color: rgba(255,255,255,0.5); text-align: center; padding: 48px 32px; font-size: 14px; }
.page-footer-band a { color: rgba(255,255,255,0.5); text-decoration: none; }
.page-footer-band a:hover { color: #fff; }

/* keep snippet buttons from stretching the buttons tile too tall */
#buttons .tile-stage .nq-button { margin: 8px auto; }

/* wide tiles span two grid columns where the grid is wide enough */
.tile.wide { grid-column: span 2; }
@media (max-width: 870px) { .tile.wide { grid-column: auto; } }

/* contain fixed-position snippets (toasts) inside their tile for display */
.stage-contain { position: relative; gap: 12px; }
.stage-contain .nq-toast { position: static !important; margin: 6px 0; }

/* status-screen sits inside a SmallPage; shrink it a touch to fit the tile */
#status-screen .small-page { transform: scale(0.82); transform-origin: top center; margin-bottom: -100px !important; }

/* supporting-element tiles (2026-06-11 batch) — sizing chrome only */
#backup-banner .backup-banner { width: 100%; max-width: 560px; }
#account-header .account-header { width: 100%; }
#transaction-list .transaction-list { width: 100%; }
#swap-balance-bar .swap-balance-bar { width: 444px; max-width: 100%; margin-bottom: 1.5rem; }
#balance-distribution .tile-stage { background: radial-gradient(100% 100% at bottom right, #260133, #1F2348); }
/* zoomed children resolve % widths in their own zoomed space — width:100% already fills the stage */
#hero-section .tile-stage { padding: 0; align-items: stretch; }
#hero-section .nq-hero-section { zoom: 0.55; }
#honeycomb-band .tile-stage { padding: 0; align-items: stretch; }
#honeycomb-band .nq-honeycomb-band { zoom: 0.6; }
#app-showcase-card .tile-stage { gap: 28px; }
#app-showcase-card .nq-app-showcase-card { max-width: 100%; }

/* component snippet styles (verbatim from the registry) */
${styles}
</style>
</head>
<body>

<div class="hero">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 18" height="28" aria-label="Nimiq">
    <g fill="none">
      <path fill="url(#hdr-grad)" d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/>
      <path fill="#fff" d="M34.91 3.656h1.829v10.688H35.33L29.582 6.89v7.453H27.76V3.656h1.403l5.748 7.453zm5.47 10.688V3.656h1.962v10.688zM54.82 3.656h1.543v10.688H54.68v-6.61l-2.874 6.61h-1.262l-2.874-6.61v6.61h-1.683V3.656h1.542l3.646 8.368zm5.189 10.688V3.656h1.962v10.688zm15.075-2.436c-.572 1.14-1.461 1.809-2.25 2.135.093.214.528.81.856 1.153s.673.692 1.11 1.046l-1.332 1.055c-.49-.343-.917-.754-1.351-1.232a9 9 0 01-1.142-1.595 9 9 0 01-.451.014c-1.085 0-1.991-.222-2.773-.663a4.4 4.4 0 01-1.792-1.913c-.379-.756-.623-1.766-.623-2.908s.21-2.076.628-2.908a4.44 4.44 0 011.8-1.913c.783-.444 1.697-.663 2.76-.663s1.991.222 2.773.663a4.4 4.4 0 011.792 1.913c.415.832.623 1.766.623 2.908s-.25 2.154-.628 2.908m-6.935.009q.849 1.02 2.375 1.02 1.528 0 2.375-1.02c.567-.684.85-1.646.85-2.917 0-1.263-.283-2.247-.85-2.922q-.849-1.014-2.375-1.016-1.528 0-2.375 1.007c-.567.673-.85 1.66-.85 2.931s.283 2.233.85 2.917"/>
      <defs><radialGradient id="hdr-grad" cx="0" cy="0" r="1" gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)" gradientUnits="userSpaceOnUse"><stop stop-color="#ec991c"/><stop offset="1" stop-color="#e9b213"/></radialGradient></defs>
    </g>
  </svg>
  <h1>Component Registry Showcase</h1>
  <p>Every piece below is scaffolded by the <code>nq</code> CLI. Wallet and hub snippets are
  pixel-diffed against the real Nimiq component source before they ship; the marketing elements
  are screenshot-referenced recreations of nimiq.com.</p>
  <div class="pill">nq add &lt;component&gt; — Vue 3 or plain HTML</div>
</div>

<h2 class="section-title">The app page anatomy</h2>
<p class="section-sub">Four layout components composed the way every Wallet, Hub and Keyguard flow composes them.</p>
<div class="composite-wrap">
  ${composite}
  <ul class="composite-notes">
    <li><b>small-page</b> — the canonical 420×564&nbsp;px white card. Every screen in the Nimiq Wallet, Hub and Keyguard renders inside this exact frame; it never grows to fill the viewport.</li>
    <li><b>page-header</b> — centered title with optional back arrow and step dots (teal = completed). The Keyguard uses the dots for its 6-step onboarding.</li>
    <li><b>page-body</b> — the scrollable middle; flex-grows to push the footer down. Shown here holding an <b>identicon</b>, an <b>address-display</b> and an <b>amount</b>.</li>
    <li><b>page-footer</b> — pins the primary action. Light-blue is the wallet&rsquo;s &ldquo;prominent action&rdquo; button color.</li>
  </ul>
</div>

<h2 class="section-title">The pieces</h2>
<p class="section-sub">Each tile is the registry snippet rendered as-is. The purpose line comes from the component&rsquo;s meta.json; install any of them with <code>nq add &lt;name&gt;</code>.</p>
<div class="grid">
${tiles}
</div>

<div class="page-footer-band">
  Built from <a href="https://github.com/Andjroo111/nimiq-branding-cli">nimiq-branding-cli</a> · sources: nimiq/vue-components · @nimiq/style · nimiq/wallet
</div>

</body>
</html>`;

await writeFile(join(ROOT, 'showcase.html'), page);
console.log('showcase.html written,', TILES.length, 'tiles + composite');
