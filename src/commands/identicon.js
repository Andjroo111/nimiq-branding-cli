import { identicon } from '../lib/identicon.js';
import { bg, bold, dim, swatch, pad } from '../lib/render.js';

/**
 * Terminal block-art rendering. Colors and parameters are exactly the
 * official ones; the shape drawing is a terminal-friendly approximation
 * of the 21 SVG assets per section (which live in @nimiq/identicons).
 */
const HEX_ROWS = [
  //  cells per row of the hexagon silhouette (width 16 max)
  { pad: 4, width: 8 },
  { pad: 2, width: 12 },
  { pad: 0, width: 16 },
  { pad: 0, width: 16 },
  { pad: 0, width: 16 },
  { pad: 2, width: 12 },
  { pad: 4, width: 8 },
];

function renderTerminal(params) {
  const { main, background, accent } = params.colors;
  const { face, top, side, bottom } = params.sections;
  const lines = [];

  HEX_ROWS.forEach((row, y) => {
    let line = ' '.repeat(row.pad + 2);
    let cells = '';
    for (let x = 0; x < row.width; x++) {
      // Deterministic, horizontally symmetric pattern from section indices.
      const gx = row.pad + x;
      const mx = Math.min(gx, 15 - gx); // mirror
      const seed = y < 2 ? top : y > 4 ? bottom : mx < 3 ? side : face;
      const on = (seed * 7 + mx * 3 + y * 5) % 4 === 0;
      const isAccent = on && (seed + mx + y) % 9 === 0;
      const color = isAccent ? accent.hex : on ? main.hex : background.hex;
      cells += bg(color, '  ');
    }
    lines.push(line + cells);
  });
  return lines.join('\n');
}

function renderSvg(params) {
  const { main, background, accent } = params.colors;
  const { face, top, side, bottom } = params.sections;
  // Hexagon matching the official 160x160 viewBox proportions.
  const hexPath = 'M125.7 21.4l32.6 56.5c5.8 10 5.8 22.3 0 32.2l-32.6 56.5c-5.8 10-16.4 16.2-28 16.2H62.3c-11.5 0-22.2-6.2-28-16.2L1.8 110.1c-5.8-10-5.8-22.3 0-32.2l32.6-56.5c5.8-10 16.4-16.2 28-16.2h35.4c11.5 0 22.1 6.1 27.9 16.2z';
  const deco = (seed, cx, cy) => {
    const r = 6 + (seed % 5) * 2;
    return seed % 2 === 0
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent.hex}"/>`
      : `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="3" fill="${accent.hex}"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <!-- Nimiq-style identicon for "${params.input}" — colors/indices per the official
       @nimiq/identicons algorithm; shapes are a simplified approximation. -->
  <path d="${hexPath}" fill="${background.hex}"/>
  <circle cx="80" cy="${80 + (face % 5) * 2}" r="${26 + (face % 7)}" fill="${main.hex}"/>
  ${deco(top, 80, 38)}
  ${deco(side, 44 + (side % 4) * 2, 80)}
  ${deco(bottom, 80, 122)}
</svg>`;
}

export function run(args, flags) {
  const input = args[0];
  if (!input) {
    console.error('Usage: nimiq-brand identicon <address-or-text> [--format=svg|json]');
    process.exitCode = 1;
    return;
  }
  const params = identicon(input);

  if (flags.format === 'json') {
    console.log(JSON.stringify(params, null, 2));
    return;
  }
  if (flags.format === 'svg') {
    console.log(renderSvg(params));
    return;
  }

  console.log('');
  console.log(renderTerminal(params));
  console.log(`\n  ${bold(params.input)}`);
  console.log(`  ${swatch(params.colors.background.hex, 3)} ${pad(`background ${params.colors.background.name}`, 22)} ${params.colors.background.hex}`);
  console.log(`  ${swatch(params.colors.main.hex, 3)} ${pad(`main       ${params.colors.main.name}`, 22)} ${params.colors.main.hex}`);
  console.log(`  ${swatch(params.colors.accent.hex, 3)} ${pad(`accent     ${params.colors.accent.name}`, 22)} ${params.colors.accent.hex}`);
  console.log(dim(`  sections: face ${params.sections.face}, top ${params.sections.top}, side ${params.sections.side}, bottom ${params.sections.bottom} (of 21 each)`));
  console.log(dim('\n  Same colors and indices as @nimiq/identicons; terminal shapes are approximate.'));
  console.log(dim('  nimiq-brand identicon <input> --format=svg > avatar.svg\n'));
}
