# Logged-in Nimiq testnet wallet — authentic captures (mobile 390×844 @2x)

Captured from the REAL testnet wallet (wallet.nimiq-testnet.com) on a funded
throwaway testnet account ("Purple Address", 110 000 testnet NIM from the faucet —
no real value). These fill the gap the old skill's manual logged-in captures left
when nimiq-branding-skill was renamed. Regenerate with
`scripts/capture-testnet-wallet.mjs`.

- home-overview-mobile.png ............ multi-asset home (TOTAL BALANCE, NIM/BTC, Receive/Send bottom bar)
- nim-address-overview-mobile.png ..... THE account-header screen: identicon + label + balance +
                                        faded chunked address + actions row (search/stake/⋮) + tx-list
                                        ("Testnet Faucet +110 000 NIM"). The screen our wallet UIs mirror.
- receive-choose-recipient-mobile.png  "Choose a Recipient" account picker (Receive step 1)
- receive-nim-address-mobile.png ..... "Receive NIM": identicon + 3×3 Fira-Mono address grid +
                                        "Create request link" + QR icon (the Receive screen)
- send-choose-sender-mobile.png ...... "Choose a Sender" account picker (Send step 1)
- send-transaction-enter-address-mobile.png  "Send Transaction": Contacts + recent identicons +
                                        "ENTER ADDRESS" 3×3 input grid + "Create a Cashlink" (the Send screen)
- receive-nim-address-qr-mobile.png .. "NIM Address": the QR sheet behind Receive's corner glyph.
                                        Its own sheet (X, no back arrow), a NAVY QR — NOT the
                                        registry `qr-code` light-blue radial — the address as ONE
                                        truncated Fira-Mono line with a `•••` middle, and a
                                        light-blue instruction as the only other colour on it.
- scanner-mobile.png ................. the QR scanner behind the home bar's right-hand glyph:
                                        full-screen OPAQUE navy radial gradient, four white-55%
                                        corner brackets with the radius on the one corner each
                                        bracket turns, and a white Cancel pill. Captured headless,
                                        so it shows the no-camera state; the chrome is the point.

Both of the last two are bare SVG controls with no accessible name, so the script
finds them by geometry, not by text. Everything here is captured, never inferred —
if a screen is missing, extend the script rather than drawing what you think it
looks like.
