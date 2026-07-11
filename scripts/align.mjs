// nq align — fleet stack-alignment grader.
//
// Branding accuracy (nq audit / nq verify) asks "does our UI match Nimiq's design?".
// nq align asks the sibling question for a whole APP: "is this app on the canonical
// Nimiq fleet stack?" — same self-learning vocabulary (clean / safe-drift / risky-fail).
//
// The load-bearing axis is SETTLEMENT. The @nimiq/core light client is broken on our
// hosts (never reaches consensus). So an `@nimiq/core/web` import, a `Client.create(`,
// or a `waitForConsensusEstablished(` in src is a HARD FAIL — chain reads must go
// through the rpc-block-scan path (the nimiq-settlement package).
//
// Reads <app>/nimiq-stack.json (infers + offers to write one if absent), grades each
// axis against align/canonical.json, prints a verdict table, and exits nonzero when a
// --fail-on axis fails (the pre-commit / CI gate).
//
// Usage:
//   nq align [path]                  grade one app (default: cwd)
//   nq align --all <dir>             grade every app dir under <dir>
//   nq align --fix                   safe autofixes only (write/repair the manifest)
//   nq align --fail-on=settlement,styling   exit 1 if any listed axis is risky-fail
//   nq align --quiet                 one-line drift banner (for SessionStart)
//   nq align --json                  machine-readable
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// ---- verdict vocabulary (shared with nq audit) ----
export const CLEAN = 'clean';
export const SAFE = 'safe-drift';
export const RISKY = 'risky-fail';
const RANK = { [CLEAN]: 0, [SAFE]: 1, [RISKY]: 2 };
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);

// axes that may be named in --fail-on.
// miniApp / i18n / deps are ADVISORY adoption axes: they max out at safe-drift (never
// risky), so they track fleet adoption (Nimiq Pay mini-app, runtime i18n, shared-package
// freshness) without failing CI everywhere. They are NOT in nq check's gate set.
const AXES = ['settlement', 'styling', 'identity', 'miniApp', 'i18n', 'deps', 'stack', 'deploy', 'config'];
// advisory axes never move `overall` and never gate (they cap at safe-drift by design).
const ADVISORY_AXES = new Set(['miniApp', 'i18n', 'deps']);

const MANIFEST = 'nimiq-stack.json';

export async function loadCanonical() {
  return JSON.parse(await readFile(join(ROOT, 'align', 'canonical.json'), 'utf8'));
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

// ---- canonical repo-name resolution (for the identity axis) ----
// The CANONICAL name is the repo name from the git origin remote (after the last '/',
// '.git' stripped). With no git/remote we fall back to basename(dir). An explicit
// opts.repoName override wins (used by tests, since tmp dirs have no remote).
const FLEET_NAME = /^nimiq\.[a-z0-9-]+$/;

function resolveRepoName(appDir) {
  try {
    const url = execSync('git remote get-url origin', {
      cwd: appDir, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8',
    }).trim();
    if (url) {
      const last = url.split('/').pop() ?? '';
      const name = last.replace(/\.git$/, '').trim();
      if (name) return name;
    }
  } catch { /* no git, no remote, or git not installed — fall back */ }
  return basename(appDir);
}

// ---- source scan for the broken light-client path ----
// Walks the app's src/ (+ a couple of common roots) for any forbidden import/call.
// Returns the list of "file:line  snippet" hits. This is what makes SETTLEMENT load-bearing.
const SRC_DIRS = ['src', 'app', 'lib', 'server', 'public', 'functions'];
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|svelte)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.output', 'coverage', '.verify', '.audit']);

async function scanLightClient(appDir, canonical) {
  const forbiddenImports = canonical.lightClient?.forbiddenImports ?? ['@nimiq/core/web'];
  const forbiddenCalls = canonical.lightClient?.forbiddenCalls ?? ['Client.create(', 'waitForConsensusEstablished('];
  const hits = [];
  const coreImports = []; // files that import @nimiq/core (any subpath) — for coreRole check

  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.well-known') continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!CODE_EXT.test(e.name)) continue;
      // Test/spec files legitimately reference the forbidden strings (fixtures, mocks, the
      // detector's own cases) and are not shipped runtime code — never grade them.
      if (/\.(test|spec)\./.test(e.name)) continue;
      let text;
      try { text = await readFile(full, 'utf8'); } catch { continue; }
      const rel = full.slice(appDir.length + 1);
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        // a pure line-comment can mention these strings ("don't call Client.create()")
        // without being a real usage — skip those to avoid false positives.
        const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
        for (const imp of forbiddenImports) {
          // a comment can quote the forbidden import without being a real usage; only a
          // non-comment line that contains it is a real import (imports never start with //).
          if (!isComment && line.includes(imp)) {
            hits.push({ file: rel, line: i + 1, kind: 'import', match: imp, text: trimmed.slice(0, 100) });
          }
        }
        if (!isComment) {
          for (const call of forbiddenCalls) {
            if (line.includes(call)) hits.push({ file: rel, line: i + 1, kind: 'call', match: call, text: trimmed.slice(0, 100) });
          }
        }
        if (/from\s+['"]@nimiq\/core/.test(line) || /require\(\s*['"]@nimiq\/core/.test(line)) {
          coreImports.push({ file: rel, line: i + 1, text: line.trim().slice(0, 100) });
        }
      }
    }
  }
  for (const d of SRC_DIRS) {
    const p = join(appDir, d);
    if (existsSync(p)) await walk(p);
  }
  return { hits, coreImports };
}

// ---- identity scan ----
// Scoped ONLY to load-bearing identity surfaces — NOT docs/CHANGELOG/comments (those
// are append-only history and would false-positive on every past rename). The surfaces:
//   - package.json  "name" + "description"
//   - nimiq-stack.json  "name"
//   - fly.toml  app = "..."  and  [[mounts]] source = "..."
//   - env-var NAMES referenced as process.env.<NAME> in src/ files
// Returns { stale: [{where, token}], envPrefixes: Set<string> }.
const IDENTITY_SRC_DIRS = ['src'];

function findStaleTokens(text, oldCodenames, allow) {
  const hits = [];
  const lower = String(text ?? '').toLowerCase();
  for (const code of oldCodenames) {
    const c = code.toLowerCase();
    if (allow.has(c)) continue;
    // word/hyphen-bounded so "split" inside "splitter" or the legit "nimiq-settlement"
    // never trips; matches splitlink, nimiq-split, etc. as standalone identity tokens.
    const re = new RegExp(`(^|[^a-z0-9])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (re.test(lower)) hits.push(c);
  }
  return [...new Set(hits)];
}

async function scanIdentity(appDir, canonical, repoName) {
  const idc = canonical.identity ?? {};
  const oldCodenames = idc.oldCodenames ?? [];
  // never flag the repo's OWN canonical name, nor the legit shared deps.
  const allow = new Set([
    repoName.toLowerCase(),
    ...(idc.sharedDeps ?? []).map(s => s.toLowerCase()),
  ]);
  const stale = [];

  // package.json name + description
  const pkg = await readJson(join(appDir, 'package.json'));
  if (pkg) {
    const pkgName = String(pkg.name ?? '').replace(/^@[^/]+\//, '');
    for (const t of findStaleTokens(pkgName, oldCodenames, allow)) stale.push({ where: 'package.json name', token: t });
    for (const t of findStaleTokens(pkg.description ?? '', oldCodenames, allow)) stale.push({ where: 'package.json description', token: t });
  }
  // nimiq-stack.json name
  const stack = await readJson(join(appDir, MANIFEST));
  if (stack) {
    for (const t of findStaleTokens(stack.name ?? '', oldCodenames, allow)) stale.push({ where: 'nimiq-stack.json name', token: t });
  }
  // fly.toml app + [[mounts]] source
  const flyPath = join(appDir, 'fly.toml');
  if (existsSync(flyPath)) {
    let fly = '';
    try { fly = await readFile(flyPath, 'utf8'); } catch { /* unreadable */ }
    for (const line of fly.split('\n')) {
      const m = line.match(/^\s*(app|source)\s*=\s*["']([^"']+)["']/);
      if (m) for (const t of findStaleTokens(m[2], oldCodenames, allow)) stale.push({ where: `fly.toml ${m[1]}`, token: t });
    }
  }

  // env-var NAMES (process.env.<NAME>) referenced in src/ — both for stale-codename
  // detection and for the advisory env-prefix note.
  const envNames = new Set();
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!CODE_EXT.test(e.name)) continue;
      if (/\.(test|spec)\./.test(e.name)) continue;
      let text;
      try { text = await readFile(full, 'utf8'); } catch { continue; }
      for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) envNames.add(m[1]);
    }
  }
  for (const d of IDENTITY_SRC_DIRS) {
    const p = join(appDir, d);
    if (existsSync(p)) await walk(p);
  }
  for (const name of envNames) {
    for (const t of findStaleTokens(name, oldCodenames, allow)) stale.push({ where: `env var ${name}`, token: t });
  }

  return { stale, envNames: [...envNames] };
}

// ---- adoption scans (mini-app + i18n) ----
// One walk over the app's code roots, collecting the signals both advisory axes need:
//   - shellImports:  names imported FROM nimiq-app-shell / @nimiq/app-shell (createWallet,
//                    createI18n, ...) — the canonical shared-shell integration.
//   - sdkHits:       references to the real Nimiq Pay mini-app surface (@nimiq/mini-app-sdk,
//                    window.nimiqPay, window.nimiq) outside comments.
//   - createI18nHits / vueI18nHits: real runtime-i18n wiring.
//   - stubProvider:  the integration is present but is plainly a STUB/MOCK (competition-era
//                    placeholder) — keeps the axis honest (present-but-fake ≠ adopted).
// the shared shell, imported either as the package OR as the vendored bundle the
// scaffold's `build:shell` step emits at public/vendor/app-shell.js.
const SHELL_PKG_RE = /from\s+['"](?:@nimiq\/app-shell|nimiq-app-shell|[^'"]*\/vendor\/app-shell(?:\.js)?)['"]/;
const SHELL_REQUIRE_RE = /require\(\s*['"](?:@nimiq\/app-shell|nimiq-app-shell|[^'"]*\/vendor\/app-shell(?:\.js)?)['"]\s*\)/;

async function scanAdoption(appDir, canonical) {
  const sdkTokens = canonical.miniApp?.sdkTokens ?? ['@nimiq/mini-app-sdk', 'window.nimiqPay', 'window.nimiq'];
  const stubMarkers = (canonical.miniApp?.stubMarkers ?? ['stub', 'mock', 'fake', 'placeholder', 'competition'])
    .map(s => s.toLowerCase());

  const shellImportNames = new Set(); // identifiers imported from the shell package
  const sdkHits = [];                 // {file,line,token}
  let createI18nHit = false;          // createI18n imported/used from the shell
  let vueI18nHit = false;             // vue-i18n imported or createI18n()/useI18n() used
  let stubProvider = false;          // a shell/mini-app wiring that is clearly a stub/mock

  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.well-known') continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { await walk(full); continue; }
      if (!CODE_EXT.test(e.name)) continue;
      if (/\.(test|spec)\./.test(e.name)) continue;
      let text;
      try { text = await readFile(full, 'utf8'); } catch { continue; }
      const rel = full.slice(appDir.length + 1);
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
        // imports FROM the shared shell — capture the named bindings (createWallet, createI18n).
        if (!isComment && (SHELL_PKG_RE.test(line) || SHELL_REQUIRE_RE.test(line))) {
          for (const m of line.matchAll(/[{,]\s*([A-Za-z_$][\w$]*)/g)) shellImportNames.add(m[1]);
          if (/\bcreateI18n\b/.test(line)) createI18nHit = true;
          // a shell wiring next to a stub marker on the same line is a stub
          if (stubMarkers.some(s => line.toLowerCase().includes(s))) stubProvider = true;
        }
        // vue-i18n usage: an explicit vue-i18n import, or useI18n(). (A bare createI18n()
        // call is attributed to the shell via createI18nHit, not double-counted here.)
        if (!isComment) {
          if (/from\s+['"]vue-i18n['"]/.test(line) || /require\(\s*['"]vue-i18n['"]/.test(line)) vueI18nHit = true;
          if (/\buseI18n\s*\(/.test(line)) vueI18nHit = true;
          if (/\bcreateWallet\b/.test(line) && shellImportNames.has('createWallet')) {
            if (stubMarkers.some(s => line.toLowerCase().includes(s))) stubProvider = true;
          }
        }
        // real mini-app SDK surface
        if (!isComment) {
          for (const tok of sdkTokens) {
            if (line.includes(tok)) sdkHits.push({ file: rel, line: i + 1, token: tok });
          }
        }
      }
    }
  }
  for (const d of SRC_DIRS) {
    const p = join(appDir, d);
    if (existsSync(p)) await walk(p);
  }
  return { shellImportNames: [...shellImportNames], sdkHits, createI18nHit, vueI18nHit, stubProvider };
}

// locales-dir detection (>1 language file = real i18n) — independent of code scan.
async function scanLocales(appDir, canonical) {
  const dirs = canonical.i18n?.localesDirs ?? ['public/locales', 'locales', 'src/locales'];
  const fileRe = new RegExp(canonical.i18n?.localeFile ?? '\\.(json|ya?ml|js|ts)$');
  let best = 0, where = null;
  for (const d of dirs) {
    const p = join(appDir, d);
    if (!existsSync(p)) continue;
    let entries;
    try { entries = await readdir(p, { withFileTypes: true }); } catch { continue; }
    const files = entries.filter(e => e.isFile() && fileRe.test(e.name)
      && !/^index\./i.test(e.name) && e.name.toLowerCase() !== 'config.json');
    if (files.length > best) { best = files.length; where = d; }
  }
  return { localeFileCount: best, localesDir: where };
}

// ---- shared-package version drift (deps axis) ----
// For each shared fleet package depended on as a git dep, resolve the git tag pinned in
// package.json and compare to the latest tag from `git ls-remote --tags`. Older pin =
// SAFE-DRIFT (advisory). Network/git failure = skip QUIETLY (offline → no drift).
const SEMVER_RE = /v?(\d+)\.(\d+)\.(\d+)/;

function parsePinnedTag(spec) {
  // git dep specs:  github:owner/repo#v0.2.0  |  <url>.git#v0.2.0  |  ...#semver:^1.0.0
  const s = String(spec ?? '');
  const hashIdx = s.indexOf('#');
  if (hashIdx < 0) return null;
  let ref = s.slice(hashIdx + 1).trim();
  if (ref.startsWith('semver:')) ref = ref.slice('semver:'.length).trim();
  return ref || null;
}

function semverCmp(a, b) {
  const ma = SEMVER_RE.exec(a ?? ''), mb = SEMVER_RE.exec(b ?? '');
  if (!ma || !mb) return null; // not comparable
  for (let i = 1; i <= 3; i++) {
    const d = Number(ma[i]) - Number(mb[i]);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

function latestTagFromLsRemote(out) {
  let best = null;
  for (const line of String(out).split('\n')) {
    const m = line.match(/refs\/tags\/(v?\d+\.\d+\.\d+)(\^\{\})?$/);
    if (!m) continue;
    const tag = m[1];
    if (best === null || (semverCmp(best, tag) ?? -1) < 0) best = tag;
  }
  return best;
}

// injectable for tests via opts.lsRemote(url) → string | null (null = offline/failure)
function defaultLsRemote(url) {
  try {
    return execSync(`git ls-remote --tags ${JSON.stringify(url)}`, {
      stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', timeout: 8000,
    });
  } catch { return null; }
}

function scanDeps(appDir, canonical, pkg, lsRemote = defaultLsRemote) {
  const shared = canonical.deps?.sharedPackages ?? {};
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const findings = []; // {pkg, pinned, latest}
  let checked = 0, skipped = 0;
  for (const [name, url] of Object.entries(shared)) {
    if (!(name in deps)) continue;
    const pinned = parsePinnedTag(deps[name]);
    if (!pinned || !SEMVER_RE.test(pinned)) { skipped++; continue; } // not a git tag pin (e.g. file:, *) — nothing to compare
    const out = lsRemote(url);
    if (out == null) { skipped++; continue; } // offline / failure → skip quietly
    const latest = latestTagFromLsRemote(out);
    if (!latest) { skipped++; continue; }
    checked++;
    const cmp = semverCmp(pinned, latest);
    if (cmp != null && cmp < 0) findings.push({ pkg: name, pinned, latest });
  }
  return { findings, checked, skipped };
}

// ---- manifest inference (when absent) ----
async function inferManifest(appDir) {
  const pkg = await readJson(join(appDir, 'package.json')) ?? {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const has = (n) => n in deps;
  const fileExists = (rel) => existsSync(join(appDir, rel));

  const runtime = fileExists('bun.lock') || fileExists('bun.lockb') ? 'bun'
    : has('next') ? 'edge' : 'node';
  const packageManager = fileExists('bun.lock') || fileExists('bun.lockb') ? 'bun'
    : fileExists('pnpm-lock.yaml') ? 'pnpm'
    : fileExists('yarn.lock') ? 'yarn' : 'npm';
  const framework = has('next') ? 'next' : has('nuxt') ? 'nuxt'
    : has('vue') ? 'vue' : 'vanilla-pwa';
  const server = has('hono') ? `hono@${deps.hono ?? '^4'}`
    : has('next') ? 'next' : has('express') ? 'express' : 'none';
  const build = has('vite') ? 'vite' : has('next') ? 'next' : has('esbuild') ? 'esbuild' : 'none';

  const stylingSource = (has('@nimiq/style') || has('nimiq-css') || fileExists('public/css/tokens.css'))
    ? 'nimiq-ui' : 'unknown';

  const settlementLib = has('nimiq-settlement') ? 'nimiq-settlement'
    : (fileExists('src/lib/chain.ts') || fileExists('src/payments/nimiq-rpc-client.ts')) ? 'inline'
    : 'none';
  const coreRole = has('@nimiq/core') ? 'offline-crypto-only' : 'none';

  const target = fileExists('fly.toml') ? 'fly'
    : fileExists('netlify.toml') ? 'netlify'
    : fileExists('wrangler.toml') ? 'cloudflare-pages' : 'unknown';
  const ci = existsSync(join(appDir, '.github', 'workflows'));

  return {
    $schema: 'https://nimiq.tech/schemas/nimiq-stack.v1.json',
    schemaVersion: 1,
    name: pkg.name ? String(pkg.name).replace(/^@[^/]+\//, '') : basename(appDir),
    chainApp: has('@nimiq/core') || settlementLib !== 'none',
    exempt: false,
    exemptReason: null,
    stack: { framework, server, runtime, build, packageManager },
    styling: { source: stylingSource, notes: 'inferred by nq align --fix; confirm' },
    settlement: {
      pattern: settlementLib === 'none' ? 'mock' : 'rpc-block-scan',
      lib: settlementLib,
      coreRole,
      notes: 'inferred by nq align --fix; confirm',
    },
    deploy: {
      target, region: null, storage: null, autoDeploy: ci ? 'github-actions' : null,
      edge: { provider: null, proxied: null, access: null },
    },
    config: {
      tsconfig: fileExists('tsconfig.json') ? 'local-strict' : 'none',
      lint: has('eslint') ? 'eslint' : has('@biomejs/biome') ? 'biome' : 'none',
      fileSizeGuard: false,
      ci,
    },
    canonicalVersion: '0.0.0',
    _inferred: true,
  };
}

// ---- the axis graders ----
// Each returns { verdict, lines: [..notes] }.

function gradeSettlement(m, canonical, scan) {
  const lines = [];
  let v = CLEAN;
  // (1) HARD FAIL: the broken light-client path anywhere in src.
  if (scan.hits.length) {
    v = RISKY;
    for (const h of scan.hits.slice(0, 6)) {
      lines.push(`HARD FAIL: ${h.kind} ${h.match}  (${h.file}:${h.line})`);
    }
    if (scan.hits.length > 6) lines.push(`  ...and ${scan.hits.length - 6} more`);
    lines.push('  the @nimiq/core light client never reaches consensus on our hosts — use rpc-block-scan via nimiq-settlement');
    return { verdict: v, lines };
  }
  // (2) declared pattern must not be the forbidden one
  const forbidden = canonical.settlement.forbiddenPatterns ?? ['light-client'];
  if (forbidden.includes(m.settlement?.pattern)) {
    return { verdict: RISKY, lines: [`settlement.pattern "${m.settlement.pattern}" is forbidden (light client is broken on our hosts)`] };
  }
  const accepted = canonical.settlement.acceptedPatterns ?? ['rpc-block-scan', 'mock', 'noop'];
  if (!accepted.includes(m.settlement?.pattern)) {
    v = worst(v, SAFE);
    lines.push(`settlement.pattern "${m.settlement?.pattern}" not in canonical set [${accepted.join(', ')}]`);
  }
  // (3) chain reads via the settlement package (warn until extracted)
  const acceptedLibs = canonical.settlement.acceptedLibs ?? ['nimiq-settlement', 'inline'];
  if (!acceptedLibs.includes(m.settlement?.lib)) {
    v = worst(v, SAFE);
    lines.push(`settlement.lib "${m.settlement?.lib}" not canonical — chain reads should use the ${canonical.settlementPackage} package`);
  } else if (m.settlement?.lib === 'inline') {
    lines.push(`settlement.lib inline — fine for now; migrate to the shared ${canonical.settlementPackage} package once extracted`);
  }
  // (4) coreRole must match actual @nimiq/core usage
  if (scan.coreImports.length && m.settlement?.coreRole !== 'offline-crypto-only') {
    v = worst(v, SAFE);
    lines.push(`@nimiq/core is imported but coreRole is "${m.settlement?.coreRole}" — should be "offline-crypto-only"`);
  }
  if (!scan.coreImports.length && m.settlement?.coreRole === 'offline-crypto-only') {
    lines.push('coreRole offline-crypto-only but no @nimiq/core import found (declared-only; OK)');
  }
  if (v === CLEAN && !lines.length) lines.push('rpc-block-scan / offline-crypto-only — no light-client path in src');
  return { verdict: v, lines };
}

function gradeStyling(m, canonical) {
  if (!m.chainApp) return { verdict: CLEAN, lines: ['not a chain app — styling parity not enforced'] };
  if (m.styling?.source === canonical.styling.source) {
    return { verdict: CLEAN, lines: [`styling.source ${canonical.styling.source} (@nimiq/style / nq)`] };
  }
  return {
    verdict: RISKY,
    lines: [`chainApp styling.source "${m.styling?.source}" != "${canonical.styling.source}" — use @nimiq/style + nq components (nq init / nq add)`],
  };
}

function gradeStack(m, canonical, scan) {
  const lines = [];
  let v = CLEAN;
  const c = canonical.stack;
  const s = m.stack ?? {};
  const norm = (x) => String(x ?? '').replace(/@.*$/, '');
  for (const key of ['framework', 'runtime', 'packageManager']) {
    if (norm(s[key]) !== norm(c[key])) {
      v = worst(v, SAFE);
      lines.push(`stack.${key} "${s[key]}" drifts from canonical "${c[key]}"`);
    }
  }
  // a bundler is a drift UNLESS a /web import justifies it
  if (norm(s.build) !== norm(c.build)) {
    const justified = scan.coreImports.some(h => h.text.includes('@nimiq/core/web'));
    if (justified) lines.push(`stack.build "${s.build}" (bundler) — justified by an @nimiq/core/web import`);
    else { v = worst(v, SAFE); lines.push(`stack.build "${s.build}" != canonical "${c.build}" (no /web import to justify a bundler)`); }
  }
  if (v === CLEAN && !lines.length) lines.push(`${c.framework} / ${c.runtime} / ${c.packageManager} — canonical`);
  return { verdict: v, lines };
}

function gradeDeploy(m, canonical, appDir) {
  const lines = [];
  let v = CLEAN;
  const target = m.deploy?.target;
  if (!target || target === 'unknown') {
    v = worst(v, SAFE);
    lines.push('deploy.target unknown — wire a real target (Fly: Dockerfile + fly.toml)');
  }
  // verify the deploy kit is actually present when target is fly
  if (target === 'fly') {
    const missing = ['Dockerfile', 'fly.toml'].filter(f => !existsSync(join(appDir, f)));
    if (missing.length) { v = worst(v, SAFE); lines.push(`deploy.target fly but missing: ${missing.join(', ')}`); }
  }
  if (!m.config?.ci) { v = worst(v, SAFE); lines.push('no CI declared (config.ci=false) — deploy should be CI-gated'); }
  if (v === CLEAN && !lines.length) lines.push(`${target} + CI wired`);
  return { verdict: v, lines };
}

function gradeConfig(m, canonical) {
  const lines = [];
  let v = CLEAN;
  const c = canonical.config;
  if (m.config?.tsconfig !== c.tsconfig) { v = worst(v, SAFE); lines.push(`config.tsconfig "${m.config?.tsconfig}" != "${c.tsconfig}"`); }
  if (m.config?.fileSizeGuard !== c.fileSizeGuard && m.config?.fileSizeGuard !== false) {
    v = worst(v, SAFE); lines.push(`config.fileSizeGuard ${m.config?.fileSizeGuard} != canonical ${c.fileSizeGuard}`);
  } else if (m.config?.fileSizeGuard === false) {
    v = worst(v, SAFE); lines.push(`config.fileSizeGuard off — canonical guards source files at ${c.fileSizeGuard} lines`);
  }
  if (m.canonicalVersion && canonical.canonicalVersion && m.canonicalVersion !== canonical.canonicalVersion) {
    lines.push(`canonicalVersion ${m.canonicalVersion} != fleet ${canonical.canonicalVersion} (re-align)`);
  }
  if (v === CLEAN && !lines.length) lines.push('tsconfig / fileSizeGuard / ci parity');
  return { verdict: v, lines };
}

// ---- identity axis ----
// Make it impossible for a fleet repo's internal identity to silently drift from its
// repo name. ONLY enforced for real fleet repos (canonical name /^nimiq\.<seg>$/);
// everything else is CLEAN/not-applicable so non-fleet dirs + test fixtures stay clean.
function gradeIdentity(canonical, repoName, { pkgName, stackName }, idScan) {
  if (!FLEET_NAME.test(repoName)) {
    return { verdict: CLEAN, lines: [`repo "${repoName}" is not a fleet name (nimiq.<seg>) — identity not enforced`] };
  }
  const lines = [];
  let v = CLEAN;
  const seg = repoName.slice(repoName.indexOf('.') + 1);
  const envSeg = seg.toUpperCase().replace(/-/g, '_');
  const neutral = new Set(canonical.identity?.neutralEnv ?? []);

  // (1) package.json name must === the canonical dotted name
  if (pkgName !== undefined && pkgName !== null && pkgName !== repoName) {
    v = RISKY;
    lines.push(`package.json name "${pkgName}" != repo "${repoName}"`);
  }
  // (2) nimiq-stack.json name must === canonical
  if (stackName !== undefined && stackName !== null && stackName !== repoName) {
    v = RISKY;
    lines.push(`nimiq-stack.json name "${stackName}" != repo "${repoName}"`);
  }
  // (3) STALE-CODENAME scan over load-bearing identity files
  if (idScan.stale.length) {
    v = RISKY;
    const grouped = {};
    for (const s of idScan.stale) (grouped[s.where] ??= new Set()).add(s.token);
    for (const [where, toks] of Object.entries(grouped)) {
      lines.push(`stale codename in ${where}: ${[...toks].join(', ')} — rename to "${repoName}"`);
    }
  }
  // (4) ADVISORY (safe-drift, never fail): env-var prefix that is neither
  //     NIMIQ_<envSeg>_ nor in the neutral allowlist (shared NIMIQ_ settlement vars OK).
  const oddEnv = idScan.envNames.filter(name =>
    !neutral.has(name)
    && !name.startsWith(`NIMIQ_${envSeg}_`)
    && !name.startsWith('NIMIQ_'));
  if (oddEnv.length) {
    v = worst(v, SAFE);
    lines.push(`env var(s) not NIMIQ_${envSeg}_* nor neutral: ${oddEnv.slice(0, 6).join(', ')}${oddEnv.length > 6 ? ` (+${oddEnv.length - 6})` : ''} (advisory)`);
  }

  if (v === CLEAN && !lines.length) lines.push(`identity matches repo "${repoName}" — no stale codenames`);
  return { verdict: v, lines };
}

// ---- miniApp axis (ADVISORY: max safe-drift, never risky) ----
// Tracks Nimiq Pay mini-app adoption. CLEAN when the app is wired to the real surface
// (shell createWallet, or @nimiq/mini-app-sdk / window.nimiqPay / window.nimiq). A
// stub/mock provider — or nothing — is SAFE-DRIFT so we track adoption without failing CI.
function gradeMiniApp(m, canonical, adopt) {
  if (!m.chainApp) return { verdict: CLEAN, lines: ['not a chain app — mini-app integration not tracked'] };
  const wantShell = new Set(canonical.miniApp?.shellImports ?? ['createWallet']);
  const hasShellWallet = adopt.shellImportNames.some(n => wantShell.has(n));
  const hasSdk = adopt.sdkHits.length > 0;

  // a real (non-stub) integration via either path = CLEAN
  if ((hasShellWallet || hasSdk) && !adopt.stubProvider) {
    const via = [hasShellWallet && 'nimiq-app-shell createWallet', hasSdk && `mini-app SDK (${[...new Set(adopt.sdkHits.map(h => h.token))].join(', ')})`]
      .filter(Boolean).join(' + ');
    return { verdict: CLEAN, lines: [`Nimiq Pay mini-app wired via ${via}`] };
  }
  // present but a stub/mock → advisory (adoption in progress)
  if (hasShellWallet || hasSdk) {
    return { verdict: SAFE, lines: ['mini-app provider present but a STUB/MOCK — wire to the real Nimiq Pay SDK (createWallet / @nimiq/mini-app-sdk) and verify in-wallet (advisory)'] };
  }
  // nothing → advisory
  return { verdict: SAFE, lines: ['no Nimiq Pay mini-app integration found — import createWallet from nimiq-app-shell or reference @nimiq/mini-app-sdk / window.nimiqPay (advisory)'] };
}

// ---- i18n axis (ADVISORY: max safe-drift, never risky) ----
// Tracks runtime-language adoption. CLEAN when wired via nimiq-app-shell createI18n OR
// vue-i18n OR a locales dir with >1 language file. Hardcoded-English = SAFE-DRIFT.
function gradeI18n(m, canonical, adopt, locales) {
  if (!m.chainApp) return { verdict: CLEAN, lines: ['not a chain app — i18n not tracked'] };
  const wantShell = new Set(canonical.i18n?.shellImports ?? ['createI18n']);
  const hasShellI18n = adopt.createI18nHit || adopt.shellImportNames.some(n => wantShell.has(n));
  const hasVueI18n = adopt.vueI18nHit;
  const hasLocales = locales.localeFileCount > 1;

  if (hasShellI18n || hasVueI18n || hasLocales) {
    const via = [
      hasShellI18n && 'nimiq-app-shell createI18n',
      hasVueI18n && 'vue-i18n',
      hasLocales && `${locales.localeFileCount} locale files in ${locales.localesDir}`,
    ].filter(Boolean).join(' + ');
    return { verdict: CLEAN, lines: [`runtime i18n via ${via}`] };
  }
  const note = locales.localeFileCount === 1
    ? `only one locale file in ${locales.localesDir} — add a 2nd language + createI18n for runtime switching (advisory)`
    : 'hardcoded-English — adopt nimiq-app-shell createI18n (or vue-i18n) + public/locales/<lang>.json for runtime language switching (advisory)';
  return { verdict: SAFE, lines: [note] };
}

// ---- deps axis (ADVISORY: max safe-drift, never risky) ----
// Flags shared fleet packages pinned to an older git tag than the latest published tag.
// Offline / no git-tag pin → CLEAN (skipped quietly).
function gradeDeps(m, deps) {
  if (deps.findings.length) {
    return {
      verdict: SAFE,
      lines: deps.findings.map(f => `${f.pkg} pinned ${f.pinned} but latest tag is ${f.latest} — bump the git dep (advisory)`),
    };
  }
  if (deps.checked === 0) {
    return { verdict: CLEAN, lines: [deps.skipped ? 'shared-package tags not comparable (no git-tag pin / offline) — skipped' : 'no shared fleet packages depended on'] };
  }
  return { verdict: CLEAN, lines: [`${deps.checked} shared package(s) on the latest tag`] };
}

// ---- grade one app ----
export async function alignApp(appDir, opts = {}) {
  const canonical = await loadCanonical();
  const manifestPath = join(appDir, MANIFEST);
  let m = await readJson(manifestPath);
  let inferred = false;
  let wrote = false;

  if (!m) {
    m = await inferManifest(appDir);
    inferred = true;
    if (opts.fix) { await writeFile(manifestPath, JSON.stringify(stripInternal(m), null, 2) + '\n'); wrote = true; }
  }

  // EXEMPT: report, never fail.
  if (m.exempt) {
    return {
      app: m.name ?? basename(appDir), appDir, exempt: true,
      reason: m.exemptReason ?? 'exempt:true', overall: CLEAN, axes: {}, inferred, wrote,
    };
  }

  const scan = await scanLightClient(appDir, canonical);

  // identity axis inputs: canonical repo name + the REAL on-disk names (not the inferred
  // manifest's, so an inferred app isn't double-graded against its own fallback name).
  const repoName = opts.repoName ?? resolveRepoName(appDir);
  const pkg = await readJson(join(appDir, 'package.json'));
  const pkgName = pkg?.name != null ? String(pkg.name).replace(/^@[^/]+\//, '') : null;
  const stackName = inferred ? null : (m.name ?? null);
  const idScan = await scanIdentity(appDir, canonical, repoName);

  // adoption scans (mini-app + i18n) + shared-package drift
  const adopt = await scanAdoption(appDir, canonical);
  const locales = await scanLocales(appDir, canonical);
  const deps = scanDeps(appDir, canonical, pkg, opts.lsRemote);

  const axes = {
    settlement: m.chainApp ? gradeSettlement(m, canonical, scan) : { verdict: CLEAN, lines: ['--no-chain: settlement parity skipped'] },
    styling: gradeStyling(m, canonical),
    identity: gradeIdentity(canonical, repoName, { pkgName, stackName }, idScan),
    miniApp: gradeMiniApp(m, canonical, adopt),
    i18n: gradeI18n(m, canonical, adopt, locales),
    deps: gradeDeps(m, deps),
    stack: gradeStack(m, canonical, scan),
    deploy: gradeDeploy(m, canonical, appDir),
    config: gradeConfig(m, canonical),
  };

  // --fix: repair the manifest in place (safe writes only — never touches source).
  if (opts.fix && !inferred) {
    const repaired = repairManifest(m, canonical);
    if (repaired) {
      await writeFile(manifestPath, JSON.stringify(stripInternal(repaired), null, 2) + '\n');
      wrote = true;
    }
  }

  // ADVISORY axes (miniApp/i18n/deps) are informational only — they NEVER move `overall`
  // (and never gate). overall rolls up the core stack axes; adoption is surfaced per-axis.
  let overall = CLEAN;
  for (const name of Object.keys(axes)) {
    if (ADVISORY_AXES.has(name)) continue;
    overall = worst(overall, axes[name].verdict);
  }

  return { app: m.name ?? basename(appDir), appDir, exempt: false, overall, axes, inferred, wrote, scanHits: scan.hits.length };
}

function stripInternal(m) {
  const { _inferred, ...rest } = m;
  return rest;
}

// safe autofixes: bump canonicalVersion + backfill missing/null config knobs.
// NEVER changes source files or load-bearing settlement values.
function repairManifest(m, canonical) {
  let changed = false;
  const out = JSON.parse(JSON.stringify(m));
  if (out.canonicalVersion !== canonical.canonicalVersion) { out.canonicalVersion = canonical.canonicalVersion; changed = true; }
  out.config ??= {};
  if (out.config.fileSizeGuard == null) { out.config.fileSizeGuard = canonical.config.fileSizeGuard; changed = true; }
  if (out.config.tsconfig == null) { out.config.tsconfig = canonical.config.tsconfig; changed = true; }
  if (out.exempt == null) { out.exempt = false; changed = true; }
  if (out.exemptReason === undefined) { out.exemptReason = null; changed = true; }
  if (!out.$schema) { out.$schema = 'https://nimiq.tech/schemas/nimiq-stack.v1.json'; changed = true; }
  return changed ? out : null;
}

// ---- discovery for --all ----
async function findApps(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  // an app dir = has a package.json OR a nimiq-stack.json
  if (existsSync(join(dir, MANIFEST)) || existsSync(join(dir, 'package.json'))) out.push(dir);
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const sub = join(dir, e.name);
    if (existsSync(join(sub, MANIFEST)) || existsSync(join(sub, 'package.json'))) out.push(sub);
  }
  return [...new Set(out)];
}

// ---- rendering ----
const GLYPH = { [CLEAN]: '✓', [SAFE]: '~', [RISKY]: '✗' };

function renderApp(r, { quiet } = {}) {
  if (r.exempt) return `  exempt   ${r.app}  (${r.reason})`;
  const head = `${GLYPH[r.overall]} ${r.app}  [${r.overall}]${r.inferred ? '  (inferred — run --fix to write nimiq-stack.json)' : ''}${r.wrote ? '  (manifest written/repaired)' : ''}`;
  if (quiet) return head;
  const rows = [head];
  for (const axis of AXES) {
    const a = r.axes[axis];
    if (!a) continue;
    rows.push(`    ${axis.padEnd(11)} ${GLYPH[a.verdict]} ${a.verdict}`);
    for (const l of a.lines) rows.push(`        ${l}`);
  }
  return rows.join('\n');
}

// ---- entry ----
export async function run(rest, flags) {
  const failOn = parseFailOn(flags);
  const quiet = flags.quiet;
  const targets = [];

  if (flags.all) {
    // --all <dir>  (dir is the value after --all, or the first positional, or cwd)
    const dir = resolve(typeof flags.all === 'string' ? flags.all : (rest[0] ?? '.'));
    const apps = await findApps(dir);
    if (!apps.length) throw new Error(`nq align --all: no app dirs under ${dir}`);
    for (const a of apps) targets.push(a);
  } else {
    targets.push(resolve(rest[0] ?? '.'));
  }

  const results = [];
  for (const appDir of targets) results.push(await alignApp(appDir, { fix: flags.fix }));

  if (flags.json) {
    console.log(JSON.stringify({ canonicalVersion: (await loadCanonical()).canonicalVersion, results }, null, 2));
  } else if (quiet) {
    const drift = results.filter(r => !r.exempt && r.overall !== CLEAN);
    if (!drift.length) console.log(`nq align: ${results.length} app(s) aligned — clean.`);
    else console.log(`nq align: ${drift.length}/${results.length} app(s) drifting — ${drift.map(r => `${r.app}[${r.overall}]`).join(' ')} · run \`nq align\` for detail`);
  } else {
    console.log(`\nnq align — canonical fleet baseline v${(await loadCanonical()).canonicalVersion}\n`);
    for (const r of results) console.log(renderApp(r) + '\n');
    const fails = results.filter(r => !r.exempt && r.overall === RISKY);
    const drifts = results.filter(r => !r.exempt && r.overall === SAFE);
    console.log(`${results.filter(r => !r.exempt && r.overall === CLEAN).length} clean · ${drifts.length} safe-drift · ${fails.length} risky-fail · ${results.filter(r => r.exempt).length} exempt`);
  }

  // gate: exit nonzero if any --fail-on axis is risky-fail on any app
  if (failOn.length) {
    const gated = results.filter(r => !r.exempt).some(r =>
      failOn.some(axis => r.axes[axis]?.verdict === RISKY));
    if (gated) {
      if (!flags.json) console.error(`\nnq align: GATE FAILED — a [${failOn.join(', ')}] axis is risky-fail.`);
      process.exitCode = 1;
    }
  } else {
    // default (no --fail-on): nonzero on any risky-fail, like nq audit's exit 2
    if (results.filter(r => !r.exempt).some(r => r.overall === RISKY)) process.exitCode = 1;
  }

  return results;
}

function parseFailOn(flags) {
  if (!flags.failOn) return [];
  return String(flags.failOn).split(',').map(s => s.trim()).filter(Boolean)
    .filter(a => {
      if (!AXES.includes(a)) throw new Error(`--fail-on: unknown axis "${a}" (axes: ${AXES.join(', ')})`);
      if (ADVISORY_AXES.has(a)) throw new Error(`--fail-on: "${a}" is an advisory axis (max safe-drift) — it can never gate. Gateable: ${AXES.filter(x => !ADVISORY_AXES.has(x)).join(', ')}`);
      return true;
    });
}
