# nimiq-branding-cli

<!-- nimiq-north-star -->
> 🧭 **North Star** · Every Nimiq project aligns to one shared set of values and a single mission. See the canonical [Nimiq Values & North Star](https://github.com/Andjroo111/nimiq.life/blob/main/NORTH-STAR.md).

Scaffold **pixel-accurate Nimiq-branded UI components** into any project — Vue 3 SFCs or plain
HTML/CSS — from a registry of 40 components (39 pixel-diffed against the real Nimiq apps before
they ship, plus 1 original brand composition), plus the team's real asset library (logos, icons,
flags, imagery). A weekly self-learning audit keeps it current with live Nimiq design — see
[AUDIT.md](AUDIT.md).

> Unofficial community project — see [NOTICE.md](NOTICE.md). All visuals are the Nimiq team's
> real shipped files or faithful ports of their open-source components, never hand-drawn
> approximations.

## The soul of the tool

Everything here flows from the **[Nimiq Design Principles](PRINCIPLES.md)** — distilled from
the NIMIQ Style Guide (October 2018) and the
[A New Visual Identity](https://www.nimiq.com/blog/a-new-visual-identity/) essay: radical
simplicity, a light stage structured by white space, traditional colors with the radial-gradient
spin, warm-and-round-yet-tangible form, and one calculated break per experience. `nq principles`
prints them; `nq new <name>` scaffolds a component with the 10-point principles checklist
embedded — a component isn't done until the checklist and the pixel verification both pass.

## Install

```bash
git clone https://github.com/Andjroo111/nimiq-branding-cli
cd nimiq-branding-cli && npm install     # dev deps only needed for `nq verify`
ln -s "$PWD/bin/nq.js" ~/.local/bin/nq   # or: npm link
```

## Use

```
nq list                     # browse the 40-component registry
nq init --style modern      # drop Nimiq design tokens into your project
nq add amount-input         # copy a component (+ deps + CSS + real assets) into src/components
nq add account-header --html   # plain HTML/CSS variant instead of Vue
nq assets search wallet     # search 182 vendored files + 323 nimiq-icons + 422 hexagon flags
nq assets add icon:logos-nimiq-horizontal flag:cr-hexagon world-map
nq verify all               # (repo dev) re-run pixel verification against references
nq audit                    # (repo dev) check the LIVE Nimiq upstreams for branding drift
nq sync-skill               # (repo dev) regenerate the nimiq-ui skill block from index.json
```

Open `showcase.html` for the full component gallery and `supporting-elements.html` for the
wallet + marketing element demos.

## Fleet stack alignment (`nq align` / `nq new-app` / `nq hooks`)

Branding accuracy (`nq audit`/`nq verify`) keeps the UI matching Nimiq's design. `nq align`
keeps a whole **app** on the canonical Nimiq fleet stack — same verdict vocabulary
(`clean` / `safe-drift` / `risky-fail`).

```
nq new-app my-app           # scaffold a CANONICAL app: Bun+Hono+bun:sqlite+vanilla PWA+
                            # @nimiq/style + inline rpc-block-scan settlement + Fly deploy
                            # kit + ci.yml + a stamped nimiq-stack.json + /health. Aligns clean.
nq new-app readonly --no-chain  # informational app (chainApp:false → skip settlement/styling parity)
nq new-app pay --settlement rpc --deploy fly
# (nq new <name> still scaffolds a UI registry component, unchanged)

nq align                    # grade the app in cwd against the canonical fleet baseline
nq align --all ~/Projects   # grade every app dir under a folder
nq align --fix              # safe autofixes only (write/repair nimiq-stack.json)
nq align --fail-on=settlement,styling   # nonzero exit for the pre-commit / CI gate

nq hooks install            # git pre-commit gate + SessionStart banner + weekly GH Action
```

**The load-bearing axis is SETTLEMENT.** The `@nimiq/core` light client never reaches
consensus on our hosts, so any `@nimiq/core/web` import or `Client.create(` /
`waitForConsensusEstablished(` in `src/` is a **HARD FAIL**. Chain reads must use the
rpc-block-scan path (the `nimiq-settlement` package). `@nimiq/core` is offline-crypto-only.

Each app declares a root `nimiq-stack.json` (schema: `schemas/nimiq-stack.v1.json`); the
canonical fleet baseline `nq align` grades against lives in `align/canonical.json`. Apps
that are intentionally off-stack (e.g. nimiq.tech, nimiq-ads, gateflo) set `"exempt": true`
and are reported but never failed.

## How pixel accuracy is enforced

Every registry component carries:

- `meta.json` — purpose, props, category, CSS deps, verify config (viewport, selector, max diff %)
- `vue/` and/or `html/` — the scaffolded source
- `html/demo.html` — a self-contained render of the component
- `reference.png` — a screenshot of the REAL component (live site, upstream demo, or storybook)

`nq verify` renders `demo.html` headlessly (Playwright, 2× scale, fonts settled, animations
disabled) and diffs it against `reference.png` with pixelmatch. Components whose diff exceeds
`maxDiffPct` fail CI and are marked `· unverified` in `nq list`.

## Sources of truth

| Source | What it provides |
|---|---|
| `nimiq/vue-components` | canonical Vue component library (SmallPage, PageHeader, AmountInput, Identicon, …) |
| `nimiq/wallet` | production wallet components (FeeSelector, TransactionList, BalanceDistribution, …) |
| `nimiq/hub` | checkout / account-management flows |
| `nimiq/nimiq-style` | legacy `nq-*` CSS framework + demo.html |
| `onmax/nimiq-ui` | modern `nimiq-css` (oklch tokens, auto dark mode) |
| `references/screenshots/` | captured reference screenshots of live Nimiq properties |

Upstream clones live in `upstream/` (gitignored — re-clone with `git clone --depth 1`). The exact
commits the registry was verified against are recorded in [`upstream-pins.json`](upstream-pins.json) —
the committed source of truth for "what we are current with". `nq audit` watches the live tips against
these pins; see [AUDIT.md](AUDIT.md).

## Repo layout

```
bin/nq.js              CLI entry (zero runtime deps, node >= 18)
registry/
  index.json           component index (nq list reads this)
  components/<name>/   meta.json, vue/, html/, reference.png
assets/
  css/modern/          vendored nimiq-css layers (oklch + light-dark)
  css/legacy/          vendored @nimiq/style (nq-* classes)
  tokens.md            design-token quick reference
scripts/verify.mjs     pixel-diff harness (playwright + pixelmatch)
scripts/audit.mjs      live-upstream branding-drift engine (nq audit)
scripts/sync-skill.mjs regenerates the nimiq-ui skill block from index.json
upstream-pins.json     the upstream commits the registry is verified against
audit/learnings.json   self-learning store: which upstream churn is benign vs branding
references/screenshots side-by-side reference captures of live Nimiq UIs
```
