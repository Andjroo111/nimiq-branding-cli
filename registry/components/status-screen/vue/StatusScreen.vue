<template>
    <div class="status-screen" :class="{
        'nq-blue-bg': showLoadingBackground && !lightBlue,
        'nq-light-blue-bg': showLoadingBackground && lightBlue,
        'exit-transition': state === 'success',
        small,
    }">
        <Transition name="fade-loading">
            <div class="wrapper" v-if="state === 'loading'">
                <h1 class="title nq-h1">{{ loadingTitle }}</h1>

                <div class="icon-row">
                    <slot name="loading">
                        <!-- LoadingSpinner (@nimiq/vue-components), inlined -->
                        <svg height="48" width="54" viewBox="0 0 54 48" color="inherit" class="loading-spinner">
                            <path class="big-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4" stroke-dasharray="92.5 60"/>
                            <path class="small-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="47.5 105"/>
                        </svg>
                    </slot>
                </div>

                <div class="status-row" :class="{ transition: isTransitioningStatus }">
                    <div class="status current nq-h2">{{ currentStatus }}</div>
                    <div class="status next nq-h2">{{ nextStatus }}</div>
                </div>
            </div>
        </Transition>

        <Transition name="fade-result">
            <div class="wrapper success nq-green-bg" v-if="state === 'success'">
                <div class="spacer"></div>

                <div class="icon-row">
                    <slot name="success">
                        <!-- CheckmarkIcon (checkmark.svg from @nimiq/style) -->
                        <svg class="nq-icon" width="74" height="74" viewBox="0 0 74 74" xmlns="http://www.w3.org/2000/svg"><path d="M71.12 1.84a4.5 4.5 0 0 0-6.28 1.04l-42.1 58.74L8.68 47.54a4.5 4.5 0 1 0-6.36 6.37l17.8 17.81a4.57 4.57 0 0 0 6.84-.56l45.2-63.03a4.5 4.5 0 0 0-1.04-6.29z" fill="currentColor" stroke="currentColor" stroke-width=".8"/></svg>
                        <h1 class="title nq-h1">{{ title }}</h1>
                    </slot>
                </div>

                <div class="spacer"></div>
            </div>
        </Transition>

        <Transition name="fade-result">
            <div class="wrapper warning nq-orange-bg" v-if="state === 'warning'">
                <div class="spacer" :class="{'with-main-action': !!mainAction, 'with-alternative-action': !!alternativeAction}"></div>

                <div class="icon-row">
                    <slot name="warning">
                        <!-- FaceNeutralIcon (face-neutral.svg from @nimiq/style) -->
                        <svg class="nq-icon" width="102" height="102" viewBox="0 0 102 102" xmlns="http://www.w3.org/2000/svg"><circle cx="51" cy="51" r="48" stroke="currentColor" fill="none" stroke-width="6"/><circle cx="35.1485" cy="40.6627" r="4.82432" fill="currentColor"/><circle cx="66.8514" cy="40.6622" r="4.82432" fill="currentColor"/><path d="M39 68.9863C39 68.9863 44.8244 68.9863 51.0271 68.9863C57.2298 68.9863 63.0541 68.9863 63.0541 68.9863" stroke="currentColor" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>

                        <h1 class="title nq-h1">{{ title }}</h1>
                        <p v-if="message" class="message nq-text">{{ message }}</p>
                    </slot>
                </div>

                <div class="action-row">
                    <button v-if="mainAction" class="nq-button orange inverse" @click="emit('main-action')">{{ mainAction }}</button>
                    <a v-if="alternativeAction" href="javascript:void(0)" class="alternative-action nq-link" @click="emit('alternative-action')">{{ alternativeAction }}</a>
                </div>
            </div>
        </Transition>

        <Transition name="fade-result">
            <div class="wrapper error nq-red-bg" v-if="state === 'error'">
                <div class="spacer" :class="{'with-main-action': !!mainAction, 'with-alternative-action': !!alternativeAction}"></div>

                <div class="icon-row">
                    <slot name="error">
                        <!-- FaceSadIcon (face-sad.svg from @nimiq/style) -->
                        <svg class="nq-icon" width="102" height="102" viewBox="0 0 102 102" xmlns="http://www.w3.org/2000/svg"><circle cx="51" cy="51" r="48" stroke="currentColor" fill="none" stroke-width="6"/><circle cx="35.1485" cy="40.6627" r="4.82432" fill="currentColor"/><circle cx="66.8514" cy="40.6622" r="4.82432" fill="currentColor"/><path d="M39.9729 70.9867C39.9729 70.9867 44.7972 68.23 50.9999 68.23C57.2026 68.23 62.027 70.9867 62.027 70.9867" stroke="currentColor" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>

                        <h1 class="title nq-h1">{{ title }}</h1>
                        <p v-if="message" class="message nq-text">{{ message }}</p>
                    </slot>
                </div>

                <div class="action-row">
                    <button v-if="mainAction" class="main-action nq-button red inverse" @click="emit('main-action')">{{ mainAction }}</button>
                    <a v-if="alternativeAction" href="javascript:void(0)" class="alternative-action nq-link" @click="emit('alternative-action')">{{ alternativeAction }}</a>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of the Nimiq Hub's StatusScreen.vue (upstream is a Vue 2 class component).
// Icons (LoadingSpinner, Checkmark, FaceNeutral, FaceSad from @nimiq/vue-components /
// @nimiq/style) are inlined as SVG slot fallbacks; override via the loading/success/
// warning/error slots. Requires nimiq-style (legacy) for the .nq-* classes.
// SUCCESS_REDIRECT_DELAY (upstream): 2000ms = 1s of transition + 1s of display.
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';

const props = withDefaults(defineProps<{
    /** The current title, dynamic for both loading and result states */
    title?: string,
    state?: 'loading' | 'success' | 'warning' | 'error',
    /** Show light blue loading screen */
    lightBlue?: boolean,
    /** Currently doing this (loading state) */
    status?: string,
    /** Message displayed for warning and error states */
    message?: string,
    /** Text of main action button (button is hidden otherwise) */
    mainAction?: string,
    /** Text of alternative action link (link is hidden otherwise) */
    alternativeAction?: string,
    /** Toggle to a smaller layout */
    small?: boolean,
}>(), {
    state: 'loading',
});

const emit = defineEmits<{
    (e: 'main-action'): void,
    (e: 'alternative-action'): void,
}>();

const currentStatus = ref('');
const nextStatus = ref('');
const isTransitioningStatus = ref(false);

/**
 * To enable a smooth transition of the non-transitionable background-image
 * property, we instead place the new background above the old one and
 * animate the top element's opacity. But because the color area has rounded
 * corners, and the browser creates transparent pixels in the corner
 * because of anti-aliasing, the blue background partly shines through the
 * transparent corner pixels of the foreground. Thus we remove the background
 * color after the transition is complete.
 */
const showLoadingBackground = ref(true);

const loadingTitle = ref('');

let hideLoadingBackgroundTimeout = -1;
let statusUpdateTimeout = -1;

watch(() => props.title, (newTitle) => {
    // only change the loadingTitle if we're still in the loading state (and not changing the
    // state right after setting the title) to avoid it being changed on the loading screen
    // when we actually want to set it for the success/error/warning screen.
    nextTick(() => {
        if (props.state !== 'loading') return;
        loadingTitle.value = newTitle || '';
    });
}, { immediate: true });

watch(() => props.state, (newState, oldState) => {
    if (newState === 'loading') {
        // Starting in or changing to LOADING
        if (hideLoadingBackgroundTimeout !== -1) {
            clearTimeout(hideLoadingBackgroundTimeout);
            hideLoadingBackgroundTimeout = -1;
        }
        showLoadingBackground.value = true;
    } else {
        // other state than LOADING
        if (oldState === 'loading') {
            if (hideLoadingBackgroundTimeout === -1) {
                hideLoadingBackgroundTimeout = window.setTimeout(() => {
                    showLoadingBackground.value = false;
                    hideLoadingBackgroundTimeout = -1;
                }, 1000);
            }
        } else {
            showLoadingBackground.value = false;
        }
    }
}, { immediate: true });

watch(() => props.status, async (newStatus) => {
    if (statusUpdateTimeout !== -1) {
        clearTimeout(statusUpdateTimeout);
        // reset transitioning state for new change
        isTransitioningStatus.value = false;
        await nextTick();
        await new Promise((resolve) => requestAnimationFrame(resolve)); // await style update
        currentStatus.value = nextStatus.value;
    }

    nextStatus.value = newStatus || '';
    isTransitioningStatus.value = true;

    statusUpdateTimeout = window.setTimeout(() => {
        statusUpdateTimeout = -1;
        currentStatus.value = newStatus || '';
        isTransitioningStatus.value = false;
    }, 500);
}, { immediate: true });

onBeforeUnmount(() => {
    clearTimeout(hideLoadingBackgroundTimeout);
    clearTimeout(statusUpdateTimeout);
});
</script>

<style scoped>
    .status-screen {
        --status-screen-margin: .75rem;
        display: flex;
        flex-direction: column;
        border-radius: 0.625rem;
        width: calc(100% - 2 * var(--status-screen-margin));
        height: calc(100% - 2 * var(--status-screen-margin));
        margin: var(--status-screen-margin);
        z-index: 1000;
        position: relative;
        flex-grow: 1;
    }

    .wrapper {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        flex-grow: 1;
        border-radius: 0.625rem;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    .icon-row,
    .status-row,
    .action-row {
        width: 100%;
        text-align: center;
    }

    .success .icon-row {
        margin-top: 2rem;
    }

    .status-row {
        --status-font-size: 2.5rem;
        margin-top: 2rem; /* Same as title margin-bottom, to equalize spacing to center icon */
        margin-bottom: 5rem;
        height: var(--status-font-size); /* 1 line of status text. For multiple lines, the text overflows to the top */
        position: relative;
    }

    .status-screen.small .status-row {
        margin-bottom: 2.5rem;
    }

    .status {
        position: absolute;
        bottom: 0;
        width: 100%;
        margin: 0;
        padding: 0 2rem;
        font-size: var(--status-font-size);
        font-weight: normal;
        line-height: 1.2;
        opacity: 1;
    }

    .status-screen.small .status {
        /* on small layout center multiple lines vertically instead of overflowing to the top */
        transform: translateY(calc(50% - var(--status-font-size) / 2));
    }

    .status-row.transition .status {
        transition: transform 500ms, opacity 500ms;
    }

    .status-row.transition .status.current {
        transform: translateY(-100%);
        opacity: 0;
    }

    .status-screen.small .status-row.transition .status.current {
        /* on small layout move message less to avoid that it flies over half the screen */
        transform: translateY(calc(-1 * var(--status-font-size)));
    }

    .status-row:not(.transition) .status.next {
        transform: translateY(100%);
        opacity: 0;
    }

    .spacer {
        padding-top: 2rem;
    }

    .success .spacer {
        padding-top: 6rem;
    }

    .spacer.with-main-action {
        padding-bottom: 8rem;
    }

    .spacer.with-alternative-action {
        margin-bottom: 2rem;
    }

    .action-row {
        padding-bottom: 2rem;
    }

    .action-row .nq-link {
        color: white;
        font-size: 2rem;
    }

    /* FADE transitions (Vue 3 *-enter-from class names) */

    .fade-loading-leave-active,
    .fade-result-leave-active {
        transition: opacity 300ms;
    }

    .fade-loading-enter-active,
    .fade-result-enter-active {
        transition: opacity 700ms 300ms;
    }

    .fade-loading-enter-from,
    .fade-loading-leave-to,
    .fade-result-enter-from,
    .fade-result-leave-to {
        opacity: 0;
    }

    /* Inlined LoadingSpinner animation (@nimiq/vue-components), ids -> classes.
       Hexagon circumference: 152.5 */

    .loading-spinner .big-hex {
        stroke-dashoffset: -40.5;
        animation: big-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
    }

    .loading-spinner .small-hex {
        stroke-dashoffset: 13;
        animation: small-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
    }

    @keyframes small-hex {
        0%   { stroke-dashoffset: 13 }
        17%  { stroke-dashoffset: 38.42 }
        33%  { stroke-dashoffset: 63.84 }
        50%  { stroke-dashoffset: 89.25 }
        67%  { stroke-dashoffset: 114.66 }
        83%  { stroke-dashoffset: 140.08 }
        100% { stroke-dashoffset: 165.5 }
    }

    @keyframes big-hex {
        0%   { stroke-dashoffset: -40.5 }
        17%  { stroke-dashoffset: -15.08 }
        33%  { stroke-dashoffset: 10.33 }
        50%  { stroke-dashoffset: 35.75 }
        67%  { stroke-dashoffset: 61.17 }
        83%  { stroke-dashoffset: 86.58 }
        100% { stroke-dashoffset: 112 }
    }
</style>

<style>
    .status-screen .title {
        line-height: 1;
        margin-top: 4rem;
        white-space: pre-line;
    }

    .status-screen.small .title {
        margin-top: 3rem;
        margin-bottom: 2rem;
        font-size: 2.5rem;
    }

    .status-screen .icon-row .nq-icon {
        margin: auto;
    }

    .status-screen .success .nq-icon {
        font-size: 9rem;
    }

    .status-screen .warning .nq-icon {
        font-size: 10rem;
    }

    .status-screen .error .nq-icon {
        font-size: 12rem;
    }

    .status-screen .icon-row .title,
    .status-screen .icon-row .message {
        margin-left: auto;
        margin-right: auto;
    }

    .status-screen .icon-row .title {
        max-width: 80%;
        line-height: 1.4;
    }

    .status-screen .message {
        max-width: 70%;
        opacity: 1;
    }

    .status-screen.exit-transition .success .icon-row {
        animation: success-title-slide 1s;
    }

    @keyframes success-title-slide {
        from { transform: translateY(8rem); }
        to   { transform: translateY(0); }
    }

    /* Optional entry animation that components can apply on the status-screen */
    .status-screen.grow-from-bottom-button {
        position: absolute;
        animation: status-screen-grow-from-bottom-button .6s forwards cubic-bezier(0.25, 0, 0, 1);
        overflow: hidden;
    }

    @keyframes status-screen-grow-from-bottom-button {
        0%,
        20% {
            max-width: calc(100% - 12rem);
            max-height: 7.5rem;
            bottom: calc(4.25rem - var(--status-screen-margin));
            left: calc(6rem - var(--status-screen-margin));
            border-radius: 4rem;
        }

        0% {
            opacity: 0;
        }

        25% {
            opacity: 1;
        }

        100% {
            max-width: calc(100% - 2 * var(--status-screen-margin));
            max-height: calc(100% - 2 * var(--status-screen-margin));
            bottom: 0;
            left: 0;
            border-radius: 0.5rem;
        }
    }
</style>
