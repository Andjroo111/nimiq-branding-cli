// Tests for `nq new` (canonical app scaffold) and the hook artifacts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { scaffoldApp } = await import(join(ROOT, 'scripts', 'scaffold.mjs'));
const { alignApp, CLEAN } = await import(join(ROOT, 'scripts', 'align.mjs'));
const hooks = await import(join(ROOT, 'scripts', 'hooks.mjs'));

async function inTmp(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'nq-new-'));
  const prev = process.cwd();
  process.chdir(dir);
  try { return await fn(dir); }
  finally { process.chdir(prev); await rm(dir, { recursive: true, force: true }); }
}

test('nq new scaffolds the canonical app and it aligns CLEAN', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('my-app');
    assert.equal(r.chain, true);
    for (const f of ['package.json', 'src/server.ts', 'src/db.ts', 'src/chain.ts', 'nimiq-stack.json',
      'public/index.html', 'Dockerfile', 'fly.toml', '.dockerignore',
      '.github/workflows/ci.yml', '.github/workflows/deploy.yml', 'test/health.test.ts']) {
      assert.ok(existsSync(join(r.dir, f)), `missing ${f}`);
    }
    const m = JSON.parse(await readFile(join(r.dir, 'nimiq-stack.json'), 'utf8'));
    assert.equal(m.schemaVersion, 1);
    assert.equal(m.styling.source, 'nimiq-ui');
    assert.equal(m.settlement.pattern, 'mock');
    assert.equal(m.deploy.target, 'fly');
    // and it should grade clean on every axis out of the box
    const graded = await alignApp(r.dir);
    assert.equal(graded.overall, CLEAN, JSON.stringify(graded.axes, null, 2));
  });
});

test('the scaffolded src has NO light-client path', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('clean-app', { settlement: 'rpc' });
    const chain = await readFile(join(r.dir, 'src', 'chain.ts'), 'utf8');
    // the actual code must not contain a real Client.create( call
    const codeLines = chain.split('\n').filter(l => !l.trim().startsWith('//'));
    assert.ok(!codeLines.some(l => l.includes('Client.create(')), 'rpc client must not use the light client');
    const graded = await alignApp(r.dir);
    assert.equal(graded.axes.settlement.verdict, CLEAN);
  });
});

test('--no-chain stamps chainApp:false and skips settlement/styling parity', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('readonly', { noChain: true });
    assert.equal(r.chain, false);
    const m = JSON.parse(await readFile(join(r.dir, 'nimiq-stack.json'), 'utf8'));
    assert.equal(m.chainApp, false);
    assert.equal(existsSync(join(r.dir, 'src', 'chain.ts')), false);
    const graded = await alignApp(r.dir);
    assert.equal(graded.overall, CLEAN);
  });
});

test('--settlement and --deploy flags are honored', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('noopapp', { settlement: 'noop', deploy: 'none' });
    const m = JSON.parse(await readFile(join(r.dir, 'nimiq-stack.json'), 'utf8'));
    assert.equal(m.settlement.pattern, 'noop');
    assert.equal(m.deploy.target, 'unknown');
    assert.equal(existsSync(join(r.dir, 'Dockerfile')), false);
  });
});

test('scaffold rejects a bad name and an existing dir', async () => {
  await inTmp(async () => {
    await assert.rejects(() => scaffoldApp('Bad Name'));
    await scaffoldApp('dupe');
    await assert.rejects(() => scaffoldApp('dupe'), /already exists/);
  });
});

test('hook artifacts contain the pre-commit gate and weekly workflow', () => {
  assert.ok(hooks.PRE_COMMIT.includes('--fail-on=settlement,styling'));
  assert.ok(hooks.SESSION_START.includes('nq align --quiet'));
  assert.ok(hooks.WEEKLY_WORKFLOW.includes('nq align') || hooks.WEEKLY_WORKFLOW.includes('align --all'));
  assert.ok(hooks.WEEKLY_WORKFLOW.includes('stack-drift'));
});

test('hooks install writes an executable pre-commit into a git repo', async () => {
  await inTmp(async (dir) => {
    const { execFileSync } = await import('node:child_process');
    execFileSync('git', ['init', '-q'], { cwd: dir });
    const r = await hooks.installHooks(dir);
    const hookPath = join(dir, '.git', 'hooks', 'pre-commit');
    assert.ok(r.wrote.includes(hookPath));
    assert.ok(existsSync(hookPath));
    const { statSync } = await import('node:fs');
    assert.ok(statSync(hookPath).mode & 0o100, 'pre-commit must be executable');
  });
});
