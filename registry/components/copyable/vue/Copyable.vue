<template>
    <div
        ref="root$"
        class="copyable"
        :class="{ copied }"
        tabindex="0"
        @click="copy"
        @keydown="onKeyDown"
    >
        <div class="background"></div>
        <slot></slot>
        <div ref="tooltip$" class="tooltip">Copied</div>
    </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';

/**
 * **Copyable**
 *
 * Copyable can be used to make a click on one or more elements copy content to the Clipboard with visual feedback.
 * By default the children's contents are copied to the Clipboard. Alternatively, a specific text to be copied can be
 * provided.
 */
const props = defineProps<{
    /** A specific text to be copied to the clipboard on click */
    text?: string,
}>();

const emit = defineEmits<{
    (event: 'copy', text: string): void,
}>();

const DISPLAY_TIME = 800;

const root$ = ref<HTMLElement | null>(null);
const tooltip$ = ref<HTMLElement | null>(null);
const copied = ref(false);
let copiedResetTimeout: number | null = null;

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
    let text = props.text;
    if (!text) {
        const copiedLabel = tooltip$.value!.textContent!;
        text = root$.value!.innerText.replace(new RegExp(`\\s*${copiedLabel}$`), '');
    }
    clipboardCopy(text);

    if (copiedResetTimeout !== null) window.clearTimeout(copiedResetTimeout);
    copied.value = true;
    copiedResetTimeout = window.setTimeout(() => {
        copied.value = false;
    }, DISPLAY_TIME);

    emit('copy', text);
}

function onKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' /* Space */ || event.key === 'Enter') {
        copy();
    }
}

onBeforeUnmount(() => {
    if (copiedResetTimeout !== null) window.clearTimeout(copiedResetTimeout);
});

defineExpose({ copy });
</script>

<style scoped>
    .copyable {
        position: relative;
        padding: 1.5rem;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: color .3s var(--nimiq-ease);
    }

    .copyable:hover,
    .copyable:focus,
    .copyable.copied {
        color: var(--nimiq-light-blue) !important;
        outline: none;
    }

    .background {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-image: var(--nimiq-light-blue-bg);
        border-radius: .5rem;
        opacity: 0;
        transition: opacity .3s var(--nimiq-ease);
    }

    .copyable:hover .background,
    .copyable:focus .background,
    .copyable.copied .background {
        opacity: .07;
    }

    .tooltip {
        pointer-events: none;
        font-size: 1.75rem;
        padding: 0.75rem 1rem;
        background: var(--nimiq-light-blue-bg);
        position: absolute;
        top: -5rem;
        left: 50%;
        margin-left: -3.75rem; /* half width of tooltip */
        border-radius: .5rem;
        color: white;
        font-weight: 600;
        line-height: 1.1;
        box-shadow:
            0px 2px 2.5px rgba(31, 35, 72, 0.02),
            0px 7px 8.5px rgba(31, 35, 72, 0.04),
            0px 18px 38px rgba(31, 35, 72, 0.07);

        /* Animated styles */
        transform: translate3d(0, 1rem, 0);
        opacity: 0;

        transition: transform .3s var(--nimiq-ease), opacity .3s var(--nimiq-ease);
        transition-delay: .2s;
    }

    .tooltip::after {
        content: '';
        display: block;
        position: absolute;
        width: 2.25rem;
        height: 2rem;
        left: calc(50% - 1.125rem);
        mask-image: url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
        z-index: 1000; /* move above tooltip-box's box-shadow */
        background: #1A6AD2;
        transform: rotate(180deg) translateY(-0.75rem);
    }

    .copyable.copied .tooltip {
        transition-delay: 0s;
        pointer-events: all;
        opacity: 1;
        transform: translate3d(0, 0, 0);
    }
</style>
