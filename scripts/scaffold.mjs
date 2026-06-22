// nq new-app <name> — scaffold a CANONICAL Nimiq fleet app.
//
// Bun + Hono + bun:sqlite + vanilla PWA + @nimiq/style/nq + the nimiq-settlement dep
// (mock client by default) + the Fly deploy kit (Dockerfile/fly.toml/.dockerignore/
// deploy.yml) + ci.yml + a stamped nimiq-stack.json + a /health route.
//
// This is the inverse of `nq align`: align grades drift FROM canonical; new STARTS at
// canonical, so a freshly-scaffolded app is `clean` on every axis out of the box.
//
// Flags: --no-chain (chainApp:false → omit settlement + styling parity, lean PWA)
//        --settlement=mock|rpc|noop   (default mock)
//        --deploy=fly|none            (default fly)
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

export async function scaffoldApp(name, opts = {}) {
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('nq new-app <kebab-case-name>');
  const dir = resolve(name);
  if (existsSync(dir)) throw new Error(`directory "${name}" already exists`);

  const chain = !opts.noChain;
  const settlement = opts.settlement ?? 'mock'; // mock | rpc | noop
  const deploy = opts.deploy ?? 'fly';          // fly | none
  if (!['mock', 'rpc', 'noop'].includes(settlement)) throw new Error(`--settlement must be mock|rpc|noop (got "${settlement}")`);
  if (!['fly', 'none'].includes(deploy)) throw new Error(`--deploy must be fly|none (got "${deploy}")`);

  const canonical = JSON.parse(await readFile(join(ROOT, 'align', 'canonical.json'), 'utf8'));
  const files = {};

  // shared fleet git deps, pinned to the latest tags the deps axis knows about (keeps a
  // freshly-scaffolded app CLEAN on the deps axis).
  const SHELL_DEP = 'github:Andjroo111/nimiq-app-shell#v0.1.0';
  const SETTLEMENT_DEP = 'github:Andjroo111/nimiq-settlement#v0.2.0';

  // ---- package.json ----
  files['package.json'] = JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'bun run --hot src/server.ts',
      start: 'bun run src/server.ts',
      test: 'bun test',
      align: 'nq align',
      // bundle the shared app-shell (wallet-connect + profile + runtime i18n) to a vendor
      // file the PWA loads. Run on install / before deploy. Esbuild via bunx — no devDep.
      'build:shell': "bunx esbuild --bundle --format=esm --minify --outfile=public/vendor/app-shell.js node_modules/nimiq-app-shell/dist/index.js || echo 'build:shell: nimiq-app-shell not installed yet — run bun install first'",
      postinstall: 'bun run build:shell',
    },
    dependencies: {
      hono: '^4.7.0',
      // shared shell: wallet-connect (Nimiq Pay mini-app), profile, runtime i18n.
      'nimiq-app-shell': SHELL_DEP,
      // chain reads via the shared rpc-block-scan settlement package; @nimiq/core signing-only.
      ...(chain ? { 'nimiq-settlement': SETTLEMENT_DEP, '@nimiq/core': '^2.6.1' } : {}),
    },
  }, null, 2) + '\n';

  // ---- src/server.ts (Hono + bun:sqlite + /health) ----
  files['src/server.ts'] = serverTs(name, chain, settlement);
  files['src/db.ts'] = dbTs();
  if (chain) files['src/chain.ts'] = chainTs(settlement);
  files['test/health.test.ts'] = healthTest(name, chain);

  // ---- vanilla PWA front end ----
  files['public/index.html'] = indexHtml(name, chain);
  files['public/app.js'] = appJs(name, chain);
  files['public/css/tokens.css'] = tokensCss();
  files['public/manifest.webmanifest'] = JSON.stringify({
    name, short_name: name, start_url: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: '#1f2348',
  }, null, 2) + '\n';

  // ---- i18n: locales the shell's createI18n loads + switches between at runtime ----
  files['public/locales/en.json'] = JSON.stringify({
    'app.title': name,
    'app.tagline': 'Canonical Nimiq fleet app.',
    'action.connect': 'Connect wallet',
    'action.ping': 'Ping /health',
  }, null, 2) + '\n';
  files['public/locales/de.json'] = JSON.stringify({
    'app.title': name,
    'app.tagline': 'Kanonische Nimiq-Fleet-App.',
    'action.connect': 'Wallet verbinden',
    'action.ping': '/health anpingen',
  }, null, 2) + '\n';

  // ---- config ----
  files['tsconfig.json'] = tsconfigJson();
  files['.gitignore'] = ['node_modules/', 'data/', '.DS_Store', 'dist/', 'public/vendor/', ''].join('\n');
  files['README.md'] = readmeMd(name, chain, settlement, deploy);

  // ---- deploy kit ----
  if (deploy === 'fly') {
    files['Dockerfile'] = dockerfile();
    files['fly.toml'] = flyToml(name);
    files['.dockerignore'] = ['node_modules', 'data', '.git', '*.md', ''].join('\n');
    files['.github/workflows/deploy.yml'] = deployYml();
  }
  files['.github/workflows/ci.yml'] = ciYml();

  // ---- the stamped manifest: starts CLEAN on every axis ----
  files['nimiq-stack.json'] = JSON.stringify(stampManifest(name, canonical, { chain, settlement, deploy }), null, 2) + '\n';

  // ---- write everything ----
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }

  return { dir, files: Object.keys(files), chain, settlement, deploy };
}

function stampManifest(name, canonical, { chain, settlement, deploy }) {
  const settlementPattern = settlement === 'rpc' ? 'rpc-block-scan' : settlement; // mock|noop pass through
  return {
    $schema: 'https://nimiq.tech/schemas/nimiq-stack.v1.json',
    schemaVersion: 1,
    name,
    chainApp: chain,
    exempt: false,
    exemptReason: null,
    stack: {
      framework: 'vanilla-pwa', server: 'hono@^4.7', runtime: 'bun', build: 'none', packageManager: 'bun',
    },
    styling: chain
      ? { source: 'nimiq-ui', notes: '@nimiq/style (CDN) + nq-* component classes; tokens in public/css/tokens.css' }
      : { source: 'nimiq-ui', notes: 'tokens only; no chain styling parity (--no-chain)' },
    settlement: chain
      ? { pattern: settlementPattern, lib: 'inline', coreRole: 'offline-crypto-only', notes: `client: ${settlement} (src/chain.ts rpc-block-scan); migrates to the shared nimiq-settlement package once extracted. @nimiq/core is signing-only.` }
      : { pattern: 'noop', lib: 'none', coreRole: 'none', notes: 'not a chain app (--no-chain)' },
    deploy: deploy === 'fly'
      ? { target: 'fly', region: 'ord', storage: 'fly-volume', volumeMount: '/app/data', autoDeploy: 'github-actions:workflow_run(CI)', edge: { provider: 'cloudflare', proxied: true, access: false } }
      : { target: 'unknown', region: null, storage: null, autoDeploy: null, edge: { provider: null, proxied: null, access: null } },
    config: { tsconfig: 'local-strict', lint: 'none', fileSizeGuard: 800, ci: true },
    canonicalVersion: canonical.canonicalVersion,
  };
}

// ---------- templates ----------
function serverTs(name, chain, settlement) {
  return `// ${name} — canonical Nimiq fleet app (Bun + Hono + bun:sqlite).
import { Hono } from 'hono';
import { db, migrate } from './db.ts';
${chain ? "import { chainClient } from './chain.ts';\n" : ''}
migrate();
export const app = new Hono();

// static PWA shell
app.get('/', () => new Response(Bun.file('public/index.html')));
app.get('/app.js', () => new Response(Bun.file('public/app.js')));
app.get('/css/tokens.css', () => new Response(Bun.file('public/css/tokens.css')));
app.get('/manifest.webmanifest', () => new Response(Bun.file('public/manifest.webmanifest')));
// shared app-shell bundle (build:shell) + i18n locale files
app.get('/vendor/:file', (c) => new Response(Bun.file('public/vendor/' + c.req.param('file'))));
app.get('/locales/:file', (c) => new Response(Bun.file('public/locales/' + c.req.param('file'))));

// health route — required by Fly checks + nq align deploy axis
app.get('/health', (c) => c.json({ ok: true, app: '${name}', ts: Date.now() }));

${chain ? `// chain reads go through the nimiq-settlement path — NEVER the @nimiq/core light client.
app.get('/api/balance/:address', async (c) => {
  const bal = await chainClient.getBalance(c.req.param('address'));
  return c.json({ address: c.req.param('address'), balance: bal });
});
` : ''}
const port = Number(process.env.PORT ?? 3000);
export default { port, fetch: app.fetch };
console.log('${name} listening on :' + port);
`;
}

function dbTs() {
  return `import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';

mkdirSync(process.env.DATA_DIR ?? 'data', { recursive: true });
export const db = new Database((process.env.DATA_DIR ?? 'data') + '/app.sqlite');

export function migrate() {
  db.run(\`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    payload TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )\`);
}
`;
}

function chainTs(settlement) {
  const impl = settlement === 'rpc'
    ? `// rpc-block-scan: read balances/txs from an Albatross JSON-RPC node. This is the
// canonical settlement path (forward-scan blocks). Do NOT spin up the @nimiq/core light
// client — it never reaches consensus on our hosts. RPC only.
const RPC_URL = process.env.NIMIQ_RPC_URL ?? 'http://127.0.0.1:8648';
async function rpc(method, params = []) {
  const r = await fetch(RPC_URL, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result?.data ?? j.result;
}
export const chainClient = {
  async getBalance(address) {
    const acc = await rpc('getAccountByAddress', [address]);
    return acc?.balance ?? 0;
  },
};`
    : settlement === 'noop'
    ? `// noop client — wired but inert. Swap to rpc (NIMIQ_RPC_URL) for real settlement.
export const chainClient = { async getBalance() { return 0; } };`
    : `// mock client (default) — deterministic fake balances for local dev + tests.
// Swap to the rpc client (NIMIQ_RPC_URL) for real settlement; never the light client.
// (no live chain access here)
export const chainClient = {
  async getBalance(address) {
    let h = 0; for (const ch of address) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 100000;
  },
};`;
  return `// chain.ts — settlement adapter. Conforms to the nimiq-settlement contract.
// Chain reads use rpc-block-scan; @nimiq/core (if imported elsewhere) is offline
// crypto only (key derivation / tx signing), never the light client.
${impl}
`;
}

function healthTest(name, chain) {
  return `import { test, expect } from 'bun:test';
import { app } from '../src/server.ts';

test('GET /health returns ok', async () => {
  const res = await app.fetch(new Request('http://x/health'));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.app).toBe('${name}');
});
${chain ? `
import { chainClient } from '../src/chain.ts';
test('chainClient.getBalance resolves a number (no light client)', async () => {
  const bal = await chainClient.getBalance('NQ00 0000 0000 0000 0000 0000 0000 0000 0000');
  expect(typeof bal).toBe('number');
});
` : ''}`;
}

function indexHtml(name, chain) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${name}</title>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/css/tokens.css">
${chain ? '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@nimiq/style@0.8/nimiq-style.min.css">\n' : ''}</head>
<body class="nq-style">
  <main class="app">
    <h1 class="nq-h1" data-i18n="app.title">${name}</h1>
    <p class="nq-text" data-i18n="app.tagline">Canonical Nimiq fleet app. Edit <code>public/app.js</code>.</p>
    <button class="nq-button" id="connect" data-i18n="action.connect">Connect wallet</button>
    <button class="nq-button" id="ping" data-i18n="action.ping">Ping /health</button>
    <pre id="out"></pre>
  </main>
  <script src="/app.js" type="module"></script>
</body>
</html>
`;
}

function appJs(name, chain) {
  // wire the shared app-shell: Nimiq Pay wallet-connect (mini-app) + runtime i18n.
  // The bundle is produced by `bun run build:shell` (esbuild → public/vendor/app-shell.js);
  // app-shell runs dual-mode (real Nimiq Pay SDK in-wallet, fallback connect elsewhere).
  return `// ${name} front end — wired to the shared nimiq-app-shell.
import { createWallet, createI18n } from './vendor/app-shell.js';

const out = document.getElementById('out');

// runtime i18n: nimiq.life (umbrella) hands off the initial language via ?lang=; users
// switch live with the flag picker. Strings live in public/locales/<lang>.json.
const i18n = createI18n({
  defaultLocale: new URLSearchParams(location.search).get('lang') || 'en',
  load: (lang) => fetch('/locales/' + lang + '.json').then((r) => r.json()),
});
i18n.apply?.(document);

// Nimiq Pay mini-app: createWallet runs as a mini-app inside the wallet, and falls back
// to wallet-connect elsewhere. Verify in-wallet before shipping.
const wallet = createWallet({ appName: '${name}' });
document.getElementById('connect')?.addEventListener('click', () => wallet.connect());

document.getElementById('ping')?.addEventListener('click', async () => {
  const r = await fetch('/health');
  out.textContent = JSON.stringify(await r.json(), null, 2);
});
${chain ? `
// chain reads go through the shared nimiq-settlement package (rpc-block-scan), never the
// light client. See src/chain.ts for the server-side adapter.
` : ''}`;
}

function tokensCss() {
  return `:root {
  --nimiq-blue: #1f2348;
  --nimiq-light-blue: #0582ca;
  --nimiq-gold: #e9b213;
  --nimiq-green: #21bca5;
  --bg: #ffffff;
  --bg-secondary: #f8f8f8;
  --radius: 8px;
}
body { margin: 0; font-family: 'Mulish', system-ui, sans-serif; background: var(--bg); color: var(--nimiq-blue); }
.app { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }
`;
}

function tsconfigJson() {
  return JSON.stringify({
    compilerOptions: {
      target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler',
      types: ['bun-types'], strict: true, noUncheckedIndexedAccess: true,
      noEmit: true, skipLibCheck: true,
    },
    include: ['src', 'public'],
  }, null, 2) + '\n';
}

function dockerfile() {
  return `FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
# install also runs postinstall → build:shell (bundles nimiq-app-shell → public/vendor)
RUN bun install --frozen-lockfile || bun install
COPY . .
# ensure the vendored shell bundle exists in the image (idempotent)
RUN bun run build:shell || true
ENV DATA_DIR=/app/data
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
`;
}

function flyToml(name) {
  return `app = "${name}"
primary_region = "ord"

[build]

[env]
  PORT = "3000"
  DATA_DIR = "/app/data"

[[mounts]]
  source = "${name.replace(/-/g, '_')}_data"
  destination = "/app/data"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [[http_service.checks]]
    method = "GET"
    path = "/health"
    interval = "30s"
    timeout = "5s"
`;
}

function deployYml() {
  return `name: deploy
on:
  workflow_run:
    workflows: [ci]
    types: [completed]
    branches: [main]
jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    concurrency: deploy-\${{ github.ref }}
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: \${{ secrets.FLY_API_TOKEN }}
`;
}

function ciYml() {
  return `name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
  align:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx -y github:Andjroo111/nimiq-branding-cli align --fail-on=settlement,styling
`;
}

function readmeMd(name, chain, settlement, deploy) {
  return `# ${name}

Canonical Nimiq fleet app — scaffolded by \`nq new\`.

- **Stack:** Bun + Hono + bun:sqlite + vanilla PWA${chain ? ' + @nimiq/style' : ''}
- **App shell:** \`nimiq-app-shell\` — Nimiq Pay wallet-connect (mini-app) + profile + runtime i18n. Bundled to \`public/vendor/app-shell.js\` by \`bun run build:shell\` (runs on \`postinstall\`).
- **i18n:** \`createI18n\` loads \`public/locales/<lang>.json\` (en, de seeded). The umbrella \`nimiq.life\` hands off the initial language via \`?lang=\`; users switch live with the flag picker.
${chain ? `- **Settlement:** \`${settlement}\` client (\`src/chain.ts\`), via the shared \`nimiq-settlement\` package. Chain reads use rpc-block-scan; \`@nimiq/core\` is signing-only — never the light client.\n` : '- **Chain:** none (`--no-chain`)\n'}- **Deploy:** ${deploy === 'fly' ? 'Fly.io (Dockerfile + fly.toml + persistent volume at /app/data)' : 'none yet — wire a target'}
- **Health:** \`GET /health\`

## Dev
\`\`\`
bun install      # also runs build:shell (bundles nimiq-app-shell → public/vendor)
bun run dev      # http://localhost:3000
bun test
nq align         # clean on the core axes; CLEAN on miniApp + i18n adoption axes too
\`\`\`

> **Verify the mini-app in-wallet.** \`createWallet\` runs as a Nimiq Pay mini-app inside the
> wallet and falls back to wallet-connect elsewhere. Test the real in-wallet flow before shipping.
${deploy === 'fly' ? `
## Deploy — Fly (stateful, this app)
\`\`\`
fly launch --no-deploy   # once, to create the app + volume
fly deploy               # CI auto-deploys on green (.github/workflows/deploy.yml)
\`\`\`

### Cloudflare (edge in front of Fly)
This app is **stateful** (bun:sqlite on a Fly volume), so it runs on Fly with Cloudflare
proxying in front — NOT Cloudflare Pages (Pages can't host a Bun+disk app without a D1
rewrite). Wire it up:

1. Add a DNS record for your hostname pointing at the Fly app (CNAME → \`${name}.fly.dev\`),
   **proxied** (orange cloud) in the Cloudflare dashboard.
2. \`fly certs add <your-host>\` so Fly serves a valid cert behind the proxy.
3. Keep SSL/TLS mode **Full (strict)**.

A purely-static fleet app (no DB) deploys to **Cloudflare Pages** instead; this scaffold is
stateful, so Fly + Cloudflare-proxy is the canonical 2-lane choice.
` : ''}`;
}
