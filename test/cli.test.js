import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const BIN = fileURLToPath(new URL('../bin/nimiq-brand.js', import.meta.url));

const run = (...args) => exec(process.execPath, [BIN, ...args], { env: { ...process.env, NO_COLOR: '1' } });

test('help lists all commands', async () => {
  const { stdout } = await run('help');
  for (const cmd of ['colors', 'gradients', 'typography', 'principles', 'check', 'contrast', 'tokens', 'logo']) {
    assert.ok(stdout.includes(cmd), `help missing ${cmd}`);
  }
});

test('colors --format=json returns the full palette', async () => {
  const { stdout } = await run('colors', '--format=json');
  const palette = JSON.parse(stdout);
  assert.equal(palette['nimiq-blue'], '#1F2348');
  assert.equal(palette['nimiq-gold'], '#E9B213');
});

test('colors accepts short names', async () => {
  const { stdout } = await run('colors', 'gold');
  assert.ok(stdout.includes('#E9B213'));
});

test('gradients --format=css emits radial-gradient bottom-right', async () => {
  const { stdout } = await run('gradients', '--format=css');
  assert.ok(stdout.includes('radial-gradient(100% 100% at 100% 100%, #260133, #1F2348)'));
});

test('check passes for an on-brand color', async () => {
  const { stdout } = await run('check', '#0582CA');
  assert.ok(stdout.includes('On-brand'));
});

test('check fails (exit 1) for an off-brand color and suggests nearest', async () => {
  await assert.rejects(run('check', '#FF0000'), (err) => {
    assert.equal(err.code, 1);
    assert.ok(err.stdout.includes('nimiq-red'));
    return true;
  });
});

test('contrast reports WCAG level', async () => {
  const { stdout } = await run('contrast', '#FFFFFF', '#1F2348', '--format=json');
  const result = JSON.parse(stdout);
  assert.equal(result.normalText, 'AAA');
});

test('tokens tailwind strips the nimiq- prefix', async () => {
  const { stdout } = await run('tokens', 'tailwind');
  assert.ok(stdout.includes('"light-blue": "#0582CA"'));
});

test('unknown command exits 1', async () => {
  await assert.rejects(run('nope'), (err) => err.code === 1);
});
