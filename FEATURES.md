# Supporting Features Roadmap

Interactive widgets/flows across Nimiq's apps and sites that this CLI can scaffold as
ready-made features (beyond single components). Surveyed 2026-06-11 from live sites +
upstream sources. Full data: `references/supporting-features.json`.

## High priority

### Hub onboarding / connect-wallet (signup, login, choose address)
- **Where:** https://hub.nimiq.com popup via @nimiq/hub-api — source: upstream/hub/src/views/OnboardingSelector.vue, Signup.vue, Login.vue, ChooseAddress.vue, ConnectAccount.vue
- **Screenshots:** need it
- The universal 'Connect with Nimiq' flow every third-party app starts with: OnboardingMenu (create account / login / Ledger), IdenticonSelector avatar picker, ChooseAddress address selector. Composes hub components OnboardingMenu.vue, IdenticonSelector.vue, StatusScreen.vue plus @nimiq/vue-components (SmallPage, PageHeader/Body, AccountSelector). A CLI scaffold = drop-in 'connect wallet' button + callback handling.
- **Built from:** `hub/src/views/OnboardingSelector.vue`, `hub/src/views/ChooseAddress.vue`, `hub/src/components/OnboardingMenu.vue`, `hub/src/components/IdenticonSelector.vue`, `@nimiq/hub-api`, `@nimiq/vue-components AccountSelector`

### Checkout / payment flow (Hub checkout)
- **Where:** https://hub.nimiq.com checkout via hub-api; docs at nimiq.github.io/hub — source: upstream/hub/src/views/Checkout.vue + CheckoutTransmission.vue
- **Screenshots:** need it
- Multi-currency payment sheet: currency cards (CheckoutCardNimiq/Bitcoin/Ethereum/External), CheckoutManualPaymentDetails (pay-by-address+QR fallback), PaymentInfoLine + Timer from @nimiq/vue-components, CurrencyInfo, StatusScreen success/error. This is THE merchant-facing feature (woocommerce-gateway-nimiq builds on it). CLI scaffold = 'accept NIM/BTC/ETH payment' page with callback verification.
- **Built from:** `hub/src/views/Checkout.vue`, `hub/src/components/CheckoutCardNimiq.vue`, `hub/src/components/CheckoutCardBitcoin.vue`, `hub/src/components/CheckoutCardEthereum.vue`, `hub/src/components/CheckoutManualPaymentDetails.vue`, `@nimiq/vue-components PaymentInfoLine + Timer + QrCode`

### Cashlink create / manage / claim
- **Where:** Hub views + wallet entry points — upstream/hub/src/views/CashlinkCreate.vue, CashlinkManage.vue, CashlinkReceive.vue; wallet/src/components/CashlinkButton.vue; github.com/nimiq/cashlink-generator (bulk tool)
- **Screenshots:** have it (cashlink tx-detail modal in nimiq-branding-skill/screenshots/nimiq-wallet-app/Screenshot 2026-03-13 at 9.42.56 PM.png; create/claim screens still needed)
- Signature Nimiq feature: send NIM via shareable link, no recipient address needed. Create flow (amount + message + fee), manage (copy/share/cancel link), receive/claim flow with CashlinkSparkle celebration animation. Wallet send modal offers 'Create a Cashlink' when address unavailable; cashlink txs render specially in the tx list. High reuse for tipping, airdrops, promo apps.
- **Built from:** `hub/src/views/CashlinkCreate.vue`, `hub/src/views/CashlinkManage.vue`, `hub/src/views/CashlinkReceive.vue`, `hub/src/lib/Cashlink.ts`, `hub/src/components/CashlinkSparkle.vue`, `wallet/src/components/CashlinkButton.vue`

### Staking calculator
- **Where:** https://www.nimiq.com/staking-calculator/ (nimiq.com website; not in local upstream clones)
- **Screenshots:** have it (nimiq-branding-skill/screenshots/staking-calculator/nimiq.com-staking-calculator-desktop.png + -mobile.png)
- Standalone marketing-grade widget: NIM amount + duration inputs -> projected rewards/APY output, branded slider UI. Self-contained (only needs supply/reward-curve math + current staked ratio from network), making it the easiest high-visual feature to scaffold for any community/validator site.
- **Built from:** `nimiq.com website widget (no local source)`, `reward-curve math from core-rs-albatross economics`, `validators-api for live staked supply`

### Staking flow + validator picker
- **Where:** wallet.nimiq.com — upstream/wallet/src/components/staking/ (26 components)
- **Screenshots:** have it partially (staked-balance card + 'NimiqHub Staking 10.1% p.a.' row in nimiq-wallet-app/Screenshot ...9.42.22 PM.png; validator list page still needed)
- Full multi-page StakingModal wizard: StakingWelcomePage -> StakingValidatorPage (validator list with ValidatorListItem, ValidatorFilter, ValidatorScoreDetails star-ratings, ValidatorIcon/IconStack) -> StakingGraphPage (AmountSlider over balance + reward projection StakingGraph) -> StakingRewardsPage/Chart. Backed by github.com/nimiq/validators-api ('helping stakers choose where to stake'). The validator-picker subcomponent alone is valuable for pool/validator websites (e.g. stakenimiq.com).
- **Built from:** `wallet/src/components/staking/StakingModal.vue`, `StakingValidatorPage.vue`, `ValidatorListItem.vue`, `ValidatorFilter.vue`, `ValidatorScoreDetails.vue`, `AmountSlider.vue`, `StakingGraph.vue`, `StakingRewardsChart.vue`, `nimiq/validators-api`

### QR scan + pay (request links / receive)
- **Where:** wallet.nimiq.com — upstream/wallet/src/components/modals/ScanQrModal.vue + ReceiveModal.vue; libs github.com/nimiq/qr-scanner (2.9k stars) + qr-creator
- **Screenshots:** have it (receive modal w/ request-link in ...9.42.34 PM.png; send modal w/ QR-scan entry + cashlink CTA in ...9.42.44 PM.png)
- Two halves: (1) ScanQrModal using @nimiq/vue-components QrScanner (camera scan, parses nimiq:/bitcoin:/polygon payment URIs and routes to the right send flow); (2) ReceiveModal showing identicon + chunked address + QR + 'Create request link' (amount-encoded payment URI). Both libs are standalone MIT packages, so this scaffolds cleanly into any PoS/payment app (NimiPay, Gateflo).
- **Built from:** `wallet/src/components/modals/ScanQrModal.vue`, `wallet/src/components/modals/ReceiveModal.vue`, `@nimiq/vue-components QrScanner + QrCode`, `nimiq/qr-scanner`, `nimiq/qr-creator`, `payment URI parser in wallet/src/lib`

### Transaction history with fiat conversion + CSV export
- **Where:** wallet.nimiq.com — upstream/wallet/src/components/TransactionList.vue, TransactionListItem.vue, FiatConvertedAmount.vue, modals/HistoryExportModal.vue
- **Screenshots:** have it (mobile tx list with fiat values in nimiq-wallet-app/Screenshot ...9.42.22 PM.png)
- Virtual-scrolled, month-grouped tx list with identicon avatars, contact-label resolution, cashlink/swap badges, historic fiat value per tx (via @nimiq/utils FiatApi rates), search bar, and CSV export modal. Per-currency variants exist (BtcTransactionList, UsdcTransactionList, UsdtTransactionList) sharing the pattern. Any wallet-adjacent or accounting app wants this.
- **Built from:** `wallet/src/components/TransactionList.vue`, `TransactionListItem.vue`, `FiatConvertedAmount.vue`, `SearchBar.vue`, `modals/TransactionModal.vue`, `modals/HistoryExportModal.vue`, `@nimiq/utils FiatApi`

### Identicon generator / avatar picker
- **Where:** github.com/nimiq/identicons (MIT) + @nimiq/vue-components Identicon.vue + hub IdenticonSelector.vue; reference doc already at nimiq-branding-skill/references/identicons.md
- **Screenshots:** have it (identicons visible in all wallet screenshots; documented in nimiq-branding-skill/references/identicons.md)
- Deterministic hexagon avatar from any Nimiq address — the most recognizable Nimiq brand element. Two scaffold targets: plain Identicon renderer (address -> SVG) and the hub's IdenticonSelector 'choose your avatar' onboarding carousel. Tiny dependency, used by literally every Nimiq app.
- **Built from:** `nimiq/identicons`, `@nimiq/vue-components Identicon.vue + AccountRing.vue`, `hub/src/components/IdenticonSelector.vue`, `wallet IdenticonButton.vue + IdenticonStack.vue`

## Medium priority

### Swap UI (NIM <-> BTC <-> USDC/USDT via Fastspot)
- **Where:** wallet.nimiq.com Trade > Swap — upstream/wallet/src/components/swap/ (SwapModal.vue, SwapBalanceBar.vue, SwapAnimation.vue, SwapFeesTooltip.vue, SwapNotification.vue)
- **Screenshots:** need it (only disabled Swap button visible in ...9.41.06 PM.png)
- Atomic-swap UI: dual AmountInputs with live quote, draggable SwapBalanceBar showing post-swap balance split, SwapFeesTooltip fee breakdown, full-screen SwapAnimation during HTLC execution, background SwapNotification. Visually excellent but tightly coupled to Fastspot API + @nimiq/fastspot-api + hub setupSwap — scaffold as UI shell with pluggable quote provider. Directly relevant to Hashmark-style apps.
- **Built from:** `wallet/src/components/swap/SwapModal.vue`, `SwapBalanceBar.vue`, `SwapAnimation.vue`, `SwapFeesTooltip.vue`, `@nimiq/fastspot-api`, `hub setupSwap/RefundSwap views`

### Buy/Sell fiat on-ramp (Moonpay, Simplex, Coinify, OASIS bank swap)
- **Where:** wallet.nimiq.com Buy flow — upstream/wallet/src/components/modals/BuyOptionsModal.vue, BuyCryptoModal.vue, SellCryptoModal.vue, MoonpayModal.vue, SimplexModal.vue, CoinifyModal.vue, TradeModal.vue; OASIS marketing page nimiq.com/oasis
- **Screenshots:** have it partially (OASIS marketing page nimiq-website/nimiq.com-oasis-desktop+mobile.png; the actual buy-options modal still needed)
- Provider-chooser pattern: BuyOptionsModal geo-gates providers via useGeoIp + CountrySelector/CountryFlag, then opens provider webview modals (Moonpay/Simplex/Coinify) or the OASIS SEPA bank-swap TradeModal (SwapSepaFundingInstructions, BankCheckInput, KYC components). Scaffold value is the chooser shell + provider-modal pattern; the providers themselves need API keys/contracts, and OASIS availability has been limited — hence medium.
- **Built from:** `wallet/src/components/modals/BuyOptionsModal.vue`, `MoonpayModal.vue`, `SimplexModal.vue`, `CoinifyModal.vue`, `TradeModal.vue`, `CountrySelector.vue`, `swap/SwapSepaFundingInstructions.vue`, `BankCheckInput.vue`, `kyc/`

### Address book / contacts
- **Where:** wallet.nimiq.com — upstream/wallet/src/components/ContactBook.vue, ContactShortcuts.vue, UsdcContactBook.vue + stores/Contacts.ts
- **Screenshots:** have it partially (Contacts entry point in send modal screenshot ...9.42.44 PM.png; open contact book still needed)
- Identicon-driven contact list: add/edit/delete with LabelInput, recent-recipient shortcuts row in the send flow, contact resolution in tx history. Small, self-contained (localStorage store), reusable in any send-money UI.
- **Built from:** `wallet/src/components/ContactBook.vue`, `ContactShortcuts.vue`, `stores/Contacts.ts`, `@nimiq/vue-components Identicon + LabelInput`, `modals/AddressSelectorModal.vue`

### Amount input with live fiat sync
- **Where:** wallet/src/components/AmountInput.vue + AmountMenu.vue + FiatConvertedAmount.vue; @nimiq/vue-components AmountInput + AmountWithFee + FiatAmount
- **Screenshots:** need it
- Auto-scaling NIM amount input with currency-flip (enter in fiat or NIM), max-button, and live conversion line. Foundational sub-widget for send/swap/staking/checkout — worth scaffolding once as a shared primitive since the wallet version is richer than the base vue-components one.
- **Built from:** `wallet/src/components/AmountInput.vue`, `AmountMenu.vue`, `FiatConvertedAmount.vue`, `@nimiq/vue-components AmountWithFee`, `@nimiq/utils CurrencyInfo + FiatApi`

### Network consensus indicator + network map
- **Where:** wallet.nimiq.com network view — upstream/wallet/src/components/ConsensusIcon.vue, NetworkStats.vue, NetworkMap.vue, NetworkMapPeerList.vue, modals/NetworkInfoModal.vue
- **Screenshots:** need it
- Two tiers: (a) ConsensusIcon — small animated connecting/syncing/established indicator every light-client app should show (pairs with @nimiq/core web client); (b) the full maplibre world NetworkMap with peer list + NetworkStats (uses nimiq-ui packages/nimiq-maplibre-styles). Scaffold (a) as high-value default, (b) as optional showpiece.
- **Built from:** `wallet/src/components/ConsensusIcon.vue`, `NetworkStats.vue`, `NetworkMap.vue`, `NetworkMapPeerList.vue`, `nimiq-ui/packages/nimiq-maplibre-styles`, `stores/Network.ts`

## Low priority

### Price chart / portfolio balance distribution
- **Where:** wallet.nimiq.com sidebar — upstream/wallet/src/components/PriceChart.vue, LineChart.vue, BalanceDistribution.vue, AccountBalance.vue
- **Screenshots:** have it (left sidebar in nimiq-wallet-app/Screenshot ...9.41.06 PM.png and wallet.nimiq.com-desktop.png)
- Sidebar sparkline price charts (NIM/BTC with 24h delta) and the BalanceDistribution bar splitting portfolio across currencies/addresses. Nice-to-have dashboard garnish; visible in held wallet screenshots.
- **Built from:** `wallet/src/components/PriceChart.vue`, `LineChart.vue`, `BalanceDistribution.vue`, `AccountBalance.vue`, `stores/Fiat.ts`

### Fee selector
- **Where:** upstream/wallet/src/components/FeeSelector.vue (used in BTC send flow; SendModalFooter for NIM)
- **Screenshots:** need it
- Free/standard/express SelectBar with live fee-in-fiat preview. Marginal for NIM (fees ~0, mostly hidden) — really only matters for BTC sends, so low priority for a Nimiq-branding CLI.
- **Built from:** `wallet/src/components/FeeSelector.vue`, `@nimiq/vue-components SelectBar`, `lib/BitcoinTransactionUtils.ts estimateFees`

### Vote / governance UI
- **Where:** https://nimiq.com/vote — github.com/nimiq/vote (Vue + TypeScript + Pug, MIT)
- **Screenshots:** need it
- Community-decision app: choice ranking/weighting UI where vote weight = NIM balance, signed via Hub signMessage/transaction. Niche (only used for occasional community-wide decisions) and the repo is stylistically older (Stylus/Pug), so low priority unless the CLI targets DAO-ish use cases.
- **Built from:** `nimiq/vote repo (not cloned locally)`, `@nimiq/hub-api signTransaction/chooseAddress`

### Browser-wallet onboarding extras (welcome tour, backup nag, testnet faucet)
- **Where:** upstream/wallet/src/components/modals/WelcomeModal.vue, MigrationWelcomeModal.vue, BackupModal.vue (warning banner visible in screenshots), TestnetFaucet.vue, UpdateNotification.vue
- **Screenshots:** have it partially (backup warning banner + multisig promo modal in ...9.40.54 PM.png / ...9.41.06 PM.png)
- Supporting onboarding chrome around the wallet: first-run welcome/tour modal, persistent 'no forgot password — Backup' warning banner, release-notes/update notification, and a testnet faucet widget (handy for any Nimiq dev-demo app the CLI scaffolds). Individually small; bundle as an 'app shell extras' template.
- **Built from:** `wallet/src/components/modals/WelcomeModal.vue`, `modals/BackupModal.vue`, `TestnetFaucet.vue`, `UpdateNotification.vue`, `AnnouncementBox.vue`, `StatusScreen.vue`
