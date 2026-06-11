import { COLORS, DARKENED, ON_DARK } from '../data/brand.js';
import { parseHex, toHex, nearest, contrastRatio, wcagLevel } from '../lib/color.js';
import { swatch, bold, dim, pad } from '../lib/render.js';

const PALETTE = {
  ...Object.fromEntries(Object.entries(COLORS).map(([n, c]) => [n, c.hex])),
  ...DARKENED,
  ...ON_DARK,
};

/**
 * Check an arbitrary color against the brand: is it on-palette, and if
 * not, which brand colors are closest? Also reports contrast against the
 * two canonical surfaces (white and nimiq-blue).
 */
export function run(args, flags) {
  const input = args[0];
  if (!input) {
    console.error('Usage: nimiq-brand check <hex>   e.g. nimiq-brand check "#0582CA"');
    process.exitCode = 1;
    return;
  }
  const color = parseHex(input);
  if (!color) {
    console.error(`"${input}" is not a valid hex color.`);
    process.exitCode = 1;
    return;
  }

  const hex = toHex(color);
  const matches = nearest(color, PALETTE, 3);
  const exact = matches[0].distance === 0;

  if (flags.format === 'json') {
    console.log(JSON.stringify({ input: hex, onBrand: exact, nearest: matches }, null, 2));
    process.exitCode = exact ? 0 : 1;
    return;
  }

  console.log(`\n  ${swatch(hex)}  ${bold(hex)}\n`);
  if (exact) {
    console.log(`  ✓ On-brand: this is ${bold(matches[0].name)}.\n`);
  } else {
    console.log('  ✗ Not in the Nimiq palette. Closest brand colors:\n');
    for (const m of matches) {
      console.log(`    ${swatch(m.hex, 4)}  ${pad(m.name, 28)} ${m.hex}  ${dim(`Δ ${m.distance.toFixed(1)}`)}`);
    }
    console.log(dim('\n  Per the simplicity principle, prefer the closest token.'));
  }

  const white = parseHex('#FFFFFF');
  const blue = parseHex(PALETTE['nimiq-blue']);
  const cw = contrastRatio(color, white);
  const cb = contrastRatio(color, blue);
  console.log(bold('\n  Contrast (accessibility principle)'));
  console.log(`    on white       ${cw.toFixed(2)}:1  ${wcagLevel(cw)}`);
  console.log(`    on nimiq-blue  ${cb.toFixed(2)}:1  ${wcagLevel(cb)}\n`);

  process.exitCode = exact ? 0 : 1;
}
