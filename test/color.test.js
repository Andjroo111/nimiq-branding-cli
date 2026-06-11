import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHex, toHex, contrastRatio, wcagLevel, nearest } from '../src/lib/color.js';
import { COLORS, GRADIENTS, PRINCIPLES } from '../src/data/brand.js';

test('parseHex handles 6-digit, 3-digit, and # prefix', () => {
  assert.deepEqual(parseHex('#1F2348'), { r: 31, g: 35, b: 72 });
  assert.deepEqual(parseHex('1F2348'), { r: 31, g: 35, b: 72 });
  assert.deepEqual(parseHex('#fff'), { r: 255, g: 255, b: 255 });
  assert.equal(parseHex('not-a-color'), null);
  assert.equal(parseHex('#12345'), null);
});

test('toHex round-trips', () => {
  assert.equal(toHex(parseHex('#e9b213')), '#E9B213');
});

test('contrast: white on nimiq-blue passes AAA', () => {
  const ratio = contrastRatio(parseHex('#FFFFFF'), parseHex(COLORS['nimiq-blue'].hex));
  assert.ok(ratio > 7, `expected > 7, got ${ratio}`);
  assert.equal(wcagLevel(ratio), 'AAA');
});

test('contrast: black on white is 21:1', () => {
  const ratio = contrastRatio(parseHex('#000'), parseHex('#fff'));
  assert.ok(Math.abs(ratio - 21) < 0.01);
});

test('wcagLevel thresholds', () => {
  assert.equal(wcagLevel(4.4), 'fail');
  assert.equal(wcagLevel(4.5), 'AA');
  assert.equal(wcagLevel(7), 'AAA');
  assert.equal(wcagLevel(3.1, { largeText: true }), 'AA');
});

test('nearest finds exact brand colors at distance 0', () => {
  const palette = Object.fromEntries(Object.entries(COLORS).map(([n, c]) => [n, c.hex]));
  const [match] = nearest(parseHex('#0582CA'), palette);
  assert.equal(match.name, 'nimiq-light-blue');
  assert.equal(match.distance, 0);
});

test('brand data integrity: every color and gradient stop is valid hex', () => {
  for (const [name, { hex }] of Object.entries(COLORS)) {
    assert.ok(parseHex(hex), `${name} has invalid hex ${hex}`);
  }
  for (const [name, { from, to }] of Object.entries(GRADIENTS)) {
    assert.ok(parseHex(from) && parseHex(to), `${name} gradient invalid`);
  }
});

test('there are five design principles, each with practice guidance', () => {
  assert.equal(PRINCIPLES.length, 5);
  for (const p of PRINCIPLES) {
    assert.ok(p.name && p.summary && p.practice);
  }
});
