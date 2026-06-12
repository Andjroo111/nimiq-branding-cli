# Supporting elements Andrew wants recreated (from his 2026-06-11 wallet/site screenshots)

The original screenshot files were ephemeral; this brief records what they showed.
Wallet elements have upstream source (port from code). Marketing elements are
screenshot-referenced — compare against our own captures in
`references/screenshots/nimiq-com/`.

## Wallet (wallet.nimiq.com, logged in, light mode)

1. **Backup banner** — orange `.backup-warning.words`: ⚠ "There is no 'forgot password'"
   left, orange `Backup →` pill right, white bg, subtle inset border, radius 6px.
2. **Account header** — big identicon (~110px) left; right of it: account name
   "Indigo Address" (nq-h1 weight), chunked address `NQ87 JY9X JUEE HA17 JNBB HPGM 5ETQ VT1G CVN2`
   in gray Fira Mono; far right balance "995 NIM" bold + "$0.50" gray under it.
   Below: pill search input "🔍 Search transactions" + three action buttons:
   `🌱 Stake` (green pill), thin divider, `↑ Send` (light-blue pill), `↓ Receive` (gray pill).
   Under Stake: a GREEN tooltip bubble "Earn NIM every month by staking your NIM"
   (solid green #21BCA5-ish, white text, small arrow pointing up at the Stake button).
3. **Transaction list** — month header "MAY" (gray, letter-spaced, small caps feel).
   Rows: left column date "14 / MAY" stacked (day big, month small gray); identicon;
   middle: address chunks in Fira Mono (e.g. `NQ49 Q4GS PG77 NTQT VRC9 6FF0 VXJX FKXF 829U`)
   with time "22:58" gray underneath; right: amount — outgoing plain navy "- 5.0 NIM",
   incoming in a GREEN tinted pill "+ 1000 NIM" (green text on pale green, radius ~6px);
   gray placeholder bar under amounts (fiat value loading).
4. **Swap balance bar** (Swap Currencies modal) — horizontal distribution bar:
   left segment solid navy (NIM share), right segment ORANGE DIAGONAL HATCHING with
   orange border (BTC share); round white drag handle with ◀▶ glyph at the boundary;
   blue vertical hairline at the connection point; below the bar a tick scale with
   "46%" left label and "54%" right label; curved connector lines from the bar up to
   the account labels (identicon "Indigo Address / 519 NIM" left, "Bitcoin / 0.00 BTC" + ₿ right).
   Also: NIM|BTC slider-toggle pairs at top with ⇄ between, "$0.47 fee · $999" line,
   "-476 NIM / $0.24" left input, "+0.00000476 BTC / $0.30" GREEN-outlined input right,
   disabled CONFIRM pill, orange ⚠ "The swap requirements are unresolvable" notice.
5. **Sidebar price chart** — "24H" outlined badge over a white sparkline polyline;
   below: "NIM  $0.000501  +0.1%" (label white-ish, price white, delta GREEN);
   second chart "BTC $63 417.00 +2.0%". On navy sidebar bg.
6. **Balance distribution ring** — donut/ring (gold/yellow stroke, full circle = 100% NIM)
   with legend "NIM 100% / BTC 0%" rows beside it; "Swap" pill below.

## Marketing (nimiq.com — see references/screenshots/nimiq-com/home-desktop-full.png + element crops)

7. **Hero** — deep purple/indigo radial-gradient sky (#1F2348→violet glow center),
   floating translucent hexagons (soft blue-purple gradient fill, slight blur/glow),
   H1 white "Universal Money for Independent Individuals" (~64px, 800),
   gray-lavender subtitle, light-blue `Create Wallet ↗` pill,
   "WORKS WITH" row of partner logos, bottom: white globe arc made of DOTS
   (dotted world map on a huge white circle cresting into view).
8. **App showcase card** (THE APPS section) — white rounded card (radius ~12px):
   centered gold hexagon app icon in rounded square, H3 title ("Pay App"),
   2-line gray subtitle, then a device mockup image/frame showing the app.
   Wide variant: icon+title+copy left, dashboard mock right ("Nimiq wallet" card).
9. **Community honeycomb band** — light gray hexagon mosaic (flat-top hexagons,
   various very-light grays, generous gaps) with a few brand-colored hexagons mixed in
   (YouTube red w/ play glyph, X black, Facebook blue) and a blue `Community →` pill
   centered above.
