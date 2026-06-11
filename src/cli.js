import { bold, dim, fg } from './lib/render.js';

const COMMANDS = {
  colors: { mod: () => import('./commands/colors.js'), help: 'Show the Nimiq color palette (filter by name; --format css|scss|json)' },
  gradients: { mod: () => import('./commands/gradients.js'), help: 'Show the signature radial gradients (--format css|json)' },
  typography: { mod: () => import('./commands/typography.js'), help: 'Fonts, weights and the 8px-based type scale' },
  principles: { mod: () => import('./commands/principles.js'), help: "Nimiq's design principles — the foundation of this tool" },
  check: { mod: () => import('./commands/check.js'), help: 'Check a hex color against the brand palette: nimiq-brand check "#0582CA"' },
  contrast: { mod: () => import('./commands/contrast.js'), help: 'WCAG contrast of two colors: nimiq-brand contrast "#FFF" "#1F2348"' },
  tokens: { mod: () => import('./commands/tokens.js'), help: 'Export all tokens: nimiq-brand tokens css|scss|json|tailwind' },
  logo: { mod: () => import('./commands/logo.js'), help: 'Render the Nimiq hexagon in the terminal (--color green, etc.)' },
};

function parseArgs(argv) {
  const args = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      flags[key] = value ?? true;
    } else {
      args.push(arg);
    }
  }
  return { args, flags };
}

function help() {
  console.log(`
  ${fg('#E9B213', '⬡')} ${bold('nimiq-brand')} ${dim('— the Nimiq branding toolkit for your terminal')}

  ${dim('Built on the official Nimiq Style framework and design principles.')}

  ${bold('Usage')}
    nimiq-brand <command> [args] [--format=...]

  ${bold('Commands')}`);
  for (const [name, { help }] of Object.entries(COMMANDS)) {
    console.log(`    ${fg('#0582CA', name.padEnd(12))} ${help}`);
  }
  console.log(`
  ${dim('Start with `nimiq-brand principles` to see the foundation.')}
`);
}

export async function main(argv = process.argv.slice(2)) {
  const { args, flags } = parseArgs(argv);
  const command = args.shift();

  if (flags.version) {
    const { createRequire } = await import('node:module');
    console.log(createRequire(import.meta.url)('../package.json').version);
    return;
  }
  if (!command || command === 'help' || flags.help) {
    help();
    return;
  }
  const entry = COMMANDS[command];
  if (!entry) {
    console.error(`Unknown command "${command}". Run \`nimiq-brand help\`.`);
    process.exitCode = 1;
    return;
  }
  const { run } = await entry.mod();
  run(args, flags);
}
