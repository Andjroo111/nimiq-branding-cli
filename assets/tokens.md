# Nimiq Design Tokens — quick reference

Two token sets ship with this CLI. Pick ONE per project via `nq init --style modern|legacy`.

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

Full extraction with file paths: see `references/` in this repo and
`~/Projects/nimiq/nimiq-branding-skill/nimiq-branding.md` (deep brand doc).
