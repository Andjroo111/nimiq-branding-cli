<template>
    <span class="fiat-amount">
        {{ currencyString }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    /** The fiat amount to display, e.g. 1234.56 */
    amount: number,
    /** ISO 4217 currency code, e.g. 'USD', 'EUR' */
    currency: string,
    /**
     * Maximum allowed relative deviation between the displayed (rounded) value and the
     * actual amount. Decimals get extended until the deviation is below this threshold.
     */
    maxRelativeDeviation?: number,
    /** Locale used for formatting, e.g. 'en-US'. Defaults to a currency-typical locale. */
    locale?: string,
    /** Hide all decimals. If set, takes precedence over maxRelativeDeviation. */
    hideDecimals?: boolean,
}>(), {
    maxRelativeDeviation: 0.1,
    hideDecimals: false,
});

const NUMBER_REGEX = /(-)?\D*(\d+)(\.(\d+))?/;
const DECIMAL_SEPARATOR_REGEX = /(\d)\D(\d)/;
const CURRENCY_CODE_REGEX = /[A-Z]{3}\s?/i;
const SYMBOL_TRAILING_ALPHA_REGEX = /[A-Z.]$/i;

// ---------------------------------------------------------------------------------------------
// Inlined from @nimiq/utils CurrencyInfo (only the parts FiatAmount uses: symbol + decimals).
// ---------------------------------------------------------------------------------------------

// Manually curated currency symbols for currencies where the browser's Intl symbol is unsuitable.
// For entries with two symbols, the second is the right-to-left variant.
const EXTRA_SYMBOLS: { [code: string]: string | [string, string] } = {
    AED: ['DH', 'د.إ'],
    AFN: ['Afs', '؋'],
    ALL: 'L',
    ANG: 'ƒ',
    AWG: 'ƒ',
    BGN: 'лв.',
    BHD: ['BD', '.د.ب'],
    BTN: 'Nu.',
    BYN: 'Br',
    CDF: 'Fr',
    CHF: 'Fr.',
    CVE: '$',
    DJF: 'Fr',
    DZD: ['DA', 'د.ج'],
    EGP: ['£', 'ج.م'],
    ETB: 'Br',
    HTG: 'G',
    IQD: ['ID', 'ع.د'],
    IRR: ['RI', '﷼'],
    JOD: ['JD', 'د.ا'],
    KES: 'Sh',
    KGS: '⃀',
    KWD: ['KD', 'د.ك'],
    LBP: ['LL', 'ل.ل'],
    LSL: 'M',
    LYD: ['LD', 'ل.د'],
    MAD: ['DH', 'درهم'],
    MDL: 'L',
    MKD: 'ден',
    MMK: 'Ks',
    MRU: 'UM',
    MVR: ['Rf', '.ރ'],
    MZN: 'MT',
    NPR: 'रु',
    OMR: ['R.O.', 'ر.ع.'],
    PAB: 'B/.',
    PEN: 'S/',
    PKR: '₨',
    QAR: ['QR', 'ر.ق'],
    RSD: 'дин.',
    SAR: ['SR', '﷼'],
    SDG: ['£SD', 'ج.س.'],
    SLE: 'Le',
    SOS: 'Sh.',
    TJS: 'SM',
    TMT: 'm',
    TND: ['DT', 'د.ت'],
    UZS: 'сум',
    VED: 'Bs.D',
    VES: 'Bs.S',
    WST: 'T',
    XPF: '₣',
    YER: ['RI', '﷼'],
};

// Currencies whose sub-units are effectively out of use, thus rendered without decimals.
const CUSTOM_DECIMAL_LESS_CURRENCIES = new Set([
    'AMD', 'AOA', 'ARS', 'BDT', 'BTN', 'CDF', 'COP', 'CRC', 'CVE', 'CZK', 'DOP', 'DZD',
    'GMD', 'GYD', 'HUF', 'IDR', 'INR', 'JMD', 'KES', 'KGS', 'KHR', 'KZT', 'LKR', 'MAD',
    'MKD', 'MNT', 'MOP', 'MWK', 'MXN', 'NGN', 'NOK', 'NPR', 'PHP', 'PKR', 'RUB', 'SEK',
    'TWD', 'TZS', 'UAH', 'UYU', 'UZS', 'VES',
]);

const RIGHT_TO_LEFT_DETECTION_REGEX = /[֑-߿יִ-﷽ﹰ-ﻼ]/;
const CURRENCY_INFO_NUMBER_REGEX = /\d+(?:\D(\d+))?/;

function failsafeNumberToLocaleString(
    value: number,
    locales?: string | string[],
    options?: Intl.NumberFormatOptions,
): string | null {
    try {
        return value.toLocaleString(locales, options);
    } catch (e) {
        return null;
    }
}

function getCurrencyInfo(currencyCode: string, requestedLocale?: string)
    : { symbol: string, decimals: number } {
    const code = currencyCode.toUpperCase();
    const currencyCountry = code.substring(0, 2);
    const formatterOptions: Intl.NumberFormatOptions & { numberingSystem: string } = {
        style: 'currency',
        currency: currencyCode,
        useGrouping: false,
        numberingSystem: 'latn',
    };

    // Resolved locale (used for the right-to-left decision below), as in CurrencyInfo.
    const localesToTry = [
        ...(requestedLocale ? [requestedLocale] : []),
        `${navigator.language.substring(0, 2)}-${currencyCountry}`,
        navigator.language,
        'en-US',
    ];
    const [resolvedLocale] = 'DisplayNames' in Intl
        ? (Intl as any).DisplayNames.supportedLocalesOf(localesToTry)
        : Intl.NumberFormat.supportedLocalesOf(localesToTry);

    // Symbol
    let symbol: string;
    let formattedString: string | null = null;
    const extraSymbol = EXTRA_SYMBOLS[code];
    if (typeof extraSymbol === 'string') {
        symbol = extraSymbol;
    } else if (Array.isArray(extraSymbol)) {
        // Use the right-to-left symbol only if a right-to-left locale was explicitly requested.
        let currencyName = '';
        if ('DisplayNames' in Intl) {
            try {
                currencyName = new (Intl as any).DisplayNames(resolvedLocale, { type: 'currency' })
                    .of(currencyCode) || '';
            } catch (e) { /* ignore */ }
        }
        const useRightToLeft = resolvedLocale === requestedLocale
            && RIGHT_TO_LEFT_DETECTION_REGEX.test(currencyName);
        symbol = extraSymbol[useRightToLeft ? 1 : 0];
    } else {
        const symbolLocalesToTry = [
            ...(requestedLocale ? [requestedLocale] : []),
            `en-${currencyCountry}`,
            'en',
        ];
        formattedString = failsafeNumberToLocaleString(
            0, symbolLocalesToTry, { currencyDisplay: 'narrowSymbol', ...formatterOptions },
        ) || failsafeNumberToLocaleString(
            0, symbolLocalesToTry, { currencyDisplay: 'symbol', ...formatterOptions },
        );
        symbol = formattedString
            ? formattedString.replace(CURRENCY_INFO_NUMBER_REGEX, '').trim()
            : code;
    }

    // Decimals
    let decimals: number;
    if (CUSTOM_DECIMAL_LESS_CURRENCIES.has(code)) {
        decimals = 0;
    } else {
        formattedString = formattedString
            || failsafeNumberToLocaleString(0, 'en', { currencyDisplay: 'code', ...formatterOptions });
        if (formattedString) {
            const numberMatch = formattedString.match(CURRENCY_INFO_NUMBER_REGEX);
            decimals = numberMatch ? (numberMatch[1] || '').length : 2;
        } else {
            decimals = 2;
        }
    }

    return { symbol, decimals };
}

// ---------------------------------------------------------------------------------------------
// Inlined from @nimiq/utils FormattableNumber: integer grouping (toString(true) on an
// integers-only string). Groups of 3 separated by narrow no-break space, only for >4 digits.
// ---------------------------------------------------------------------------------------------
function groupIntegers(integers: string): string {
    const trimmed = integers.replace(/^0+/, '') || '0';
    if (trimmed.length <= 4) return trimmed;
    return trimmed.replace(/(\d)(?=(\d{3})+$)/g, '$1\u202F');
}

function getPositioningLocale(currency: string): string {
    // Try to guess a locale which positions the currency symbol in a way typical for countries,
    // where the currency is used, e.g. 1.00€ for eur; $1.00 for usd.
    currency = currency.toLowerCase();
    switch (currency) {
        case 'eur':
        case 'chf':
            return 'de';
        case 'gbp':
        case 'usd':
            return 'en';
        case 'cny':
            return 'zh';
        default:
            // Country from the currency code, which is typically its first two letters.
            return currency.substr(0, 2);
    }
}

const currencyString = computed(() => {
    const positioningLocale = getPositioningLocale(props.currency);
    const currencyInfo = getCurrencyInfo(props.currency, props.locale || undefined);
    const formattingOptions = {
        style: 'currency' as const,
        currency: props.currency,
        currencyDisplay: 'code' as const, // replaced below by the optimized currency symbol
        useGrouping: false,
        numberingSystem: 'latn',
        minimumFractionDigits: props.hideDecimals ? 0 : currencyInfo.decimals,
        maximumFractionDigits: props.hideDecimals ? 0 : currencyInfo.decimals,
    };
    let formatted: string;
    let integers: string;
    let relativeDeviation: number;

    do {
        formatted = props.amount.toLocaleString([
            props.locale || positioningLocale,
            positioningLocale,
            `${navigator.language.substring(0, 2)}-${positioningLocale}`,
            navigator.language,
            `en-${positioningLocale}`,
            'en',
        ], formattingOptions)
            // Enforce a dot as decimal separator for consistency and parseFloat.
            .replace(DECIMAL_SEPARATOR_REGEX, '$1.$2');
        const regexMatch = formatted.match(NUMBER_REGEX)!;
        const [/* full match */, sign, /* integers */, decimalsIncludingSeparator] = regexMatch;
        integers = regexMatch[2];
        const formattedNumber = `${sign || ''}${integers}${decimalsIncludingSeparator || ''}`;
        relativeDeviation = Math.abs((props.amount - Number.parseFloat(formattedNumber)) / props.amount);

        const decimals = regexMatch[4];
        const nextDecimals = decimals ? decimals.length + 1 : 1;
        formattingOptions.minimumFractionDigits = nextDecimals;
        formattingOptions.maximumFractionDigits = nextDecimals;
    } while (relativeDeviation > props.maxRelativeDeviation
        && formattingOptions.minimumFractionDigits <= 20 // max for min/maximumFractionDigits
        && !props.hideDecimals
    );

    // Replace the currency code with our custom currency symbol.
    formatted = formatted.replace(CURRENCY_CODE_REGEX, (match, position) => {
        if (position !== 0 || !SYMBOL_TRAILING_ALPHA_REGEX.test(currencyInfo.symbol)) {
            // For trailing currency symbol or symbol not ending in a latin letter or dot, no
            // space, e.g.: 1.00 € (EUR), $1.00 (USD), R$1.00 (BRL), ₼1.00 (AZN)
            return currencyInfo.symbol;
        }
        // For leading currency symbol ending in a latin letter or dot, add a non-breaking
        // space, e.g. KM 1.00 (BAM), B/. 1.00 (PAB), лв. 1.00 (BGN), kr 1.00 (DKK)
        return `${currencyInfo.symbol}\u00A0`;
    });

    // apply integer grouping
    if (integers.length <= 4) return formatted;
    return formatted.replace(integers, groupIntegers(integers));
});
</script>

<!-- FiatAmount has no styles upstream; the span inherits font and color from its context. -->
