// Rebuild registry/index.json from each component's meta.json.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMP = join(ROOT, 'registry', 'components');
const names = (await readdir(COMP, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
const components = [];
for (const name of names) {
  try {
    const m = JSON.parse(await readFile(join(COMP, name, 'meta.json'), 'utf8'));
    components.push({
      name: m.name ?? name,
      purpose: m.purpose ?? '',
      category: m.category ?? 'misc',
      variants: m.variants ?? [],
      verified: !!m.verified,
    });
  } catch (e) {
    console.warn(`skip ${name}: ${e.message}`);
  }
}
await writeFile(join(ROOT, 'registry', 'index.json'), JSON.stringify({ components }, null, 2) + '\n');
console.log(`index.json: ${components.length} components, ${components.filter(c => c.verified).length} verified`);
