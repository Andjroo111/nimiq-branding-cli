// Tests for `nq align` — the fleet stack-alignment grader.
// Uses node:test (the runner declared in package.json: `node --test test/`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { alignApp, loadCanonical, CLEAN, SAFE, RISKY } = await import(join(ROOT, 'scripts', 'align.mjs'));

async function tmpApp(files) {
  const dir = await mkdtemp(join(tmpdir(), 'nq-align-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

const canonicalManifest = (over = {}) => ({
  schemaVersion: 1, name: 'app', chainApp: true, exempt: false, exemptReason: null,
  stack: { framework: 'vanilla-pwa', server: 'hono@^4.7', runtime: 'bun', build: 'none', packageManager: 'bun' },
  styling: { source: 'nimiq-ui' },
  settlement: { pattern: 'rpc-block-scan', lib: 'inline', coreRole: 'offline-crypto-only' },
  deploy: { target: 'fly' },
  config: { tsconfig: 'local-strict', lint: 'none', fileSizeGuard: 800, ci: true },
  canonicalVersion: '0.1.0',
  ...over,
});

test('canonical fleet baseline loads with a version', async () => {
  const c = await loadCanonical();
  assert.equal(typeof c.canonicalVersion, 'string');
  assert.ok(c.lightClient.forbiddenCalls.includes('Client.create('));
});

test('a canonical manifest with Dockerfile+fly.toml+CI grades clean', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'FROM oven/bun:1\n', 'fly.toml': 'app="x"\n',
    '.github/workflows/ci.yml': 'name: ci\n',
  });
  const r = await alignApp(dir);
  assert.equal(r.overall, CLEAN, JSON.stringify(r.axes, null, 2));
  await rm(dir, { recursive: true, force: true });
});

test('HARD FAIL: @nimiq/core/web import in src → settlement risky-fail', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/chain.ts': "import { Client } from '@nimiq/core/web';\n",
  });
  const r = await alignApp(dir);
  assert.equal(r.axes.settlement.verdict, RISKY);
  assert.equal(r.overall, RISKY);
  assert.ok(r.axes.settlement.lines.some(l => l.includes('@nimiq/core/web')));
  await rm(dir, { recursive: true, force: true });
});

test('HARD FAIL: Client.create( in src → settlement risky-fail (Client.create is the light-client tell)', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/boot.ts': 'const c = Client.create(cfg);\nawait c.waitForConsensusEstablished();\n',
  });
  const r = await alignApp(dir);
  assert.equal(r.axes.settlement.verdict, RISKY);
  assert.ok(r.axes.settlement.lines.some(l => l.includes('Client.create(')));
  // waitForConsensusEstablished( is a legit NimiqClientLike interface / rpc-client method — NOT forbidden.
  assert.ok(!r.axes.settlement.lines.some(l => l.includes('waitForConsensusEstablished(')), 'waitForConsensusEstablished must not be flagged');
  await rm(dir, { recursive: true, force: true });
});

test('the canonical rpc-block-scan client (implements waitForConsensusEstablished) is NOT flagged', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/payments/nimiq-rpc-client.ts': 'export class RpcNimiqClient {\n  async waitForConsensusEstablished() { /* RPC poll of isConsensusEstablished */ }\n}\n',
    'src/payments/nimiq-provider.ts': 'export interface NimiqClientLike {\n  waitForConsensusEstablished(): Promise<void>;\n}\n',
  });
  const r = await alignApp(dir);
  assert.notEqual(r.axes.settlement.verdict, RISKY, 'the canonical rpc client + interface must stay clean');
  await rm(dir, { recursive: true, force: true });
});

test('forbidden light-client strings inside a *.test.* file are ignored', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/chain.test.ts': "import x from '@nimiq/core/web';\nconst c = Client.create(cfg);\n",
  });
  const r = await alignApp(dir);
  assert.notEqual(r.axes.settlement.verdict, RISKY, 'test/spec files are excluded from the light-client scan');
  await rm(dir, { recursive: true, force: true });
});

test('a pure comment mentioning Client.create() does NOT hard-fail', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/chain.ts': '// never call Client.create() — use rpc\nexport const x = 1;\n',
  });
  const r = await alignApp(dir);
  assert.notEqual(r.axes.settlement.verdict, RISKY, 'comment should not trip the hard fail');
  await rm(dir, { recursive: true, force: true });
});

test('a comment quoting the forbidden import (with import/from words) does NOT hard-fail', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    // The bug: this comment contains "import"/"from" AND "@nimiq/core/web", which used to
    // trip the import detector even though it is plainly a comment, not a real import.
    'src/notes.ts': '// reminder: never import from "@nimiq/core/web"; reads go via nimiq-settlement\nexport const x = 1;\n',
  });
  const r = await alignApp(dir);
  assert.notEqual(r.axes.settlement.verdict, RISKY, 'a comment quoting the import must not trip the hard fail');
  await rm(dir, { recursive: true, force: true });
});

test('declared settlement.pattern light-client → risky-fail even without src hit', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ settlement: { pattern: 'light-client', lib: 'inline', coreRole: 'none' } }),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir);
  assert.equal(r.axes.settlement.verdict, RISKY);
  await rm(dir, { recursive: true, force: true });
});

test('STYLING: chainApp with non-nimiq styling → risky-fail', async () => {
  const dir = await tmpApp({ 'nimiq-stack.json': canonicalManifest({ styling: { source: 'tailwind' } }) });
  const r = await alignApp(dir);
  assert.equal(r.axes.styling.verdict, RISKY);
  await rm(dir, { recursive: true, force: true });
});

test('STYLING: --no-chain (chainApp:false) is never failed on styling', async () => {
  const dir = await tmpApp({ 'nimiq-stack.json': canonicalManifest({ chainApp: false, styling: { source: 'tailwind' } }) });
  const r = await alignApp(dir);
  assert.equal(r.axes.styling.verdict, CLEAN);
  assert.equal(r.axes.settlement.verdict, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('EXEMPT app is reported and NEVER failed, even with a light-client pattern', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ exempt: true, exemptReason: 'nimiq.tech', styling: { source: 'tailwind' }, settlement: { pattern: 'light-client', lib: 'none', coreRole: 'none' } }),
  });
  const r = await alignApp(dir);
  assert.equal(r.exempt, true);
  assert.equal(r.overall, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('DEPLOY: unknown target / no CI → safe-drift (not fail)', async () => {
  const dir = await tmpApp({ 'nimiq-stack.json': canonicalManifest({ deploy: { target: 'unknown' }, config: { tsconfig: 'local-strict', lint: 'none', fileSizeGuard: 800, ci: false } }) });
  const r = await alignApp(dir);
  assert.equal(r.axes.deploy.verdict, SAFE);
  assert.notEqual(r.overall, RISKY);
  await rm(dir, { recursive: true, force: true });
});

test('absent manifest is inferred (not written without --fix), then written with --fix', async () => {
  const dir = await tmpApp({ 'package.json': { name: 'inferme', dependencies: { hono: '^4' } } });
  const r1 = await alignApp(dir);
  assert.equal(r1.inferred, true);
  assert.equal(existsSync(join(dir, 'nimiq-stack.json')), false);
  const r2 = await alignApp(dir, { fix: true });
  assert.equal(r2.wrote, true);
  assert.equal(existsSync(join(dir, 'nimiq-stack.json')), true);
  await rm(dir, { recursive: true, force: true });
});

test('--fix repairs canonicalVersion + backfills config on an existing manifest', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ canonicalVersion: '0.0.1', config: { tsconfig: 'local-strict', lint: 'none', ci: true } }),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  await alignApp(dir, { fix: true });
  const m = JSON.parse(await (await import('node:fs/promises')).readFile(join(dir, 'nimiq-stack.json'), 'utf8'));
  assert.equal(m.canonicalVersion, '0.1.0');
  assert.equal(m.config.fileSizeGuard, 800);
  await rm(dir, { recursive: true, force: true });
});

// ---- identity axis ----

test('IDENTITY: a fleet repo whose package+stack names match the repo grades clean', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'nimiq.party' }),
    'package.json': { name: 'nimiq.party' },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { repoName: 'nimiq.party' });
  assert.equal(r.axes.identity.verdict, CLEAN, JSON.stringify(r.axes.identity, null, 2));
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: package.json name != repo name → risky-fail (drives overall risky)', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'nimiq.party' }),
    'package.json': { name: 'splitlink' },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { repoName: 'nimiq.party' });
  assert.equal(r.axes.identity.verdict, RISKY);
  assert.equal(r.overall, RISKY);
  assert.ok(r.axes.identity.lines.some(l => l.includes('package.json name')));
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: a stale codename in nimiq-stack.json name → risky-fail', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'splitlink' }),
    'package.json': { name: 'nimiq.party' },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { repoName: 'nimiq.party' });
  assert.equal(r.axes.identity.verdict, RISKY);
  // the name-mismatch line fires AND the stale-codename scan flags it
  assert.ok(r.axes.identity.lines.some(l => l.includes('splitlink')));
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: stale codename in fly.toml app + a stale env var name → risky-fail', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'nimiq.party' }),
    'package.json': { name: 'nimiq.party' },
    'Dockerfile': 'x',
    'fly.toml': 'app = "tipjar"\n[[mounts]]\n  source = "tipjar_data"\n',
    'src/db.ts': 'const t = process.env.TIPJAR_DB_PATH;\n',
    '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { repoName: 'nimiq.party' });
  assert.equal(r.axes.identity.verdict, RISKY);
  assert.ok(r.axes.identity.lines.some(l => l.includes('fly.toml')));
  assert.ok(r.axes.identity.lines.some(l => l.toLowerCase().includes('tipjar')));
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: a non-fleet repo name is not-applicable → identity clean', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'splitlink' }),
    'package.json': { name: 'splitlink' },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  // basename of a tmp dir is not a fleet name, and we pass no override → not enforced
  const r = await alignApp(dir);
  assert.equal(r.axes.identity.verdict, CLEAN);
  assert.notEqual(r.overall, RISKY);
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: shared deps + own canonical name are never flagged as stale', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'nimiq.party' }),
    'package.json': {
      name: 'nimiq.party',
      description: 'A nimiq.party app built on nimiq-settlement and nimiq-app-shell',
      dependencies: { 'nimiq-settlement': '*', 'nimiq-app-shell': '*' },
    },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { repoName: 'nimiq.party' });
  assert.equal(r.axes.identity.verdict, CLEAN, JSON.stringify(r.axes.identity, null, 2));
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: an odd env-var prefix is advisory (safe-drift), not a fail', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({ name: 'nimiq.party' }),
    'package.json': { name: 'nimiq.party' },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    // not NIMIQ_PARTY_*, not NIMIQ_*, not neutral → advisory only
    'src/cfg.ts': 'const k = process.env.SOME_CUSTOM_KEY;\nconst rpc = process.env.NIMIQ_RPC_URL;\n',
  });
  const r = await alignApp(dir, { repoName: 'nimiq.party' });
  assert.equal(r.axes.identity.verdict, SAFE);
  assert.notEqual(r.overall, RISKY);
  assert.ok(r.axes.identity.lines.some(l => l.includes('SOME_CUSTOM_KEY')));
  // NIMIQ_RPC_URL is neutral → must not be listed
  assert.ok(!r.axes.identity.lines.some(l => l.includes('NIMIQ_RPC_URL')));
  await rm(dir, { recursive: true, force: true });
});

test('IDENTITY: existing fixtures (name "app", tmp basename) stay not-applicable / clean', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'FROM oven/bun:1\n', 'fly.toml': 'app="x"\n',
    '.github/workflows/ci.yml': 'name: ci\n',
  });
  const r = await alignApp(dir);
  assert.equal(r.axes.identity.verdict, CLEAN);
  assert.equal(r.overall, CLEAN, JSON.stringify(r.axes, null, 2));
  await rm(dir, { recursive: true, force: true });
});

// ---- adoption axes (miniApp / i18n / deps) are ADVISORY: max safe-drift, never gate ----

// a fixed ls-remote stub so the deps axis never touches the network in tests.
const lsRemoteStub = (tags) => () => tags.map(t => `deadbeef\trefs/tags/${t}`).join('\n');
const lsRemoteOffline = () => null;

test('miniApp: a bare chainApp (no wiring) is SAFE-DRIFT but does NOT move overall', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.miniApp.verdict, SAFE);
  assert.equal(r.overall, CLEAN, 'advisory axis must not move overall'); // overall stays clean
  await rm(dir, { recursive: true, force: true });
});

test('miniApp: importing createWallet from nimiq-app-shell → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'public/app.js': "import { createWallet } from 'nimiq-app-shell';\nconst w = createWallet({ appName: 'x' });\n",
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.miniApp.verdict, CLEAN);
  assert.ok(r.axes.miniApp.lines.some(l => l.includes('createWallet')));
  await rm(dir, { recursive: true, force: true });
});

test('miniApp: a real mini-app SDK reference (window.nimiqPay / @nimiq/mini-app-sdk) → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/pay.ts': "import { pay } from '@nimiq/mini-app-sdk';\nconst p = window.nimiqPay;\n",
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.miniApp.verdict, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('miniApp: a STUB/MOCK provider is SAFE-DRIFT (present but not adopted)', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    // shell import present but flagged as a competition-era stub on the same line
    'public/app.js': "import { createWallet } from 'nimiq-app-shell'; // stub provider (competition)\n",
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.miniApp.verdict, SAFE);
  assert.ok(r.axes.miniApp.lines.some(l => l.toLowerCase().includes('stub')));
  assert.notEqual(r.overall, RISKY);
  await rm(dir, { recursive: true, force: true });
});

test('miniApp: --no-chain apps are never tracked → CLEAN', async () => {
  const dir = await tmpApp({ 'nimiq-stack.json': canonicalManifest({ chainApp: false }) });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.miniApp.verdict, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('i18n: createI18n from the shell → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'public/app.js': "import { createI18n } from 'nimiq-app-shell';\nconst i = createI18n({ defaultLocale: 'en' });\n",
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.i18n.verdict, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('i18n: vue-i18n usage → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/i18n.ts': "import { useI18n } from 'vue-i18n';\nexport const t = useI18n();\n",
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.i18n.verdict, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('i18n: a locales dir with >1 language file → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'public/locales/en.json': '{"hi":"hi"}',
    'public/locales/de.json': '{"hi":"hallo"}',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.i18n.verdict, CLEAN);
  assert.ok(r.axes.i18n.lines.some(l => l.includes('locale files')));
  await rm(dir, { recursive: true, force: true });
});

test('i18n: a single locale file is SAFE-DRIFT (advisory), overall unaffected', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'public/locales/en.json': '{"hi":"hi"}',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.i18n.verdict, SAFE);
  assert.equal(r.overall, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('i18n: hardcoded-English (no i18n) is SAFE-DRIFT, never risky', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.i18n.verdict, SAFE);
  assert.notEqual(r.overall, RISKY);
  await rm(dir, { recursive: true, force: true });
});

test('deps: a shared package pinned to an OLDER tag than latest → SAFE-DRIFT', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'package.json': { name: 'app', dependencies: { 'nimiq-settlement': 'github:Andjroo111/nimiq-settlement#v0.1.0' } },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteStub(['v0.1.0', 'v0.2.0']) });
  assert.equal(r.axes.deps.verdict, SAFE);
  assert.ok(r.axes.deps.lines.some(l => l.includes('v0.1.0') && l.includes('v0.2.0')));
  assert.equal(r.overall, CLEAN, 'deps drift must not move overall');
  await rm(dir, { recursive: true, force: true });
});

test('deps: a shared package pinned to the LATEST tag → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'package.json': { name: 'app', dependencies: { 'nimiq-settlement': 'github:Andjroo111/nimiq-settlement#v0.2.0' } },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteStub(['v0.1.0', 'v0.2.0']) });
  assert.equal(r.axes.deps.verdict, CLEAN);
  assert.ok(r.axes.deps.lines.some(l => l.includes('latest tag')));
  await rm(dir, { recursive: true, force: true });
});

test('deps: offline (ls-remote returns null) is skipped quietly → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'package.json': { name: 'app', dependencies: { 'nimiq-settlement': 'github:Andjroo111/nimiq-settlement#v0.1.0' } },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteOffline });
  assert.equal(r.axes.deps.verdict, CLEAN);
  assert.equal(r.overall, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('deps: a non-git-tag dep spec (e.g. "*") is not comparable → CLEAN', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'package.json': { name: 'app', dependencies: { 'nimiq-app-shell': '*' } },
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
  });
  const r = await alignApp(dir, { lsRemote: lsRemoteStub(['v0.1.0']) });
  assert.equal(r.axes.deps.verdict, CLEAN);
  await rm(dir, { recursive: true, force: true });
});

test('advisory axes can never be named in --fail-on (they cap at safe-drift)', async () => {
  const align = await import(join(ROOT, 'scripts', 'align.mjs'));
  await assert.rejects(() => align.run([], { failOn: 'miniApp' }), /advisory axis/);
  await assert.rejects(() => align.run([], { failOn: 'i18n' }), /advisory axis/);
  await assert.rejects(() => align.run([], { failOn: 'deps' }), /advisory axis/);
});
