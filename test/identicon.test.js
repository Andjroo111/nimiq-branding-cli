import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHash, identicon } from '../src/lib/identicon.js';

test('makeHash is deterministic, digits only, 13-17 chars (official contract)', () => {
  const a = makeHash('NQ07 0000 0000 0000 0000 0000 0000 0000 0000');
  const b = makeHash('NQ07 0000 0000 0000 0000 0000 0000 0000 0000');
  assert.equal(a, b);
  assert.match(a, /^\d{13,17}$/);
});

test('different inputs give different identicons', () => {
  const a = identicon('alice');
  const b = identicon('bob');
  assert.notDeepEqual(
    [a.hash, a.sections],
    [b.hash, b.sections],
  );
});

test('main, background and accent colors are always distinct', () => {
  for (const input of ['a', 'bob', 'NQ12 3456', 'x'.repeat(50), '0', 'Nimiq', 'identicon']) {
    const { colors } = identicon(input);
    assert.notEqual(colors.main.hex, colors.background.hex, input);
    assert.notEqual(colors.accent.hex, colors.main.hex, input);
    assert.notEqual(colors.accent.hex, colors.background.hex, input);
  }
});

test('section indices are within the official 1..21 asset range', () => {
  for (const input of ['alice', 'bob', 'carol', 'dave']) {
    const { sections } = identicon(input);
    for (const v of Object.values(sections)) {
      assert.ok(v >= 1 && v <= 21, `${input}: ${v}`);
    }
  }
});

test('colors come from the official identicon palette', () => {
  const palette = new Set([
    '#FC8702', '#D94432', '#E9B213', '#1A5493', '#0582CA',
    '#5961A8', '#21BCA5', '#FA7268', '#88B04B', '#795548',
    '#1F2348', '#5F4B8B',
  ]);
  const { colors } = identicon('Nimiq');
  for (const c of Object.values(colors)) {
    assert.ok(palette.has(c.hex), c.hex);
  }
});
