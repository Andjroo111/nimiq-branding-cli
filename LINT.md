# nq lint — brand + breathability enforcement

`nq audit` watches the *upstream* Nimiq design for drift. `nq lint` is the other direction:
it renders **your** page (desktop + a 390px mobile pass) and checks it against the Nimiq rules,
so the brand discipline that used to live only as prose (the 21 rules + AI-slop blacklist in the
`nimiq-ui` skill) becomes something a machine can actually *deny*, not just something a human is
asked to remember.

```bash
nq lint <file.html | url>     # render + check; exit 1 if any ERROR
nq lint page.html --fix       # also auto-fix the safe text violations in place
nq lint https://site/ --json  # machine-readable
```

It renders with the same Playwright harness as `nq verify` (no new runtime dep). For URLs it
dismisses a language-picker splash (e.g. nimiq.tech) and scrolls to trigger lazy sections;
decorative SVG fields (honeycomb / identicon fences) are excluded from every measurement.

> **Lint source files, not live URLs, when you can.** A built/static `.html` file renders
> deterministically. A live SPA adds splash gates, lazy hydration and thousands of decorative
> nodes — handled, but fragile. URL mode is for spot-checks; the gate should point at source.

---

## Two layers

### ERRORS — off-brand slop (hard-fail, exit 1)
Unambiguous, deterministic, and verified **not** to fire on nimiq.com itself (see calibration).
These are the "make us not do AI things" set.

| Check | Rule | Auto-fix |
|---|---|---|
| em/en dashes in copy | skill rule 18 | `--fix` → comma |
| periods on display titles / CTAs | skill rule 16 | `--fix` → strip |
| glassmorphism (translucent surface + backdrop blur) | skill rule 10 | manual |
| borders on inputs | skill rule 1 | manual (inset box-shadow) |
| off-palette colors | skill rule 13 | manual |
| low-contrast blue/navy text on dark | skill rule 20 | manual → `#0CA6FE` / white |

**Blue/navy on dark (rule 20)** is the headline a11y+brand check. A blue-family foreground (hue
195–245°) sitting on a dark surface (luminance < 0.12) below the AA floor — **4.5:1 normal, 3.0:1
large** — fails. Raw `#0582CA` on navy = 3.63:1 and `#265DD7` = 2.61:1 both error; the on-dark
variant `#0CA6FE` (5.68:1) and white pass cleanly. The background is read from the element's *own*
surface first (so blue text on a light card nested in a dark section is not a false positive), and
gradient-filled CTAs with white text are never flagged.

### WARNINGS — breathability / density (advisory, never block)
These **cannot** hard-fail: nimiq.com's own marketing trips several of them (it runs 12 font
sizes and 31–38% dense sections). They're calibrated to the measured Nimiq envelope and exist
to flag *"this is getting busy, is it justified?"* — the deterministic half of PRINCIPLES law 4
("white space does the structural work").

**Breathability / density**

| Check | Threshold | Why |
|---|---|---|
| body text wider than ~88ch | `> 88ch` | prose measure caps at 78ch; nimiq.com p90 ≈ 84ch |
| dense sections (text-ink ratio) | `> 18%` of a full-width band | nimiq.com pages run 5–12% page ink |
| off-scale spacing | values not on the curated scale | warn-and-snap, not fail |
| type-scale sprawl | `> 12` distinct text sizes | calm app ≈ 4; busy marketing ≈ 12 |
| colored / long / pill uppercase eyebrow | colored, >24 chars, or a pill | grey section labels are fine (rules 8, 17) |

**Depth / motion / form** (from the design recon)

| Check | Threshold |
|---|---|
| non-pill action buttons | a text button radius below a full pill (and not a nav trigger) |
| flat-fill colored button | a brand-colored button with no radial gradient |
| wrong gradient anchor | a linear-gradient, or a radial not at bottom-right / `100% 100%` |
| non-Nimiq easing | the Material `cubic-bezier(0.4,0,0.2,1)` on a button (use `cubic-bezier(0.25,0,0,1)`) |
| off-scale border-radius | not on `3 · 4 · 6 · 8 · 10 · 12` or a full pill / 50% |
| harsh near-black shadow | `rgba(0,0,0, > 0.22)` (Nimiq shadows are soft, low-alpha) |
| underlined links | a body `<a>` with `text-decoration: underline` (links are bold, no underline) |
| NIM address not in Fira Mono | a 4-char-grouped address rendered in a proportional font |
| gold-tinted UI icon | a non-logo icon tinted gold (gold = brand mark only) |

**Mobile (a second pass at 390px)**

| Check | Threshold |
|---|---|
| horizontal overflow | `scrollWidth > viewport` by > 4px |
| tap targets too small | a button / input / link-button under 30px (inline text links are exempt) |
| text smaller than 12px | any text element below 12px at mobile width |

The curated spacing scale (from `assets/css/modern/spacing.css`, desktop max of each step):
`8 · 12 · 16 · 24 · 32 · 40 · 48 · 72 · 80 · 96 · 144 · 200`. Sub-8px is treated as optical
nudging, not layout, and ignored. The radius scale: `3 · 4 · 6 · 8 · 10 · 12` plus full pills
(500/999/9999) and circles (50%).

---

## Exceptions are part of the spec

Calibration against real pages proved that a naive version of each rule flags Nimiq's own
sites. The carve-outs are load-bearing, not afterthoughts:

- **Social brand icons** — Discord/Telegram/X/YouTube/etc. colors are exempt from the palette
  rule (you can't recolor a third-party logo). Reported separately as `exempt social-icon colors`.
- **Blue-tinted neutrals** — Nimiq grays carry a deliberate violet spin, so "neutral" is tested
  by *saturation relative to lightness*, not a flat channel spread.
- **Secondary palette** — purple `#5F4B8B`, pink `#FA7268`, light-green `#88B04B`, brown
  `#795548` (+ gradient starts) are brand colors, not violations.
- **Abbreviations** — `p.a.`, `e.g.`, `U.S.` don't count as title periods (internal-dot guard).
- **Translucent-only glass** — a near-opaque panel (≥85% bg) with a faint backdrop blur is a
  solid surface, not glassmorphism. Only `10–85%` translucency + backdrop blur is flagged.
- **Grey section eyebrows** — short grey uppercase labels ("THE APPS", "TRUSTED BY") are the
  brand's own pattern; only *colored*, *>24-char*, or *pill* uppercase is flagged.
- **Addresses & codes** — `NQ…` addresses and short alphanumeric codes (`L51C`) are uppercase by
  nature and excluded from the eyebrow check.
- **Own-surface contrast** — blue/navy text is judged against the element's *own* background
  first, so blue text on a light card inside a dark section isn't a false error; gradient-filled
  CTAs (white text) are never flagged.
- **Inline links & nav triggers** — inline text links are exempt from the mobile tap-target check;
  `nav`/`header` text buttons are exempt from the non-pill check.

---

## Calibration (measured, not invented)

Thresholds were set by rendering real Nimiq pages at 1440px and measuring the envelope — the
same "measure reality" method that proved the no-em-dash rule. Verified outcome:

| Page | ERRORS | Note |
|---|---|---|
| nimiq.com home (reference) | **0** | the gate must never flag the brand's own site, even with the rule-20 contrast + depth/motion checks |
| nimiq.com/about | 0 | — |
| nimiq.tech | real findings | catches genuine em-dashes + a "Phase 2 · preview" colored eyebrow + 3 dense bands |
| positive control | **2** | a deliberate `#0582CA`/`#265DD7`-on-navy page errors at 3.63/2.61:1; `#0CA6FE` + white pass |

Re-run the calibration any time the rules change:
`node bin/nq.js lint https://www.nimiq.com/` **must stay at 0 errors.** If a new rule flags the
reference, the rule is wrong — fix the rule, not nimiq.com. (That principle just caught four
over-strict rules during the 2026-06-20 hardening, including a blue-on-navy false error that the
own-surface-bg fix resolved.)

---

## Exit codes & `--fix`

- Exit `1` if any ERROR; `0` otherwise (warnings never affect exit). Wire the exit code into a
  pre-commit hook or CI step to make it a real gate.
- `--fix` (local files only) applies the safe **text** transforms — em/en dashes → comma,
  strip trailing title periods — and reports what it changed. It never silently green-washes:
  geometry fixes (measure width, spacing snap, glass → solid) are reported for a human/agent,
  because rewriting layout unsupervised can break the page.

---

## Roadmap

- **Render-mapped geometry autofix** — map a flagged rendered element back to its source line so
  `--fix` can also constrain over-wide text and snap off-scale spacing, each behind a
  re-render-and-verify check so a fix that breaks layout is rejected instead of shipped.
- **Layer 3 — optional aesthetic judgment (BYO-key).** A cheap vision pass for the irreducible
  residue the metrics can't see ("is this busyness *justified*? does it feel Nimiq or generic
  SaaS?"). Off by default; the deterministic layers above stay free, offline, and keyless.
- **`learnings.json` for lint** — same self-learning store as `nq audit`, so confirmed false
  positives are remembered and suppressed across runs.
