// Tests for `nq reuse` — the fleet code-discovery index.
// Uses node:test (the runner declared in package.json: `node --test test/`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { rebuild, query } = await import(join(ROOT, 'scripts', 'reuse.mjs'));

// Build a tiny FIXTURE dir of fake fleet repos.
//   nimiq-fakelib  — a shared lib: package.json with "exports" + src/index.ts exports
//   nimiq-fakeapp  — an app with a cashlink-codec.ts (a seeded module)
//   nimiq-weird    — a repo with no package.json (must be skipped gracefully)
async function fixtureRepos() {
  const dir = await mkdtemp(join(tmpdir(), 'nq-reuse-'));
  const reposDir = join(dir, 'repos');

  const files = {
    // --- shared lib repo ---
    'repos/nimiq-fakelib/package.json': JSON.stringify({
      name: 'nimiq-fakelib',
      version: '1.0.0',
      description: 'a fake shared settlement lib',
      exports: { '.': './src/index.ts' },
    }, null, 2),
    'repos/nimiq-fakelib/src/index.ts':
      "export { watchAddress } from './watch';\n" +
      "export const FEE = 1;\n" +
      "export function settle() {}\n" +
      "export class SettlementWatcher {}\n",

    // --- app repo with a seeded module (cashlink codec) ---
    'repos/nimiq-fakeapp/package.json': JSON.stringify({
      name: 'nimiq-fakeapp',
      version: '0.1.0',
      dependencies: { hono: '^4' },
    }, null, 2),
    'repos/nimiq-fakeapp/src/lib/cashlink-codec.ts':
      'export function encodeCashlink(v) { return v; }\nexport function decodeCashlink(s) { return s; }\n',
    'repos/nimiq-fakeapp/fly.toml': 'app = "nimiq-fakeapp"\n',
    'repos/nimiq-fakeapp/Dockerfile': 'FROM oven/bun:1\n',

    // --- weird repo: no package.json, should not crash, should be ignored ---
    'repos/nimiq-weird/README.md': '# just docs\n',

    // --- the shared app-shell: canonical source for wallet-adapter + nim-format ---
    'repos/nimiq-app-shell/package.json': JSON.stringify({
      name: 'nimiq-app-shell',
      version: '0.1.0',
      description: 'shared shell: dual-mode wallet + nim-format + i18n',
      exports: { '.': './src/index.ts' },
    }, null, 2),
    'repos/nimiq-app-shell/src/index.ts':
      "export { createWallet, detectModeSync } from './wallet';\n" +
      "export { fmtNim, parseNim } from './format/nim';\n",
    'repos/nimiq-app-shell/src/wallet/index.ts':
      'export function createWallet() {}\n',
    'repos/nimiq-app-shell/src/wallet/detect.ts':
      "export function detectModeSync() { return 'hub'; }\n",
    'repos/nimiq-app-shell/src/format/nim.ts':
      'export function fmtNim(luna) { return String(luna); }\n',

    // --- an app that merely USES the shared modules; sorts BEFORE nimiq-app-shell,
    // --- so canonicalRepo must still win the dedup for wallet-adapter/nim-format ---
    'repos/a-fakeconsumer/package.json': JSON.stringify({
      name: 'a-fakeconsumer',
      version: '0.1.0',
      dependencies: { 'nimiq-app-shell': 'github:x/nimiq-app-shell#main' },
    }, null, 2),
    'repos/a-fakeconsumer/src/app.ts':
      "import { createWallet, fmtNim } from 'nimiq-app-shell';\n" +
      'createWallet(); fmtNim(1);\n',
  };

  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return { dir, reposDir };
}

test('--rebuild writes reuse-index.json + REUSE-CATALOG.md with package + module + component entries', async () => {
  const { dir, reposDir } = await fixtureRepos();
  const { index, indexPath, catalogPath } = await rebuild(reposDir);

  assert.ok(existsSync(indexPath), 'reuse-index.json written');
  assert.ok(existsSync(catalogPath), 'REUSE-CATALOG.md written');

  // a 'package' entry for the shared lib, with exports parsed + git-dep install line
  const pkg = index.entries.find(e => e.kind === 'package' && e.key === 'nimiq-fakelib');
  assert.ok(pkg, 'package entry present for nimiq-fakelib');
  assert.ok(pkg.exports.includes('watchAddress'), 'parsed exports include watchAddress');
  assert.ok(pkg.exports.includes('SettlementWatcher'), 'parsed exports include the class');
  assert.match(pkg.import, /github:Andjroo111\/nimiq-fakelib#/, 'install line is a github git-dep');

  // a 'module' entry for the seeded cashlink codec
  const mod = index.entries.find(e => e.kind === 'module' && e.key === 'cashlink-codec');
  assert.ok(mod, 'module entry present for cashlink-codec');
  assert.equal(mod.source.repo, 'nimiq-fakeapp');
  assert.match(mod.source.path, /cashlink-codec\.ts/);

  // the fly deploy kit (fly.toml + Dockerfile) is also a seeded module
  const fly = index.entries.find(e => e.kind === 'module' && e.key === 'fly-deploy-kit');
  assert.ok(fly, 'fly-deploy-kit module detected from fly.toml + Dockerfile');

  // 'component' entries come from the CLI's own registry (the same index `nq add` reads)
  assert.ok(index.counts.component > 0, 'registry components indexed as kind=component');

  // the weird (no package.json) repo did not crash the rebuild and is not an entry
  assert.ok(!index.entries.some(e => e.source?.repo === 'nimiq-weird'));

  await rm(dir, { recursive: true, force: true });
});

test('glue seeds: wallet-adapter + nim-format resolve to nimiq-app-shell, toast driver to the CLI registry', async () => {
  const { dir, reposDir } = await fixtureRepos();
  const { index } = await rebuild(reposDir);

  // wallet-adapter: canonical source is nimiq-app-shell src/wallet/*, even though
  // a-fakeconsumer (scanned earlier alphabetically) also matches the import rules
  const wa = index.entries.find(e => e.kind === 'module' && e.key === 'wallet-adapter');
  assert.ok(wa, 'wallet-adapter module entry present');
  assert.equal(wa.source.repo, 'nimiq-app-shell', 'canonicalRepo beats the consumer app');
  assert.match(wa.source.path, /src\/wallet\/(index|detect)\.ts/);
  assert.match(wa.import, /bun add github:Andjroo111\/nimiq-app-shell#main/);
  assert.match(wa.import, /import \{ createWallet \} from 'nimiq-app-shell';/);

  // nim-format: same canonical-source rule
  const nf = index.entries.find(e => e.kind === 'module' && e.key === 'nim-format');
  assert.ok(nf, 'nim-format module entry present');
  assert.equal(nf.source.repo, 'nimiq-app-shell', 'canonicalRepo beats the consumer app');
  assert.match(nf.source.path, /src\/format\/nim\.ts/);
  assert.match(nf.import, /import \{ fmtNim, parseNim, lunaToNim \} from 'nimiq-app-shell';/);

  // toast driver: a FIXED seed — ships with this CLI, present even though no
  // scanned fixture repo carries a toast.js
  const toast = index.entries.find(e => e.kind === 'module' && e.key === 'toast');
  assert.ok(toast, 'toast driver module entry present without any repo match');
  assert.equal(toast.source.repo, 'nimiq-branding-cli');
  assert.equal(toast.source.path, 'registry/components/toast-notification/html/toast.js');
  assert.match(toast.import, /nq add toast-notification/);

  // the consumer app claimed nothing it doesn't own
  assert.ok(!index.entries.some(e => e.kind === 'module' && e.source.repo === 'a-fakeconsumer'
    && (e.key === 'wallet-adapter' || e.key === 'nim-format')));

  await rm(dir, { recursive: true, force: true });
});

test('query surfaces the glue seeds by their obvious terms', async () => {
  const { dir, reposDir } = await fixtureRepos();
  await rebuild(reposDir);

  const wallet = await query('wallet', { dir: reposDir, json: true });
  assert.ok(wallet.matches.some(m => m.key === 'wallet-adapter'), "query 'wallet' finds the adapter");

  const fmt = await query('fmtNim', { dir: reposDir, json: true });
  assert.ok(fmt.matches.some(m => m.key === 'nim-format'), "query 'fmtNim' finds nim-format");

  const toast = await query('toast', { dir: reposDir, json: true });
  assert.ok(toast.matches.some(m => m.key === 'toast' && m.kind === 'module'), "query 'toast' finds the driver");
  assert.ok(toast.matches.some(m => m.kind === 'component' && m.key === 'toast-notification'),
    "query 'toast' still finds the component too");

  await rm(dir, { recursive: true, force: true });
});

test('query finds a seeded module term and an absent term returns no matches gracefully', async () => {
  const { dir, reposDir } = await fixtureRepos();
  await rebuild(reposDir);

  // a real captured-output query via --json to assert on results without parsing stdout
  const hit = await query('cashlink', { dir: reposDir, json: true });
  assert.ok(hit.matches.some(m => m.key === 'cashlink-codec'), 'cashlink query finds the codec module');

  // querying a package term works too
  const pkgHit = await query('settlement', { dir: reposDir, json: true });
  assert.ok(pkgHit.matches.length > 0, 'settlement query returns matches');

  // an absent term returns an empty match list, never throws
  const miss = await query('zzznotathing', { dir: reposDir, json: true });
  assert.equal(miss.matches.length, 0, 'absent term yields no matches');

  await rm(dir, { recursive: true, force: true });
});

test('query with no built index reports a helpful message and does not throw', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nq-reuse-empty-'));
  const res = await query('qr', { dir, json: true });
  assert.equal(res.matches.length, 0);
  await rm(dir, { recursive: true, force: true });
});
