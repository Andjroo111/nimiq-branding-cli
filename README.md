# nimiq-brand ⬡

A zero-dependency CLI toolkit for the **Nimiq blockchain brand** — colors, gradients, typography, design principles, WCAG accessibility checks, and design-token export, straight from your terminal.

All values are sourced from the official [Nimiq Style framework](https://github.com/nimiq/nimiq-style) (`@nimiq/style`) and [nimiq.com](https://www.nimiq.com), and the tool itself is built on Nimiq's design principles: it is accessible (WCAG checks built in, `NO_COLOR` respected), simple (one small CLI, no runtime dependencies), and open (every token exportable to CSS, SCSS, JSON, or Tailwind).

## Install & run

Requires Node.js ≥ 18. No dependencies to install.

```sh
node bin/nimiq-brand.js help     # from a clone
# or, once published / linked:
npm link && nimiq-brand help
```

## Commands

| Command | What it does |
| --- | --- |
| `principles` | Nimiq's five design principles — the foundation of everything else |
| `colors [name]` | The full palette (incl. darkened and on-dark variants) with truecolor swatches. `--format=css\|scss\|json` |
| `gradients [name]` | The signature radial gradients (anchored bottom-right). `--format=css\|json` |
| `typography` | Muli + Fira Mono, weights, and the 8px-based type scale |
| `check <hex>` | Is a color on-brand? If not, suggests the nearest brand tokens and reports WCAG contrast. Exits 1 when off-brand — usable in CI |
| `contrast <fg> <bg>` | WCAG 2.x contrast ratio with AA/AAA verdicts for normal and large text |
| `tokens [css\|scss\|json\|tailwind]` | Export the complete token set for your stack |
| `logo [--color=<name>]` | The Nimiq hexagon, rendered in a brand gradient |
| `identicon <address-or-text>` | Nimiq identicon for any address or name — exact port of the official `@nimiq/identicons` algorithm (chaos hash, color tables, collision rules, 1–21 asset indices). Terminal render by default; `--format=svg` for a simplified SVG avatar, `--format=json` for the raw parameters (compatible with official assets) |

### Examples

```sh
nimiq-brand check "#0582CA"          # ✓ On-brand: this is nimiq-light-blue.
nimiq-brand check "#1F2349"          # ✗ suggests nimiq-blue (Δ 1.0), exits 1
nimiq-brand contrast "#FFF" "#1F2348"  # 14.85:1 — AAA
nimiq-brand tokens css > nimiq.css   # drop-in CSS custom properties
nimiq-brand colors --format=json | jq .
nimiq-brand identicon "NQ07 0000 0000 0000 0000 0000 0000 0000 0000"
nimiq-brand identicon alice --format=svg > alice.svg
```

## The design principles (the foundation)

1. **Accessible to everyone** — jargon-free, intuitive, WCAG-compliant. Enforced by `contrast` and `check`.
2. **Independence by design** — the user stays in control; no dark patterns.
3. **Simplicity over complexity** — one 8px base unit, one typeface, one restrained palette. Enforced by `check` and the token scale.
4. **Light, fast, sustainable** — a Nimiq transaction uses less energy than an email; this CLI mirrors that with zero runtime dependencies.
5. **Open and community-driven** — every token exports to open formats via `tokens`.

Run `nimiq-brand principles` for the full text.

## Brand quick reference

| Token | Hex | Role |
| --- | --- | --- |
| `nimiq-blue` | `#1F2348` | Primary brand color |
| `nimiq-light-blue` | `#0582CA` | Links, buttons, highlights |
| `nimiq-gold` | `#E9B213` | The NIM coin color |
| `nimiq-green` | `#21BCA5` | Success |
| `nimiq-orange` | `#FC8702` | Warning |
| `nimiq-red` | `#D94432` | Error |

Gradients are radial, anchored bottom-right: `radial-gradient(100% 100% at 100% 100%, <from>, <to>)`.

## Development

```sh
npm test   # node:test, unit + end-to-end CLI tests
```

Token data lives in [`src/data/brand.js`](src/data/brand.js) — the single source of truth for every command.

## Disclaimer

This is an unofficial community tool. Nimiq, the Nimiq logo, and the official assets belong to the Nimiq project — see [nimiq/designs](https://github.com/nimiq/designs).
