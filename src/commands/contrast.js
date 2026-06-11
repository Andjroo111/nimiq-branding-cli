import { parseHex, toHex, contrastRatio, wcagLevel } from '../lib/color.js';
import { bg, bold, dim } from '../lib/render.js';

export function run(args, flags) {
  const [fgIn, bgIn] = args;
  if (!fgIn || !bgIn) {
    console.error('Usage: nimiq-brand contrast <foreground-hex> <background-hex>');
    process.exitCode = 1;
    return;
  }
  const f = parseHex(fgIn);
  const b = parseHex(bgIn);
  if (!f || !b) {
    console.error(`Invalid hex color: "${!f ? fgIn : bgIn}"`);
    process.exitCode = 1;
    return;
  }

  const ratio = contrastRatio(f, b);
  const normal = wcagLevel(ratio);
  const large = wcagLevel(ratio, { largeText: true });

  if (flags.format === 'json') {
    console.log(JSON.stringify({
      foreground: toHex(f), background: toHex(b),
      ratio: Number(ratio.toFixed(2)), normalText: normal, largeText: large,
    }, null, 2));
  } else {
    console.log(`\n  ${bg(toHex(b), `  ${toHex(f)} on ${toHex(b)}  `)}\n`);
    console.log(`  Ratio        ${bold(`${ratio.toFixed(2)}:1`)}`);
    console.log(`  Normal text  ${normal === 'fail' ? '✗ fail' : `✓ ${normal}`}`);
    console.log(`  Large text   ${large === 'fail' ? '✗ fail' : `✓ ${large}`}`);
    console.log(dim('\n  Nimiq principle: accessible to everyone — aim for AA or better.\n'));
  }
  process.exitCode = normal === 'fail' && large === 'fail' ? 1 : 0;
}
