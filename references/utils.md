# @nimiq/utils API reference

**Version documented: 0.12.4** (npm `latest` as of 2026-07-10, published 2025-05-15).
Verified against the published tarball (`npm pack @nimiq/utils@0.12.4`, `dist/*.mjs` +
`.d.ts`) and github.com/nimiq/nimiq-utils (tag commit `1f44fb5`). The wallet pins
`@nimiq/utils: ^0.12.1` (`upstream/wallet/package.json:39`). Every example output below
was executed against the real 0.12.4 dist, not transcribed from docs.

Install / import:

```js
// npm
import { FormattableNumber, ValidationUtils } from '@nimiq/utils';
// per-module subpaths keep bundles small
import { ValidationUtils } from '@nimiq/utils/validation-utils';
// browser, no build step (the published dist has zero runtime deps and no bare imports)
import { FormattableNumber } from 'https://cdn.jsdelivr.net/npm/@nimiq/utils@0.12.4/dist/main.mjs';
```

Live playground: `references/utils-demo.html` (pinned to 0.12.4).

## FormattableNumber (loss-less amounts)

String-based number handling with no floating-point loss. This is what the wallet's
`<Amount>` uses under the hood (our registry `amount` component inlines a mini-port of it).

```ts
new FormattableNumber(value: string | number | bigint | BigInteger)

.toString(options?: {
    maxDecimals?: number,      // rounds half-up past this
    minDecimals?: number,      // pads with zeros up to this
    useGrouping?: boolean,     // group integer digits in threes
    groupSeparator?: string,   // default ' ' narrow no-break space
} | useGrouping?: boolean): string

.valueOf(): string             // same as toString() with no options
.moveDecimalSeparator(moveBy: number): this   // luna to NIM: moveBy -5
.round(decimals: number): this // half-up, in place
.equals(other: any): boolean

toNonScientificNumberString(value)  // '2e-7' to '0.0000002', standalone helper
```

Gotchas, verified in source: grouping only kicks in when there are MORE than 4 integer
digits, and the default separator is U+202F (narrow no-break space), not a comma.

```js
new FormattableNumber('1234567.891234').toString({ maxDecimals: 4, useGrouping: true })
// '1 234 567.8912'  (those are U+202F separators)
new FormattableNumber(123456789n).moveDecimalSeparator(-5).toString({ minDecimals: 2 })
// '1234.56789'  (luna to NIM: only 4 integer digits, so no grouping)
```

## ValidationUtils (address checks)

```ts
ValidationUtils.isValidAddress(address: string): boolean   // never throws
ValidationUtils.normalizeAddress(address: string): string  // uppercases, strips space/+/-/%20, re-chunks in 4s
ValidationUtils.isUserFriendlyAddress(str: string): void   // throws with the specific reason
ValidationUtils.isValidHash(hash: string): boolean         // base64, decodes to 32 bytes
ValidationUtils.NIMIQ_ALPHABET                             // '0123456789ABCDEFGHJKLMNPQRSTUVXY'
```

A valid user-friendly address starts with `NQ`, is 36 chars ignoring spaces, uses only
`NIMIQ_ALPHABET` chars (base32 without I, O, W, Z), and passes the IBAN mod-97 checksum.

```js
ValidationUtils.isValidAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 0000') // true (burn address)
ValidationUtils.isValidAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 0001') // false (checksum)
```

Note: `normalizeAddress` chunks from the RIGHT (its regex is end-anchored), so only feed
it full 36-char addresses; partial input gets odd leading groups.

## RequestLinkEncoding (payment links)

Multi-currency: `Currency` enum is `nim | btc | eth | matic | usdc | usdt`. NIM link
types: `NimiqRequestLinkType.SAFE` (`https://.../#_request/...`), `.URI` (`nimiq:`),
`.WEBURI` (`web+nim:`).

```ts
createRequestLink(recipient: string, options: GeneralRequestLinkOptions): string
// NIM options: { currency: Currency.NIM, amount?, message?, label?, basePath?, type? }
//   amount is in LUNA (1 NIM = 1e5 luna). message max 64 UTF-8 bytes.
//   basePath defaults to window.location.host in browsers, 'wallet.nimiq.com' otherwise.
// BTC options: { currency: Currency.BTC, amount?, fee?, label?, message? }  (satoshi)
// ETH/MATIC/USDC/USDT: { currency, amount?, gasPrice?, gasLimit?, chainId?, contractAddress? }

// legacy positional form, still supported, NIM only: amount here is in whole NIM
createRequestLink(recipient, amount?: number, message?: string, basePath?: string)

parseRequestLink<C extends Currency>(requestLink: string | URL, options?: {
    currencies?: C[],
    isValidAddress?, normalizeAddress?,            // per-currency hooks for BTC/ETH
    expectedNimiqSafeRequestLinkBasePath?: string,
}): null | ParsedRequestLink   // { recipient, currency, amount?, message?, ... }
```

Per-currency helpers are also exported: `createNimiqRequestLink`,
`parseNimiqSafeRequestLink`, `parseNimiqUriRequestLink`, `createBitcoinRequestLink`,
`parseBitcoinRequestLink`, `createEthereumRequestLink`, `parseEthereumRequestLink`, plus
`EthereumChain`, `ETHEREUM_SUPPORTED_CONTRACTS` (USDC/USDT contract addresses per chain).

```js
createRequestLink('NQ07 0000 0000 0000 0000 0000 0000 0000 0000', {
    currency: Currency.NIM, amount: 12.5e5, message: 'Coffee', basePath: 'https://wallet.nimiq.com',
})
// 'https://wallet.nimiq.com/#_request/NQ0700000000000000000000000000000000/12.5/Coffee_'

createRequestLink('NQ07 0000 ...', { currency: Currency.NIM, amount: 12.5e5, message: 'Coffee', type: NimiqRequestLinkType.URI })
// 'nimiq:NQ0700000000000000000000000000000000?amount=12.5&message=Coffee'

parseRequestLink('nimiq:NQ0700...?amount=12.5&message=Coffee', { currencies: [Currency.NIM] })
// { recipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000', amount: 1250000, message: 'Coffee', currency: 'nim' }
```

## CurrencyInfo (fiat metadata)

Readonly instance fields: `code`, `symbol`, `name`, `decimals`, `locale`. Name and symbol
resolve via `Intl` for the locale (with a curated `EXTRA_SYMBOLS` table for currencies
the browser renders poorly), decimals via `Intl.NumberFormat` plus a custom
decimal-less list.

```ts
new CurrencyInfo(currencyCode: string)                       // auto locale
new CurrencyInfo(currencyCode: string, locale: string)
new CurrencyInfo(currencyCode: string, decimals?: number, name?: string, symbol?: string)
new CurrencyInfo(currencyCode: string, { decimals?, name?, symbol?, locale? })
```

```js
const eur = new CurrencyInfo('EUR'); // { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, locale: 'en-EU' }
const jpy = new CurrencyInfo('JPY'); // { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, locale: 'en-JP' }
```

## Clipboard

```ts
Clipboard.copy(text: string): boolean   // true on success
```

Synchronous, no permission prompt: appends an off-screen readonly textarea, selects it,
`document.execCommand('copy')`, removes it, then restores the previous focus and text
selection. Returns false outside a DOM. The wallet shows its 'Copied' tooltip for 800 ms
after a successful copy (see registry `copyable` notes).

## Tweenable (JS value animation)

```ts
new Tweenable(targetValue = 0, startValue = targetValue, tweenTime = 0,
              startTime = Date.now(), easing = Tweenable.Easing.EASE_IN_OUT_CUBIC)

.tweenTo(targetValue: number, tweenTime? /* keeps current */): void
.currentValue: number    // eased, computed from Date.now()
.progress: number        // 0..1 (1 when tweenTime is 0)
.finished: boolean       // progress === 1
Tweenable.Easing.LINEAR | Tweenable.Easing.EASE_IN_OUT_CUBIC
```

Poll `currentValue` from a `requestAnimationFrame` loop until `finished`; retargeting
mid-tween starts from the current eased value. The wallet uses it to tween its Timer
radius on hover.

```js
const t = new Tweenable(0);
t.tweenTo(1000, 300); // animate to 1000 over 300ms
(function loop() { render(t.currentValue); if (!t.finished) requestAnimationFrame(loop); })();
```

## Also in the box

Main entry also exports: `AddressBook` (known-address labels), `BrowserDetection`,
`Cookie`, FiatApi (`getExchangeRates`, `getHistoricExchangeRates`, `CryptoCurrency`,
`FiatCurrency`, `Provider`, `RateType`, ...), `RateLimitScheduler`, `Utf8Tools`
(`stringToUtf8ByteArray`, `truncateToUtf8ByteLength`, ...). Subpath-only modules (NOT in
the main entry): `@nimiq/utils/rewards-calculator`, `@nimiq/utils/supply-calculator`,
`@nimiq/utils/albatross-policy`.

## API drift

This registry's meta notes pin their inlined helpers to `@nimiq/utils@0.11.1`
(`registry/components/identicon/meta.json`, `account-list/AccountList.vue`), a 2024-04
vintage whose package layout (`dist/module/main.js`) and parts of its API no longer
exist upstream. The 0.12.0 rebuild (2024-12) moved to the `dist/main.mjs` + subpath
exports layout documented here. The inlined ports themselves (ValidationUtils,
FormattableNumber, Clipboard) still match 0.12.4 behavior, so no registry change is
needed. To re-check this document: `npm view @nimiq/utils version`, then diff the new
tarball's `dist/*.d.ts` against these signatures. Heads-up: nimiq-utils master already
carries unreleased changes past 0.12.4 (Bitcoin address sanitization in
RequestLinkEncoding, Utf8Tools TextEncoder fallback removal, FiatApi endpoint updates),
so re-verify on the next npm release.
