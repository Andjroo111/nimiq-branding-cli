// Tests for `nq check` — the per-project alignment gate, and the pre-push hook.
// node:test style, matching test/align.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { check } = await import(join(ROOT, 'scripts', 'check.mjs'));
const hooks = await import(join(ROOT, 'scripts', 'hooks.mjs'));

async function tmpApp(files) {
  const dir = await mkdtemp(join(tmpdir(), 'nq-check-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

// a clean, canonical chain app manifest (mirrors test/align.test.mjs)
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

test('a clean canonical app → check passes (exit 0), align PASS', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'FROM oven/bun:1\n', 'fly.toml': 'app="x"\n',
    '.github/workflows/ci.yml': 'name: ci\n',
    // no package.json test script + no index.html → those sections SKIP, never FAIL
    'src/server.ts': 'export const x = 1;\n',
  });
  const r = await check(dir);
  assert.equal(r.ok, true, JSON.stringify(r.sections, null, 2));
  assert.equal(r.sections.align.verdict, 'pass');
  assert.equal(r.sections.filesize.verdict, 'pass');
  // no test script → SKIP, no index.html → SKIP (skips don't fail the gate)
  assert.ok(['skip', 'pass'].includes(r.sections.test.verdict));
  assert.equal(r.sections.lint.verdict, 'skip');
  await rm(dir, { recursive: true, force: true });
});

test('a dir with @nimiq/core/web + Client.create + chainApp manifest → check FAILS', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/boot.ts': "import { Client } from '@nimiq/core/web';\nconst c = Client.create(cfg);\n",
  });
  const r = await check(dir);
  assert.equal(r.ok, false);
  assert.equal(r.sections.align.verdict, 'fail');
  assert.ok(r.sections.align.lines.some(l => l.includes('@nimiq/core/web')));
  await rm(dir, { recursive: true, force: true });
});

test('an oversized first-party src file → filesize section FAILS the gate', async () => {
  const big = Array.from({ length: 850 }, (_, i) => `const l${i} = ${i};`).join('\n') + '\n';
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/huge.ts': big,
  });
  const r = await check(dir);
  assert.equal(r.sections.filesize.verdict, 'fail');
  assert.ok(r.sections.filesize.lines.some(l => l.includes('src/huge.ts')));
  assert.equal(r.ok, false);
  await rm(dir, { recursive: true, force: true });
});

test('filesize honors per-repo fileSizeGuardExclude in the manifest', async () => {
  const big = Array.from({ length: 850 }, (_, i) => `const l${i} = ${i};`).join('\n') + '\n';
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest({
      config: { tsconfig: 'local-strict', lint: 'none', fileSizeGuard: 800, ci: true, fileSizeGuardExclude: ['src/generated.ts'] },
    }),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/generated.ts': big,
    'src/app.ts': 'export const ok = 1;\n', // a real, in-scope file so the scan isn't empty
  });
  const r = await check(dir);
  assert.equal(r.sections.filesize.verdict, 'pass', JSON.stringify(r.sections.filesize, null, 2));
  await rm(dir, { recursive: true, force: true });
});

test('lint section SKIPs (never FAILs) when there is no index.html', async () => {
  const dir = await tmpApp({
    'nimiq-stack.json': canonicalManifest(),
    'Dockerfile': 'x', 'fly.toml': 'x', '.github/workflows/ci.yml': 'x',
    'src/server.ts': 'export const x = 1;\n',
  });
  const r = await check(dir);
  assert.equal(r.sections.lint.verdict, 'skip');
  await rm(dir, { recursive: true, force: true });
});

test('hooks install writes an executable pre-push that runs the check/align gate', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nq-prepush-'));
  const { execFileSync } = await import('node:child_process');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const r = await hooks.installHooks(dir);
  const pushPath = join(dir, '.git', 'hooks', 'pre-push');
  assert.ok(r.wrote.includes(pushPath), 'pre-push should be in wrote[]');
  assert.ok(existsSync(pushPath));
  assert.ok(statSync(pushPath).mode & 0o100, 'pre-push must be executable');
  const { readFile } = await import('node:fs/promises');
  const body = await readFile(pushPath, 'utf8');
  assert.ok(/nq (check|align) --fail-on=settlement,styling/.test(body), 'pre-push must run the gate');
  await rm(dir, { recursive: true, force: true });
});

test('PRE_PUSH artifact contains the check/align gate command', () => {
  assert.ok(/nq (check|align) --fail-on=settlement,styling/.test(hooks.PRE_PUSH));
});
