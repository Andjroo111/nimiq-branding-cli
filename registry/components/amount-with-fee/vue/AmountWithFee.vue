<template>
    <div class="amount-with-fee">
        <AmountInput
            class="value"
            v-model="liveAmount"
            :class="{ invalid: !isValid && liveAmount > 0 }"
            :currency="currency"
            :decimals="currencyDecimals"
            ref="amountInput"
        />
        <div class="fee-section nq-text-s">
            <div v-if="!isValid && liveAmount" class="nq-red">
                <slot name="insufficient-balance-error">{{ $t('Insufficient balance') }}</slot>
            </div>
            <div v-else>
                <span v-if="fiatAmount !== null && fiatAmount !== undefined && fiatCurrency" class="fiat">
                    ~<FiatAmount :amount="fiatAmount" :currency="fiatCurrency" />
                </span>
                <span v-if="modelValue.fee" class="fee">
                    + <Amount :amount="modelValue.fee" :minDecimals="0" :maxDecimals="currencyDecimals"
                        :currency="currency" :currencyDecimals="currencyDecimals" /> {{ $t('fee') }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AmountInput from './AmountInput.vue';
// Amount.vue comes from the 'amount' registry component, FiatAmount.vue from
// 'fiat-amount' — copy them next to this file (see meta.json dependsOn).
import Amount from './Amount.vue';
import FiatAmount from './FiatAmount.vue';

/**
 * Vue 3 port of @nimiq/vue-components AmountWithFee.
 * Upstream's v-model (`value` prop + `input` event) becomes `modelValue` +
 * `update:modelValue`. The I18nMixin $t is stubbed as identity.
 */

export interface AmountAndFee {
    amount: number;
    fee: number;
    isValid: boolean;
}

const props = withDefaults(defineProps<{
    modelValue?: AmountAndFee,
    /** Spendable balance in the currency's smallest unit. */
    availableBalance?: number,
    fiatAmount?: number | null,
    fiatCurrency?: string | null,
    currency?: string,
    currencyDecimals?: number,
}>(), {
    modelValue: () => ({ amount: 0, fee: 0, isValid: false }),
    availableBalance: 0,
    fiatAmount: null,
    fiatCurrency: null,
    currency: 'nim',
    currencyDecimals: 5,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: AmountAndFee): void,
}>();

// I18nMixin stub: identity translation.
const $t = (key: string) => key;

const liveAmount = ref(props.modelValue.amount);

const isValid = computed(() => liveAmount.value > 0
    && liveAmount.value + props.modelValue.fee <= props.availableBalance);

watch([liveAmount, isValid], () => {
    emit('update:modelValue', {
        amount: liveAmount.value,
        fee: props.modelValue.fee,
        isValid: isValid.value,
    });
}, { immediate: true });

const amountInput = ref<InstanceType<typeof AmountInput> | null>(null);

function focus() {
    amountInput.value?.focus();
}

defineExpose({ focus });
</script>

<style scoped>
    .amount-with-fee {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
    }

    .value {
        display: flex;
        align-items: baseline;
    }

    .amount-input :deep(input) {
        padding-top: 0;
        padding-bottom: 0;
    }

    .amount-input.invalid :deep(input),
    .amount-input.invalid :deep(.nim) {
        border-color: rgb(216, 65, 51, 0.2); /* Based on Nimiq Red */
        color: var(--nimiq-red) !important;
    }

    .fee-section {
        color: rgba(31, 35, 72, 0.5);
        min-height: 2rem;
    }

    .fiat {
        display: inline-flex;
    }
</style>
