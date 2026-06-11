<template>
    <div class="amount-input" :class="{ 'has-value': valueInLuna > 0, 'focussed': isFocussed }">
        <form class="label-input" @submit.prevent ref="fullWidth">
            <span class="width-finder width-placeholder" ref="widthPlaceholder">{{ placeholder }}</span>
            <div v-if="maxFontSize" class="full-width" :class="{ 'width-finder': maxWidth > 0 }">Width</div>
            <span class="width-finder width-value" ref="widthValue">{{ formattedValue || '' }}</span>
            <input type="text" inputmode="decimal" class="nq-input" :class="{ vanishing }"
                :placeholder="placeholder"
                :style="{ width: `${width}px`, fontSize: `${fontSize}rem` }"
                :value="formattedValue"
                @input="onInput(($event.target as HTMLInputElement).value)"
                @focus="isFocussed = true" @blur="isFocussed = false"
                ref="input">
        </form>
        <span class="nim" :class="currency">{{ ticker }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

/**
 * Vue 3 port of @nimiq/vue-components AmountInput.
 * v-model carries the value in the currency's smallest unit (luna for NIM).
 * The input auto-sizes to its content via the hidden width-finder spans and
 * shrinks the font once the value exceeds the available width.
 */

const props = withDefaults(defineProps<{
    modelValue?: number,
    maxFontSize?: number,
    placeholder?: string,
    vanishing?: boolean,
    /** Decimals of the currency's smallest unit (5 for NIM/luna). */
    decimals?: number,
    currency?: string,
}>(), {
    maxFontSize: 8,
    placeholder: '0',
    vanishing: false,
    decimals: 5,
    currency: 'nim',
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void,
}>();

const fullWidth = ref<HTMLFormElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const widthPlaceholder = ref<HTMLSpanElement | null>(null);
const widthValue = ref<HTMLSpanElement | null>(null);

const liveValue = ref('');
let lastEmittedValue = 0;
const width = ref(50);
const fontSize = ref(props.maxFontSize);
const maxWidth = ref(0);
const valueInLuna = ref(0);
const isFocussed = ref(false);

onMounted(() => {
    if (props.maxFontSize && fullWidth.value) {
        maxWidth.value = fullWidth.value.offsetWidth;
    }
});

function focus() {
    input.value?.focus();
}
defineExpose({ focus });

const formattedValue = computed(() => liveValue.value);

function onInput(value: string) {
    if (!value) {
        liveValue.value = '';
        lastEmittedValue = 0;
        valueInLuna.value = 0;
        emit('update:modelValue', valueInLuna.value);
        return;
    }

    value = value.replace(/\,/, '.');
    const regExp = new RegExp(`(\\d*)(\\.(\\d{0,${props.decimals}}))?`, 'g'); // Backslashes are escaped
    const regExpResult = regExp.exec(value)!;
    if (regExpResult[1] || regExpResult[2]) {
        liveValue.value = `${regExpResult[1] ? regExpResult[1] : '0'}${regExpResult[2] ? regExpResult[2] : ''}`;
        valueInLuna.value = Number(
            `${regExpResult[1]}${(regExpResult[2] ? regExpResult[3] : '').padEnd(props.decimals, '0')}`,
        );
    }

    if (lastEmittedValue !== valueInLuna.value) {
        emit('update:modelValue', valueInLuna.value);
        lastEmittedValue = valueInLuna.value;
    }
}

watch(() => props.modelValue, (newValue) => {
    if (newValue === valueInLuna.value || newValue === undefined) return;
    lastEmittedValue = newValue || 0;
    liveValue.value = newValue ? (newValue / Math.pow(10, props.decimals)).toString() : '';
    valueInLuna.value = newValue || 0;
}, { immediate: true });

watch(liveValue, async () => {
    await nextTick(); // Await updated DOM
    if (!widthPlaceholder.value || !widthValue.value) return;

    const placeholderWidth = widthPlaceholder.value.offsetWidth;
    const valueWidth = widthValue.value.offsetWidth;
    const fontSizeFactor = Math.min(1.0, Math.max(maxWidth.value / valueWidth, 1 / props.maxFontSize));

    fontSize.value = fontSizeFactor * props.maxFontSize;
    width.value = (formattedValue.value ? (fontSizeFactor === 1 ? valueWidth : maxWidth.value) : placeholderWidth);
}, { immediate: true });

const ticker = computed(() => {
    if (props.currency === 'tnim') return 'tNIM';
    if (props.currency === 'mbtc') return 'mBTC';
    if (props.currency === 'tbtc') return 'tBTC';
    if (props.currency === 'usdc.e') return 'USDC.e';
    return props.currency.toUpperCase();
});
</script>

<style scoped>
    .label-input {
        position: relative;
        overflow: hidden; /* limit width-finder width to parent available width */
        max-width: 100%;
        height: 100%;
    }

    .width-finder {
        position: absolute;
        color: transparent;
        pointer-events: none;
        user-select: none;
        white-space: pre;
        padding: 1.25rem;
    }

    input {
        padding: 0 0.25rem;
        max-width: 100%;
        text-align: center;
        transition: width 50ms ease-out, color .2s var(--nimiq-ease);
    }

    .full-width {
        width: 1000px;
    }

    .amount-input {
        display: flex;
        align-items: baseline;
        justify-content: center;
        width: 100%;
        font-size: 8rem;
        color: rgba(31, 35, 72, 0.5); /* Based on Nimiq Blue */
        transition: color .2s var(--nimiq-ease);
    }

    .amount-input.has-value {
        color: var(--nimiq-blue);
    }

    .amount-input.focussed {
        color: var(--nimiq-light-blue);
    }

    .amount-input form {
        display: flex;
    }

    .amount-input .nim {
        margin-left: 1rem;
        font-size: 4rem;
        font-weight: 700;
        line-height: 4.5rem;
    }
</style>
