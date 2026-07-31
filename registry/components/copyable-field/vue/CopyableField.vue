<template>
    <div class="copyable-field" :class="{ small }">
        <span class="nq-label" v-if="label">{{ label }}</span>
        <div class="copyable-field-content" :class="{ 'simple-value': !isKeyedValue, copied }" @click="copy">
            <div ref="valueContainer$" class="value-container" :style="{ fontSize: fontSize + 'rem' }">
                <span ref="value$" class="value">
                    {{ isKeyedValue ? (value as Record<string, any>)[currentKey] : value }}
                </span>
            </div>
            <button
                class="nq-button-s"
                v-for="key in (isKeyedValue ? Object.keys(value) : [])"
                :key="key"
                @click.stop="currentKey = key"
                :class="{
                    inverse: currentKey === key,
                    'single-key': hasSingleKey,
                }"
                :tabindex="hasSingleKey ? -1 : 0"
            >{{ key }}</button>
            <div class="copy-notice">Copied</div>
        </div>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components CopyableField.vue.
// Renders WHITE text — place it on a dark surface (e.g. .nq-blue-bg).
// The 'Copied' notice is the en-US i18n source string (I18nMixin stubbed).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const DEFAULT_FONT_SIZE = 3; // in rem
const DEFAULT_FONT_SIZE_SMALL = 2.5; // in rem
const COPIED_RESET_DELAY = 500; // ms

const props = withDefaults(defineProps<{
    /**
     * The value to display and copy: a string or number, or an object of alternative
     * representations keyed by their label (e.g. { hex: ..., base64: ... }), switchable
     * via small key buttons.
     */
    value: string | number | { [key: string]: any },
    /** Uppercase field label rendered above the value (nq-label). */
    label?: string,
    /** Compact variant: 5rem field height and 2.5rem default font size. */
    small?: boolean,
}>(), {
    small: false,
});

const valueContainer$ = ref<HTMLDivElement | null>(null);
const value$ = ref<HTMLSpanElement | null>(null);

const currentKey = ref('');
const fontSize = ref(props.small ? DEFAULT_FONT_SIZE_SMALL : DEFAULT_FONT_SIZE);
const copied = ref(false);
let copiedResetTimeout: number | undefined;

const isKeyedValue = computed(() => typeof props.value !== 'string' && typeof props.value !== 'number');
const hasSingleKey = computed(() => isKeyedValue.value && Object.keys(props.value).length === 1);

onMounted(() => {
    window.addEventListener('resize', updateFontSize);
    updateFontSize();
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateFontSize);
    window.clearTimeout(copiedResetTimeout);
});

watch(() => props.value, () => {
    const keys = isKeyedValue.value ? Object.keys(props.value) : [];
    if (keys.length > 0 && (!currentKey.value || !keys.includes(currentKey.value))) {
        currentKey.value = keys[0]; // will also trigger updateFontSize
    } else {
        updateFontSize(); // trigger manually
    }
}, { immediate: true });

watch([currentKey, () => props.small], updateFontSize);

async function updateFontSize() {
    await nextTick(); // let Vue render the component first
    const valueContainer = valueContainer$.value;
    const valueElement = value$.value;
    if (!valueContainer || !valueElement) return;
    const defaultFontSize = props.small ? DEFAULT_FONT_SIZE_SMALL : DEFAULT_FONT_SIZE;
    valueElement.style.fontSize = `${defaultFontSize}rem`;
    const availableWidth = valueContainer.offsetWidth;
    const referenceWidth = valueElement.offsetWidth;
    const scaleFactor = availableWidth / referenceWidth;
    valueElement.style.fontSize = '';
    fontSize.value = Math.min(defaultFontSize, defaultFontSize * scaleFactor);
}

// Inlined verbatim from @nimiq/utils (src/clipboard/Clipboard.ts).
function clipboardCopy(text: string): boolean {
    if (typeof globalThis.document === 'undefined') return false;

    // Simplified and typed version of https://github.com/sindresorhus/copy-text-to-clipboard
    // Additionally added a fix for correctly restoring selections in input fields.
    const element = document.createElement('textarea');

    element.value = text;

    // Prevent keyboard from showing on mobile
    element.setAttribute('readonly', '');

    element.style.contain = 'strict';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.fontSize = '12pt'; // Prevent zooming on iOS

    // store selection to be restored later
    const selection = document.getSelection()!;
    const originalRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.append(element);
    element.select();

    // Explicit selection workaround for iOS
    element.selectionStart = 0;
    element.selectionEnd = text.length;

    let isSuccess = false;
    try {
        isSuccess = document.execCommand('copy');
    } catch (e) {
        // Ignore
    }

    element.remove();

    if (activeElement) {
        activeElement.focus();
    }
    if (originalRange
        && !(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
        // We don't have to do this for inputs and textareas as they retain their selection on blur. Refocusing them
        // was enough to recover the original selection.
        selection.removeAllRanges();
        selection.addRange(originalRange);
    }

    return isSuccess;
}

function copy() {
    clipboardCopy(isKeyedValue.value
        ? (props.value as Record<string, any>)[currentKey.value].toString()
        : props.value.toString());
    copied.value = true;

    window.clearTimeout(copiedResetTimeout);
    copiedResetTimeout = window.setTimeout(() => {
        copied.value = false;
    }, COPIED_RESET_DELAY);
}
</script>

<style scoped>
    .copyable-field-content,
    .copy-notice,
    button,
    .simple-value .value-container {
        transition-duration: .25s;
        transition-timing-function: var(--nimiq-ease);
    }

    .copyable-field,
    .copyable-field-content {
        display: flex;
        width: 100%;
        align-items: center;
    }

    .copyable-field {
        flex-direction: column;
        justify-content: space-between;
        color: white;
    }

    .copyable-field-content {
        height: 6.25rem;
        position: relative;
        border-radius: 0.5rem;
        line-height: 6.25rem;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.1);
        transition-property: background;
    }

    .small .copyable-field-content {
        height: 5rem;
        line-height: 5rem;
    }

    .copy-notice {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.75rem;
        font-weight: 600;
        color: var(--nimiq-light-blue);
        pointer-events: none;
        opacity: 0;
        transition-property: opacity;
    }

    .copyable-field-content,
    .copy-notice {
        padding: 0 3rem;
    }

    .copyable-field-content:hover {
        background: rgba(255, 255, 255, 0.16);
    }

    .copied .copy-notice {
        opacity: 1;
    }

    button {
        margin-left: .5rem;
        transition-property: background, color, opacity;
    }

    button:first-of-type {
        margin-left: 2.5rem;
    }

    button:not(.inverse) {
        background: transparent;
    }

    button:not(.inverse):hover {
        background: rgba(255, 255, 255, .07);
    }

    button.inverse {
        color: white;
    }

    button.single-key {
        pointer-events: none;
        background: transparent;
    }

    .small button {
        height: 3rem;
        line-height: 3rem;
    }

    .copied button {
        opacity: 0;
    }

    .value-container {
        display: flex;
        align-items: center;
        flex-grow: 1;
        overflow-x: hidden; /* avoid overflow of the value while it's not resized yet */
        white-space: nowrap;
    }

    .simple-value .value-container {
        mask-image: linear-gradient(90deg, black 60%, transparent 80%);
        mask-size: 160%;
        transition-property: mask-size;
    }

    .simple-value.copied .value-container {
        mask-size: 100%;
    }

    .nq-button-s,
    .nq-label {
        color: rgba(255, 255, 255, 0.5);
    }

    .nq-label {
        margin-top: 3rem;
        margin-bottom: 2rem;
    }

    .small .nq-label {
        margin-top: 2.75rem;
        margin-bottom: 1.75rem;
    }
</style>
