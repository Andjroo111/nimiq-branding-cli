// One-time (idempotent) bootstrap: write a structured `source` provenance block
// into every registry component's meta.json. The audit (scripts/audit.mjs) reads
// this to attribute an upstream diff to the exact components it touches.
//
// `source` schema:
//   { "repo": "<primary repo|original|nimiq-com>",
//     "ref":  "<short sha of the primary repo's vendored pin at bootstrap>",
//     "files": ["<repo>:<path within upstream/<repo>>", ...] }
//
// `files` entries are "repo:path" strings (primary repo first) so the audit can
// split on ":" and the format matches audit/learnings.json patterns.
//
// Run: node scripts/bootstrap-provenance.mjs [--check]
//   --check : report only, do not write.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = join(ROOT, 'registry', 'components');
const CHECK = process.argv.includes('--check');

// Primary repo + the upstream source file(s) each component was ported from.
// Derived from meta.notes citations, the @nimiq/vue-components PascalCase
// mapping, and the FEATURES.md "Built from:" survey. Marketing components are
// calibrated to nimiq.com screenshots/assets (no vendored git repo → "nimiq-com");
// flag-hex is an original brand composition ("original").
const MAP = {
  // --- @nimiq/vue-components ports (upstream/vue-components/src/components/*.vue) ---
  'account-list':      { repo: 'vue-components', files: ['vue-components:src/components/AccountList.vue', 'vue-components:src/components/Identicon.vue'] },
  'account-ring':      { repo: 'vue-components', files: ['vue-components:src/components/AccountRing.vue', 'vue-components:src/components/Identicon.vue'] },
  'address-display':   { repo: 'vue-components', files: ['vue-components:src/components/AddressDisplay.vue'] },
  'address-input':     { repo: 'vue-components', files: ['vue-components:src/components/AddressInput.vue'] },
  'amount':            { repo: 'vue-components', files: ['vue-components:src/components/Amount.vue'] },
  'amount-input':      { repo: 'vue-components', files: ['vue-components:src/components/AmountInput.vue'] },
  'amount-with-fee':   { repo: 'vue-components', files: ['vue-components:src/components/AmountWithFee.vue', 'vue-components:src/components/AmountInput.vue'] },
  'close-button':      { repo: 'vue-components', files: ['vue-components:src/components/CloseButton.vue'] },
  'copyable':          { repo: 'vue-components', files: ['vue-components:src/components/Copyable.vue'] },
  'fiat-amount':       { repo: 'vue-components', files: ['vue-components:src/components/FiatAmount.vue'] },
  'identicon':         { repo: 'vue-components', files: ['vue-components:src/components/Identicon.vue'] },
  'label-input':       { repo: 'vue-components', files: ['vue-components:src/components/LabelInput.vue'] },
  'loading-spinner':   { repo: 'vue-components', files: ['vue-components:src/components/LoadingSpinner.vue'] },
  'page-body':         { repo: 'vue-components', files: ['vue-components:src/components/PageBody.vue'] },
  'page-footer':       { repo: 'vue-components', files: ['vue-components:src/components/PageFooter.vue'] },
  'page-header':       { repo: 'vue-components', files: ['vue-components:src/components/PageHeader.vue'] },
  'payment-info-line': { repo: 'vue-components', files: ['vue-components:src/components/PaymentInfoLine.vue', 'vue-components:src/components/Timer.vue', 'vue-components:src/components/Identicon.vue'] },
  'qr-code':           { repo: 'vue-components', files: ['vue-components:src/components/QrCode.vue'] },
  'select-bar':        { repo: 'vue-components', files: ['vue-components:src/components/SelectBar.vue'] },
  'slider-toggle':     { repo: 'vue-components', files: ['vue-components:src/components/SliderToggle.vue'] },
  'small-page':        { repo: 'vue-components', files: ['vue-components:src/components/SmallPage.vue'] },
  'timer':             { repo: 'vue-components', files: ['vue-components:src/components/Timer.vue'] },
  'tooltip':           { repo: 'vue-components', files: ['vue-components:src/components/Tooltip.vue'] },

  // --- CSS-framework components (upstream/nimiq-style) ---
  'buttons': { repo: 'nimiq-style', files: ['nimiq-style:src/buttons.css', 'nimiq-style:nimiq-style.min.css'] },
  'card':    { repo: 'nimiq-style', files: ['nimiq-style:src/layout.css', 'nimiq-style:nimiq-style.min.css'] },

  // --- wallet ports (upstream/wallet/src/components) ---
  'account-header':       { repo: 'wallet', files: ['wallet:src/components/layouts/AddressOverview.vue', 'wallet:src/components/SearchBar.vue', 'wallet:src/components/staking/StakingButton.vue', 'wallet:src/components/icons/Staking/StakingIcon.vue'] },
  'backup-banner':        { repo: 'wallet', files: ['wallet:src/components/layouts/AccountOverview.vue'] },
  'balance-distribution': { repo: 'wallet', files: ['wallet:src/components/BalanceDistribution.vue'] },
  'consensus-icon':       { repo: 'wallet', files: ['wallet:src/components/ConsensusIcon.vue', 'wallet:src/components/icons/WorldCheckIcon.vue'] },
  'price-chart':          { repo: 'wallet', files: ['wallet:src/components/PriceChart.vue', 'wallet:src/components/LineChart.vue'] },
  'search-bar':           { repo: 'wallet', files: ['wallet:src/components/SearchBar.vue'] },
  'swap-balance-bar':     { repo: 'wallet', files: ['wallet:src/components/swap/SwapBalanceBar.vue'] },
  'toast-notification':   { repo: 'wallet', files: ['wallet:src/components/swap/SwapNotification.vue'] },
  'transaction-list':     { repo: 'wallet', files: ['wallet:src/components/TransactionListItem.vue', 'wallet:src/components/TransactionList.vue'] },

  // --- hub ---
  'status-screen': { repo: 'hub', files: ['hub:src/components/StatusScreen.vue'] },

  // --- nimiq-ui (docs theme) ---
  'status-alert': { repo: 'nimiq-ui', files: ['nimiq-ui:packages/nimiq-vitepress-theme/src/assets/github-callouts.css'] },

  // --- marketing: calibrated to nimiq.com (no vendored git repo) ---
  'app-showcase-card': { repo: 'nimiq-com', files: [] },
  'hero-section':      { repo: 'nimiq-com', files: [] },
  'honeycomb-band':    { repo: 'nimiq-com', files: [] },

  // --- original brand composition ---
  'flag-hex': { repo: 'original', files: [] },
};

const VIRTUAL = new Set(['original', 'nimiq-com']); // not vendored git repos

function shortHead(repo) {
  if (VIRTUAL.has(repo)) return null;
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: join(ROOT, 'upstream', repo), encoding: 'utf8',
    }).trim();
  } catch { return null; }
}

function fileExists(spec) {
  const [repo, ...rest] = spec.split(':');
  const path = rest.join(':');
  if (VIRTUAL.has(repo)) return true;
  return existsSync(join(ROOT, 'upstream', repo, path));
}

const { readdir } = await import('node:fs/promises');
const names = (await readdir(COMPONENTS)).sort();
let missing = [], unresolved = [], wrote = 0;

for (const name of names) {
  const entry = MAP[name];
  if (!entry) { missing.push(name); continue; }
  for (const f of entry.files) if (!fileExists(f)) unresolved.push(`${name} → ${f}`);

  const metaPath = join(COMPONENTS, name, 'meta.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  meta.source = { repo: entry.repo, ref: shortHead(entry.repo), files: entry.files };
  if (!CHECK) {
    await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');
    wrote++;
  }
}

console.log(`components: ${names.length}, mapped: ${names.length - missing.length}, ${CHECK ? 'checked' : `wrote ${wrote}`}`);
if (missing.length) console.log(`UNMAPPED (no MAP entry): ${missing.join(', ')}`);
if (unresolved.length) { console.log(`UNRESOLVED upstream paths:`); unresolved.forEach(u => console.log('  ✗ ' + u)); }
else console.log('all upstream paths resolve ✓');
process.exitCode = (missing.length || unresolved.length) ? 1 : 0;
