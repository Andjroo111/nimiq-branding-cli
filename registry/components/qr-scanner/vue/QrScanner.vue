<template>
    <div ref="root$" class="qr-scanner nq-blue-bg">
        <video ref="video$" muted autoplay playsinline width="600" height="600"></video>
        <div ref="overlay$" class="overlay" :class="{ inactive: cameraAccessFailed }">
            <slot>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 238 238">
                    <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M31.3 2H10a8 8 0 0 0-8 8v21.3M206.8 2H228a8 8 0 0 1 8 8v21.3m0 175.4V228a8 8 0 0 1-8 8h-21.3m-175.4 0H10a8 8 0 0 1-8-8v-21.3"/>
                </svg>
            </slot>
        </div>
        <button class="nq-button-s inverse cancel-button" @click="emit('cancel')">Cancel</button>

        <transition name="fade">
            <div v-if="cameraAccessFailed" class="camera-access-failed">
                <div v-if="!hasCamera" class="camera-access-failed-warning">
                    Your device does not have an accessible camera.
                </div>
                <div v-else>
                    <div class="camera-access-failed-warning">
                        Unblock the camera for this website to scan QR codes.
                    </div>
                    <div v-if="isMobileOrTablet">
                        <div v-if="browser === 'chrome'">
                            <!-- Upstream interpolates the icon via the I18n component;
                                 flattened here with the en-US source string. -->
                            <div class="access-denied-instructions">
                                Click on <span class="browser-menu-icon"></span> and go to
                                Settings &gt; Site Settings &gt; Camera
                            </div>
                            <div class="browser-menu-arrow"></div>
                        </div>
                        <div v-else class="access-denied-instructions">
                            <!-- Mobile safari and mobile firefox ask on every camera request -->
                            Grant camera access when asked.
                        </div>
                    </div>
                    <div v-else class="access-denied-instructions">
                        <div v-if="browser === 'safari'">
                            Click on <b>Safari</b> and go to
                            Settings for this Website &gt; Camera
                        </div>
                        <div v-else>
                            Click on
                            <span v-if="browser === 'chrome'" class="camera-icon-chrome"></span>
                            <span v-else-if="browser === 'firefox'" class="camera-icon-firefox"></span>
                            <span v-else>the camera icon</span>
                            in the URL bar.
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components QrScanner.vue.
//
// CAMERA REQUIREMENTS (why this cannot be pixel-verified headless):
// - a physical camera and the user's permission (getUserMedia prompt);
// - a secure context: HTTPS or localhost — getUserMedia does not exist on
//   plain HTTP;
// - most browsers additionally require a user gesture before the prompt, so
//   mount/start the scanner from a click (the upstream storybook mounts it on
//   demand for the same reason).
// On failure the component flips to the inactive state (white corner frame +
// per-browser unblock instructions) and retries every 3 seconds.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import QrScannerLib from 'qr-scanner';

const props = withDefaults(defineProps<{
    /** Minimum ms between repeated 'result' emits for the same scan result. */
    reportFrequency?: number,
    /** Results failing this check are not emitted. */
    validate?: (scanResult: string) => boolean,
}>(), {
    reportFrequency: 7000,
});

const emit = defineEmits<{
    (event: 'result', result: string): void,
    (event: 'cancel'): void,
    (event: 'error', error: unknown): void,
}>();

// --- Inlined from @nimiq/utils BrowserDetection (the subset used here) ---

function isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    // Also includes tablets.
    return /i?Phone|iP(ad|od)|Android|BlackBerry|Opera Mini|WPDesktop|Mobi(le)?|Silk/i.test(navigator.userAgent);
}

type Browser = 'chrome' | 'firefox' | 'opera' | 'edge' | 'safari' | 'brave' | 'unknown';

function detectBrowser(): Browser {
    if (typeof navigator === 'undefined') return 'unknown';
    // note that the order is important as many browsers include the names of others in the ua.
    const ua = navigator.userAgent;
    if (/Edge\//i.test(ua)) return 'edge';
    if (/(Opera|OPR)\//i.test(ua)) return 'opera';
    if (/Firefox\//i.test(ua)) return 'firefox';
    if (/Chrome\//i.test(ua)) {
        // Brave is indistinguishable from Chrome apart from missing plugins/mimeTypes (desktop only).
        return (navigator.plugins.length === 0 && navigator.mimeTypes.length === 0 && !isMobile())
            ? 'brave'
            : 'chrome';
    }
    if (/^((?!chrome|android).)*safari/i.test(ua)) return 'safari';
    return 'unknown';
}

// --- end inlined helpers ---

const root$ = ref<HTMLElement | null>(null);
const video$ = ref<HTMLVideoElement | null>(null);
const overlay$ = ref<HTMLElement | null>(null);

const cameraAccessFailed = ref(false);
const hasCamera = ref(true);
const isMobileOrTablet = isMobile();
const browser = detectBrowser();

let scanner: QrScannerLib | null = null;
let lastResult: string | undefined;
let lastResultTime = 0;
let cameraRetryTimer: number | null = null;

onMounted(() => {
    const $video = video$.value!;
    scanner = new QrScannerLib($video, (result: string) => onResult(result));
    $video.addEventListener('canplay', () => $video.classList.add('ready'));
    window.addEventListener('resize', repositionOverlay);

    QrScannerLib.hasCamera().then((has) => { hasCamera.value = has; });

    if (isVisible()) {
        start();
        repositionOverlay();
    }
});

onBeforeUnmount(() => {
    stop();
    if (scanner) scanner.destroy();
    window.removeEventListener('resize', repositionOverlay);
});

async function start(): Promise<boolean> {
    if (!scanner) return false;
    try {
        await scanner.start();
        cameraAccessFailed.value = false;
        if (cameraRetryTimer) {
            window.clearInterval(cameraRetryTimer);
            cameraRetryTimer = null;
        }
    } catch (e) {
        cameraAccessFailed.value = true;
        emit('error', e);
        if (!cameraRetryTimer) {
            cameraRetryTimer = window.setInterval(() => start(), 3000);
        }
    }
    return !cameraAccessFailed.value;
}

function stop() {
    if (scanner) scanner.stop();
    if (cameraRetryTimer) {
        window.clearInterval(cameraRetryTimer);
        cameraRetryTimer = null;
    }
}

function setGrayscaleWeights(red: number, green: number, blue: number) {
    if (scanner) scanner.setGrayscaleWeights(red, green, blue);
}

function setInversionMode(inversionMode: QrScannerLib.InversionMode) {
    if (scanner) scanner.setInversionMode(inversionMode);
}

function repositionOverlay() {
    requestAnimationFrame(() => {
        if (!root$.value || !overlay$.value) return;
        const scannerHeight = root$.value.offsetHeight;
        const scannerWidth = root$.value.offsetWidth;
        const smallerDimension = Math.min(scannerHeight, scannerWidth);
        if (smallerDimension === 0) return; // component not visible or destroyed
        const overlaySize = Math.ceil(2 / 3 * smallerDimension);
        // not always the accurate size of the sourceRect for QR detection in QrScannerLib (e.g. if video is
        // landscape and screen portrait) but looks nicer in the UI.
        const $qrOverlay = overlay$.value;
        $qrOverlay.style.width = overlaySize + 'px';
        $qrOverlay.style.height = overlaySize + 'px';
        $qrOverlay.style.top = ((scannerHeight - overlaySize) / 2) + 'px';
        $qrOverlay.style.left = ((scannerWidth - overlaySize) / 2) + 'px';
    });
}

function isVisible() {
    return !!root$.value && root$.value.offsetWidth > 0;
}

function onResult(result: string) {
    if ((result === lastResult && Date.now() - lastResultTime < props.reportFrequency)
        || (props.validate && !props.validate(result))) return;
    lastResult = result;
    lastResultTime = Date.now();
    emit('result', result);
}

defineExpose({ start, stop, setGrayscaleWeights, setInversionMode, repositionOverlay });
</script>

<style scoped>
    .qr-scanner {
        position: relative;
        overflow: hidden;
    }

    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
        transition: .7s;
    }

    .fade-leave-from,
    .fade-enter-to {
        opacity: 1;
        transition: .7s;
    }

    video {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
        opacity: 0;
        transition: opacity .3s;
    }

    video.ready {
        opacity: 1;
    }

    .overlay {
        position: absolute;
    }

    .overlay:not(.inactive) {
        animation: overlay-animation 400ms infinite alternate ease-in-out;
    }

    @keyframes overlay-animation {
        from {
            transform: scale(.98);
        }
        to {
            transform: scale(1.01);
        }
    }

    .overlay svg,
    .overlay :deep(svg) {
        width: 100%;
        height: 100%;
        stroke: var(--nimiq-gold);
    }

    .overlay.inactive svg,
    .overlay.inactive :deep(svg) {
        stroke: rgba(255, 255, 255, .4);
    }

    .cancel-button {
        background: white;
        position: absolute;
        bottom: 3rem;
        left: 50%;
        transform: translateX(-50%);
        color: var(--nimiq-blue);
    }

    .cancel-button:hover,
    .cancel-button:focus,
    .cancel-button:active {
        background: #EFF0F2; /* Indigo 7% */
    }

    .camera-access-failed {
        color: white;
        text-align: center;
        font-size: 2rem;
    }

    .camera-access-failed-warning {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30rem;
        max-width: 80%;
        font-weight: bold;
    }

    .access-denied-instructions {
        opacity: .7;
        position: absolute;
        left: 50%;
        bottom: 9rem;
        width: calc(100% - 4rem);
        transform: translateX(-50%);
        line-height: 1.7;
        white-space: pre-line;
    }

    .browser-menu-icon,
    .camera-icon-chrome,
    .camera-icon-firefox {
        display: inline-block;
        background-repeat: no-repeat;
        margin: 0 .2em;
        position: relative;
        top: .2em;
    }

    .browser-menu-icon {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 3 15"><circle cx="1.5" cy="1.5" r="1.5"/><circle cx="1.5" cy="7.5" r="1.5"/><circle cx="1.5" cy="13.5" r="1.5"/></svg>');
        height: 1em;
        width: calc(1em * (3 / 15));
    }

    .camera-icon-chrome {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 12"><path fill="%23FF5C48" fill-rule="evenodd" d="M7.8 5h5.4c.4 0 .8.4.8.8v5.4c0 .4-.4.8-.9.8H7.8c-.4 0-.8-.4-.8-.9V5.8c0-.4.4-.8.8-.8zm4.04 4.85c.2-.2.2-.5 0-.7l-.64-.65.65-.65c.2-.2.2-.5 0-.7a.5.5 0 0 0-.7 0l-.66.64-.63-.64a.5.5 0 0 0-.71 0c-.2.2-.2.5 0 .7l.64.65-.64.65c-.2.2-.2.5 0 .7a.48.48 0 0 0 .7 0l.64-.64.65.64a.48.48 0 0 0 .7 0z" clip-rule="evenodd"/><path fill="white" d="M6 5.8C6 4.8 6.8 4 7.8 4H12V.5L9.5 3V.5C9.5.2 9.3 0 9 0H.5C.2 0 0 .2 0 .5v7c0 .3.2.5.5.5H6V5.8z"/></svg>');
        height: .8em;
        width: calc(.8em * (14 / 12));
    }

    .camera-icon-firefox {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 14 14"><path d="M13.5.3c-.4-.4-.9-.4-1.3 0L9.7 2.8c-.1-.5-.5-.9-1-.9H1c-.6 0-1 .4-1 1v7.7c0 .5.4.9.9 1l-.6.6c-.4.4-.4.9 0 1.3l.6.3c.2 0 .5-.1.6-.3l12-12a1 1 0 0 0 0-1.2zM13.7 11.6V3.5l-4 4.1 4 4zM8.7 11.6c.6 0 1-.4 1-1v-3l-4 4h3z"/></svg>');
        height: .9em;
        width: .9em;
    }

    .browser-menu-arrow {
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 23"><path stroke="%230CA6FE" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 22V3M2 9l7-7 7 7"/></svg>');
        animation: arrow-bounce 400ms infinite alternate ease-in-out;
        position: fixed;
        top: 3rem;
        right: 2.2rem;
        width: 2rem;
        height: calc(2rem / (18 / 23)); /* calculate from aspect ratio and width */
    }

    @keyframes arrow-bounce {
        to {
            transform: translateY(-1rem);
        }
    }
</style>
