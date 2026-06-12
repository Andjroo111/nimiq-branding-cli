# Notice — Nimiq brand assets & upstream sources

**This is an unofficial community project.** It is not affiliated with, endorsed by,
or sponsored by the Nimiq Foundation / Nimiq team. It exists to help builders create
Nimiq-ecosystem apps that look right.

## Whose work is in here

The Nimiq name, logo, hexagon mark, identicons, and all visual designs reproduced by
this tool are the work and property of the **Nimiq team and its contributors**.
This repo vendors their real shipped files rather than imitating them:

| What | Origin | Upstream license |
|---|---|---|
| `nq-*` CSS framework | [nimiq/nimiq-style](https://github.com/nimiq/nimiq-style) | Apache-2.0 |
| Modern nimiq-css + nimiq-icons + flags | [onmax/nimiq-ui](https://github.com/onmax/nimiq-ui) | MIT |
| Vue component designs (ported) | [nimiq/vue-components](https://github.com/nimiq/vue-components), [nimiq/wallet](https://github.com/nimiq/wallet), [nimiq/hub](https://github.com/nimiq/hub) | Apache-2.0 |
| Identicon sprite + parts | [nimiq/identicons](https://github.com/nimiq/identicons) | MIT |
| Official logo pack | [nimiq/designs](https://github.com/nimiq/designs) | see repo |
| App/ecosystem icons | [nimiq/awesome](https://github.com/nimiq/awesome) | see repo |
| Marketing imagery (hero sky, world map, product previews) | [nimiq.com](https://nimiq.com) (publicly served assets) | © Nimiq |

Per-file provenance for everything under `references/assets/` is recorded in
`references/assets/ASSETS.md` and the `SOURCES.txt` files alongside the assets.

If you are from the Nimiq team and want anything removed or credited differently,
open an issue — it will be handled promptly.

## What the MIT license here covers

Only the original work in this repo: the `nq` CLI, the verification harness
(snap/verify/pixelmatch pipeline), build scripts, registry structure, and docs.
