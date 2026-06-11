import { GRADIENTS } from '../data/brand.js';
import { gradientBar, bold, dim, pad } from '../lib/render.js';

export const cssGradient = ({ from, to }) =>
  `radial-gradient(100% 100% at 100% 100%, ${from}, ${to})`;

export function run(args, flags) {
  const format = flags.format || 'table';
  const filter = args[0];
  const name = filter ? (GRADIENTS[filter] ? filter : `nimiq-${filter}`) : null;

  if (filter && !GRADIENTS[name]) {
    console.error(`Unknown gradient "${filter}". Run \`nimiq-brand gradients\` to list them.`);
    process.exitCode = 1;
    return;
  }
  const entries = name ? [[name, GRADIENTS[name]]] : Object.entries(GRADIENTS);

  if (format === 'json') {
    const out = Object.fromEntries(entries.map(([n, g]) => [n, { ...g, css: cssGradient(g) }]));
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  if (format === 'css') {
    for (const [n, g] of entries) console.log(`--${n}-bg: ${cssGradient(g)};`);
    return;
  }

  console.log(bold('\nNimiq gradients') + dim('  (radial, anchored bottom-right)\n'));
  for (const [n, g] of entries) {
    console.log(`  ${gradientBar(g.from, g.to)}  ${pad(n, 20)} ${g.from} → ${g.to}`);
  }
  console.log(dim('\n  CSS: radial-gradient(100% 100% at 100% 100%, <from>, <to>)'));
  console.log(dim('  nimiq-brand gradients --format css|json   export\n'));
}
