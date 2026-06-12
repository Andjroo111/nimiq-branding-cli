#!/usr/bin/env node
// nq — Nimiq branding CLI. Scaffolds pixel-verified Nimiq-style components.
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'registry');

const HELP = `nq — Nimiq branding CLI

Usage:
  nq list [category]            List registry components (wallet, payment, form, layout, ...)
  nq info <component>           Show a component's meta, props, and CSS deps
  nq add <component...>         Copy component(s) into the current project
      --vue                     Vue 3 SFC variant (default if a package.json with vue is found)
      --html                    Plain HTML/CSS variant (default otherwise)
      --out <dir>               Destination dir (default: src/components or ./components)
  nq init [--style modern|legacy] [--out dir]
                                Drop Nimiq design tokens + base CSS into a project
  nq tokens                     Print core design tokens (colors, fonts, radii, shadows)
  nq verify <component|all>     Render the html variant and diff against the reference PNG
  nq help                       This message
`;

async function loadIndex() {
  const raw = await readFile(join(REGISTRY, 'index.json'), 'utf8');
  return JSON.parse(raw);
}

async function loadMeta(name) {
  const path = join(REGISTRY, 'components', name, 'meta.json');
  if (!existsSync(path)) throw new Error(`Unknown component "${name}". Run: nq list`);
  return JSON.parse(await readFile(path, 'utf8'));
}

function parseFlags(args) {
  const flags = {}; const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--vue' || a === '--html') flags.variant = a.slice(2);
    else if (a === '--out') flags.out = args[++i];
    else if (a === '--style') flags.style = args[++i];
    else rest.push(a);
  }
  return { flags, rest };
}

async function cmdList(category) {
  const index = await loadIndex();
  const rows = index.components.filter(c => !category || c.category === category);
  if (!rows.length) { console.log(category ? `No components in category "${category}".` : 'Registry is empty.'); return; }
  const byCat = {};
  for (const c of rows) (byCat[c.category] ??= []).push(c);
  for (const [cat, comps] of Object.entries(byCat).sort()) {
    console.log(`\n${cat}`);
    for (const c of comps) {
      const v = [c.variants.includes('vue') && 'vue', c.variants.includes('html') && 'html'].filter(Boolean).join('+');
      console.log(`  ${c.name.padEnd(26)} ${v.padEnd(9)} ${c.verified ? '✓ pixel-verified' : '· unverified'}  ${c.purpose}`);
    }
  }
  console.log();
}

async function cmdInfo(name) {
  const meta = await loadMeta(name);
  console.log(JSON.stringify(meta, null, 2));
}

async function detectVariant(flags) {
  if (flags.variant) return flags.variant;
  try {
    const pkg = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vue) return 'vue';
  } catch { /* no package.json */ }
  return 'html';
}

async function cmdAdd(names, flags) {
  if (!names.length) throw new Error('nq add <component...> — name required. Run: nq list');
  const variant = await detectVariant(flags);
  const outBase = flags.out ?? (existsSync(resolve('src/components')) ? 'src/components' : 'components');
  const queue = [...names];
  const added = new Set();
  while (queue.length) {
    const name = queue.shift();
    if (added.has(name)) continue;
    const meta = await loadMeta(name);
    if (!meta.variants.includes(variant)) {
      console.warn(`! ${name} has no ${variant} variant (has: ${meta.variants.join(', ')}) — skipping`);
      continue;
    }
    const srcDir = join(REGISTRY, 'components', name, variant);
    const dest = resolve(outBase, variant === 'vue' ? '' : name);
    await mkdir(dest, { recursive: true });
    await cp(srcDir, dest, { recursive: true });
    added.add(name);
    for (const dep of meta.dependsOn ?? []) if (!added.has(dep)) queue.push(dep);
    for (const css of meta.cssFiles ?? []) await ensureCss(css, flags);
    console.log(`+ ${name} (${variant}) → ${dest}`);
  }
  if (added.size) console.log(`\nDone. ${added.size} component(s) added. CSS deps land in ./nimiq/ — link them once in your entry point.`);
}

async function ensureCss(cssRel, flags) {
  const src = join(ROOT, 'assets', cssRel);
  // assets/css/legacy/x.css lands at nimiq/legacy/x.css — same layout as `nq init`
  const dest = resolve(flags.out ?? '.', 'nimiq', cssRel.replace(/^css\//, ''));
  if (existsSync(dest) || !existsSync(src)) return;
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, { recursive: true });
}

async function cmdInit(flags) {
  const style = flags.style ?? 'modern';
  const srcDir = join(ROOT, 'assets', 'css', style);
  if (!existsSync(srcDir)) throw new Error(`No token set "${style}" (expected assets/css/${style})`);
  const dest = resolve(flags.out ?? '.', 'nimiq');
  await mkdir(dest, { recursive: true });
  await cp(srcDir, join(dest, style), { recursive: true });
  console.log(`+ Nimiq ${style} tokens → ${join(dest, style)}`);
  console.log(style === 'modern'
    ? `  Link: <link rel="stylesheet" href="nimiq/modern/index.css">  (layered: colors, typography, utilities, components)`
    : `  Link: <link rel="stylesheet" href="nimiq/legacy/nimiq-style.min.css">  (nq-* classes)`);
}

async function cmdTokens() {
  console.log(await readFile(join(ROOT, 'assets', 'tokens.md'), 'utf8'));
}

async function cmdVerify(target) {
  const { verify } = await import(join(ROOT, 'scripts', 'verify.mjs'));
  const names = target === 'all' || !target
    ? (await readdir(join(REGISTRY, 'components'))).sort()
    : [target];
  let pass = 0, fail = 0, skip = 0;
  for (const name of names) {
    const r = await verify(name);
    if (r.status === 'pass') { pass++; console.log(`✓ ${name}  diff ${r.diffPct}%`); }
    else if (r.status === 'skip') { skip++; console.log(`· ${name}  ${r.reason}`); }
    else { fail++; console.log(`✗ ${name}  diff ${r.diffPct}% > ${r.threshold}%  (${r.diffPath})`); }
  }
  console.log(`\n${pass} pass, ${fail} fail, ${skip} skipped`);
  if (fail) process.exitCode = 1;
}

const [, , cmd, ...args] = process.argv;
const { flags, rest } = parseFlags(args);
try {
  switch (cmd) {
    case 'list': await cmdList(rest[0]); break;
    case 'info': await cmdInfo(rest[0]); break;
    case 'add': await cmdAdd(rest, flags); break;
    case 'init': await cmdInit(flags); break;
    case 'tokens': await cmdTokens(); break;
    case 'verify': await cmdVerify(rest[0]); break;
    default: console.log(HELP);
  }
} catch (err) {
  console.error(`nq: ${err.message}`);
  process.exitCode = 1;
}
