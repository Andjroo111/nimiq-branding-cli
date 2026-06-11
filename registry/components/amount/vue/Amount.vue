<template>
    <span class="amount" :class="{ approx: showApprox && isApprox }">
        {{ formattedAmount }}
        <span class="currency" :class="currency">{{ ticker }}</span>
    </span>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

/**
 * Vue 3 port of @nimiq/vue-components Amount.
 * FormattableNumber from @nimiq/utils is inlined below (faithful mini-port).
 */

export type AmountValue = number | bigint | { toString(): string };

export function amountValidator(value: unknown): boolean {
    return typeof value === 'number' || typeof value === 'bigint'
        || !!(value && (value as object).constructor
            && (value as object).constructor.name.endsWith('Integer'));
}

const props = withDefaults(defineProps<{
    /** Amount in the currency's smallest unit (e.g. luna). */
    amount: AmountValue,
    /** If set, takes precedence over minDecimals and maxDecimals. */
    decimals?: number,
    minDecimals?: number,
    maxDecimals?: number,
    showApprox?: boolean,
    currency?: string,
    currencyDecimals?: number,
}>(), {
    minDecimals: 2,
    maxDecimals: 5,
    showApprox: false,
    currency: 'nim',
    currencyDecimals: 5,
});

// --- Inlined mini-port of @nimiq/utils FormattableNumber -------------------
// Formats and converts numbers without precision loss (string based).
const NUMBER_REGEX = /^(-?)(\d*)\.?(\d*)(e(-?\d+))?$/;

class FormattableNumber {
    private _digits: string;
    private _decimalSeparatorPosition: number;
    private _sign: string;

    constructor(value: AmountValue | string) {
        const str = typeof value === 'string' ? value : value.toString();
        const numberMatch = str.match(NUMBER_REGEX);
        if (!numberMatch) throw new Error(`${str} is not a valid number`);
        this._sign = numberMatch[1];
        this._digits = `${numberMatch[2]}${numberMatch[3]}`;
        if (!this._digits) throw new Error(`${str} is not a valid number`);
        this._decimalSeparatorPosition = numberMatch[2].length;
        const exponent = Number.parseInt(numberMatch[5], 10);
        if (exponent) this.moveDecimalSeparator(exponent); // remove scientific notation
    }

    public toString(options: {
        maxDecimals?: number,
        minDecimals?: number,
        useGrouping?: boolean,
        groupSeparator?: string,
    } = {}): string {
        let { maxDecimals, minDecimals } = options;
        const { useGrouping = false, groupSeparator = '\u202F' } = options;
        if (maxDecimals !== undefined && minDecimals !== undefined) {
            minDecimals = Math.min(minDecimals, maxDecimals);
        }
        if (maxDecimals !== undefined
            && maxDecimals < this._digits.length - this._decimalSeparatorPosition) {
            this.round(maxDecimals);
        }
        let integers = this._digits.slice(0, this._decimalSeparatorPosition).replace(/^0+/, '');
        let decimals = this._digits.slice(this._decimalSeparatorPosition).replace(/0+$/, '');
        if (minDecimals !== undefined && minDecimals > decimals.length) {
            decimals = decimals.padEnd(minDecimals, '0');
        }
        // Apply grouping for values with more than 4 integer digits.
        if (useGrouping && groupSeparator && integers.length > 4) {
            integers = integers.replace(/(\d)(?=(\d{3})+$)/g, `$1${groupSeparator}`);
        }
        return `${this._sign}${integers || '0'}${decimals ? `.${decimals}` : ''}`;
    }

    public moveDecimalSeparator(moveBy: number): this {
        this._decimalSeparatorPosition += moveBy;
        if (this._decimalSeparatorPosition > this._digits.length) {
            this._digits = this._digits.padEnd(this._decimalSeparatorPosition, '0');
        } else if (this._decimalSeparatorPosition < 0) {
            this._digits = this._digits.padStart(
                this._digits.length - this._decimalSeparatorPosition, '0');
            this._decimalSeparatorPosition = 0;
        }
        return this;
    }

    public round(decimals: number): this {
        if (this._digits.length - this._decimalSeparatorPosition <= decimals) return this;
        const firstCutOffIndex = this._decimalSeparatorPosition + decimals;
        const digitsToKeep = this._digits
            .substring(0, firstCutOffIndex)
            .padEnd(this._decimalSeparatorPosition, '0');
        if (Number.parseInt(this._digits[firstCutOffIndex], 10) < 5) {
            this._digits = digitsToKeep;
            return this;
        }
        // Round up.
        const digits = `0${digitsToKeep}`.split(''); // leading 0 for easier carry handling
        for (let i = firstCutOffIndex; i >= 0; --i) {
            const newDigit = Number.parseInt(digits[i], 10) + 1;
            if (newDigit < 10) {
                digits[i] = newDigit.toString();
                break;
            }
            digits[i] = '0'; // continue loop to handle carry over
        }
        this._digits = digits.join('');
        this._decimalSeparatorPosition += 1; // account for the added leading 0
        return this;
    }

    public equals(other: string): boolean {
        try {
            return this.toString() === new FormattableNumber(other).toString();
        } catch (e) {
            return false;
        }
    }
}
// ---------------------------------------------------------------------------

watch(
    () => [props.minDecimals, props.maxDecimals, props.decimals],
    () => {
        for (const decimals of [props.minDecimals, props.maxDecimals, props.decimals]) {
            if (props.decimals !== undefined && decimals !== props.decimals) {
                // skip validation for minDecimals/maxDecimals if overwritten by decimals
                continue;
            }
            if (
                decimals !== undefined && (
                    decimals < 0
                    || decimals > props.currencyDecimals
                    || !Number.isInteger(decimals)
                )
            ) {
                throw new Error('Amount: decimals is not in range');
            }
        }
    },
    { immediate: true },
);

const formattedAmount = computed(() => {
    let minDecimals: number;
    let maxDecimals: number;
    if (typeof props.decimals === 'number') {
        minDecimals = props.decimals;
        maxDecimals = props.decimals;
    } else {
        minDecimals = props.minDecimals;
        maxDecimals = props.maxDecimals;
    }

    return new FormattableNumber(props.amount).moveDecimalSeparator(-props.currencyDecimals)
        .toString({ maxDecimals, minDecimals, useGrouping: true });
});

const isApprox = computed(() => !new FormattableNumber(props.amount)
    .moveDecimalSeparator(-props.currencyDecimals)
    .equals(formattedAmount.value.replace(/\s/g, '')));

const ticker = computed(() => {
    if (props.currency === 'tnim') return 'tNIM';

    if (props.currency === 'mbtc') return 'mBTC';
    if (props.currency === 'tbtc') return 'tBTC';

    if (props.currency === 'usdc.e') return 'USDC.e';

    return props.currency.toUpperCase();
});
</script>

<style scoped>
    .amount {
        white-space: nowrap;
    }

    .amount.approx::before {
        content: '~ ';
        opacity: 0.5;
    }
</style>
