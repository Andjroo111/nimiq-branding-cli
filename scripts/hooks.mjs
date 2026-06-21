// nq hooks install — drift hooks that keep an app on the canonical stack.
//
//   git pre-commit   → `nq align --fail-on=settlement,styling`  (blocks a commit that
//                       introduces the broken light-client path or off-brand styling)
//   git pre-push     → `nq check --fail-on=settlement,styling`  (the fuller gate — align
//                       + 800-line guard + bun test + lint — run before code leaves the box)
//   SessionStart     → `nq align --quiet` advisory drift banner (one line)
//   weekly GH Action → `nq align --all` → PR safe fixes / file a rolling drift issue,
//                       reusing the existing nq audit weekly machinery.
//
// `nq hooks install [target]` writes the git pre-commit hook into the target repo (cwd
// by default) and prints the SessionStart + workflow snippets (with --write to drop the
// workflow file too). Artifacts also live under hooks/ in this repo for copy/paste.
import { mkdir, writeFile, chmod, readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

export const PRE_COMMIT = `#!/usr/bin/env bash
# nq align pre-commit gate — installed by \`nq hooks install\`.
# Blocks a commit that introduces the broken @nimiq/core light-client path
# (Client.create / @nimiq/core/web / waitForConsensusEstablished) or off-brand styling.
set -euo pipefail
if command -v nq >/dev/null 2>&1; then
  nq align --fail-on=settlement,styling
else
  npx -y github:Andjroo111/nimiq-branding-cli align --fail-on=settlement,styling
fi
`;

export const PRE_PUSH = `#!/usr/bin/env bash
# nq check pre-push gate — installed by \`nq hooks install\`.
# Runs the FULL per-project gate before code leaves the box: align
# (settlement/styling) + the 800-line file guard + bun test + nq lint.
# Blocks the push on any FAIL (SKIPs — e.g. no Playwright — are fine).
set -euo pipefail
if command -v nq >/dev/null 2>&1; then
  nq check --fail-on=settlement,styling
else
  npx -y github:Andjroo111/nimiq-branding-cli check --fail-on=settlement,styling
fi
`;

export const SESSION_START = `# nq align — SessionStart advisory drift banner.
# Add to .claude/settings.json hooks.SessionStart, or run at the top of a session.
nq align --quiet 2>/dev/null || true
`;

export const WEEKLY_WORKFLOW = `name: stack-align

# Weekly fleet stack-alignment audit — the sibling of branding-audit.yml. Runs
# \`nq align --all\` across the repo, PRs safe manifest fixes (nq align --fix), and
# files/updates a rolling stack-drift issue on any risky-fail (the broken light-client
# path, off-brand styling). Reuses the same verdict-driven shape as audit.yml.
on:
  schedule:
    - cron: '30 9 * * 1' # Mondays 09:30 UTC (after branding-audit at 09:00)
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write
  issues: write

concurrency:
  group: stack-align
  cancel-in-progress: false

jobs:
  align:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run nq align
        id: align
        run: |
          npx -y github:Andjroo111/nimiq-branding-cli align --all . --json > align.json || true
          node -e "const r=require('./align.json').results.filter(x=>!x.exempt); const bad=r.filter(x=>x.overall==='risky-fail'); const drift=r.filter(x=>x.overall==='safe-drift'); console.log('risky='+bad.length); console.log('drift='+drift.length); process.stdout.write('');"
          risky=\$(node -e "console.log(require('./align.json').results.filter(x=>!x.exempt&&x.overall==='risky-fail').length)")
          drift=\$(node -e "console.log(require('./align.json').results.filter(x=>!x.exempt&&x.overall==='safe-drift').length)")
          echo "risky=\$risky" >> "\$GITHUB_OUTPUT"
          echo "drift=\$drift" >> "\$GITHUB_OUTPUT"

      # ---- SAFE: only manifest drift → autofix the manifests + open a PR ----
      - name: PR safe manifest fixes
        if: steps.align.outputs.risky == '0' && steps.align.outputs.drift != '0'
        run: |
          npx -y github:Andjroo111/nimiq-branding-cli align --all . --fix || true
          git config user.name  "nq-align-bot"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          branch="align/auto-manifest-fix"
          git checkout -B "\$branch"
          git add -A '*nimiq-stack.json'
          if git diff --cached --quiet; then echo "nothing to fix"; exit 0; fi
          git commit -m "align: safe manifest fixes (nq align --fix)"
          git push -f origin "\$branch"
          if [ "\$(gh pr list --head "\$branch" --state open --json number --jq 'length')" = "0" ]; then
            gh pr create --head "\$branch" --base main \\
              --title "align: safe manifest fixes" \\
              --body "Automated \\\`nq align --fix\\\` — manifest-only, no source changes."
          fi

      # ---- RISKY: a load-bearing axis failed (light client / off-brand) → rolling issue ----
      - name: Open/update stack-drift issue
        if: steps.align.outputs.risky != '0'
        run: |
          gh label create stack-drift --color B91C1C \\
            --description "an app drifted off the canonical Nimiq fleet stack" 2>/dev/null || true
          body="$(npx -y github:Andjroo111/nimiq-branding-cli align --all . 2>&1 || true)"
          existing=\$(gh issue list --state open --label stack-drift --json number --jq '.[0].number')
          if [ -n "\$existing" ]; then
            printf '%s\\n' "\$body" | gh issue comment "\$existing" --body-file -
          else
            printf '%s\\n' "\$body" | gh issue create --title "⚙️ Nimiq stack drift needs review" \\
              --label stack-drift --body-file -
          fi
`;

export async function installHooks(target, opts = {}) {
  const repo = resolve(target ?? '.');
  const out = { wrote: [], printed: [] };

  // 1) git pre-commit
  const gitDir = join(repo, '.git');
  if (existsSync(gitDir)) {
    const hookDir = join(gitDir, 'hooks');
    await mkdir(hookDir, { recursive: true });
    const hookPath = join(hookDir, 'pre-commit');
    await writeFile(hookPath, PRE_COMMIT);
    await chmod(hookPath, 0o755);
    out.wrote.push(hookPath);

    // pre-push: the fuller `nq check` gate before code leaves the box
    const pushPath = join(hookDir, 'pre-push');
    await writeFile(pushPath, PRE_PUSH);
    await chmod(pushPath, 0o755);
    out.wrote.push(pushPath);
  } else {
    out.printed.push(`(no .git in ${repo} — skipped pre-commit + pre-push; init git then re-run)`);
  }

  // 2) weekly workflow (write only with --write)
  if (opts.write) {
    const wfDir = join(repo, '.github', 'workflows');
    await mkdir(wfDir, { recursive: true });
    const wfPath = join(wfDir, 'stack-align.yml');
    await writeFile(wfPath, WEEKLY_WORKFLOW);
    out.wrote.push(wfPath);
  }

  return out;
}

// write the committed artifacts under hooks/ in THIS repo (used by build/CI, not the app)
export async function emitArtifacts() {
  const dir = join(ROOT, 'hooks');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'pre-commit'), PRE_COMMIT);
  await chmod(join(dir, 'pre-commit'), 0o755);
  await writeFile(join(dir, 'pre-push'), PRE_PUSH);
  await chmod(join(dir, 'pre-push'), 0o755);
  await writeFile(join(dir, 'session-start.sh'), SESSION_START);
  await writeFile(join(dir, 'stack-align.yml'), WEEKLY_WORKFLOW);
  return dir;
}
