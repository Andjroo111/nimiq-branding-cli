<script setup>
// Nimiq toast notification — Vue 3 port of the wallet's bottom toast
// (upstream: wallet/src/components/swap/SwapNotification.vue, icons from
// @nimiq/style via vue-components IconBase, spinner from vue-components
// LoadingSpinner.vue, maximize glyph from wallet icons/MaximizeIcon.vue).
//
// States: info (blue, hexagon spinner), success (green, checkmark),
// error (orange, alert triangle), warning (gold, stopwatch).
// The toast is a <button> fixed at the viewport's bottom right, like upstream;
// it emits 'click' so the host app can re-open the underlying flow.

defineProps({
    type: {
        type: String,
        default: 'info',
        validator: (type) => ['info', 'success', 'error', 'warning'].includes(type),
    },
    title: {
        type: String,
        default: '',
    },
    message: {
        type: String,
        default: '',
    },
    // Renders the message in full-opacity Nimiq orange
    // (upstream's "Don't close your wallet!" treatment on the blue toast).
    emphasizeMessage: {
        type: Boolean,
        default: false,
    },
    // Shows the small maximize glyph in the top right corner.
    showMaximize: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['click']);
</script>

<template>
    <button
        type="button"
        class="nq-toast"
        :class="{
            'nq-toast--success': type === 'success',
            'nq-toast--error': type === 'error',
            'nq-toast--warning': type === 'warning',
        }"
        @click="$emit('click')"
    >
        <div class="icon">
            <!-- info: hexagon LoadingSpinner -->
            <svg v-if="type === 'info'" height="48" width="54" viewBox="0 0 54 48" color="inherit"
                class="loading-spinner">
                <path class="big-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
                    stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4"
                    stroke-dasharray="92.5 60" />
                <path class="small-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
                    stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"
                    stroke-dasharray="47.5 105" />
            </svg>
            <!-- success: checkmark (@nimiq/style checkmark.svg) -->
            <svg v-else-if="type === 'success'" class="nq-icon" width="74" height="74" viewBox="0 0 74 74"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M71.12 1.84a4.5 4.5 0 0 0-6.28 1.04l-42.1 58.74L8.68 47.54a4.5 4.5 0 1 0-6.36 6.37l17.8 17.81a4.57 4.57 0 0 0 6.84-.56l45.2-63.03a4.5 4.5 0 0 0-1.04-6.29z"
                    fill="currentColor" stroke="currentColor" stroke-width=".8" />
            </svg>
            <!-- error: alert triangle (@nimiq/style alert-triangle.svg) -->
            <svg v-else-if="type === 'error'" class="nq-icon" width="17" height="16" viewBox="0 0 17 16"
                xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M15.913 13.333L9.68 1.433a1.333 1.333 0 0 0-2.362 0l-6.232 11.9a1.333 1.333 0 0 0 1.182 1.952H14.73a1.333 1.333 0 0 0 1.182-1.952zm-8.08-7.718a.667.667 0 0 1 1.334 0v4a.667.667 0 1 1-1.334 0v-4zm.682 7.674h.018a.983.983 0 0 0 .967-1.022 1.018 1.018 0 0 0-1.016-.978h-.019a.984.984 0 0 0-.965 1.02c.02.546.468.978 1.015.98z"
                    fill="currentColor" />
            </svg>
            <!-- warning: stopwatch (@nimiq/style stopwatch.svg) -->
            <svg v-else class="nq-icon" width="98" height="123" viewBox="0 0 98 123"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M85.7 42.3l8-8a5.1 5.1 0 1 0-7.3-7.2l-8.2 8.2c-7-5.2-15.4-8.5-24-9.4V10.3h10.2a5.1 5.1 0 0 0 0-10.3H33.6a5.1 5.1 0 0 0 0 10.3H44v15.6a48.7 48.7 0 1 0 41.8 16.4zM49 112.8a38.4 38.4 0 1 1 0-77 38.4 38.4 0 0 1 0 77z M54.2 48.6a5.1 5.1 0 0 0-10.3 0V74a5.2 5.2 0 0 0 5.2 5.1 5.1 5.1 0 0 0 5-5V48.5z"
                    fill="currentColor" />
            </svg>
        </div>
        <div class="content">
            <div class="status">
                <slot name="title">{{ title }}</slot>
            </div>
            <span class="closing-notice" :class="{ 'nq-orange': emphasizeMessage }">
                <slot>{{ message }}</slot>
            </span>
        </div>
        <svg v-if="showMaximize" width="12" height="12" viewBox="0 0 12 12" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="10.5" width="8" height="1.5" rx=".75" fill="currentColor" />
            <path d="M1.23 5.96l.07-5 5 .07M2.1 1.72l4.87 5.01" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    </button>
</template>

<style scoped>
/* Requires the Nimiq legacy stylesheet (nimiq-style.min.css) for the
   --nimiq-* color/gradient variables and html { font-size: 8px }. */

.nq-toast {
    /* button reset (wallet themes.scss button.reset) */
    background: none;
    border: none;
    outline: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    text-align: inherit;
    cursor: pointer;

    /* font-size vars (wallet themes.scss :root) */
    --body-size: 2rem;
    --small-label-size: 1.5rem;

    display: flex;
    flex-direction: row;
    align-items: center;
    width: 34rem;
    height: 8rem;
    border-radius: 0.75rem;
    color: white;
    background-color: var(--nimiq-blue);
    background-image: var(--nimiq-blue-bg);

    position: fixed;
    right: 3rem;
    bottom: 3rem;
}

.nq-toast--success {
    background-color: var(--nimiq-green);
    background-image: var(--nimiq-green-bg);
}

.nq-toast--error {
    background-color: var(--nimiq-orange);
    background-image: var(--nimiq-orange-bg);
}

.nq-toast--warning {
    background-color: var(--nimiq-gold);
    background-image: var(--nimiq-gold-bg);
}

.icon {
    width: 8rem;
    flex-shrink: 0;
}

.icon svg {
    display: block;
    margin: auto;
}

.icon svg.nq-icon {
    width: 4rem;
    height: 4rem;
}

.nq-toast--success .icon .nq-icon {
    padding: 0.5rem;
}

.loading-spinner {
    width: 4.5rem;
}

.content {
    display: flex;
    flex-direction: column;
}

.status {
    font-size: var(--body-size);
    font-weight: 600;
    margin-bottom: 0.125rem;
}

.closing-notice {
    font-size: var(--small-label-size);
    font-weight: bold;
    opacity: 0.7;
}

.closing-notice.nq-orange {
    opacity: 1;
    color: var(--nimiq-orange);
}

/* maximize glyph, top right corner */
.nq-toast > svg {
    color: white;
    position: absolute;
    right: 1.25rem;
    top: 1.25rem;
}

/* hexagon loading spinner (info state) — upstream LoadingSpinner.vue */
.loading-spinner .big-hex {
    stroke-dashoffset: -40.5;
    animation: nq-toast-big-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

.loading-spinner .small-hex {
    stroke-dashoffset: 13;
    animation: nq-toast-small-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

@keyframes nq-toast-small-hex {
    0%   { stroke-dashoffset: 13 }
    17%  { stroke-dashoffset: 38.42 }
    33%  { stroke-dashoffset: 63.84 }
    50%  { stroke-dashoffset: 89.25 }
    67%  { stroke-dashoffset: 114.66 }
    83%  { stroke-dashoffset: 140.08 }
    100% { stroke-dashoffset: 165.5 }
}

@keyframes nq-toast-big-hex {
    0%   { stroke-dashoffset: -40.5 }
    17%  { stroke-dashoffset: -15.08 }
    33%  { stroke-dashoffset: 10.33 }
    50%  { stroke-dashoffset: 35.75 }
    67%  { stroke-dashoffset: 61.17 }
    83%  { stroke-dashoffset: 86.58 }
    100% { stroke-dashoffset: 112 }
}

@media (max-width: 768px) {
    .nq-toast {
        right: 1.5rem;
        bottom: 10.5rem;
    }
}
</style>
