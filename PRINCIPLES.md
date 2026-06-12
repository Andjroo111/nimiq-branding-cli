# The Nimiq Design Principles

**This is the soul of this tool.** Every component in the registry — and every NEW thing
generated with it — must come from these principles, not just resemble their output.

Sources: the **NIMIQ Style Guide (October 2018)**, the
[A New Visual Identity](https://www.nimiq.com/blog/a-new-visual-identity/) blog post,
[nimiq-style](https://nimiq.github.io/nimiq-style/), and the
[Nimiq Design Kit](https://nimiq.dev/design-kit).

---

## Why — the identity

> *Nimiq is an Inuit word for an object or force that binds things together.*

Nimiq sees itself as **the lowest common denominator at the intersection of payment
technology and accessible interaction with a blockchain** — and aims for **radical
simplicity in both technology and design**.

The brand persona, derived from team and community (not theory):

**Helping & caring · Trustworthy & transparent · Conscientious & driven**

…which translates into four visual pillars:

1. **A base that follows common patterns.**
2. **Traditional and basic colors with a subtle spin.**
3. **Warm and round, but straight visual and form language.**
4. **Subtle complexity and calculated breaks in a clear structure.**

---

## The prime directive — radical simplicity

> *"Stripping away everything that's not necessary will lead to less cognitive load and
> eventually to a better experience."*

The logo is the proof: every clever N-in-a-hexagon draft was discarded for the **bare
hexagon** — because two shapes, one inside the other, was already too complex. What
remained is *"a clean slate, ready for the community to fill."*

And the ecosystem framing that defines this CLI's job:

> *"We don't want to dictate the way the Nimiq ecosystem looks or feels, but rather
> provide a boilerplate of our vision, stripped down to the very core, so that there's
> enough room for others to fill it out with their own ideas."*

This tool **is** that boilerplate, made executable.

---

## The laws

### 1. Color — three rules, in order
1. **Traditional, basic colors with a subtle, unexpected spin.** The ultramarine
   dark-blue (`#1F2348`) carries a touch of violet spreading from the corner; the
   classic red tilts slightly toward magenta. Colors relate to *payments*, not to
   crypto fashion.
2. **Build on a light stage.** Start from a clean slate (white / `#F8F8F8`); create
   structure with very light, nuanced grays derived from the main colors — this
   underlines the transparent, open, collaborative approach and leaves room for
   others' ideas.
3. **Color is for accentuated highlights only** — to set focus, and as a *reaction to
   interaction*. Never decorative. (Green = success only. Red = error only.
   Orange = warning. Blue = action/info.)

### 2. The gradient is the spin
A **subtle radial gradient is THE key feature** of the visual identity. Apply it to
every element that qualifies as a color area — buttons, boxes, backgrounds — anchored
in the **bottom-right corner** (e.g. `radial-gradient(100% 100% at bottom right,
#260133, #1F2348)`). This is how "traditional colors" get their spin. On logo
substrates: white base with a faint color-aligned tint sweeping from the top-right edge.

### 3. Form — warm and round, but straight and tangible
Interfaces are **warm and round, but straight and tangible at the same time** (pill
buttons and 8px-radius cards, yet crisp edges and exact alignment). **Every element
has a clear anchor and a relation to the whole.** Pare down the number of visual
elements until **everything remaining is necessary for the layout to function**.

### 4. White space does the structural work
Achieve hierarchy, separation and cohesion with **white space instead of structural
elements** like separators or boxes. *"We avoid all forms of decorative elements if we
can't defend them on a content level."* When in doubt: more breathing room, fewer lines.

### 5. Typography — simple, unique, open
**Muli/Mulish**: a classic sans-serif molded by radical geometric simplicity, with
unique details that never compromise that simplicity — chosen over Roboto/Open Sans
because Nimiq could *own* it, and because it's open source (community must be able to
reproduce everything). **Fira Mono** for technical content — addresses, keys, numbers —
optimized for readability, light-footed in non-code environments.

### 6. Calculated breaks — the element of surprise
Radical simplicity is not sterility:

> *"For this reason we embrace subtle complexity — an element of surprise,
> well-defined breaks in a clear structure — something that makes the experience
> memorable."*

One surprise per experience: the gradient's diagonal, an identicon's character, the
honeycomb peeking through. **"Driven" translates into adding that bit of sophistication
and friction that makes the difference between convenience and fascination.** Friction
belongs only where it protects something critical (a passphrase, money).

### 7. Familiar in the basics, honest in the details
> *"We use common, learned patterns for critical interactions with Nimiq wherever
> possible. We're familiar in the basics, but surprising in the details. Nevertheless,
> if in doubt, everything we do follows intuitive patterns. If we don't follow best
> practices, we follow logic, nature or human behavior."*

### 8. Reproducibility is a brand value
> *"We want to encourage the community to use our visual language as a foundation for
> their own projects. … everything we create visually needs to be easily accessible and
> reproducible, being able to act as a boilerplate by virtue of its simplicity."*

This is why this CLI pixel-verifies every component against the real upstream and ships
the team's real assets instead of hand-made approximations. Reproduction *is* the brand
working as designed.

### 9. The logo is sacred ground
The hexagon signet is **universal** — anyone in the ecosystem may use it and build their
own mark on top of it. The **signet + wordmark combination is reserved** and must not be
altered. Clear space: the width of the letter N (horizontal) / half a hexagon (signet).
Monochrome versions for busy or colored backgrounds. Never reconstruct the geometry —
use the shipped files (`nq assets search logo`).

---

## The generation checklist

Before any NEW component or design ships, it must answer **yes** to all of these:

- [ ] Could anything be removed without the layout failing? (If yes → remove it.)
- [ ] Does it sit on a light stage, structured by white space rather than boxes/lines?
- [ ] Is every color either a main color with the radial-gradient spin, a light nuanced
      gray derived from main colors, or a semantic highlight reacting to focus/interaction?
- [ ] Are color areas gradient-built (bottom-right radial), not flat fills?
- [ ] Is it warm and round (pills, soft radii) yet straight and tangible (crisp anchors,
      exact alignment, clear relation to the whole)?
- [ ] Is the typography Muli/Mulish (UI) and Fira Mono (technical values) only?
- [ ] Is there at most ONE calculated break / element of surprise, and can it be
      defended on a content level?
- [ ] Are the basics a common, learned pattern? (Surprise lives in details, never in
      critical interactions.)
- [ ] Does it use the team's real assets (`nq assets`) — never redrawn logos, icons or art?
- [ ] Is it reproducible — plain HTML/CSS or standard Vue, no exotic dependencies,
      verifiable by `nq verify`?

---

*Run `nq principles` to print this document. `nq new <name>` scaffolds a component with
this checklist embedded — a component is not done until the checklist and the pixel
verification both pass.*
