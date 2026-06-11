import { PRINCIPLES, BRAND } from '../data/brand.js';
import { bold, dim, fg } from '../lib/render.js';

export function run(args, flags) {
  if (flags.format === 'json') {
    console.log(JSON.stringify(PRINCIPLES, null, 2));
    return;
  }

  console.log(bold(`\n${BRAND.name} design principles`));
  console.log(dim(`"${BRAND.tagline}"\n`));
  PRINCIPLES.forEach((p, i) => {
    console.log(`  ${fg('#E9B213', `${i + 1}.`)} ${bold(p.name)}`);
    console.log(`     ${p.summary}`);
    console.log(dim(`     In practice: ${p.practice}\n`));
  });
}
