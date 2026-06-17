# Staying current with Nimiq — the self-learning branding audit

`nq verify` proves our **port matches the vendored upstream truth render**. But that render is a
frozen snapshot — if Nimiq redesigns a component or changes a token upstream, `verify` stays green
against a stale reference. `nq audit` closes that gap: it watches the **live** Nimiq source and tells
you when the real design has moved away from what the registry ships.

## The two axes of branding accuracy

| Axis | Question | Tool |
|---|---|---|
| Port fidelity | Does our component still render like the upstream truth? | `nq verify` |
| Upstream currency | Has the live Nimiq source moved away from our pin? | `nq audit` |

## What `nq audit` does

1. **Upstream drift** — compares each `pinned` commit in [`upstream-pins.json`](upstream-pins.json)
   to the live branch tip (`git ls-remote` locally or in CI). For drifted repos it gets the changed
   file list (local clone `git diff`, or the GitHub compare API in CI).
2. **Provenance intersection** — every component's `meta.json` has a `source` block listing the exact
   upstream files it was ported from. Changed files are intersected with these → drift is attributed to
   the precise components it touches. **A changed file that any component lists is always escalated to
   `risky` before the learnings rules run**, so broad benign-churn rules can never hide a real change.
3. **Token / framework drift** — flags changes to the design-token sources (`nimiq-style`, `@nimiq/css`).
4. **Port fidelity** — runs `nq verify all` and folds the result in.
5. **New-component radar** — lists upstream `@nimiq/vue-components` with no registry port yet.

Output: `.audit/report.json` (machine) + `.audit/report.md` (human).

## Verdicts

- **clean** — nothing moved, ports green. No action.
- **safe** — upstream moved, but every changed file is learnings-classified benign (deps, tests, i18n,
  app logic, flow views), no component/token touched, and verify passed → the weekly workflow **auto-PRs
  a pin bump**. Safe because the gate proved nothing visual changed.
- **risky** — a component's real source changed (needs hand re-port), a token changed, an **unknown** path
  needs triage, or verify failed → the workflow opens/updates a **rolling GitHub issue** for a human.

## The self-learning loop (`audit/learnings.json`)

Each changed path is classified `ignore` / `token` / `branding` by glob rules. Unmatched paths are
`unknown` and surfaced for triage. **Resolving a triage = appending a rule** (with `seenCount++` and a
`learnedFrom` note). Next run, that churn auto-classifies — fewer false alarms, faster known fixes. The
store gets smarter every week. Seed rules came from the 2026-06-16 reconciliation of the hub/wallet
Bitcoin/Ledger/swap drift, which touched none of our ports.

## Weekly automation

[`.github/workflows/audit.yml`](.github/workflows/audit.yml) runs every Monday (and on demand via
`workflow_dispatch`): re-snaps references for a platform-consistent verify, runs `nq audit`, then
auto-PRs safe pin bumps or files the rolling issue. The pin record in `upstream-pins.json` is the
single committed source of truth for "what we are current with".

## Triage workflow (when you get a `risky` issue)

1. Read `.audit/report.md`. For each **upstream-touched component**, diff the upstream file and re-port
   the truth render → `node scripts/snap.mjs <name>` → `node bin/nq.js verify <name>`.
2. For each **unknown path**, decide if it's benign or branding-relevant and add a rule to
   `audit/learnings.json` (that's the learning).
3. Bump the pin in `upstream-pins.json`, run `nq sync-skill`, commit.
