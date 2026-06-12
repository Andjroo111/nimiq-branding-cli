# nimiq-branding-cli

Scaffold **pixel-accurate Nimiq-branded UI components** into any project — Vue 3 SFCs or plain
HTML/CSS — from a registry of 39 components where every one is pixel-diffed against the real
Nimiq apps before it ships, plus the team's real asset library (logos, icons, flags, imagery).

> Unofficial community project — see [NOTICE.md](NOTICE.md). All visuals are the Nimiq team's
> real shipped files or faithful ports of their open-source components, never hand-drawn
> approximations.

## Install

```bash
git clone https://github.com/Andjroo111/nimiq-branding-cli
cd nimiq-branding-cli && npm install     # dev deps only needed for `nq verify`
ln -s "$PWD/bin/nq.js" ~/.local/bin/nq   # or: npm link
```

## Use

```
nq list                     # browse the 39-component registry
nq init --style modern      # drop Nimiq design tokens into your project
nq add amount-input         # copy a component (+ deps + CSS + real assets) into src/components
nq add account-header --html   # plain HTML/CSS variant instead of Vue
nq assets search wallet     # search 182 vendored files + 323 nimiq-icons + 422 hexagon flags
nq assets add icon:logos-nimiq-horizontal flag:cr-hexagon world-map
nq verify all               # (repo dev) re-run pixel verification against references
```

Open `showcase.html` for the full component gallery and `supporting-elements.html` for the
wallet + marketing element demos.

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
