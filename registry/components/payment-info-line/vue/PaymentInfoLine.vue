<template>
    <div class="info-line" :class="{ 'inverse-theme': theme === Themes.INVERSE }">
        <div class="amounts"
            @mouseenter="priceTooltip && priceTooltip.show()"
            @mouseleave="priceTooltip && priceTooltip.hide()"
            @click="priceTooltip && Date.now() - lastTooltipToggle > 200 && priceTooltip.toggle()"
        >
            <Amount
                :currency="cryptoAmount.currency"
                :amount="cryptoAmount.amount"
                :currencyDecimals="cryptoAmount.decimals"
                :minDecimals="0"
                :maxDecimals="Math.min(4, cryptoAmount.decimals)"
            />
            <Tooltip ref="priceTooltip"
                v-if="fiatAmount"
                :container="container"
                preferredPosition="bottom left"
                :margin="{ left: 8 }"
                :styles="{
                    minWidth: '37rem',
                    padding: '2rem',
                    lineHeight: 1.3,
                }"
                :theme="theme"
                @show="onPriceTooltipToggle(true)"
                @hide="onPriceTooltipToggle(false)"
                @click.stop
                class="price-tooltip"
            >
                <template #trigger>
                    <!-- AlertTriangleIcon from @nimiq/style (only when the rate is bad) -->
                    <svg v-if="isBadRate" class="nq-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M6.94587 1.65772L1.10618 12.836C0.690903 13.631 1.26757 14.5832 2.16442 14.5832H13.8438C14.7406 14.5832 15.3173 13.631 14.902 12.836L9.06234 1.65772C8.6157 0.802744 7.39252 0.802745 6.94587 1.65772Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.00411 5.84846V8.51118" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8.00411" cy="11.4671" r="0.75" fill="currentColor"/></svg>
                    <FiatAmount :currency="fiatAmount.currency" :amount="fiatAmount.amount" />
                </template>
                <template #default>
                    <div class="price-breakdown">
                        <label>{{ $t('Order amount') }}</label>
                        <FiatAmount :currency="fiatAmount.currency" :amount="fiatAmount.amount" />
                        <template v-if="vendorMarkup || vendorMarkup === 0">
                            <label v-if="vendorMarkup >= 0">{{ $t('Vendor crypto markup') }}</label>
                            <label v-else>{{ $t('Vendor crypto discount') }}</label>
                            <div>{{ formattedVendorMarkup }}</div>
                        </template>
                        <label :class="{ 'nq-orange': isBadRate }">
                            {{ $t('Effective rate') }}
                        </label>
                        <div :class="{ 'nq-orange': isBadRate }">
                            <FiatAmount :currency="fiatAmount.currency" :amount="effectiveRate"
                                :maxRelativeDeviation=".0001"
                            />
                            / {{ cryptoAmount.currency.toUpperCase() }}
                        </div>
                    </div>
                    <div v-if="rateInfo"
                        :class="{ 'nq-orange': isBadRate }"
                        class="rate-info info"
                    >
                        {{ rateInfo }}
                    </div>
                    <div class="free-service-info info">{{ $t('Nimiq provides this service free of charge.') }}</div>
                    <hr>
                    <div class="total">
                        <label>{{ $t('Total') }}</label>
                        <Amount
                            :currency="cryptoAmount.currency"
                            :amount="cryptoAmount.amount"
                            :currencyDecimals="cryptoAmount.decimals"
                            :minDecimals="0"
                            :maxDecimals="Math.min(8, cryptoAmount.decimals)"
                            showApprox
                        />
                    </div>
                    <div v-if="networkFee === undefined || networkFee === null || Number(networkFee) !== 0"
                        class="network-fee-info info"
                    >
                        +
                        <template v-if="!isFormattedNetworkFeeZero">
                            <Amount
                                :currency="cryptoAmount.currency"
                                :amount="networkFee"
                                :currencyDecimals="cryptoAmount.decimals"
                                :minDecimals="0"
                                :maxDecimals="Math.min(6, cryptoAmount.decimals)"
                            /> {{ $t('suggested network fee') }}
                        </template>
                        <template v-else>{{ $t('network fee') }}</template>
                    </div>
                </template>
            </Tooltip>
        </div>
        <div class="arrow-runway">
            <!-- ArrowRightSmallIcon from @nimiq/style -->
            <svg width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" class="nq-icon"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <Account :address="address" :image="shopLogoUrl" :label="originDomain" />
        <Timer
            v-if="startTime && endTime"
            ref="timer"
            :startTime="startTime"
            :endTime="endTime"
            :theme="theme"
            :tooltipProps="{
                container,
                margin: { right: 8 },
            }"
        />
    </div>
</template>

<script setup lang="ts">
/**
 * Vue 3 port of @nimiq/vue-components PaymentInfoLine (the Hub checkout header).
 *
 * Porting notes:
 * - Account.vue and Timer.vue are minimal inline ports shipped next to this file
 *   (they are not standalone registry components).
 * - Amount.vue, FiatAmount.vue and Tooltip.vue come from the 'amount',
 *   'fiat-amount' and 'tooltip' registry components — copy them next to this file.
 * - AlertTriangleIcon / ArrowRightSmallIcon are inlined as raw SVG (class nq-icon).
 * - getExchangeRates comes from the real @nimiq/utils npm package (network call,
 *   used for the rate-deviation warning); failures are swallowed (no warning shown).
 * - Upstream's `:container="$parent"` (for tooltip positioning) became an explicit
 *   optional `container` prop, as Vue 3 script-setup discourages $parent access.
 * - The I18nMixin $t is stubbed as identity.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { getExchangeRates } from '@nimiq/utils';
import Account from './Account.vue';
import Timer from './Timer.vue';
import Amount from './Amount.vue';
import FiatAmount from './FiatAmount.vue';
import Tooltip from './Tooltip.vue';

export interface CryptoAmountInfo {
    amount: number | bigint; // in the smallest unit
    currency: string;
    decimals: number;
}

export interface FiatAmountInfo {
    amount: number; // in the base unit, e.g. Euro
    currency: string;
}

const Themes = { NORMAL: 'normal', INVERSE: 'inverse' } as const;

const FIAT_API_PROVIDER_URLS: Record<string, string> = {
    CoinGecko: 'coingecko.com',
    CryptoCompare: 'cryptocompare.com',
};

const REFERENCE_RATE_UPDATE_INTERVAL = 60000; // every minute
const RATE_DEVIATION_THRESHOLD = .1;

const props = withDefaults(defineProps<{
    cryptoAmount: CryptoAmountInfo,
    fiatAmount?: FiatAmountInfo,
    fiatApiProvider?: 'CoinGecko' | 'CryptoCompare',
    /** Vendor crypto markup as a fraction (>= -1), e.g. .05 for +5%. */
    vendorMarkup?: number,
    networkFee?: number | bigint,
    origin: string,
    address?: string,
    shopLogoUrl?: string,
    startTime?: number,
    endTime?: number,
    theme?: 'normal' | 'inverse',
    /** Container for tooltip positioning (upstream passed $parent). */
    container?: { $el: HTMLElement },
}>(), {
    fiatApiProvider: 'CoinGecko',
    theme: 'normal',
});

// I18nMixin stub: identity translation with variable interpolation.
const $t = (key: string, vars?: Record<string, unknown>) => !vars
    ? key
    : key.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));

const priceTooltip = ref<InstanceType<typeof Tooltip> | null>(null);
const timer = ref<InstanceType<typeof Timer> | null>(null);
const referenceRate = ref<number | null>(null);
let referenceRateUpdateTimeout = -1;
const lastTooltipToggle = ref(-1);

const originDomain = computed(() => props.origin.split('://')[1]);

const effectiveRate = computed(() => {
    if (!props.fiatAmount) return null;
    // Fiat/crypto rate. Higher fiat/crypto rate means user is paying less crypto for the requested fiat amount
    // and is therefore better for the user. Note: precision loss should be acceptable here.
    return props.fiatAmount.amount / (Number(props.cryptoAmount.amount) / (10 ** props.cryptoAmount.decimals));
});

const formattedVendorMarkup = computed(() => {
    if (typeof props.vendorMarkup !== 'number') return null;
    // Convert to percent and round to two decimals. Always ceil to avoid displaying a lower fee than charged or
    // larger discount than applied. Subtract a small epsilon to avoid that numbers get rounded up as a result of
    // floating point imprecision after multiplication.
    return `${props.vendorMarkup >= 0 ? '+' : ''}${Math.ceil(props.vendorMarkup * 100 * 100 - 1e-10) / 100}%`;
});

const isFormattedNetworkFeeZero = computed(() => {
    if (props.networkFee === null || props.networkFee === undefined) return true;
    const networkFeeBaseCurrency = Number(props.networkFee) / (10 ** props.cryptoAmount.decimals);
    const maxDecimals = Math.min(6, props.cryptoAmount.decimals);
    const roundingFactor = 10 ** maxDecimals;
    return Math.round(networkFeeBaseCurrency * roundingFactor) / roundingFactor === 0;
});

const rateDeviation = computed(() => {
    // Compare rates. Convert them from fiat/crypto to crypto/fiat as the user will be paying crypto in the end and
    // the flipped rates can therefore be compared more intuitively. Negative rate deviation is better for the user.
    if (effectiveRate.value === null || referenceRate.value === null) return null;
    const flippedEffectiveRate = 1 / effectiveRate.value;
    const flippedReferenceRate = 1 / referenceRate.value;
    return (flippedEffectiveRate - flippedReferenceRate) / flippedReferenceRate;
});

const isBadRate = computed(() => {
    if (rateDeviation.value === null) return false;
    return rateDeviation.value >= RATE_DEVIATION_THRESHOLD
        || !!(props.vendorMarkup
            && props.vendorMarkup < 0 // verify promised discount
            && rateDeviation.value >= props.vendorMarkup + RATE_DEVIATION_THRESHOLD
        );
});

const formattedRateDeviation = computed(() => {
    if (rateDeviation.value === null) return null;
    // Converted to absolute percent, rounded to one decimal
    return `${Math.round(Math.abs(rateDeviation.value) * 100 * 10) / 10}%`;
});

const rateInfo = computed(() => {
    if (rateDeviation.value === null
        || (Math.abs(rateDeviation.value) < RATE_DEVIATION_THRESHOLD && !isBadRate.value)) {
        return null;
    }
    const translationVariables = {
        formattedRateDeviation: formattedRateDeviation.value,
        provider: FIAT_API_PROVIDER_URLS[props.fiatApiProvider],
    };
    if (rateDeviation.value < 0 && isBadRate.value) {
        // False discount
        return $t(
            'Your actual discount is approx. {formattedRateDeviation} compared '
            + 'to the current market rate ({provider}).',
            translationVariables,
        );
    }
    if (rateDeviation.value > 0) {
        return $t(
            'You are paying approx. {formattedRateDeviation} more '
            + 'than at the current market rate ({provider}).',
            translationVariables,
        );
    }
    return $t(
        'You are paying approx. {formattedRateDeviation} less '
        + 'than at the current market rate ({provider}).',
        translationVariables,
    );
});

async function updateReferenceRate() {
    window.clearTimeout(referenceRateUpdateTimeout);
    const cryptoCurrency = props.cryptoAmount.currency.toLowerCase();
    const fiatCurrency = props.fiatAmount?.currency.toLowerCase();
    if (!props.fiatAmount || !fiatCurrency) {
        referenceRate.value = null;
        return;
    }
    try {
        const { [cryptoCurrency]: { [fiatCurrency]: rate } } = await getExchangeRates(
            [cryptoCurrency as any], [fiatCurrency as any], props.fiatApiProvider as any);
        referenceRate.value = rate || null;
    } catch (e) {
        referenceRate.value = null; // unsupported currency or network failure: show no rate warning
    }

    referenceRateUpdateTimeout = window.setTimeout(updateReferenceRate, REFERENCE_RATE_UPDATE_INTERVAL);
}

watch([() => props.cryptoAmount.currency, () => props.fiatAmount?.currency], updateReferenceRate,
    { immediate: true });

onBeforeUnmount(() => window.clearTimeout(referenceRateUpdateTimeout));

async function setTime(time: number) {
    await nextTick(); // let vue update in case the timer was just added
    if (!timer.value) return;
    timer.value.synchronize(time);
}

function onPriceTooltipToggle(isShow: boolean) {
    lastTooltipToggle.value = Date.now(); // record last toggle to avoid second toggle on click just after mouseover
    if (!isShow) return;
    updateReferenceRate();
}

defineExpose({ setTime });
</script>

<style scoped>
    .info-line {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
        margin: 1.75rem 2.5rem 1rem 2.375rem;
        flex-shrink: 0;
        font-size: 2rem;
        line-height: 1.5;
        font-weight: normal;
    }

    .amounts {
        display: flex;
        flex-direction: column;
        margin-bottom: .125rem;
        cursor: default;
    }

    .amounts > .amount {
        color: var(--nimiq-light-blue);
        font-weight: bold;
    }

    .inverse-theme .amounts > .amount {
        color: var(--nimiq-light-blue-on-dark, var(--nimiq-light-blue));
    }

    .amounts .trigger .nq-icon {
        font-size: 1.625rem;
        color: var(--nimiq-orange);
        vertical-align: middle;
    }

    .amounts .trigger .fiat-amount {
        margin-top: .25rem;
        color: var(--nimiq-blue);
        font-size: 1.625rem;
        line-height: 1;
        font-weight: 600;
        opacity: .6;
    }

    .price-tooltip label {
        font-weight: normal;
    }

    .price-tooltip .price-breakdown {
        display: grid;
        grid-template-columns: 1fr auto;
        column-gap: 2rem;
        row-gap: 1.5rem;
        white-space: nowrap;
    }

    .price-tooltip .price-breakdown label + * {
        justify-self: end;
    }

    .price-tooltip .info {
        font-size: 1.625rem;
        opacity: .5;
    }

    .price-tooltip .rate-info {
        margin-top: .5rem;
    }

    .price-tooltip .rate-info.nq-orange {
        opacity: 1;
    }

    .price-tooltip .free-service-info {
        margin-top: 1.5rem;
        color: var(--nimiq-green);
        opacity: 1;
    }

    .price-tooltip hr {
        margin: 2rem -1rem 1.5rem;
        border: unset;
        border-top: 1px solid currentColor;
        opacity: .2;
    }

    .price-tooltip .total {
        /* The total row is on purpose not part of the grid as the label is shorter and the value longer */
        display: flex;
        justify-content: space-between;
    }

    .price-tooltip .total .amount {
        font-weight: bold;
    }

    .price-tooltip .network-fee-info {
        margin-top: .5rem;
        margin-bottom: -.25rem;
        text-align: right;
        white-space: nowrap;
    }

    .arrow-runway {
        flex-grow: 1;
        min-width: 3rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .arrow-runway .nq-icon {
        opacity: 0;
        font-size: 2rem;
        animation: arrow-shooting 2.7s cubic-bezier(.2,.5,.75,.5) infinite;
    }

    @keyframes arrow-shooting {
        0%   { transform: translate3D(-3.5rem, 0, 0); }
        15%  { transform: translate3D(-3.5rem, 0, 0); opacity: 0; }
        30%  { opacity: .2; }
        70%  { opacity: .2; }
        85%  { transform: translate3D(3rem, 0, 0); opacity: 0; }
        100% { transform: translate3D(3rem, 0, 0); }
    }

    .account {
        padding: 0;
        width: auto !important;
        flex-shrink: 1;
    }

    .account :deep(.identicon) {
        min-width: unset;
        width: 3.375rem;
        height: 3.375rem;
        margin-right: 0;
    }

    .account :deep(.account-image) {
        border-radius: .5rem;
        width: 3rem;
        height: 3rem;
        margin-top: 0;
        margin-bottom: 0;
    }

    .account :deep(.label) {
        padding-left: .75rem;
        margin-bottom: .25rem;
        font-weight: unset;
        opacity: 1 !important;
        /* Remove gradient-fade-out and use text-overflow instead */
        mask-image: unset;
        white-space: nowrap;
        text-overflow: fade;
    }

    .timer {
        margin: auto -.5rem auto 1rem;
        flex-shrink: 0;
    }

    .inverse-theme .amounts .trigger .fiat-amount,
    .inverse-theme .arrow-runway .nq-icon,
    .inverse-theme .account :deep(.label) {
        color: white;
    }
</style>
