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
