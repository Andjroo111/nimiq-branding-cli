// apply-safe-bump — called by the weekly workflow ONLY when .audit/report.json
// verdict is "safe" (upstream moved, but every changed file is learnings-classified
// benign, no component/token touched, and pixel-verify passed). It fast-forwards the
// drifted repos' pins in upstream-pins.json to the live tips. The workflow then
// regenerates the skill block and opens a PR.
//
// Safe because the verdict gate already proved nothing visual changed.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(await readFile(join(ROOT, '.audit', 'report.json'), 'utf8'));
if (report.verdict !== 'safe') {
  console.log(`apply-safe-bump: verdict is "${report.verdict}", not "safe" — refusing to bump.`);
  process.exit(0);
}

const pinsPath = join(ROOT, 'upstream-pins.json');
const pins = JSON.parse(await readFile(pinsPath, 'utf8'));

function commitDate(slug, sha) {
  try {
    const d = execFileSync('gh', ['api', `repos/${slug}/commits/${sha}`, '--jq', '.commit.committer.date'],
      { encoding: 'utf8' }).trim();
    return d ? d.slice(0, 10) : null;
  } catch { return null; }
}
function slugOf(url) { const m = url.match(/github\.com[:/]+([^/]+\/[^/.]+)/); return m ? m[1] : null; }

const bumped = [];
for (const [repo, r] of Object.entries(report.repos)) {
  if (!r.drifted || !r.liveFull) continue;
  const info = pins.repos[repo];
  if (!info) continue;
  const date = commitDate(slugOf(info.url), r.liveFull) || new Date().toISOString().slice(0, 10);
  info.pinned = r.liveFull;
  info.pinnedDate = date;
  bumped.push(`${repo} → ${r.liveFull.slice(0, 8)} (${date})`);
}

if (!bumped.length) { console.log('apply-safe-bump: nothing to bump.'); process.exit(0); }
await writeFile(pinsPath, JSON.stringify(pins, null, 2) + '\n');
console.log('apply-safe-bump: bumped\n  ' + bumped.join('\n  '));
// emit a one-line summary for the PR body / workflow output
console.log('::BUMP_SUMMARY::' + bumped.join('; '));
