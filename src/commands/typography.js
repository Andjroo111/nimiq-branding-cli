import { TYPOGRAPHY } from '../data/brand.js';
import { bold, dim, pad } from '../lib/render.js';

export function run(args, flags) {
  if (flags.format === 'json') {
    console.log(JSON.stringify(TYPOGRAPHY, null, 2));
    return;
  }

  const t = TYPOGRAPHY;
  console.log(bold('\nNimiq typography\n'));
  console.log(`  Base unit       ${t.baseUnit}`);
  console.log(`  Primary font    ${bold(t.primaryFont.family)} ${dim(`(${Object.entries(t.primaryFont.weights).map(([k, v]) => `${k} ${v}`).join(', ')})`)}`);
  console.log(dim(`                  ${t.primaryFont.use}`));
  console.log(`  Monospace font  ${bold(t.monospaceFont.family)}`);
  console.log(dim(`                  ${t.monospaceFont.use}`));
  console.log(bold('\n  Type scale'));
  for (const [k, v] of Object.entries(t.scale)) {
    console.log(`    ${pad(k, 8)} ${v}`);
  }
  console.log(dim('\n  CSS stack: ' + t.primaryFont.stack + '\n'));
}
