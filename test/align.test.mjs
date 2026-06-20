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

test('HARD FAIL: Client.create( and waitForConsensusEstablished( in src', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/boot.ts': 'const c = Client.create(cfg);\nawait c.waitForConsensusEstablished();\n',
  });
  const r = await alignApp(dir);
  assert.equal(r.axes.settlement.verdict, RISKY);
  assert.ok(r.axes.settlement.lines.some(l => l.includes('Client.create(')));
  assert.ok(r.axes.settlement.lines.some(l => l.includes('waitForConsensusEstablished(')));
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
