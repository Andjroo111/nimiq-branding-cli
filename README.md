# nimiq-branding-cli

Scaffold **pixel-accurate Nimiq-branded UI components** into any project — Vue 3 SFCs or plain
HTML/CSS — from a registry where every component is screenshot-diffed against the real Nimiq
apps before it ships.

```
nq list                     # browse the registry
nq init --style modern      # drop Nimiq design tokens into your project
nq add amount-input         # copy a component (+ its deps + CSS) into src/components
nq add wallet-card --html   # plain HTML/CSS variant instead of Vue
nq verify all               # (repo dev) re-run pixel verification against references
```

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

Upstream clones live in `upstream/` (gitignored — re-clone with `git clone --depth 1`).

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
references/screenshots side-by-side reference captures of live Nimiq UIs
```
