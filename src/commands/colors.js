import { COLORS, DARKENED, ON_DARK } from '../data/brand.js';
import { parseHex, toRgbString } from '../lib/color.js';
import { swatch, bold, dim, pad } from '../lib/render.js';

function allColors() {
  const main = Object.fromEntries(Object.entries(COLORS).map(([n, c]) => [n, c.hex]));
  return { ...main, ...DARKENED, ...ON_DARK };
}

export function run(args, flags) {
  const format = flags.format || 'table';
  const filter = args[0];
  const colors = allColors();

  if (filter && !colors[filter] && !colors[`nimiq-${filter}`]) {
    console.error(`Unknown color "${filter}". Run \`nimiq-brand colors\` to list the palette.`);
    process.exitCode = 1;
    return;
  }
  const name = filter ? (colors[filter] ? filter : `nimiq-${filter}`) : null;
  const entries = name ? [[name, colors[name]]] : Object.entries(colors);

  if (format === 'json') {
    console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
    return;
  }
  if (format === 'css') {
    for (const [n, hex] of entries) console.log(`--${n}: ${hex};`);
    return;
  }
  if (format === 'scss') {
    for (const [n, hex] of entries) console.log(`$${n}: ${hex};`);
    return;
  }

  console.log(bold('\nNimiq color palette') + dim('  (source: @nimiq/style)\n'));
  for (const [n, hex] of entries) {
    const role = COLORS[n]?.role;
    const line = `  ${swatch(hex)}  ${pad(n, 28)} ${pad(hex, 9)} ${toRgbString(parseHex(hex))}`;
    console.log(line);
    if (role && (name || format === 'verbose')) console.log(dim(`          ${role}`));
  }
  if (!name) {
    console.log(dim('\n  nimiq-brand colors <name>            details for one color'));
    console.log(dim('  nimiq-brand colors --format css|scss|json   export\n'));
  } else {
    console.log('');
  }
}
