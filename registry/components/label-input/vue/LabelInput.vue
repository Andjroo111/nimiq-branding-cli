<template>
    <form class="label-input" @submit.prevent="onBlur" :class="{ disabled }">
        <span class="width-finder width-placeholder" ref="widthPlaceholder$">{{
            placeholder
        }}</span>
        <span class="width-finder width-value" ref="widthValue$">{{ liveValue }}</span>
        <input type="text" class="nq-input" :class="{ 'vanishing': vanishing }"
            :placeholder="placeholder"
            :style="{ width: `${width}px` }"
            v-model="liveValue"
            :disabled="disabled"
            @input="onInput"
            @blur="onBlur"
            @paste="emit('paste', $event)"
            ref="input$">
    </form>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    /** Maximum value length in UTF-8 bytes; longer input is rejected (previous value is kept). */
    maxBytes?: number,
    /** The label text (v-model). */
    value?: string,
    /** Upstream default is the i18n string $t('Name your address'). */
    placeholder?: string,
    /** Removes the input's inset border (nq-input "vanishing" style). */
    vanishing?: boolean,
    disabled?: boolean,
}>(), {
    maxBytes: undefined,
    value: '',
    placeholder: 'Name your address',
    vanishing: false,
    disabled: false,
});

const emit = defineEmits<{
    /** Emitted on every accepted keystroke (upstream Vue 2 v-model event). */
    (e: 'input', value: string): void,
    /** Emitted on blur/submit when the value changed since the last 'changed' emit. */
    (e: 'changed', value: string): void,
    (e: 'paste', event: ClipboardEvent): void,
}>();

const input$ = ref<HTMLInputElement | null>(null);
const widthPlaceholder$ = ref<HTMLSpanElement | null>(null);
const widthValue$ = ref<HTMLSpanElement | null>(null);

const liveValue = ref('');
let lastValue = '';
let lastEmittedValue = '';
const width = ref(50);

// Inlined from @nimiq/utils Utf8Tools
function stringToUtf8ByteArray(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

// Inlined from @nimiq/utils Utf8Tools.truncateToUtf8ByteLength (with default applyEllipsis=true):
// truncates to the byte budget without splitting a multi-byte character and appends an ellipsis.
function truncateToUtf8ByteLength(str: string, length: number): { result: string, didTruncate: boolean } {
    let bytes = stringToUtf8ByteArray(str);
    if (bytes.length <= length) return { result: str, didTruncate: false };
    const ellipsisBytes = [0xE2, 0x80, 0xA6]; // UTF-8 encoding of '…'
    let applyEllipsis = true;
    if (length < ellipsisBytes.length) applyEllipsis = false;
    else length -= ellipsisBytes.length;
    bytes = bytes.subarray(0, length);
    // Cut off a potentially broken multi-byte character at the end (UTF-8 continuation bytes are 0b10xxxxxx).
    let end = bytes.length;
    while (end > 0 && (bytes[end - 1] & 0xC0) === 0x80) end--;
    if (end > 0 && (bytes[end - 1] & 0xC0) === 0xC0) end--; // leading byte of an incomplete sequence
    else end = bytes.length; // last sequence was complete; keep it
    let result = new TextDecoder().decode(bytes.subarray(0, end));
    if (applyEllipsis) result += '…';
    return { result, didTruncate: true };
}

function focus() {
    input$.value?.focus();
}
defineExpose({ focus });

function onInput() {
    if (props.maxBytes && stringToUtf8ByteArray(liveValue.value).byteLength > props.maxBytes) {
        // Keep previous value rather than truncating new value, which makes it slightly more obvious for the user
        // that the change was not applied, for example if an invalid value was pasted.
        liveValue.value = lastValue;
        return;
    }
    lastValue = liveValue.value;
    emit('input', liveValue.value);
}

function onBlur() {
    if (liveValue.value === lastEmittedValue) return;
    emit('changed', liveValue.value);
    lastEmittedValue = liveValue.value;
    input$.value?.blur();
}

watch(() => props.value, (newValue) => {
    if (props.maxBytes && stringToUtf8ByteArray(newValue).byteLength > props.maxBytes) return; // keep last
    liveValue.value = newValue;
    lastValue = liveValue.value;
    lastEmittedValue = lastValue;
}, { immediate: true });

watch(liveValue, async () => {
    await nextTick(); // Await updated DOM
    if (!widthPlaceholder$.value || !widthValue$.value || !input$.value) return;

    const placeholderWidth = widthPlaceholder$.value.offsetWidth;
    const valueWidth = widthValue$.value.offsetWidth;

    // Add an additional padding, so entering new letters does not flicker the input before width is adjusted
    //
    // A third of the font-size was found to be a good compromise between not adding too big a gap and
    // still resonably supporting wide letters (it still jumps for W at bigger font-sizes, but that's why
    // it's called a compromise).
    const fontSize = parseFloat(window.getComputedStyle(input$.value, null).getPropertyValue('font-size'));

    width.value = (liveValue.value.length ? valueWidth : placeholderWidth) + fontSize / 3;
}, { immediate: true });

watch(() => props.maxBytes, (newMaxBytes) => {
    // Truncate value when maxBytes gets changed.
    if (!newMaxBytes) return;
    const { result: truncatedValue, didTruncate } = truncateToUtf8ByteLength(liveValue.value, newMaxBytes);
    if (!didTruncate) return;
    liveValue.value = truncatedValue;
    lastValue = liveValue.value;
    lastEmittedValue = lastValue;
    emit('changed', liveValue.value);
});
</script>

<style scoped>
    .label-input {
        position: relative;
        overflow: hidden; /* limit width-finder width to parent available width */
        max-width: 100%;
        box-sizing: border-box;
    }

    .width-finder {
        position: absolute;
        color: transparent;
        pointer-events: none;
        user-select: none;
        white-space: pre;
        padding: 0 2.25rem; /* nq-input padding + border-width */
    }

    input {
        padding-right: 0;
        max-width: 100%;
        transition:
            color .2s ease, box-shadow .2s ease, /* Copied from Nimiq Styles */
            width 50ms ease-out;
    }

    input:disabled {
        pointer-events: none; /* Prevent hover effects */
    }
</style>
