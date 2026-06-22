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

test('nq new wires nimiq-app-shell: mini-app + i18n deps, build:shell, locales', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('shellapp');
    // shared shell git deps pinned to tags
    const pkg = JSON.parse(await readFile(join(r.dir, 'package.json'), 'utf8'));
    assert.match(pkg.dependencies['nimiq-app-shell'], /nimiq-app-shell#v\d/);
    assert.match(pkg.dependencies['nimiq-settlement'], /nimiq-settlement#v\d/);
    // a build:shell step that bundles app-shell to public/vendor/app-shell.js
    assert.ok(pkg.scripts['build:shell'], 'build:shell script present');
    assert.match(pkg.scripts['build:shell'], /public\/vendor\/app-shell\.js/);
    // locales (en + a 2nd language) for runtime switching
    assert.ok(existsSync(join(r.dir, 'public/locales/en.json')), 'public/locales/en.json present');
    assert.ok(existsSync(join(r.dir, 'public/locales/de.json')), '2nd locale present');
    // app.js imports createWallet + createI18n from the vendored shell
    const appjs = await readFile(join(r.dir, 'public/app.js'), 'utf8');
    assert.match(appjs, /createWallet/);
    assert.match(appjs, /createI18n/);
    assert.match(appjs, /vendor\/app-shell/);
  });
});

test('nq new app is CLEAN on the miniApp + i18n adoption axes', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('adoptedapp');
    // stub ls-remote so the deps axis never touches the network and the pins are "latest"
    const lsRemote = () => ['v0.1.0', 'v0.2.0'].map(t => `x\trefs/tags/${t}`).join('\n');
    const graded = await alignApp(r.dir, { lsRemote });
    assert.equal(graded.axes.miniApp.verdict, CLEAN, JSON.stringify(graded.axes.miniApp, null, 2));
    assert.equal(graded.axes.i18n.verdict, CLEAN, JSON.stringify(graded.axes.i18n, null, 2));
    assert.equal(graded.overall, CLEAN);
  });
});

test('nq new README documents the Cloudflare-in-front-of-Fly deploy notes', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('cfapp');
    const readme = await readFile(join(r.dir, 'README.md'), 'utf8');
    assert.match(readme, /Cloudflare/);
    assert.match(readme, /fly certs add/);
    assert.match(readme, /Cloudflare Pages/);
  });
});

test('--no-chain still gets the shell dep but no settlement dep', async () => {
  await inTmp(async () => {
    const r = await scaffoldApp('leanapp', { noChain: true });
    const pkg = JSON.parse(await readFile(join(r.dir, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies['nimiq-app-shell'], 'shell dep present even on --no-chain');
    assert.ok(!pkg.dependencies['nimiq-settlement'], 'no settlement dep on --no-chain');
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
