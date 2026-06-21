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
  nq assets list [filter]       List the vendored official Nimiq asset library
  nq assets search <term>       Search assets incl. the 323 nimiq-icons + 422 hexagon flags
  nq assets add <name...>       Copy official asset(s) into ./nimiq/assets/
                                (icon:<name> extracts from nimiq-icons, flag:<cc> from nimiq-flags)
  nq principles                 Print the Nimiq design principles — the soul of this tool
  nq new <name>                 Scaffold a new REGISTRY component (principles checklist +
                                verification contract embedded)
  nq new-app <name>             Scaffold a CANONICAL Nimiq fleet app (Bun+Hono+bun:sqlite+
                                vanilla PWA + @nimiq/style + nimiq-settlement + Fly kit +
                                a stamped nimiq-stack.json + /health). Starts clean on align.
      --no-chain                chainApp:false (skip settlement + styling parity)
      --settlement mock|rpc|noop    settlement client (default mock)
      --deploy fly|none         deploy kit (default fly)
  nq check [path]               Run the FULL per-project alignment gate in one shot:
                                align (--fail-on=settlement,styling,identity) + 800-line file
                                guard + bun test (if present) + nq lint (if Playwright).
                                Prints a PASS/FAIL/SKIP summary; exits nonzero on any
                                FAIL (SKIP is fine). --json for machine output. This is
                                what a nightly loop / pre-push hook should run.
  nq align [path]               Grade an app's stack vs the canonical fleet baseline.
      --all <dir>               Grade every app dir under <dir>
      --fix                     Safe autofixes only (write/repair nimiq-stack.json)
      --fail-on settlement,styling   Nonzero exit if a listed axis is risky-fail (the gate)
      --quiet                   One-line drift banner (SessionStart)  --json  machine output
                                SETTLEMENT is load-bearing: any @nimiq/core/web import or
                                Client.create( / waitForConsensusEstablished( in src HARD FAILS.
                                IDENTITY is load-bearing for fleet repos (nimiq.<seg>): a
                                package/stack name or load-bearing file that drifts from the
                                repo name (stale codename like splitlink/tipjar) HARD FAILS.
  nq hooks install [repo]       Install the drift hooks: git pre-commit (align --fail-on),
                                git pre-push (the fuller nq check gate), SessionStart banner,
                                weekly GH Action (--write drops the workflow)
  nq verify <component|all>     Render the html variant and diff against the reference PNG
  nq lint <file.html|url>       Render a page and enforce the brand rules + breathability.
      --fix                     Auto-fix the safe text violations in a local file (dashes, title periods)
      --json                    Machine-readable output
                                ERRORS (off-brand slop) fail; WARNINGS (density) advise. See LINT.md
  nq audit [--skip-verify]      Check the LIVE Nimiq upstreams for branding drift vs our
                                pinned registry; attribute drift to components; write a report
  nq sync-skill                 Regenerate the nimiq-ui skill's registry block from index.json
  nq reuse <query>              Search the fleet REUSE index so you import instead of rebuild.
                                Fuzzy-matches packages (shared libs), components (nq add), and
                                first-party modules; prints each match's import snippet.
                                --json machine output  --dir <reposdir> point at a built index
      --rebuild <reposdir>      (Re)build reuse-index.json + REUSE-CATALOG.md by scanning a
                                directory of cloned fleet repos + this CLI's component registry.
                                Indexes 3 kinds: package / component / module (curated seed:
                                cashlink codec, QR, identicon, request-link, RPC rate, Fly kit,
                                i18n).  --out <path> for the catalog (default <reposdir>/../REUSE-CATALOG.md)
  nq help                       This message

All visual assets are the team's real shipped files (nimiq.com, wallet, hub,
nimiq/designs, nimiq-icons) — provenance in references/assets/ASSETS.md.
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
    else if (a === '--fix') flags.fix = true;
    else if (a === '--json') flags.json = true;
    else if (a === '--quiet') flags.quiet = true;
    else if (a === '--all') flags.all = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : true;
    else if (a === '--no-chain') flags.noChain = true;
    else if (a.startsWith('--settlement=')) flags.settlement = a.slice('--settlement='.length);
    else if (a === '--settlement') flags.settlement = args[++i];
    else if (a.startsWith('--deploy=')) flags.deploy = a.slice('--deploy='.length);
    else if (a === '--deploy') flags.deploy = args[++i];
    else if (a.startsWith('--fail-on=')) flags.failOn = a.slice('--fail-on='.length);
    else if (a === '--fail-on') flags.failOn = args[++i];
    else if (a === '--check') flags.check = true;
    else if (a === '--write') flags.write = true;
    else if (a === '--rebuild') flags.rebuild = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[++i] : true;
    else if (a === '--dir') flags.dir = args[++i];
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
    for (const asset of meta.assetFiles ?? []) await ensureAsset(asset, flags);
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

// official asset files a component references (meta.json assetFiles: ["img/world-map.svg"])
// land at ./nimiq/assets/<same relative path>
async function ensureAsset(assetRel, flags) {
  const src = join(ROOT, 'assets', assetRel);
  const dest = resolve(flags.out ?? '.', 'nimiq', 'assets', assetRel);
  if (existsSync(dest) || !existsSync(src)) return;
  await mkdir(dirname(dest), { recursive: true });
  await cp(src, dest, { recursive: true });
}

// ---- nq assets ----

const ASSET_DIRS = ['img', 'logos', 'icons', 'fonts'];

async function walkAssets() {
  const { readdir: rd } = await import('node:fs/promises');
  const out = [];
  async function walk(dir, rel) {
    for (const e of await rd(dir, { withFileTypes: true })) {
      if (e.isDirectory()) await walk(join(dir, e.name), `${rel}${e.name}/`);
      else out.push(rel + e.name);
    }
  }
  for (const d of ASSET_DIRS) {
    const p = join(ROOT, 'assets', d);
    if (existsSync(p)) await walk(p, d + '/');
  }
  return out;
}

async function loadIconSet(file) {
  const p = join(ROOT, 'assets', 'icons', file);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, 'utf8'));
}

function iconToSvg(set, name) {
  const ic = set.icons[name];
  if (!ic) return null;
  const w = ic.width ?? set.width ?? 16, h = ic.height ?? set.height ?? 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${ic.body}</svg>\n`;
}

async function cmdAssets(sub, args, flags) {
  if (sub === 'list') {
    const filter = args[0]?.toLowerCase();
    const files = (await walkAssets()).filter(f => !filter || f.toLowerCase().includes(filter));
    for (const f of files) console.log('  ' + f);
    console.log(`\n${files.length} file(s). Plus icon sets: nq assets search <term>  (nimiq-icons: 323, nimiq-flags: 422)`);
    return;
  }
  if (sub === 'search') {
    const term = args[0]?.toLowerCase();
    if (!term) throw new Error('nq assets search <term>');
    const files = (await walkAssets()).filter(f => f.toLowerCase().includes(term));
    files.forEach(f => console.log('  file   ' + f));
    for (const [setFile, prefix] of [['nimiq-icons.json', 'icon'], ['nimiq-flags.json', 'flag']]) {
      const set = await loadIconSet(setFile);
      if (!set) continue;
      Object.keys(set.icons).filter(n => n.includes(term)).slice(0, 40)
        .forEach(n => console.log(`  ${prefix}   ${prefix}:${n}`));
    }
    // catalog descriptions for context
    const catPath = join(ROOT, 'references', 'assets', 'asset-catalog.json');
    if (existsSync(catPath)) {
      const cat = JSON.parse(await readFile(catPath, 'utf8'));
      for (const s of cat) for (const a of s.assets ?? []) {
        if ((a.name + ' ' + a.description).toLowerCase().includes(term))
          console.log(`  ref    references/assets: ${a.name} — ${a.description.slice(0, 90)}`);
      }
    }
    return;
  }
  if (sub === 'add') {
    if (!args.length) throw new Error('nq assets add <name...> — file path fragment, icon:<name>, or flag:<name>');
    for (const q of args) {
      if (q.startsWith('icon:') || q.startsWith('flag:')) {
        const [kind, name] = q.split(':');
        const set = await loadIconSet(kind === 'icon' ? 'nimiq-icons.json' : 'nimiq-flags.json');
        const svg = set && iconToSvg(set, name);
        if (!svg) { console.warn(`! ${q} not found`); continue; }
        const dest = resolve(flags.out ?? '.', 'nimiq', 'assets', 'icons', `${name}.svg`);
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, svg);
        console.log(`+ ${q} → ${dest}`);
        continue;
      }
      const files = await walkAssets();
      const hits = files.filter(f => f.toLowerCase().includes(q.toLowerCase()));
      if (!hits.length) { console.warn(`! no asset matches "${q}"`); continue; }
      if (hits.length > 8) { console.warn(`! "${q}" matches ${hits.length} files — be more specific (nq assets search ${q})`); continue; }
      for (const f of hits) {
        await ensureAsset(f, flags);
        console.log(`+ ${f} → ${resolve(flags.out ?? '.', 'nimiq', 'assets', f)}`);
      }
    }
    return;
  }
  throw new Error(`nq assets ${sub ?? ''} — unknown subcommand (list | search | add)`);
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

async function cmdPrinciples() {
  console.log(await readFile(join(ROOT, 'PRINCIPLES.md'), 'utf8'));
}

const CHECKLIST = [
  'remove-everything-unnecessary: could anything be removed without the layout failing?',
  'light-stage: white/#F8F8F8 base, structure via white space + nuanced grays, not boxes/lines',
  'color-rules: main colors w/ gradient spin | light grays | semantic highlights on interaction only',
  'gradients: color areas use the bottom-right radial gradient, never flat fills',
  'form: warm and round yet straight and tangible; every element anchored, related to the whole',
  'type: Mulish for UI, Fira Mono for technical values, nothing else',
  'one-break: at most ONE calculated surprise, defensible on a content level',
  'learned-patterns: basics follow common patterns; surprise lives in details only',
  'real-assets: team-shipped files via nq assets — no redrawn logos/icons/art',
  'reproducible: plain HTML/CSS or standard Vue, passes nq verify',
];

async function cmdNewComponent(name, flags) {
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('nq new-component <kebab-case-name>');
  if (ROOT.includes('node_modules') || ROOT.includes('_npx')) {
    throw new Error('nq new-component scaffolds a component INTO the registry repo — clone it first:\n  git clone https://github.com/Andjroo111/nimiq-branding-cli\nthen run nq new-component from that checkout.');
  }
  const dir = join(ROOT, 'registry', 'components', name);
  if (existsSync(dir)) throw new Error(`component "${name}" already exists`);
  const pascal = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
  await mkdir(join(dir, 'html'), { recursive: true });
  await mkdir(join(dir, 'truth'), { recursive: true });
  await mkdir(join(dir, 'vue'), { recursive: true });

  const meta = {
    name,
    purpose: 'TODO: one sentence — what it is and where Nimiq uses it',
    category: 'misc',
    variants: ['vue', 'html'],
    props: [],
    cssFiles: ['css/legacy/nimiq-style.min.css'],
    assetFiles: [],
    dependsOn: [],
    npmDeps: [],
    verified: false,
    verify: { viewport: { width: 600, height: 400 }, selector: `.${name}`, maxDiffPct: 0.5, settleMs: 250 },
    principles: Object.fromEntries(CHECKLIST.map(c => [c.split(':')[0], false])),
    notes: 'Scaffolded by nq new. Cite the source (upstream file, real asset, or screenshot reference) here. A component is DONE when every principles flag is true AND nq verify passes.',
  };
  await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

  const pageChrome = (title, cssHref) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../../../assets/css/legacy/nimiq-style.min.css">
<link rel="stylesheet" href="${cssHref}">
<style>
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: 'Mulish', 'Muli', system-ui, sans-serif; }
</style>
</head>
<body>
<div class="${name}">
    <!-- TODO: same markup as html/${name}.html — keep truth/demo/snippet identical -->
</div>
</body>
</html>
`;
  await writeFile(join(dir, 'truth', 'truth.html'), pageChrome(`${name} — truth (cite your source!)`, `../html/${name}.css`));
  await writeFile(join(dir, 'html', 'demo.html'), pageChrome(name, `${name}.css`));
  await writeFile(join(dir, 'html', `${name}.html`), `<!-- ${name} — TODO describe. Requires ${name}.css + nimiq-style.min.css.\n     Source: TODO (upstream file / real asset / reference screenshot). -->\n<div class="${name}">\n    <!-- TODO -->\n</div>\n`);
  await writeFile(join(dir, 'html', `${name}.css`), `/* ${name} — all selectors namespaced under .${name}.\n   Principles: light stage, white-space structure, bottom-right radial gradients,\n   Mulish/Fira Mono, one calculated break max. Run: nq principles */\n.${name} {\n    font-family: 'Mulish', sans-serif;\n}\n`);
  await writeFile(join(dir, 'vue', `${pascal}.vue`), `<script setup lang="ts">\n// ${pascal} — port faithfully; inline small helpers; record npm deps in meta.json\n</script>\n\n<template>\n    <div class="${name}">\n        <!-- TODO -->\n    </div>\n</template>\n\n<style scoped>\n.${name} {\n    font-family: 'Mulish', sans-serif;\n}\n</style>\n`);

  console.log(`+ registry/components/${name}/ scaffolded\n`);
  console.log('The principles gate (all must become true in meta.json):');
  for (const c of CHECKLIST) console.log('  [ ] ' + c);
  console.log(`\nWorkflow:
  1. Build truth/truth.html from a REAL source (upstream code, real asset, or live screenshot) — cite it in meta.notes.
  2. node scripts/snap.mjs ${name}     (truth -> reference.png; eyeball it)
  3. Build html/${name}.html + demo.html + vue/${pascal}.vue with identical markup.
  4. node scripts/verify.mjs ${name}   (must pass at <= 0.5% diff)
  5. Flip the principles flags + verified:true, then: node scripts/build-index.mjs
Read the soul of the tool first: nq principles`);
}

async function cmdNew(name, flags) {
  const { scaffoldApp } = await import(join(ROOT, 'scripts', 'scaffold.mjs'));
  const r = await scaffoldApp(name, { noChain: flags.noChain, settlement: flags.settlement, deploy: flags.deploy });
  console.log(`+ scaffolded canonical Nimiq app → ${r.dir}`);
  console.log(`  ${r.files.length} files · chainApp=${r.chain}${r.chain ? ` · settlement=${r.settlement}` : ''} · deploy=${r.deploy}`);
  console.log(`\nNext:\n  cd ${name}\n  bun install\n  bun run dev      # http://localhost:3000  (try GET /health)\n  nq align         # should be clean on every axis\n  nq hooks install # add the pre-commit settlement/styling gate`);
}

async function cmdHooks(sub, flags) {
  const { installHooks, SESSION_START, WEEKLY_WORKFLOW } = await import(join(ROOT, 'scripts', 'hooks.mjs'));
  if (sub === 'install') {
    const r = await installHooks(rest[1], { write: !!flags.write });
    for (const p of r.wrote) console.log(`+ ${p}`);
    for (const p of r.printed) console.log(`  ${p}`);
    console.log(`\nSessionStart advisory — add to .claude/settings.json hooks.SessionStart:\n  ${SESSION_START.trim().split('\n').pop()}`);
    console.log(`\nWeekly GH Action: copy hooks/stack-align.yml into .github/workflows/ (or re-run with --write).`);
    return;
  }
  if (sub === 'show' || !sub) {
    console.log('# git pre-commit (.git/hooks/pre-commit):\n');
    const { PRE_COMMIT, PRE_PUSH } = await import(join(ROOT, 'scripts', 'hooks.mjs'));
    console.log(PRE_COMMIT);
    console.log('# git pre-push (.git/hooks/pre-push):\n');
    console.log(PRE_PUSH);
    console.log('# SessionStart advisory:\n');
    console.log(SESSION_START);
    console.log('# weekly GH Action (.github/workflows/stack-align.yml):\n');
    console.log(WEEKLY_WORKFLOW);
    return;
  }
  throw new Error(`nq hooks ${sub} — unknown (install | show)`);
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
    case 'principles': await cmdPrinciples(); break;
    case 'new':
    case 'new-component': await cmdNewComponent(rest[0], flags); break;
    case 'new-app': await cmdNew(rest[0], flags); break;
    case 'check': {
      const { run } = await import(join(ROOT, 'scripts', 'check.mjs'));
      await run(rest, flags);
      break;
    }
    case 'align': {
      const { run } = await import(join(ROOT, 'scripts', 'align.mjs'));
      await run(rest, flags);
      break;
    }
    case 'hooks': await cmdHooks(rest[0], flags); break;
    case 'assets': await cmdAssets(rest[0], rest.slice(1), flags); break;
    case 'verify': await cmdVerify(rest[0]); break;
    case 'lint': {
      const { lint } = await import(join(ROOT, 'scripts', 'lint.mjs'));
      const r = await lint(rest[0], { fix: flags.fix, json: flags.json });
      if (r.errorCount) process.exitCode = 1;
      break;
    }
    case 'audit': await import(join(ROOT, 'scripts', 'audit.mjs')); break;
    case 'sync-skill': await import(join(ROOT, 'scripts', 'sync-skill.mjs')); break;
    case 'reuse': {
      const { run } = await import(join(ROOT, 'scripts', 'reuse.mjs'));
      await run(rest, flags);
      break;
    }
    default: console.log(HELP);
  }
} catch (err) {
  console.error(`nq: ${err.message}`);
  process.exitCode = 1;
}
