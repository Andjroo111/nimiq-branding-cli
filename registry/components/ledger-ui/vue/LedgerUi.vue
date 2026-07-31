<template>
    <div class="ledger-ui" :class="{
        small,
        'has-connect-button': showConnectButton,
        'is-wrong-app-connected': wrongAppConnected,
    }">
        <StatusScreen state="loading" :title="shownTitle" :status="shownStatus" :small="small">
            <template #loading>
                <Transition name="transition-fade">
                    <!-- LoadingSpinner (@nimiq/vue-components), inlined -->
                    <svg v-if="illustration === 'loading'" height="48" width="54" viewBox="0 0 54 48"
                        color="inherit" class="loading-spinner">
                        <path class="big-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4" stroke-dasharray="92.5 60"/>
                        <path class="small-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="47.5 105"/>
                    </svg>
                    <div v-else class="ledger-device-container"
                        :class="coin"
                        :illustration="illustration"
                        :connect-animation-step="connectAnimationStep">
                        <div class="ledger-screen-confirm-address ledger-screen"></div>
                        <div class="ledger-screen-confirm-transaction ledger-screen"></div>
                        <div class="ledger-screen-confirm-message ledger-screen"></div>
                        <div class="ledger-screen-app ledger-screen"></div>
                        <div class="ledger-screen-dashboard ledger-screen"></div>
                        <div class="ledger-screen-pin ledger-screen">
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                            <div class="ledger-pin-dot"></div>
                        </div>
                        <div class="ledger-opacity-container">
                            <div class="ledger-cable"></div>
                            <div class="ledger-device"></div>
                        </div>
                    </div>
                </Transition>
                <Transition name="transition-fade">
                    <button v-if="showConnectButton" class="nq-button-s inverse connect-button"
                        :class="{ pulsate: connectAnimationStep === 4 }" @click="emit('connect')">
                        Connect
                    </button>
                </Transition>
            </template>
        </StatusScreen>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of the Nimiq Hub's LedgerUi.vue (upstream is a Vue 2 class component wired
// to the @nimiq/ledger-api service). The service is translated into props: the parent
// decides which illustration/instructions to show instead of LedgerApi state events.
// Renders inside the StatusScreen port (state 'loading'); the connect flow cycles
// 'Connect your Ledger Device' -> 'Enter your PIN' -> 'Open the {app} App' (-> 'Click
// Connect' with showConnectButton) every stepDuration ms, exactly like upstream
// _cycleConnectInstructions() (CONNECT_ANIMATION_STEP_DURATION = 9000 / 3).
// Under prefers-reduced-motion the loop is not started; the CSS freezes the
// illustration on the plugged-in device.
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import StatusScreen from './StatusScreen.vue';

const props = withDefaults(defineProps<{
    /** Which illustration to show; 'connecting' runs the looping connect animation */
    illustration?: 'loading' | 'connecting' | 'confirm-address' | 'confirm-transaction' | 'confirm-message',
    /** Device screen artwork of the dashboard/app screens */
    coin?: 'nimiq' | 'bitcoin',
    /** App name in 'Open the {app} App' (upstream: request.requiredApp); defaults per coin */
    appName?: string,
    /** Compact layout: no title, message only (as when embedded in checkout) */
    small?: boolean,
    /** Show the pulsating Connect button and the 'Click Connect' step; emits 'connect' */
    showConnectButton?: boolean,
    /** Wrong app connected: skip cable/PIN steps and loop the open-app screen */
    wrongAppConnected?: boolean,
    /** Override the derived instructions title */
    title?: string,
    /** Override the derived instructions text */
    status?: string,
    /** Connect animation step duration in ms (upstream 9000 / 3) */
    stepDuration?: number,
}>(), {
    illustration: 'connecting',
    coin: 'nimiq',
    stepDuration: 3000,
});

const emit = defineEmits<{
    (e: 'connect'): void,
    (e: 'information-shown'): void,
    (e: 'no-information-shown'): void,
}>();

const connectAnimationStep = ref(-1);
const instructionsTitle = ref('');
const instructionsText = ref('');
let connectAnimationInterval = -1;

const prefersReducedMotion = typeof window !== 'undefined'
    && !!window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const app = computed(() => props.appName || (props.coin === 'bitcoin' ? 'Bitcoin' : 'Nimiq'));

const instructions = computed(() => {
    let list = props.wrongAppConnected ? [] : ['Connect your Ledger Device', 'Enter your PIN'];
    list = [...list, `Open the ${app.value} App`];
    if (props.showConnectButton) list.push('Click Connect');
    if (list.length > 1) list = list.map((instruction, i) => `${i + 1}. ${instruction}`); // show step numbers
    return list;
});

function cycleConnectInstructions() {
    const oldIndex = instructions.value.indexOf(instructionsText.value);
    const index = (oldIndex + 1) % instructions.value.length;
    instructionsTitle.value = 'Connect Ledger';
    instructionsText.value = instructions.value[index];
    // Animation steps start counting at 1. If first instruction steps were skipped, also
    // skip them in the animation.
    connectAnimationStep.value = (props.wrongAppConnected ? 2 : 0) + index + 1;
}

watch(() => [props.illustration, props.wrongAppConnected, props.showConnectButton, props.coin], () => {
    clearInterval(connectAnimationInterval);
    connectAnimationInterval = -1;
    if (props.illustration === 'connecting') {
        instructionsText.value = '';
        cycleConnectInstructions();
        if (!prefersReducedMotion) {
            connectAnimationInterval = window.setInterval(cycleConnectInstructions, props.stepDuration);
        }
        return;
    }
    connectAnimationStep.value = -1;
    switch (props.illustration) {
        case 'confirm-address':
            instructionsTitle.value = 'Confirm Address';
            instructionsText.value = 'Confirm the address on your Ledger';
            break;
        case 'confirm-transaction':
            instructionsTitle.value = 'Confirm Transaction';
            instructionsText.value = 'Confirm using your Ledger';
            break;
        case 'confirm-message':
            instructionsTitle.value = 'Confirm Message';
            instructionsText.value = 'Confirm using your Ledger';
            break;
        default: // loading
            instructionsTitle.value = '';
            instructionsText.value = '';
    }
}, { immediate: true });

// Upstream _showInstructions: on small layout show no title, only the message (fall back
// to the title as message); props.title/props.status override the derived instructions.
const effectiveTitle = computed(() => props.title ?? instructionsTitle.value);
const effectiveStatus = computed(() => props.status ?? instructionsText.value);
const shownTitle = computed(() => props.small ? '' : effectiveTitle.value);
const shownStatus = computed(() => props.small
    ? effectiveStatus.value || effectiveTitle.value
    : effectiveStatus.value);

watch([shownTitle, shownStatus], ([title, status]) => {
    emit(!title && !status ? 'no-information-shown' : 'information-shown');
}, { immediate: true });

onBeforeUnmount(() => clearInterval(connectAnimationInterval));
</script>

<style scoped>
    .ledger-ui {
        width: 100%;
        height: 100%;
        text-align: center;
        display: flex;
        flex-direction: column;

        --ledger-connect-animation-step-duration: v-bind("stepDuration + 'ms'");
        --ledger-container-width: 52%;
        --ledger-scale-factor: 1.62;
        --ledger-y-offset: 0rem; /* unit can't be omitted here */
        --ledger-opacity: .3;
    }

    .ledger-ui.small {
        --ledger-container-width: 48%;
        --ledger-scale-factor: 1.5;
        --ledger-y-offset: -2rem;
    }

    .ledger-ui.has-connect-button.small {
        --ledger-container-width: 44%;
        --ledger-y-offset: -3.5rem;
    }

    .status-screen {
        overflow: hidden;
    }

    .status-screen :deep(.status-row) {
        transition: margin-bottom .4s;
    }

    .ledger-ui.has-connect-button .status-screen :deep(.status-row) {
        margin-bottom: 7rem;
        pointer-events: none;
    }

    .ledger-ui.has-connect-button.small .status-screen :deep(.status-row) {
        margin-bottom: 5.5rem;
    }

    .connect-button {
        position: absolute;
        left: 50%;
        bottom: 2rem;
        transform: translateX(-50%);
        transition: opacity .4s;
    }

    .connect-button.pulsate:not(:hover):not(:focus) {
        animation: connect-button-pulsate calc(var(--ledger-connect-animation-step-duration) / 4) alternate infinite;
    }

    .ledger-ui.small .connect-button {
        bottom: 1rem;
    }

    .loading-spinner,
    .ledger-device-container {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        transition: opacity .4s;
    }

    .ledger-device-container {
        width: var(--ledger-container-width);
        transform: translate(-50%, calc(-50% + var(--ledger-y-offset)));
        transition: opacity .4s, transform .4s, width .4s;
    }

    .ledger-device-container::before {
        /* fixed aspect ratio */
        content: "";
        display: block;
        padding-top: 21%;
    }

    .ledger-device-container :deep(*) {
        position: absolute;
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
    }

    .ledger-opacity-container {
        /* the ledger-device-container size and screen sizes were initially chosen such that the opacity container has
        exactly the size of the the ledger-device-container at scale factor 2. For other factors adapt size. */
        top: calc(50% * (1 - 2 / var(--ledger-scale-factor)));
        left: calc(50% * (1 - 2 / var(--ledger-scale-factor)));
        width: calc(100% * (2 / var(--ledger-scale-factor)));
        height: calc(100% * (2 / var(--ledger-scale-factor)));
    }

    .ledger-device,
    .ledger-cable {
        top: 0;
        width: 100%;
        height: 100%;
    }

    .ledger-opacity-container {
        transform: scale(var(--ledger-scale-factor)) translateX(27.3%);
        opacity: var(--ledger-opacity);
    }

    .ledger-device {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 61" fill="white"><path d="M145.5 46C137 46 130 39 130 30.5S137 15 145.5 15 161 22 161 30.5 154 46 145.5 46zm0-29c-7.4 0-13.5 6.1-13.5 13.5S138.1 44 145.5 44 159 37.9 159 30.5 152.9 17 145.5 17z"/><path d="M285.5 3H107V2a2 2 0 0 0-2-2H89a2 2 0 0 0-2 2v1H41V2a2 2 0 0 0-2-2H23a2 2 0 0 0-2 2v1H4C1.8 3 0 4.8 0 7v47c0 2.2 1.8 4 4 4h281.5c2.5 0 4.5-2 4.5-4.5v-46c0-2.5-2-4.5-4.5-4.5zM102 40.9c0 1.1-.9 2.1-2 2.1H28c-1.1 0-2-.9-2-2.1V20.1c0-1.1.9-2.1 2-2.1h72c1.1 0 2 .9 2 2.1v20.8zm186 12.6c0 1.4-1.1 2.5-2.5 2.5h-140C131.4 56 120 44.6 120 30.5S131.4 5 145.5 5h140c1.4 0 2.5 1.1 2.5 2.5v46z"/></svg>');
    }

    .ledger-cable {
        right: 94.2%;
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 61"><path fill="white" d="M289.3 38.5c0 1.4-1 2.5-2 2.5h-18c-1.2 0-2-1.1-2-2.5v-16c0-1.4.8-2.5 2-2.5h18c1 0 2 1.1 2 2.5z" opacity=".7"/><path fill="%231f2348" d="M284.3 27h-8c-.7 0-1-.4-1-1s.3-1 1-1h8c.5 0 1 .4 1 1s-.5 1-1 1zM284.3 36h-8c-.7 0-1-.4-1-1s.3-1 1-1h8c.5 0 1 .4 1 1s-.5 1-1 1z" opacity=".5"/><path fill="white" d="M269.3 18h-27c-2.9 0-5 2.4-5 5.4V29H1.3v3h236v5.6c0 3 2.1 5.4 5 5.4h27c1 0 2-1 2-2.2V20.2c0-1.2-1-2.2-2-2.2z"/></svg>');
    }

    .ledger-screen {
        top: 10%;
        left: 24.25%;
        width: 51%;
        height: 77%;
        justify-content: center;
        align-items: center;
        display: none;
    }

    .ledger-screen-pin {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 114 37.5"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12.2 17.5l-2.7 2.7-2.8-2.7M101.8 20.2l2.7-2.7 2.8 2.7"/><text fill="white" font-family="sans-serif" font-size="10" transform="translate(36.4 13.5)">PIN code</text></svg>');
    }

    .ledger-pin-dot {
        position: unset;
        margin: 1%;
        margin-top: 13%;
        width: 5%;
        height: 15.7%;
    }

    .nimiq .ledger-screen-dashboard {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 114 37.5"><path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M103.5 16.2l2.7 2.7-2.7 2.8m-93 .1L7.8 19l2.7-2.8M40.2 14.5h3.6m26.4 0h3.6"/><text font-family="sans-serif" font-size="11.2" transform="translate(41.3 32.3)">Nimiq</text><path d="M27.3 14.8h-.6v1.9h.2c.7 0 2.2 0 2.2-.9 0-.8-1-1-1.8-1zm1.4-1.7c0-.8-.9-.9-1.5-.9h-.5V14h.1c.7 0 1.9 0 1.9-.9z"/><path d="M27.5 7.5a7 7 0 0 0-7 7c0 3.9 3.1 7 7 7s7-3.1 7-7a7 7 0 0 0-7-7zm3.3 8.4c-.1 1.4-1.2 1.7-2.6 1.9v1.4h-.9v-1.4h-.7v1.4h-.8v-1.4h-1.7l.2-1h.7c.3 0 .3-.2.3-.3v-3.8c0-.2-.2-.4-.5-.4h-.6v-.9H26V9.9h.8v1.5h.7V9.9h.9v1.4c1.1.1 2 .4 2.1 1.4 0 .8-.3 1.2-.8 1.5.7.2 1.2.6 1.1 1.7zm33.5-2l-3.1-5.3c-.2-.4-.6-.6-1.1-.6h-6.3c-.4 0-.9.2-1.1.6l-3.1 5.3c-.2.4-.2.8 0 1.2l3.1 5.3c.2.4.6.6 1.1.6h6.3c.4 0 .9-.2 1.1-.6l3.1-5.3c.3-.4.3-.8 0-1.2zm22.2-6.4a7 7 0 0 0-7 7c0 3.9 3.1 7 7 7s7-3.1 7-7a7 7 0 0 0-7-7zm0 11.5l-3-4 3 1.8 3-1.8-3 4zm0-2.8l-3-1.7 3-4.5 3 4.5-3 1.7z"/></svg>');
    }

    .bitcoin .ledger-screen-dashboard {
        background-image: url('data:image/svg+xml,<svg fill="white" viewBox="0 0 114 37.5" xmlns="http://www.w3.org/2000/svg"><path d="M35 13.9l-3.1-5.3c-.2-.4-.6-.6-1.1-.6h-6.3c-.4 0-1 .2-1.1.6l-3.1 5.3c-.2.4-.2.8 0 1.2l3 5.3c.3.4.7.6 1.2.6h6.3c.4 0 .9-.2 1-.6l3.2-5.3c.3-.4.3-.8 0-1.2z"/><path d="M103.5 16.2l2.7 2.7-2.7 2.8m-93 .1L7.8 19l2.7-2.8m29.7-1.7h3.6m26.4 0h3.6" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/><text x="40.2" y="32.3" font-family="sans-serif" font-size="11.2">Bitcoin</text><path d="M57 7.5a7 7 0 00-7 7c0 3.9 3 7 7 7s7-3.1 7-7a7 7 0 00-7-7zm-1.6 2.4h.8v1.5h.7V9.9h1v1.4c1 .1 2 .4 2 1.4 0 .8-.3 1.2-.8 1.5.7.2 1.2.6 1.1 1.7 0 1.4-1.2 1.7-2.6 1.9v1.4h-.9v-1.4H56v1.4h-.8v-1.4h-1.7l.2-1h.7c.3 0 .3-.2.3-.3v-3.8c0-.2-.2-.4-.5-.4h-.6v-.9h1.8zm.7 2.3V14h.1c.7 0 2 0 2-.9 0-.8-1-.9-1.6-.9zm0 2.6v1.9h.2c.7 0 2.2 0 2.2-.9 0-.8-1-1-1.8-1zM86.5 7.5a7 7 0 00-7 7c0 3.9 3.1 7 7 7s7-3.1 7-7a7 7 0 00-7-7zm0 2.5l3 4.5-3 1.7-3-1.7 3-4.5zm-3 5l3 1.8 3-1.8-3 4-3-4z"/></svg>');
    }

    .nimiq .ledger-screen-app {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 114 37.5"><g fill="white" stroke-width=".4"><path d="M34.2 17.7l-5.4-9.3a2.1 2.1 0 0 0-1.9-1.1H16.2a2.1 2.1 0 0 0-1.9 1L9 17.8a2.1 2.1 0 0 0 0 2.1l5.3 9.3a2.1 2.1 0 0 0 1.9 1.1h10.7a2.1 2.1 0 0 0 1.9-1l5.4-9.4a2.1 2.1 0 0 0 0-2.1zM53.2 12h2.4v13.5h-1.8l-7.4-9.4v9.4h-2.3V12H46l7.3 9.5zM60.2 25.6V12h2.5v13.6zM78.7 12h2v13.5h-2.2v-8.4l-3.7 8.4h-1.6l-3.7-8.4v8.4h-2.1V12h2L74 22.6zM85.3 25.6V12h2.5v13.6zM104.5 22.4a5.7 5.7 0 0 1-2.9 2.8 7.5 7.5 0 0 0 1.1 1.4 13.6 13.6 0 0 0 1.5 1.4l-1.8 1.3a10.4 10.4 0 0 1-1.7-1.6 11.4 11.4 0 0 1-1.4-2h-.6a7 7 0 0 1-3.5-.8 5.6 5.6 0 0 1-2.3-2.5 8.4 8.4 0 0 1-.8-3.7 8 8 0 0 1 .8-3.7 5.7 5.7 0 0 1 2.3-2.4 7.8 7.8 0 0 1 7 0 5.6 5.6 0 0 1 2.3 2.4 8 8 0 0 1 .8 3.7 8.3 8.3 0 0 1-.8 3.7zm-8.8 0a4.2 4.2 0 0 0 6 0c.7-.8 1.1-2 1.1-3.7s-.4-2.8-1-3.7a4.2 4.2 0 0 0-6.1 0c-.8.9-1.1 2.1-1.1 3.7s.3 2.9 1 3.8z"/></g></svg>');
    }

    .bitcoin .ledger-screen-app {
        background-image: url('data:image/svg+xml,<svg viewBox="0 0 114 37.5" xmlns="http://www.w3.org/2000/svg"><path d="M21.6 7.3A11.5 11.5 0 0010 18.8c0 6.4 5 11.4 11.5 11.4 6.4 0 11.4-5 11.4-11.4A11.5 11.5 0 0021.6 7.3zm-2.5 4h1.3v2.4h1.2v-2.5H23v2.3c1.8.2 3.2.7 3.4 2.3 0 1.3-.5 2-1.3 2.5 1.1.3 2 1 1.8 2.8-.2 2.3-2 2.7-4.3 3v2.4h-1.5v-2.3h-1.1v2.3h-1.3v-2.3H16l.3-1.7h1.2c.5 0 .5-.3.5-.5v-6.2c0-.3-.4-.6-.8-.6h-1v-1.5h3zm1.2 3.7v3h.1c1.2 0 3.1 0 3.1-1.5 0-1.3-1.4-1.5-2.4-1.5zm0 4.3v3h.3c1.1 0 3.6 0 3.6-1.4 0-1.3-1.6-1.6-3-1.6zm73.3 6.2v-6.7-1.4l-.1-1.3h2.2l.2 1.9h-.2q.4-1 1.3-1.6.9-.5 2-.5 3.4 0 3.4 3.9v5.7h-2.3V20q0-1.1-.5-1.7-.4-.5-1.3-.5-1 0-1.7.7t-.7 1.8v5.3zm-4.8 0v-9.4H91v9.4zm-.2-13.7h2.6v2.3h-2.6zM82 25.7q-1.5 0-2.6-.6-1-.6-1.6-1.7-.6-1.1-.6-2.6t.6-2.6q.6-1.1 1.6-1.7 1.1-.6 2.6-.6 1.4 0 2.5.6 1 .6 1.7 1.7.6 1 .6 2.6 0 1.5-.6 2.6-.6 1-1.7 1.7-1 .6-2.5.6zm0-1.8q1.2 0 1.8-.8.6-.8.6-2.3 0-1.5-.6-2.3-.6-.8-1.8-.8-1.2 0-1.8.8-.7.8-.7 2.3 0 1.5.7 2.3.6.8 1.8.8zm-9.4 1.8q-1.5 0-2.6-.6-1-.6-1.6-1.7-.6-1-.6-2.6 0-1.5.6-2.6t1.7-1.7q1.1-.6 2.6-.6 1 0 2 .3.9.3 1.5.9l-.7 1.6q-.6-.5-1.3-.7-.7-.3-1.3-.3-1.3 0-2 .8t-.7 2.3q0 1.5.7 2.3.7.8 2 .8.6 0 1.3-.3.7-.2 1.3-.7l.7 1.6q-.7.6-1.6.9-1 .3-2 .3zM60 17.9V16h6.6V18zm6.6 5.7v1.9l-.7.1h-.8q-1.6 0-2.5-.8-.8-1-.8-2.6v-8.4l2.3-.8v9q0 .7.2 1.1.2.4.6.5.3.2.7.2h.5l.5-.2zm-10.3 2V16h2.3v9.4zm-.1-13.8h2.6v2.3h-2.6zM43.7 25.5V12.3h5.8q2 0 3.3.9 1.1.9 1.1 2.5 0 1.1-.6 2t-1.7 1q1.3.2 2 1 .7 1 .7 2.2 0 1.7-1.2 2.7-1.2 1-3.4 1zm2.4-1.8h3.4q1.3 0 1.9-.5.6-.5.6-1.5t-.6-1.5-2-.5h-3.3zm0-5.8h3q1.3 0 2-.5.6-.5.6-1.4 0-1-.7-1.4-.6-.5-1.9-.5h-3z" fill="white" stroke-width=".4"/></svg>');
    }

    .ledger-screen-confirm-address {
        /* Port fix: upstream cf2ea41 misses the leading '<' of '<svg', which breaks this
           data URI (the confirm-address screen renders blank in the Hub). Restored here. */
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 114 37.5"><text font-family="sans-serif" font-size="11" transform="translate(36.5 16.5)"><tspan x="0" y="0">Confirm </tspan><tspan x="-.9" y="12">Address</tspan></text><path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.2 21.2l-5.5-5.5m5.5.1l-5.5 5.5m98.5-5.5l-5.5 5.5-2.5-2.5"/></svg>');
    }

    .ledger-device-container[illustration="confirm-address"] .ledger-screen-confirm-address {
        display: block;
    }

    .ledger-screen-confirm-transaction {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 114 37.5"><text font-family="sans-serif" font-size="11" transform="translate(36.5 16.5)"><tspan x="0" y="0">Confirm </tspan><tspan x="-10.2" y="12">Transaction</tspan></text><path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.2 21.2l-5.5-5.5m5.5.1l-5.5 5.5m98.5-5.5l-5.5 5.5-2.5-2.5"/></svg>');
    }

    .ledger-device-container[illustration="confirm-transaction"] .ledger-screen-confirm-transaction {
        display: block;
    }

    .ledger-screen-confirm-message {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 114 37.5"><text font-family="sans-serif" font-size="11" transform="translate(36.5 16.5)"><tspan x="0" y="0">Confirm </tspan><tspan x="-3" y="12">Message</tspan></text><path fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.2 21.2l-5.5-5.5m5.5.1l-5.5 5.5m98.5-5.5l-5.5 5.5-2.5-2.5"/></svg>');
    }

    .ledger-device-container[illustration="confirm-message"] .ledger-screen-confirm-message {
        display: block;
    }

    /* Connect Animation */

    .ledger-device-container[illustration="connecting"][connect-animation-step="1"] .ledger-opacity-container {
        animation: ledger-fade-in var(--ledger-connect-animation-step-duration) both;
    }
    .ledger-device-container[illustration="connecting"][connect-animation-step="1"] .ledger-cable {
        animation: ledger-connect-cable var(--ledger-connect-animation-step-duration) both;
    }

    .ledger-device-container[illustration="connecting"][connect-animation-step="2"] .ledger-opacity-container {
        animation: ledger-scale var(--ledger-connect-animation-step-duration) both;
    }
    .ledger-device-container[illustration="connecting"][connect-animation-step="2"] .ledger-screen-pin {
        animation: ledger-show-screen-pin var(--ledger-connect-animation-step-duration) both;
        display: flex;
    }
    .ledger-device-container[illustration="connecting"][connect-animation-step="2"] .ledger-pin-dot {
        animation: ledger-show-pin-dot var(--ledger-connect-animation-step-duration) both;
    }

    .ledger-device-container[illustration="connecting"][connect-animation-step="3"] .ledger-opacity-container {
        animation: ledger-fade-out var(--ledger-connect-animation-step-duration) both;
    }
    .ledger-device-container[illustration="connecting"][connect-animation-step="3"] .ledger-screen-dashboard,
    .ledger-device-container[illustration="connecting"][connect-animation-step="4"] .ledger-screen-dashboard {
        /* The dashboard animation duration spans two steps (but can be cut after the first step), see below */
        animation: ledger-show-screen-dashboard calc(2 * var(--ledger-connect-animation-step-duration)) both;
        display: flex;
    }
    .ledger-device-container[illustration="connecting"][connect-animation-step="3"] .ledger-screen-app {
        animation: ledger-show-screen-app var(--ledger-connect-animation-step-duration) both;
        display: flex;
    }

    .has-connect-button [illustration="connecting"][connect-animation-step="3"] .ledger-opacity-container,
    .has-connect-button [illustration="connecting"][connect-animation-step="4"] .ledger-opacity-container {
        /* Span animation over two animation steps via animation delay */
        animation: ledger-fade-out var(--ledger-connect-animation-step-duration)
            var(--ledger-connect-animation-step-duration) both;
    }
    .has-connect-button [illustration="connecting"][connect-animation-step="3"] .ledger-screen-app,
    .has-connect-button [illustration="connecting"][connect-animation-step="4"] .ledger-screen-app {
        /* Use animation with double the duration to span over two animation steps */
        animation: ledger-show-screen-app-double-duration calc(2 * var(--ledger-connect-animation-step-duration)) both;
        display: flex;
    }

    .is-wrong-app-connected [illustration="connecting"][connect-animation-step="3"] .ledger-opacity-container,
    .is-wrong-app-connected [illustration="connecting"][connect-animation-step="4"] .ledger-opacity-container {
        /* Keep the device displayed without animating it */
        animation: none;
    }
    .is-wrong-app-connected [illustration="connecting"][connect-animation-step="3"] .ledger-screen-app,
    .is-wrong-app-connected [illustration="connecting"][connect-animation-step="4"] .ledger-screen-app {
        /* Use animation with double the duration even if there is only a single animation step, to avoid too quick back
        and forth switching between the dashboard and the app screen. Note that the dashboard animation is also designed
        to span two animation steps to run in sync with the app animation. */
        animation: ledger-show-screen-app-double-duration calc(2 * var(--ledger-connect-animation-step-duration)) both;
        /* Keep the animation running */
        animation-iteration-count: infinite;
    }
    .is-wrong-app-connected [illustration="connecting"][connect-animation-step="3"] .ledger-screen-dashboard,
    .is-wrong-app-connected [illustration="connecting"][connect-animation-step="4"] .ledger-screen-dashboard {
        /* Keep the animation running */
        animation-iteration-count: infinite;
    }

    @keyframes ledger-connect-cable {
        0% {
            transform: translateX(-50%);
        }
        75%, 100% {
            transform: translateX(0);
        }
    }

    @keyframes ledger-fade-in {
        0% {
            opacity: 0;
            transform: scale(1);
        }
        10%, 100% {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes ledger-scale {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        25%, 100% {
            opacity: var(--ledger-opacity);
            transform: scale(var(--ledger-scale-factor)) translateX(27.3%);
        }
    }

    @keyframes ledger-fade-out {
        0%, 95% {
            opacity: var(--ledger-opacity);
        }
        100% {
            opacity: 0;
        }
    }

    @keyframes ledger-show-screen-pin {
        0% {
            opacity: 0;
            transform: scale(calc(1 / var(--ledger-scale-factor))) translateX(-105%);
        }
        5% {
            opacity: 1;
        }
        25% {
            transform: scale(1);
        }
        95% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @keyframes ledger-show-pin-dot {
        0%, 12% {
            background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="30" height="3" x="1" y="28" fill="white" ry="1.5"/></svg>');
        }
        17%, 100% {
            background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="white"/></svg>');
        }
    }

    /* This animation is designed for a duration of two animation steps to run in sync with the app animation if it runs
    over 2 steps but the actual animation happens within the first animation step and the second animation step is just
    transparency such that the animation can also be cut after the first step. */
    @keyframes ledger-show-screen-dashboard {
        0% {
            opacity: 0;
        }
        2.5%, 25% {
            opacity: 1;
        }
        27.5%, 100% {
            opacity: 0;
        }
    }

    @keyframes ledger-show-screen-app {
        0%, 55% {
            opacity: 0;
        }
        60%, 95% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @keyframes ledger-show-screen-app-double-duration {
        0%, 27.5% {
            opacity: 0;
        }
        30%, 97.5% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    @keyframes connect-button-pulsate {
        100% {
            background-color: rgba(255, 255, 255, var(--ledger-opacity));
        }
    }

    .ledger-ui .ledger-pin-dot:nth-child(2) {
        animation-delay: calc(1 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }
    .ledger-ui .ledger-pin-dot:nth-child(3) {
        animation-delay: calc(2 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }
    .ledger-ui .ledger-pin-dot:nth-child(4) {
        animation-delay: calc(3 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }
    .ledger-ui .ledger-pin-dot:nth-child(5) {
        animation-delay: calc(4 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }
    .ledger-ui .ledger-pin-dot:nth-child(6) {
        animation-delay: calc(5 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }
    .ledger-ui .ledger-pin-dot:nth-child(7) {
        animation-delay: calc(6 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }
    .ledger-ui .ledger-pin-dot:nth-child(8) {
        animation-delay: calc(7 * var(--ledger-connect-animation-step-duration) / 1.15 / 8) !important;
    }

    /* transition-fade (hub App.vue global CSS; elements carry their own opacity .4s
       transition), Vue 3 class names */
    .transition-fade-enter-from,
    .transition-fade-leave-to {
        opacity: 0;
    }

    /* Port addition (not upstream): honor prefers-reduced-motion. The instruction cycle
       is also not started (script); the illustration rests on the plugged-in device. */
    @media (prefers-reduced-motion: reduce) {
        .ledger-device-container[illustration="connecting"] :deep(*),
        .connect-button.pulsate {
            animation: none !important;
        }

        .ledger-device-container[illustration="connecting"] .ledger-opacity-container {
            transform: scale(1);
            opacity: 1;
        }

        .ledger-device-container[illustration="connecting"] .ledger-screen {
            display: none;
        }
    }
</style>
