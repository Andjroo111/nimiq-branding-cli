import { BRAND, GRADIENTS } from '../data/brand.js';
import { parseHex } from '../lib/color.js';
import { fg, bold, dim } from '../lib/render.js';

// The Nimiq logo is a hexagon. Rendered here in the gold identity
// gradient (#EC991C → #E9B213), interpolated top-to-bottom.
const HEX = [
  '      ▄▄█▀▀█▄▄      ',
  '   ▄█▀▀      ▀▀█▄   ',
  '  ██            ██  ',
  '  ██            ██  ',
  '   ▀█▄▄      ▄▄█▀   ',
  '      ▀▀█▄▄█▀▀      ',
];

export function run(args, flags) {
  const grad = GRADIENTS[flags.color && GRADIENTS[`nimiq-${flags.color}`] ? `nimiq-${flags.color}` : 'nimiq-gold'];
  const a = parseHex(grad.from);
  const b = parseHex(grad.to);

  console.log('');
  HEX.forEach((line, i) => {
    const t = i / (HEX.length - 1);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    const hex = `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
    console.log('   ' + fg(hex, line));
  });
  console.log(`\n   ${bold(BRAND.name)} ${dim(`· ${BRAND.tagline}`)}`);
  console.log(dim(`   Official assets: ${BRAND.links.designs}\n`));
}
