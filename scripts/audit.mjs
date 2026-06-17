// nq audit — the self-learning branding-drift engine.
//
// Branding accuracy has two axes:
//   (1) our vendored upstream pin == the LIVE Nimiq design  (this file)
//   (2) our port == the vendored upstream truth render       (scripts/verify.mjs)
// `nq verify` only covers (2) against a FROZEN snapshot. This audit covers (1):
// it asks "has the live Nimiq source moved away from what we ported?", attributes
// any drift to the exact components it touches (via meta.json `source.files`),
// classifies each change through an accumulated learnings store, runs the pixel
// verify, and emits a verdict the weekly workflow acts on (auto-PR safe / alert risky).
//
// Works locally (uses the gitignored upstream/<repo> clones) AND in CI (no clones:
// `git ls-remote` for live tips + the GitHub compare API for changed files).
//
// Usage: node scripts/audit.mjs [--skip-verify] [--json]
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS = join(ROOT, 'registry', 'components');
const SKIP_VERIFY = process.argv.includes('--skip-verify');
const JSON_ONLY = process.argv.includes('--json');

// ---------- tiny helpers ----------
function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts }).trim();
}
function try_(fn, fallback = null) { try { return fn(); } catch { return fallback; } }

// glob ("wallet:**/*Sentry*") -> RegExp. Supports ** (any incl. /), * (any excl. /).
function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
      else re += '[^/]*';
    } else if ('.+?^${}()|[]\\'.includes(c)) re += '\\' + c;
    else re += c;
  }
  return new RegExp('^' + re + '$');
}

// ---------- inputs ----------
async function loadPins() {
  return JSON.parse(await readFile(join(ROOT, 'upstream-pins.json'), 'utf8')).repos;
}
async function loadLearnings() {
  const p = join(ROOT, 'audit', 'learnings.json');
  if (!existsSync(p)) return { rules: [] };
  return JSON.parse(await readFile(p, 'utf8'));
}
// "repo:path" -> [componentName...]   and  componentName -> {repo, files}
async function loadProvenance() {
  const index = {}; const byComponent = {};
  for (const name of (await readdir(COMPONENTS)).sort()) {
    const meta = JSON.parse(await readFile(join(COMPONENTS, name, 'meta.json'), 'utf8'));
    const src = meta.source ?? { repo: 'unknown', files: [] };
    byComponent[name] = src;
    for (const f of src.files ?? []) (index[f] ??= []).push(name);
  }
  return { index, byComponent };
}

// ---------- upstream drift ----------
function repoSlug(url) { // https://github.com/nimiq/wallet.git -> nimiq/wallet
  const m = url.match(/github\.com[:/]+([^/]+\/[^/.]+)/);
  return m ? m[1] : null;
}
function liveTip(repo, info) {
  const local = join(ROOT, 'upstream', repo);
  if (existsSync(join(local, '.git'))) {
    try_(() => sh('git', ['-C', local, 'fetch', '--quiet', 'origin', info.branch]));
    const tip = try_(() => sh('git', ['-C', local, 'rev-parse', `origin/${info.branch}`]));
    if (tip) return { tip, via: 'local' };
  }
  const ls = try_(() => sh('git', ['ls-remote', info.url, `refs/heads/${info.branch}`]));
  if (ls) return { tip: ls.split(/\s+/)[0], via: 'ls-remote' };
  return { tip: null, via: 'unreachable' };
}
function changedFiles(repo, info, base, head) {
  const local = join(ROOT, 'upstream', repo);
  // local clone: direct diff (most reliable, offline)
  if (existsSync(join(local, '.git'))) {
    const out = try_(() => sh('git', ['-C', local, 'diff', '--name-only', `${base}..${head}`]));
    if (out !== null) return out ? out.split('\n') : [];
  }
  // CI: GitHub compare API. Prefer authenticated gh (higher rate limit), else fetch.
  const slug = repoSlug(info.url);
  if (slug) {
    const viaGh = try_(() => sh('gh', ['api', `repos/${slug}/compare/${base}...${head}`, '--jq', '.files[].filename']));
    if (viaGh !== null) return viaGh ? viaGh.split('\n') : [];
  }
  return null; // unknown — drift detected but file list unavailable
}

function classify(repoPath, learnings) {
  for (const rule of learnings.rules ?? []) {
    if (globToRe(rule.pattern).test(repoPath)) return rule;
  }
  return null; // unknown -> triage
}

// ---------- main ----------
const pins = await loadPins();
const learnings = await loadLearnings();
const { index: provIndex, byComponent } = await loadProvenance();

const report = {
  generatedAtNote: 'timestamp stamped by caller',
  verdict: 'clean',
  repos: {},
  driftedComponents: [],   // components whose upstream source changed
  tokenDrift: [],          // framework-level css/scss/token changes
  unknownPaths: [],        // changed paths with no learnings rule -> need triage
  verify: { ran: false },
  newComponents: [],       // upstream components not yet in the registry
  summary: '',
};

let anyDrift = false, riskyDrift = false;

for (const [repo, info] of Object.entries(pins)) {
  const { tip, via } = liveTip(repo, info);
  const base = info.pinned;
  const drifted = tip && tip !== base;
  const entry = { branch: info.branch, pinned: base.slice(0, 8), live: tip ? tip.slice(0, 8) : null, pinnedFull: base, liveFull: tip, via, drifted: !!drifted };
  if (drifted) {
    anyDrift = true;
    const files = changedFiles(repo, info, base, tip);
    entry.changedFileCount = files ? files.length : null;
    entry.changedFiles = files ? files.slice(0, 500) : null;
    for (const path of files ?? []) {
      const repoPath = `${repo}:${path}`;
      // does this file feed a registry component?
      const touchedComponents = new Set();
      for (const [provFile, comps] of Object.entries(provIndex)) {
        if (provFile === repoPath) comps.forEach(c => touchedComponents.add(c));
      }
      const rule = classify(repoPath, learnings);
      if (touchedComponents.size) {
        riskyDrift = true; // a real component source moved -> needs re-port review
        report.driftedComponents.push({ repoPath, components: [...touchedComponents], verdict: rule?.verdict ?? 'branding' });
      } else if (rule?.verdict === 'branding' || rule?.verdict === 'token') {
        riskyDrift = true;
        report.tokenDrift.push({ repoPath, rule: rule.pattern, reason: rule.reason });
      } else if (rule?.verdict === 'ignore') {
        // benign churn (deps, telemetry, CI) — known noise, no action
      } else {
        report.unknownPaths.push(repoPath); // no rule -> triage (treated risky)
        riskyDrift = true;
      }
    }
    if (files === null) { entry.note = 'drift detected but changed-file list unavailable (no clone + compare API failed)'; riskyDrift = true; }
  }
  report.repos[repo] = entry;
}

// ---------- new-component radar (best-effort, needs the vue-components clone) ----------
{
  const vc = join(ROOT, 'upstream', 'vue-components', 'src', 'components');
  if (existsSync(vc)) {
    const ported = new Set(Object.values(byComponent).flatMap(s => (s.files ?? []).filter(f => f.startsWith('vue-components:')).map(f => f.split(':')[1])));
    for (const f of (await readdir(vc)).filter(f => f.endsWith('.vue'))) {
      const path = `src/components/${f}`;
      if (!ported.has(path)) report.newComponents.push(`vue-components:${path}`);
    }
  } else {
    report.newComponents = ['(skipped — vue-components clone not present; see FEATURES.md roadmap)'];
  }
}

// ---------- port fidelity (pixel verify) ----------
if (!SKIP_VERIFY) {
  try {
    const { verify } = await import(join(ROOT, 'scripts', 'verify.mjs'));
    const names = (await readdir(COMPONENTS)).sort();
    let pass = 0, fail = 0, skip = 0; const failed = [];
    for (const n of names) {
      const r = await verify(n);
      if (r.status === 'pass') pass++;
      else if (r.status === 'skip') skip++;
      else { fail++; failed.push({ name: n, diffPct: r.diffPct }); }
    }
    report.verify = { ran: true, pass, fail, skip, failed };
    if (fail) riskyDrift = true;
  } catch (e) {
    report.verify = { ran: false, error: e.message };
  }
}

// ---------- verdict ----------
// clean  : nothing moved, ports green
// safe   : upstream moved but ONLY in benign (learnings-classified "ignore") files,
//          no component/token touched, no unknown paths, verify green -> auto-PR pin bump
// risky  : a component source moved, token-relevant change, unknown paths, or verify failed -> alert
if (!anyDrift && (!report.verify.ran || report.verify.fail === 0)) report.verdict = 'clean';
else if (anyDrift && !riskyDrift) report.verdict = 'safe';
else report.verdict = 'risky';

report.summary = [
  `verdict: ${report.verdict}`,
  `${Object.values(report.repos).filter(r => r.drifted).length}/${Object.keys(report.repos).length} upstream(s) drifted`,
  `${report.driftedComponents.length} component(s) upstream-touched`,
  `${report.tokenDrift.length} token-drift`,
  `${report.unknownPaths.length} unknown path(s)`,
  report.verify.ran ? `verify ${report.verify.pass}✓/${report.verify.fail}✗/${report.verify.skip}·` : 'verify skipped',
].join(' · ');

// ---------- write report ----------
await mkdir(join(ROOT, '.audit'), { recursive: true });
await writeFile(join(ROOT, '.audit', 'report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(join(ROOT, '.audit', 'report.md'), renderMd(report));

if (JSON_ONLY) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`\nnq audit — ${report.summary}\n`);
  for (const [repo, r] of Object.entries(report.repos)) {
    console.log(`  ${r.drifted ? '⚠' : '✓'} ${repo.padEnd(15)} ${r.pinned} → ${r.live ?? '?'}${r.drifted ? `  (${r.changedFileCount ?? '?'} files, ${r.via})` : '  up-to-date'}`);
  }
  if (report.driftedComponents.length) { console.log('\n  upstream-touched components (need re-port review):'); report.driftedComponents.forEach(d => console.log(`    ✗ ${d.components.join(', ')}  ←  ${d.repoPath}`)); }
  if (report.tokenDrift.length) { console.log('\n  token / framework drift:'); report.tokenDrift.forEach(d => console.log(`    ! ${d.repoPath} (${d.reason})`)); }
  if (report.unknownPaths.length) { console.log(`\n  unknown paths needing triage: ${report.unknownPaths.length} (see .audit/report.md)`); }
  if (report.newComponents.length) { console.log(`\n  new-component radar: ${report.newComponents.length} upstream component(s) not in registry`); }
  console.log(`\n  full report: .audit/report.md\n`);
}

// verdict drives the workflow; non-zero only on risky so a CI step can branch on it too
process.exitCode = report.verdict === 'risky' ? 2 : 0;

function renderMd(r) {
  const L = [];
  L.push(`# nq audit report`, ``, `**${r.summary}**`, ``);
  L.push(`## Upstream pins vs live`, ``, `| repo | branch | pinned | live | drifted | changed files |`, `|---|---|---|---|---|---|`);
  for (const [repo, e] of Object.entries(r.repos)) L.push(`| ${repo} | ${e.branch} | \`${e.pinned}\` | \`${e.live ?? '?'}\` | ${e.drifted ? '**yes**' : 'no'} | ${e.drifted ? (e.changedFileCount ?? '?') : '—'} |`);
  L.push(``);
  if (r.driftedComponents.length) { L.push(`## ⚠ Components whose upstream source changed (re-port review)`, ``); for (const d of r.driftedComponents) L.push(`- \`${d.repoPath}\` → **${d.components.join(', ')}**`); L.push(``); }
  if (r.tokenDrift.length) { L.push(`## Token / framework drift`, ``); for (const d of r.tokenDrift) L.push(`- \`${d.repoPath}\` — ${d.reason}`); L.push(``); }
  if (r.unknownPaths.length) { L.push(`## Unknown changed paths (need triage → add a learnings rule)`, ``); for (const p of r.unknownPaths) L.push(`- \`${p}\``); L.push(``); }
  if (r.verify.ran) { L.push(`## Port fidelity (pixel verify)`, ``, `${r.verify.pass} pass · ${r.verify.fail} fail · ${r.verify.skip} skip`, ``); if (r.verify.failed?.length) for (const f of r.verify.failed) L.push(`- ✗ ${f.name} (${f.diffPct}%)`); L.push(``); }
  if (r.newComponents.length) { L.push(`## New-component radar`, ``, `Upstream components with no registry port yet (candidates — cross-ref FEATURES.md):`, ``); for (const n of r.newComponents) L.push(`- \`${n}\``); L.push(``); }
  L.push(`---`, ``, `Verdicts: **clean** (nothing moved) · **safe** (only learnings-"ignore" churn → auto-PR pin bump) · **risky** (component/token/unknown/verify-fail → human review).`);
  return L.join('\n') + '\n';
}
