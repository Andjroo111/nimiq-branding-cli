# Nimiq Design Tokens — quick reference

Three token sets ship with this CLI. Pick ONE per project via `nq init --style modern|legacy|tokens-px`.

## Modern (`assets/css/modern/` — from onmax/nimiq-ui nimiq-css)

- 79 CSS custom properties in `colors.css`, all `oklch()` + `light-dark()` (automatic dark mode).
  Core hues: `--colors-neutral` (darkblue↔white), `--colors-blue`, `--colors-green`,
  `--colors-orange`, `--colors-red`, `--colors-gold`, `--colors-purple`, each with
  400/500/600/1100 tints. Brand navy: `--colors-darkblue: oklch(0.2737 0.068 276.29)` (#1F2348).
- Typography in `typography.css`, fonts in `fonts.css` (Mulish family).
- Layers: `preflight → colors → fonts → typography → spacing → utilities → atomic → animations`,
  linked together by `index.css`.

## Legacy (`assets/css/legacy/` — from @nimiq/style)

- `nimiq-style.min.css` — the `nq-*` class framework used by wallet.nimiq.com + hub:
  `nq-card`, `nq-card-header/body/footer`, `nq-button` (+ light-blue/green/orange/red variants),
  `nq-input`, `nq-label`, `nq-h1/h2`, `nq-text`, `nq-link`, `nq-icon`.
- Key hex values: Nimiq blue `#0582CA`, light blue `#265DD7`, gold `#E9B213`,
  navy text `#1F2348`, green `#21BCA5`, orange `#FC8702`, red `#D94432`.
  Radial gradients pair each color with a darker stop (e.g. blue `#265DD7→#0582CA`).
- Font: Muli/Mulish. Headings 600/700 weight. Base ease: `--nimiq-ease: cubic-bezier(0.25, 0, 0, 1)`.
- App card canon: `.small-page` = 420×564 px (52.5rem × 70.5rem at 8px root), radius 8px,
  shadow `0 3px 22px rgba(0,0,0,0.1)`. Pill CTAs 47px tall.

## Wallet app tokens (from `upstream/wallet/src`, 8px root)

Verified against the pinned wallet checkout (see `upstream-pins.json`).

- **Text opacity ladder** `--text-<step>`: the wallet's greyscale text system. Every step
  is Nimiq blue at descending alpha: `rgba(31, 35, 72, step/100)` via the `nimiq-blue()`
  helper (`scss/functions.scss`). Steps defined in `scss/themes.scss` (defaults mixin):
  `100, 80, 70, 60, 50, 40, 35, 30, 25, 22, 20, 16, 14, 12, 10, 6`.
  So `--text-70: rgba(31, 35, 72, 0.7)`, `--text-6: rgba(31, 35, 72, 0.06)`, etc.
  Prefer a ladder step over ad-hoc grays for any secondary text on light surfaces.
- **Crypto colors** (`scss/themes.scss` + asset classes, e.g. `BalanceDistribution.vue`):
  NIM `var(--nimiq-gold)` `#E9B213` (the gold brand color doubles as the NIM asset color),
  BTC `--bitcoin-orange: #F7931A`, USDC `--usdc-blue: #2775CA`,
  USDT `--usdt-green: #009393` (named green, renders teal).
- **Breakpoints (px)** (`scss/variables.scss`): mobile 768, tablet 960, halfMobile 1160,
  smallDesktop 1199, mediumDesktop 1319, largeDesktop 1409, extraLargeDesktop 1499,
  veryLargeDesktop 1800, ultraLargeDesktop 2000. Mirrored to JS via
  `scss/modules/variables.module.scss` + `variables.ts`.
- **App-shell layout widths (rem, 1rem = 8px)** (`App.vue` `#app` block):
  `--sidebar-width: 24rem` (192px), `--settings-width: 131rem`,
  `--address-column-width: 150rem`, `--account-column-width: 70rem` default (>= 1500px)
  stepping 65 / 59 / 52 / 47.5rem down the desktop breakpoints, 80.75rem >= 1800px,
  85rem >= 2000px, and 100vw (with address column) at <= 768px.

## tokens-px (`assets/css/tokens-px/` — the px-only escape hatch)

`nq init --style tokens-px` drops `nimiq/tokens-px/tokens.css`: every brand custom
property above (colors, the radial `-bg` gradients, radii, shadows, easing, font stacks,
the 16-step `--text-*` opacity ladder, crypto colors) as `:root` values in PLAIN PX /
absolute units — no `html{font-size}` rescale, no resets, no component classes. Use it
when hand-authoring CSS so you don't hit the legacy 8px-rem trap (and stop hand-copying
hex values per app). Tailwind v4 projects: import `tailwind-theme.css` (same values in an
`@theme` block) instead. Values sourced from the legacy sheet + wallet extraction above.

Full extraction with file paths: see `references/` in this repo and
`~/Projects/nimiq/nimiq-branding-skill/nimiq-branding.md` (deep brand doc).
@nimiq/utils API + live playground: `references/utils.md`, `references/utils-demo.html`.
