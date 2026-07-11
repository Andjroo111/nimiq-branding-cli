// nq reuse — make the Nimiq fleet's code DISCOVERABLE so a builder reuses instead of rebuilding.
//
// nq audit / nq verify ask "does our UI match Nimiq's design?".
// nq align asks "is this app on the canonical fleet stack?".
// nq reuse asks the THIRD sibling question: "what already exists in the fleet that I can
// import instead of writing again?" — aligned repos should SHARE their code.
//
// Two modes:
//
//   nq reuse --rebuild <reposdir> [--out <path>]
//       Scan a directory of already-cloned fleet repos + the CLI's own component registry,
//       and write reuse-index.json (machine) + REUSE-CATALOG.md (human). Indexes 3 KINDS:
//         package   — shared libs (package.json has "exports" / is a lib). Captures name,
//                     the git-dep install line github:Andjroo111/<repo>#<tag|main>, and the
//                     exported symbols parsed from src/index.ts.
//         component — the existing nq component registry (reuses registry/index.json — the
//                     same index `nq add` reads; never re-invented).
//         module    — notable first-party reusable modules found via a CURATED SEED of
//                     filename/import heuristics (cashlink codec, QR, identicon, request-link
//                     builder, RPC rate fetcher, the Fly deploy kit, the i18n engine). For each
//                     found: the canonical source repo + path.
//
//   nq reuse <query> [--json] [--dir <reposdir>]
//       Load reuse-index.json and fuzzy-match <query> against key/label/what; print matches
//       grouped by kind with their import snippet. Always exits 0 (it's a query).
//
// Entry shape: { key, kind, label, what, source: { repo, path }, import }
//   import = a copy/import snippet a builder can paste.
//
// Resilient by design: any repo that doesn't parse is skipped; a weird repo never crashes a rebuild.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const GH_OWNER = 'Andjroo111';
const INDEX_NAME = 'reuse-index.json';
const CATALOG_NAME = 'REUSE-CATALOG.md';

const KINDS = ['package', 'component', 'module'];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.output', 'coverage',
  '.verify', '.audit', '.cache', 'vendor', 'tmp', '.turbo',
]);
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte)$/;

// ---- the CURATED SEED ----
// Each seed names a reusable first-party module the fleet keeps re-writing. A seed matches a
// repo when ANY filename rule hits OR ANY import rule appears in a scanned source file. The
// first repo that matches wins (canonical source). `what` explains it; `importHint` builds the
// snippet from the discovered path.
const SEED = [
  {
    key: 'cashlink-codec',
    label: 'Cashlink codec',
    what: 'encode / decode Nimiq Cashlinks (base64url short-link payload <-> {value,message,...})',
    files: [/cashlink-codec\.(ts|js|mjs)$/, /cashlink\.codec\./, /lib\/cashlink\.(ts|js)$/],
    imports: [/cashlink-codec/, /encodeCashlink|decodeCashlink|CashlinkEncoding/],
  },
  {
    key: 'qr',
    label: 'QR creator',
    what: 'render a payment / request QR (Nimiq-styled qr-creator wrapper)',
    files: [/qr-?creator\.(ts|js|mjs)$/, /lib\/qr\.(ts|js)$/, /\bqr\b.*\.(ts|js)$/i],
    imports: [/['"]qr-creator['"]/, /QrCreator/, /createQr|renderQr/],
  },
  {
    key: 'identicon',
    label: 'Identicon renderer',
    what: 'render the Nimiq identicon for an address (@nimiq/identicons wrapper)',
    files: [/identicons?\.(ts|js|mjs)$/, /lib\/identicon/],
    imports: [/['"]@nimiq\/identicons['"]/, /makeIdenticon|identiconSvg|toIdenticon/],
  },
  {
    key: 'request-link',
    label: 'Request-link builder',
    what: 'build / parse a nimiq: payment request URI (recipient, amount, message)',
    files: [/request-link\.(ts|js|mjs)$/, /payment-?link\.(ts|js)$/, /lib\/request\.(ts|js)$/],
    imports: [/createRequestLink|parseRequestLink/, /['"]@nimiq\/utils['"].*[Rr]equestLink/, /nimiq:.*\?recipient/],
  },
  {
    key: 'rpc-rate',
    label: 'RPC / fiat rate fetcher',
    what: 'fetch the live NIM fiat price (coinpaprika; CoinGecko & raw urllib UA are CF-403d)',
    files: [/rate-?fetcher\.(ts|js|mjs)$/, /price\.(ts|js)$/, /fiat\.(ts|js)$/, /coinpaprika/],
    imports: [/coinpaprika/, /fetchRate|getNimPrice|fetchNimPrice|fiatRate/],
  },
  {
    key: 'fly-deploy-kit',
    label: 'Fly deploy kit',
    what: 'the canonical Fly deploy kit — Dockerfile + fly.toml (Bun + persistent volume, ord region)',
    files: [/^fly\.toml$/],
    extraFiles: ['Dockerfile'], // both must exist for the kit
    imports: [],
  },
  {
    key: 'i18n',
    label: 'i18n engine',
    what: 'the lightweight first-party i18n / translation engine (t() + locale dictionaries)',
    files: [/i18n\.(ts|js|mjs)$/, /lib\/i18n\//, /translations?\.(ts|js)$/, /locales?\//],
    imports: [/createI18n|useI18n|\bt\(['"]/, /from\s+['"].*i18n/],
  },
];

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

// Walk a repo collecting source files (relative paths). Bounded + resilient: never throws.
async function walkRepo(repoDir, { limit = 4000 } = {}) {
  const out = [];
  async function walk(dir) {
    if (out.length >= limit) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= limit) return;
      if (e.name.startsWith('.') && e.name !== '.well-known') continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      out.push(full.slice(repoDir.length + 1));
    }
  }
  await walk(repoDir);
  return out;
}

// The git-dep install ref for a fleet repo: latest tag if any, else main.
function latestRef(repoDir) {
  try {
    const tag = execFileSync('git', ['-C', repoDir, 'describe', '--tags', '--abbrev=0'],
      { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (tag) return tag;
  } catch { /* no tags / not a git repo */ }
  return 'main';
}

function installLine(repo, ref) {
  return `github:${GH_OWNER}/${repo}#${ref}`;
}

// Parse exported symbols from a src/index.ts (or .js/.mjs) barrel. Best-effort regex; resilient.
function parseExports(text) {
  const names = new Set();
  if (!text) return [];
  // export { a, b as c } from './x'   |  export { a, b }
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/i).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  // export const/function/class/let/var/type/interface/enum NAME
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:const|function|class|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  // export default ... -> note as "default"
  if (/export\s+default\b/.test(text)) names.add('default');
  // export * from './x'  -> can't name them; note the re-export
  const star = [...text.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  return { names: [...names], star };
}

// ---------------------------------------------------------------------------
// MODE 1: --rebuild
// ---------------------------------------------------------------------------

// PACKAGE: a repo is a shared lib when its package.json has "exports", or is marked a lib
// (main/module/types pointing at a src barrel), or its name matches a known shared-engine name.
const KNOWN_LIB_NAMES = new Set(['nimiq-settlement', 'nimiq-app-shell']);

async function indexPackage(repoDir, repo) {
  const pkg = await readJson(join(repoDir, 'package.json'));
  if (!pkg) return null;
  const name = pkg.name ? String(pkg.name).replace(/^@[^/]+\//, '') : repo;
  const isLib =
    !!pkg.exports ||
    KNOWN_LIB_NAMES.has(name) ||
    (!!pkg.module || (!!pkg.main && /\bindex\b/.test(String(pkg.main)))) && !!pkg.types;
  if (!isLib) return null;

  // find the barrel: src/index.ts | src/index.js | index.ts ...
  let barrelPath = null, barrelText = null;
  for (const cand of ['src/index.ts', 'src/index.js', 'src/index.mjs', 'index.ts', 'index.js', 'index.mjs']) {
    const full = join(repoDir, cand);
    if (existsSync(full)) { barrelPath = cand; try { barrelText = await readFile(full, 'utf8'); } catch {} break; }
  }
  const parsed = barrelText ? parseExports(barrelText) : { names: [], star: [] };
  const ref = latestRef(repoDir);
  const exportsList = parsed.names ?? [];

  const importExample = exportsList.length
    ? `import { ${exportsList.filter(n => n !== 'default').slice(0, 4).join(', ')} } from '${name}';`
    : `import * as ${name.replace(/[^A-Za-z0-9]/g, '')} from '${name}';`;

  return {
    key: name,
    kind: 'package',
    label: name,
    what: (pkg.description || `shared ${name} library`).trim(),
    source: { repo, path: barrelPath ?? 'package.json' },
    import: [
      `# add the git dep:`,
      `bun add ${installLine(repo, ref)}`,
      ``,
      importExample,
    ].join('\n'),
    exports: exportsList,
    install: installLine(repo, ref),
  };
}

// MODULE: scan a repo against the curated SEED; return the entries it satisfies.
async function indexModules(repoDir, repo, files) {
  const found = [];
  // small cache of file text for import-rule checks (only read code files, bounded)
  const codeFiles = files.filter(f => CODE_EXT.test(f)).slice(0, 1500);

  for (const seed of SEED) {
    // (a) filename rules
    let hitPath = null;
    for (const f of files) {
      if (seed.files.some(re => re.test(f) || re.test(basename(f)))) { hitPath = f; break; }
    }
    // fly-deploy-kit: require BOTH fly.toml and Dockerfile
    if (seed.key === 'fly-deploy-kit') {
      const hasFly = files.some(f => /^fly\.toml$/.test(f));
      const hasDocker = files.some(f => /^Dockerfile$/.test(basename(f)));
      hitPath = hasFly && hasDocker ? 'fly.toml + Dockerfile' : null;
    }
    // (b) import rules (only if no filename hit and the seed declares them)
    if (!hitPath && seed.imports?.length) {
      for (const f of codeFiles) {
        let text;
        try { text = await readFile(join(repoDir, f), 'utf8'); } catch { continue; }
        if (seed.imports.some(re => re.test(text))) { hitPath = f; break; }
      }
    }
    if (!hitPath) continue;

    found.push({
      key: seed.key,
      kind: 'module',
      label: seed.label,
      what: seed.what,
      source: { repo, path: hitPath },
      import:
        seed.key === 'fly-deploy-kit'
          ? `# copy the kit from ${repo}:\ncp ${repo}/Dockerfile ${repo}/fly.toml ./\n# (or scaffold fresh: nq new-app <name> --deploy fly)`
          : `# canonical source: ${repo}/${hitPath}\n# copy it, or import from the repo if it exports the symbol`,
    });
  }
  return found;
}

// COMPONENT: reuse the existing nq registry index — the SAME index `nq add` reads.
async function indexComponents() {
  const index = await readJson(join(ROOT, 'registry', 'index.json'));
  if (!index?.components) return [];
  return index.components.map(c => ({
    key: c.name,
    kind: 'component',
    label: c.name,
    what: c.purpose,
    source: { repo: 'nimiq-branding-cli', path: `registry/components/${c.name}` },
    import: `nq add ${c.name}`,
  }));
}

export async function rebuild(reposDir, { outPath } = {}) {
  const dir = resolve(reposDir);
  if (!existsSync(dir)) throw new Error(`nq reuse --rebuild: no such dir "${dir}"`);

  const entries = [];
  const scanned = [];
  const skipped = [];

  // components (from this CLI's own registry) — always available
  for (const c of await indexComponents()) entries.push(c);

  // walk each repo dir (only direct children that look like a repo)
  let children;
  try { children = await readdir(dir, { withFileTypes: true }); } catch { children = []; }
  for (const e of children) {
    if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const repoDir = join(dir, e.name);
    const repo = e.name;
    // a repo dir = has a package.json OR a fly.toml (deploy-kit-only repos still count)
    if (!existsSync(join(repoDir, 'package.json')) && !existsSync(join(repoDir, 'fly.toml'))) continue;
    try {
      const files = await walkRepo(repoDir);
      const pkgEntry = await indexPackage(repoDir, repo);
      if (pkgEntry) entries.push(pkgEntry);
      const mods = await indexModules(repoDir, repo, files);
      for (const m of mods) entries.push(m);
      scanned.push(repo);
    } catch (err) {
      // resilient: never let one weird repo crash the rebuild
      skipped.push({ repo, reason: err?.message ?? String(err) });
    }
  }

  // de-dup modules by key, keep the first (canonical) source
  const seenModuleKeys = new Set();
  const deduped = [];
  for (const en of entries) {
    if (en.kind === 'module') {
      if (seenModuleKeys.has(en.key)) continue;
      seenModuleKeys.add(en.key);
    }
    deduped.push(en);
  }

  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    reposDir: dir,
    scanned,
    skipped,
    counts: Object.fromEntries(KINDS.map(k => [k, deduped.filter(e => e.kind === k).length])),
    entries: deduped,
  };

  const indexPath = join(dir, INDEX_NAME);
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');

  const catalogPath = outPath ? resolve(outPath) : resolve(dir, '..', CATALOG_NAME);
  await writeFile(catalogPath, renderCatalog(index));

  return { index, indexPath, catalogPath };
}

function renderCatalog(index) {
  const lines = [];
  lines.push('# Nimiq fleet — REUSE catalog');
  lines.push('');
  lines.push('Before you build, check here. Aligned repos share their code — reuse, do not rebuild.');
  lines.push('');
  lines.push(`Generated ${index.generatedAt} from \`${index.reposDir}\` · regenerate with \`nq reuse --rebuild <reposdir>\``);
  lines.push(`Scanned ${index.scanned.length} repo(s)${index.skipped.length ? ` · skipped ${index.skipped.length}` : ''}.`);
  lines.push('');
  for (const kind of KINDS) {
    const rows = index.entries.filter(e => e.kind === kind);
    if (!rows.length) continue;
    const heading = kind === 'package' ? 'Packages (shared libs — `bun add github:...`)'
      : kind === 'component' ? 'Components (`nq add <name>`)'
      : 'Modules (first-party reusable code — copy or import)';
    lines.push(`## ${heading}  (${rows.length})`);
    lines.push('');
    for (const r of rows) {
      lines.push(`### ${r.label}  \`${r.key}\``);
      lines.push('');
      lines.push(r.what);
      lines.push('');
      lines.push(`Source: \`${r.source.repo}/${r.source.path}\``);
      if (r.exports?.length) lines.push(`Exports: ${r.exports.map(e => `\`${e}\``).join(', ')}`);
      lines.push('');
      lines.push('```');
      lines.push(r.import);
      lines.push('```');
      lines.push('');
    }
  }
  lines.push('---');
  lines.push(`Find anything fast: \`nq reuse <query>\`  (e.g. \`nq reuse qr\`, \`nq reuse settlement\`).`);
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// MODE 2: query
// ---------------------------------------------------------------------------

function resolveIndexPath(flags) {
  if (flags.dir) {
    const p = join(resolve(flags.dir), INDEX_NAME);
    if (existsSync(p)) return p;
    return null;
  }
  // default search: cwd, then ./<common reposdir guesses>
  for (const cand of [
    resolve(INDEX_NAME),
    resolve('..', INDEX_NAME),
  ]) {
    if (existsSync(cand)) return cand;
  }
  return null;
}

function scoreEntry(entry, q) {
  const ql = q.toLowerCase();
  const hay = [entry.key, entry.label, entry.what, ...(entry.exports ?? [])]
    .filter(Boolean).join(' ').toLowerCase();
  if (!hay.includes(ql)) {
    // token fallback: all query tokens present somewhere
    const toks = ql.split(/\s+/).filter(Boolean);
    if (!toks.length || !toks.every(t => hay.includes(t))) return 0;
    return 1;
  }
  let s = 5;
  if (entry.key.toLowerCase() === ql) s += 10;
  if (entry.key.toLowerCase().includes(ql)) s += 4;
  if (entry.label.toLowerCase().includes(ql)) s += 3;
  return s;
}

export async function query(q, flags = {}) {
  const indexPath = resolveIndexPath(flags);
  if (!indexPath) {
    const msg = 'no reuse-index.json found — run `nq reuse --rebuild <reposdir>` first (or pass --dir <reposdir>)';
    if (flags.json) console.log(JSON.stringify({ error: msg, matches: [] }, null, 2));
    else console.log(`nq reuse: ${msg}`);
    return { matches: [] };
  }
  const index = await readJson(indexPath);
  const entries = index?.entries ?? [];
  const matches = entries
    .map(e => ({ e, score: scoreEntry(e, q) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.e);

  if (flags.json) {
    console.log(JSON.stringify({ query: q, indexPath, count: matches.length, matches }, null, 2));
    return { matches };
  }

  if (!matches.length) {
    console.log(`nq reuse "${q}": no matches in ${matches.length ? '' : ''}${basename(indexPath)} — try a broader term, or rebuild the index.`);
    return { matches };
  }

  console.log(`\nnq reuse "${q}" — ${matches.length} match(es) in ${index.scanned?.length ?? 0} fleet repo(s)\n`);
  for (const kind of KINDS) {
    const rows = matches.filter(m => m.kind === kind);
    if (!rows.length) continue;
    console.log(`${kind}`);
    for (const r of rows) {
      console.log(`  ${r.label}  (${r.source.repo}/${r.source.path})`);
      console.log(`    ${r.what}`);
      for (const ln of r.import.split('\n')) console.log(`      ${ln}`);
      console.log();
    }
  }
  return { matches };
}

// ---------------------------------------------------------------------------
// entry — wired into bin/nq.js
// ---------------------------------------------------------------------------

export async function run(rest, flags) {
  if (flags.rebuild) {
    const reposDir = rest[0] ?? (typeof flags.rebuild === 'string' ? flags.rebuild : null);
    if (!reposDir) throw new Error('nq reuse --rebuild <reposdir> — a directory of cloned fleet repos is required');
    const { index, indexPath, catalogPath } = await rebuild(reposDir, { outPath: flags.out });
    console.log(`+ ${indexPath}`);
    console.log(`+ ${catalogPath}`);
    const c = index.counts;
    console.log(`\nIndexed ${index.entries.length} entries — ${c.package} package, ${c.component} component, ${c.module} module · scanned ${index.scanned.length} repo(s)${index.skipped.length ? ` · skipped ${index.skipped.length}` : ''}.`);
    console.log(`Find anything: nq reuse <query>`);
    return;
  }
  const q = rest.join(' ').trim();
  if (!q) {
    console.log('nq reuse <query>            search the fleet reuse index (e.g. nq reuse qr)');
    console.log('nq reuse --rebuild <dir>    (re)build reuse-index.json + REUSE-CATALOG.md from cloned fleet repos');
    return;
  }
  await query(q, flags); // always exits 0 — it's a query
}
