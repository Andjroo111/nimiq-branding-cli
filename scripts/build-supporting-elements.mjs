// Build supporting-elements.html — recreates the FEEL of Andrew's 2026-06-11
// wallet/site screenshots (references/supporting-elements-brief-2026-06-11.md)
// by composing the registry snippets (registry/components/<name>/html/).
// Layout: wallet elements on the light wallet page, then the navy sidebar panel,
// then the nimiq.com marketing elements full-bleed.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const C = join(ROOT, 'registry', 'components');

const NEEDED = [
  'backup-banner', 'account-header', 'transaction-list', 'search-bar',
  'swap-balance-bar', 'price-chart', 'balance-distribution',
  'hero-section', 'app-showcase-card', 'honeycomb-band',
];

const snippets = {};
let styles = '';
for (const name of NEEDED) {
  const htmlPath = join(C, name, 'html', `${name}.html`);
  const cssPath = join(C, name, 'html', `${name}.css`);
  if (!existsSync(htmlPath)) { console.warn(`skip ${name}: no snippet dir`); continue; }
  snippets[name] = (await readFile(htmlPath, 'utf8')).replaceAll('../../../../assets/', 'assets/'); // rewriteAssetPaths: page lives at repo root
  if (existsSync(cssPath)) styles += `\n/* === ${name} === */\n` + await readFile(cssPath, 'utf8');
}

const caption = (name, dark = false) =>
  `<figcaption class="cap${dark ? ' cap-dark' : ''}"><span class="cap-name">${name}</span><code>nq add ${name}</code></figcaption>`;

// An exhibit = the snippet on a white stage card + caption. Returns '' if the
// component is missing so the page still builds.
const exhibit = (name, { stageStyle = '', stageClass = 'stage' } = {}) => {
  if (!snippets[name]) return '';
  return `
  <figure class="exhibit" id="x-${name}">
    <div class="${stageClass}"${stageStyle ? ` style="${stageStyle}"` : ''}>${snippets[name]}</div>
    ${caption(name)}
  </figure>`;
};

// ---- Wallet section ----------------------------------------------------------

const walletExhibits = [];
walletExhibits.push(exhibit('backup-banner', { stageStyle: 'max-width:600px' }));
walletExhibits.push(exhibit('account-header'));
walletExhibits.push(exhibit('transaction-list'));

// Row pairing search-bar + swap-balance-bar
const pairRow = (snippets['search-bar'] || snippets['swap-balance-bar']) ? `
  <div class="pair-row">
    ${snippets['search-bar'] ? `
    <figure class="exhibit" id="x-search-bar">
      <div class="stage stage-search"><div class="search-host">${snippets['search-bar']}</div></div>
      ${caption('search-bar')}
    </figure>` : ''}
    ${snippets['swap-balance-bar'] ? `
    <figure class="exhibit" id="x-swap-balance-bar">
      <div class="stage stage-swap"><div class="swap-host">${snippets['swap-balance-bar']}</div></div>
      ${caption('swap-balance-bar')}
    </figure>` : ''}
  </div>` : '';

// Navy sidebar panel: price-chart + balance-distribution (+ the sidebar's Swap
// pill, which in the wallet is a sibling of the distribution ring).
const sidebarPanel = (snippets['price-chart'] || snippets['balance-distribution']) ? `
  <figure class="exhibit" id="x-sidebar-panel">
    <div class="sidebar-panel">
      ${snippets['price-chart'] ? `
      <div class="sidebar-item" id="x-price-chart">
        ${snippets['price-chart']}
      </div>` : ''}
      ${snippets['balance-distribution'] ? `
      <div class="sidebar-item sidebar-item-pad" id="x-balance-distribution">
        ${snippets['balance-distribution']}
        <button class="nq-button-s inverse sidebar-swap-pill">Swap</button>
      </div>` : ''}
    </div>
    ${snippets['price-chart'] ? caption('price-chart') : ''}
    ${snippets['balance-distribution'] ? caption('balance-distribution') : ''}
  </figure>` : '';

// ---- Marketing section -------------------------------------------------------

const hero = snippets['hero-section'] ? `
  <figure class="exhibit exhibit-bleed" id="x-hero-section">
    ${snippets['hero-section']}
    ${caption('hero-section')}
  </figure>` : '';

const appCards = snippets['app-showcase-card'] ? `
  <figure class="exhibit" id="x-app-showcase-card">
    <div class="cards-row">${snippets['app-showcase-card']}</div>
    ${caption('app-showcase-card')}
  </figure>` : '';

const honeycomb = snippets['honeycomb-band'] ? `
  <figure class="exhibit exhibit-bleed exhibit-white" id="x-honeycomb-band">
    ${snippets['honeycomb-band']}
    ${caption('honeycomb-band')}
  </figure>` : '';

// ---- Page --------------------------------------------------------------------

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nimiq Supporting Elements — wallet &amp; marketing demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Fira+Mono:400,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/legacy/nimiq-style.min.css">
<style>
body { font-family: 'Mulish', 'Muli', system-ui, sans-serif !important; background: #F8F8F8; margin: 0; }

/* intro band */
.intro { background-image: radial-gradient(100% 100% at bottom right, #260133, #1F2348); color: #fff; padding: 56px 32px 48px; text-align: center; }
.intro h1 { font-size: 30px; font-weight: 800; margin: 0 0 10px; letter-spacing: -0.5px; }
.intro p { font-size: 16px; color: rgba(255,255,255,0.6); max-width: 660px; margin: 0 auto; line-height: 1.6; }
.intro code { color: #E9B213; }

.section-title { max-width: 1160px; margin: 64px auto 8px; padding: 0 32px; font-size: 22px; font-weight: 800; color: #1F2348; }
.section-sub { max-width: 1160px; margin: 0 auto 32px; padding: 0 32px; color: rgba(31,35,72,0.5); font-size: 15px; line-height: 1.6; }

/* wallet column */
.wallet-col { max-width: 1160px; margin: 0 auto; padding: 0 32px 24px; display: flex; flex-direction: column; gap: 44px; }

.exhibit { margin: 0; }
.stage { background: #fff; border-radius: 12px; box-shadow: 0 4px 28px rgba(0,0,0,0.07); padding: 32px; }
.cap { display: flex; align-items: baseline; gap: 12px; margin: 12px 4px 0; font-size: 13px; color: rgba(31,35,72,0.55); }
.cap .cap-name { font-family: 'Fira Mono', monospace; font-weight: 500; color: #1F2348; }
.cap code { font-family: 'Fira Mono', monospace; font-size: 12px; color: #0582CA; background: rgba(5,130,202,0.08); border-radius: 4px; padding: 2px 7px; }
.cap-dark { color: rgba(255,255,255,0.45); margin: 14px 0 0; }
.cap-dark .cap-name { color: rgba(255,255,255,0.85); }
.cap-dark code { color: #9adcf5; background: rgba(255,255,255,0.08); }

/* per-exhibit sizing (demo chrome, mirrors each component's demo.html) */
#x-account-header .account-header { width: 100%; max-width: 880px; margin: 0 auto; }
#x-transaction-list .transaction-list { width: 100%; max-width: 720px; margin: 0 auto; background: #fff; }

/* search-bar + swap-balance-bar row */
.pair-row { display: flex; gap: 44px; align-items: stretch; flex-wrap: wrap; }
.pair-row .exhibit { display: flex; flex-direction: column; }
.pair-row .stage { flex: 1; display: flex; align-items: center; }
.stage-search { min-width: 320px; }
.search-host { width: 100%; min-width: 280px; max-width: 400px; }
.stage-swap { flex: 1; }
.swap-host { width: 444px; max-width: 100%; padding-bottom: 1.5rem; margin: 0 auto; }
#x-swap-balance-bar { flex: 1; }
#x-search-bar { flex: 0 1 380px; }

/* navy sidebar panel (wallet sidebar context) */
.sidebar-panel { width: 264px; background-image: radial-gradient(100% 100% at bottom right, #260133, #1F2348); border-radius: 12px; padding: 28px 0 22px; display: flex; flex-direction: column; gap: 28px; box-shadow: 0 4px 28px rgba(0,0,0,0.18); }
/* keep --bg-secondary navy: the 24h badge uses it for its knockout text + border */
.sidebar-panel .price-chart-widget { background: transparent; width: 100%; padding: 0 2.5rem; }
.sidebar-item { display: flex; flex-direction: column; }
.sidebar-item .cap { padding: 0 20px; }
.sidebar-item-pad { padding: 0; }
.sidebar-item-pad .balance-distribution { margin: 0 20px; }
.sidebar-swap-pill { margin: 18px 20px 0; align-self: flex-start; }

/* marketing */
.exhibit-bleed { display: flex; flex-direction: column; }
.exhibit-bleed .cap { max-width: 1160px; margin: 14px auto 0; padding: 0 32px; align-self: stretch; box-sizing: border-box; }
.exhibit-white { background: #fff; padding-bottom: 28px; }
.cards-row { display: flex; flex-wrap: wrap; gap: 36px; justify-content: center; align-items: flex-start; max-width: 1160px; margin: 0 auto; padding: 8px 32px 0; }
#x-app-showcase-card .cap { max-width: 1160px; margin: 16px auto 0; padding: 0 32px; box-sizing: border-box; }
.marketing-spacer { height: 48px; }

/* footer */
.page-footer-band { background-image: radial-gradient(100% 100% at bottom right, #260133, #1F2348); color: rgba(255,255,255,0.5); text-align: center; padding: 40px 32px; font-size: 14px; margin-top: 72px; }
.page-footer-band a { color: rgba(255,255,255,0.5); text-decoration: none; }
.page-footer-band a:hover { color: #fff; }

/* component snippet styles (verbatim from the registry) */
${styles}
</style>
</head>
<body>

<div class="intro">
  <h1>Supporting Elements</h1>
  <p>The wallet and nimiq.com elements from Andrew&rsquo;s 2026-06-11 screenshots, recreated from the
  registry snippets. Install any of them with <code>nq add &lt;name&gt;</code>.</p>
</div>

<h2 class="section-title">Wallet elements</h2>
<p class="section-sub">wallet.nimiq.com, logged in, light mode — the account overview, transaction history,
swap distribution bar, and the navy sidebar widgets.</p>
  <p style="text-align:center;margin:6px 0 0"><a href="showcase.html" style="color:#0582CA;font-weight:700;text-decoration:none">→ Full component gallery (all 39, incl. cards, toasts, buttons)</a></p>

<div class="wallet-col">
  ${walletExhibits.join('\n')}
  ${pairRow}
  ${sidebarPanel}
</div>

<h2 class="section-title">Marketing elements</h2>
<p class="section-sub">nimiq.com — the home hero, THE APPS showcase cards (standard + wide), and the community
honeycomb band.</p>

${hero}
<div class="marketing-spacer"></div>
${appCards}
<div class="marketing-spacer"></div>
${honeycomb}

<div class="page-footer-band">
  Built from <a href="https://github.com/Andjroo111/nimiq-branding-cli">nimiq-branding-cli</a> · see also <a href="showcase.html">the full component showcase</a>
</div>

</body>
</html>`;

await writeFile(join(ROOT, 'supporting-elements.html'), page);
console.log(`supporting-elements.html written (${Object.keys(snippets).length}/${NEEDED.length} components)`);
