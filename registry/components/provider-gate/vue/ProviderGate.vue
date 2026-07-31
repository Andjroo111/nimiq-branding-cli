<!--
  ProviderGate: the fleet's environment and wallet-status gate (ORIGINAL
  composition, no upstream; built ON the status-alert family, the one
  legitimate pill/callout family, rule 17).

  Two forms in one component:
  - STRIP (default): a non-blocking one-line banner with canned copy +
    semantic color per state: demo (neutral) | open-in-wallet (blue info,
    optional deep-link action) | connected (green) | testnet | simulated
    (orange warning).
  - WALL (:wall="true"): for states that block (open-in-wallet), renders the
    tipjar-style handoff wall instead: signet + headline + QR deep link +
    open button + copy-link fallback. Non-blocking states still render the
    strip. Typical use: wall on desktop, strip on mobile.

      <ProviderGate
          :detect="() => (detectModeSync() === 'miniapp' ? 'connected' : 'open-in-wallet')"
          :wall="isDesktop"
          page-url="https://pay.example/creator"
          ref="gate"
      />
      gate.value?.setState('demo')  // e.g. after a probe resolves { fake: true }

  THE APP-SHELL STATE MAPPING (nimiq-app-shell src/wallet/detect.ts and the
  tipjar onboard-core probe). No hard dependency, detect is the only seam:

      detectModeSync() === 'miniapp'   -> 'connected'       (host or provider present)
      detectModeSync() === 'hub'       -> 'open-in-wallet'  (standalone browser)
      probe.fake (nimiqPay.connect())  -> 'demo'            (the offline test loop)
      app config: mock settlement      -> 'simulated'
      app config: network === testnet  -> 'testnet'

  Suggested precedence when several apply: demo > simulated > open-in-wallet
  > testnet > connected. A null state hides the gate entirely.

  The wall's open button uses the legacy .nq-button (import @nimiq/style).
  Copy is sentence case; short status labels carry no period, running
  sentences do; localize via the labels prop.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
// npm dep: qr-creator (pinned 1.0.0, the qr-code component recipe)
import QrCreator from 'qr-creator'

// Module-level counter for unique gradient ids across instances (rule 3).
let gradSeq = 0

type GateState = 'demo' | 'open-in-wallet' | 'connected' | 'testnet' | 'simulated'

interface GateLabels {
    demo?: string
    openInWallet?: string
    connected?: string
    testnet?: string
    simulated?: string
    open?: string
    wallTitle?: string
    wallMessage?: string
    copyLink?: string
    linkCopied?: string
}

const props = withDefaults(defineProps<{
    state?: GateState | null
    /** Called at init and on refresh(); wins over state. The injection seam. */
    detect?: () => GateState | null | undefined
    /** The page the deep link reopens; default location.href. */
    pageUrl?: string
    /** Full deep link override; default nimiqpay://miniapp?url=<pageUrl>. */
    deepLink?: string
    /** Blocking states render the handoff wall instead of the strip. */
    wall?: boolean
    labels?: GateLabels
}>(), {
    state: null,
    wall: false,
})

const DEFAULT_LABELS: Required<GateLabels> = {
    demo: 'Demo mode. No real payments.',
    openInWallet: 'Open inside Nimiq Pay for live payments',
    connected: 'Connected to Nimiq Pay',
    testnet: 'Testnet. Coins have no value.',
    simulated: 'Simulated payments. No coins move.',
    open: 'Open in Nimiq Pay',
    wallTitle: 'Open in Nimiq Pay',
    wallMessage: 'Live payments need Nimiq Pay. Scan the code with your phone or open this page inside the app.',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
}
const L = computed(() => ({ ...DEFAULT_LABELS, ...(props.labels || {}) }))

/** The deep link that reopens a page INSIDE Nimiq Pay (tipjar fleet form). */
function nimiqPayDeepLink(pageUrl: string): string {
    return 'nimiqpay://miniapp?url=' + encodeURIComponent(String(pageUrl || ''))
}

const pageUrl = computed(() => props.pageUrl
    || (typeof location !== 'undefined' ? location.href : ''))
const deepLink = computed(() => props.deepLink || nimiqPayDeepLink(pageUrl.value))

const state = ref<GateState | null>(
    typeof props.detect === 'function' ? (props.detect() ?? null) : props.state)
watch(() => props.state, (next) => {
    if (typeof props.detect !== 'function') state.value = next ?? null
})

const STRIP_COPY: Record<GateState, keyof typeof DEFAULT_LABELS> = {
    'demo': 'demo',
    'open-in-wallet': 'openInWallet',
    'connected': 'connected',
    'testnet': 'testnet',
    'simulated': 'simulated',
}

const showWall = computed(() => props.wall && state.value === 'open-in-wallet')

// Unique signet gradient id per instance (rule 3), the app-header pattern.
const gradId = `nq-provider-gate-hex-grad-${++gradSeq}`

// QR: draw whenever the wall shows (the qr-code component recipe).
const qrCanvas = ref<HTMLCanvasElement | null>(null)
watch([showWall, deepLink, qrCanvas], () => {
    const canvas = qrCanvas.value
    if (!showWall.value || !canvas) return
    QrCreator.render({
        text: deepLink.value,
        radius: 0.5,
        ecLevel: 'M',
        fill: {
            type: 'radial-gradient',
            position: [1, 1, 0, 1, 1, Math.sqrt(2)],
            colorStops: [[0, '#265DD7'], [1, '#0582CA']],
        },
        background: null,
        size: 180,
    }, canvas)
}, { flush: 'post', immediate: true })

// Copy-link fallback: copies the plain page URL (sendable anywhere).
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyLink() {
    try {
        await navigator.clipboard.writeText(pageUrl.value)
        copied.value = true
        clearTimeout(copyTimer)
        copyTimer = setTimeout(() => { copied.value = false }, 2000)
    } catch { /* clipboard unavailable (http, permissions): leave the label */ }
}
onBeforeUnmount(() => clearTimeout(copyTimer))

defineExpose({
    state,
    setState(next: GateState | null) { state.value = next },
    /** Re-run the detect callback (e.g. after a provider injects late). */
    refresh() {
        if (typeof props.detect === 'function') state.value = props.detect() ?? null
    },
})
</script>

<template>
    <div v-if="state && showWall" class="provider-gate-wall">
        <div class="pgw-body">
            <!-- Verbatim Nimiq hexagon (universal ground); unique gradient id (rule 3) -->
            <svg class="pgw-signet" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18" role="img" aria-label="Nimiq">
                <path :fill="`url(#${gradId})`"
                    d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/>
                <defs>
                    <radialGradient :id="gradId" cx="0" cy="0" r="1"
                        gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)"
                        gradientUnits="userSpaceOnUse">
                        <stop stop-color="#ec991c"/>
                        <stop offset="1" stop-color="#e9b213"/>
                    </radialGradient>
                </defs>
            </svg>
            <h2 class="pgw-title">{{ L.wallTitle }}</h2>
            <p class="pgw-message">{{ L.wallMessage }}</p>
            <div class="pgw-qr">
                <canvas ref="qrCanvas" width="180" height="180"
                    aria-label="QR code that opens this page in Nimiq Pay"></canvas>
            </div>
            <div class="pgw-action">
                <a class="nq-button light-blue" :href="deepLink">{{ L.open }}</a>
            </div>
            <p class="pgw-secondary">
                <button type="button" class="pgw-link" @click="copyLink">
                    {{ copied ? L.linkCopied : L.copyLink }}
                </button>
            </p>
        </div>
    </div>
    <div v-else-if="state" class="provider-gate" :data-state="state" role="status">
        <span class="pg-icon" aria-hidden="true"></span>
        <span class="pg-copy">{{ L[STRIP_COPY[state]] }}</span>
        <a v-if="state === 'open-in-wallet' && deepLink" class="pg-action" :href="deepLink">{{ L.open }}</a>
    </div>
</template>

<style scoped>
/* ── Strip: the status-alert semantic treatment (tint bg + 1.5px tonal
   outline + icon mask), nimiq-css light-mode token halves ─────────────── */

.provider-gate {
    --colors-blue:        oklch(0.5849 0.1438 244.29);
    --colors-blue-400:    oklch(0.9545 0.0167 236.69);
    --colors-blue-500:    oklch(0.9109 0.0327 232.24);
    --colors-green:       oklch(0.6932 0.1245 178.48);
    --colors-green-400:   oklch(0.9637 0.017 187.9);
    --colors-green-500:   oklch(0.9307 0.034 185.2);
    --colors-orange:      oklch(0.7387 0.179 56.67);
    --colors-orange-400:  oklch(0.951 0.0221 74.1);
    --colors-orange-500:  oklch(0.9396 0.0436 71.7);
    --colors-neutral:     oklch(0.2737 0.068 276.29);
    --colors-neutral-300: oklch(0.95 0.004 286.32);
    --colors-neutral-400: oklch(0.9203 0.0067 286.27);

    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--pg-bg);
    outline: 1.5px solid var(--pg-ring);
    outline-offset: -1.5px;
    color: var(--pg-text);
    font-family: 'Mulish', 'Muli', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
}

.provider-gate .pg-icon {
    flex: none;
    width: 16px;
    height: 16px;
    background-color: var(--pg-text);
    -webkit-mask: var(--pg-icon-mask) no-repeat center / contain;
    mask: var(--pg-icon-mask) no-repeat center / contain;
}

.provider-gate .pg-copy {
    margin: 0;
    min-width: 0;
}

.provider-gate .pg-action {
    flex: none;
    color: currentColor;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    padding: 12px 0;
    margin: -12px 0 -12px auto;
}
.provider-gate .pg-action:hover {
    text-decoration: underline;
}
.provider-gate .pg-action:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 2px;
}

/* demo: neutral navy. Icon = the real nimiq-icons info circle (icon:info). */
.provider-gate[data-state="demo"] {
    --pg-text: var(--colors-neutral);
    --pg-bg: var(--colors-neutral-300);
    --pg-ring: var(--colors-neutral-400);
    --pg-icon-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 13 13"><rect width="1.368" height="3.649" x="7.184" y="9.693" fill="currentColor" rx=".643" transform="rotate(-180 7.184 9.693)"/><rect width="1.825" height="1.825" x="7.412" y="4.904" fill="currentColor" rx=".857" transform="rotate(-180 7.412 4.904)"/><path stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M6.5 12.202A5.7 5.7 0 116.5.8a5.7 5.7 0 010 11.402z"/></svg>');
}

/* open-in-wallet: blue info. Icon = the status-alert note hexagon. */
.provider-gate[data-state="open-in-wallet"] {
    --pg-text: var(--colors-blue);
    --pg-bg: var(--colors-blue-400);
    --pg-ring: var(--colors-blue-500);
    --pg-icon-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 17"><path stroke="currentColor" stroke-width="1.5" d="m16.824 7.603-3.335-5.92A1.33 1.33 0 0 0 12.335 1H5.666c-.475 0-.915.26-1.153.683l-3.335 5.92a1.397 1.397 0 0 0 0 1.367l3.335 5.92a1.325 1.325 0 0 0 1.153.683h6.668a1.323 1.323 0 0 0 1.154-.683l3.334-5.92c.24-.424.24-.943.002-1.367Z"/><path fill="currentColor" d="M10 12a1 1 0 1 1-2 0V9a1 1 0 0 1 2 0v3Z"/><rect width="2" height="2" x="10" y="7" fill="currentColor" rx="1" transform="rotate(-180 10 7)"/></svg>');
}

/* connected: green success. Icon = the real nimiq-icons checkmark (icon:check). */
.provider-gate[data-state="connected"] {
    --pg-text: var(--colors-green);
    --pg-bg: var(--colors-green-400);
    --pg-ring: var(--colors-green-500);
    --pg-icon-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 10"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.082 1.111 5.022 8.89 1.363 5.687"/></svg>');
}

/* testnet + simulated: orange warning. Icon = the status-alert warning flame. */
.provider-gate[data-state="testnet"],
.provider-gate[data-state="simulated"] {
    --pg-text: var(--colors-orange);
    --pg-bg: var(--colors-orange-400);
    --pg-ring: var(--colors-orange-500);
    --pg-icon-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 9 12"><path fill="currentColor" d="M3.818.074a.658.658 0 0 0-.756.108.616.616 0 0 0-.12.736 5.017 5.017 0 0 1 .02 4.628.127.127 0 0 1-.113.063.13.13 0 0 1-.112-.066 2.766 2.766 0 0 1-.288-.789.376.376 0 0 0-.248-.28.393.393 0 0 0-.373.06A4.349 4.349 0 0 0 .327 6.727a4.256 4.256 0 0 0 .07 2.637 3.94 3.94 0 0 0 1.547 1.964 4.09 4.09 0 0 0 2.443.669c2.178 0 3.7-1.08 4.18-2.96.71-2.773-1.033-7.04-4.749-8.962Zm2.44 8.993a1.658 1.658 0 0 1-.618 1.057 1.734 1.734 0 0 1-1.189.365c-.41 0-.809-.14-1.127-.4a1.705 1.705 0 0 1-.6-1.014.246.246 0 0 1 .076-.226.259.259 0 0 1 .236-.063c.258-.004.51-.07.736-.195.225-.123.414-.3.55-.514a1.133 1.133 0 0 0 .234-1.238.247.247 0 0 1 .03-.286.259.259 0 0 1 .284-.072c.494.219.897.592 1.148 1.06a2.33 2.33 0 0 1 .24 1.525Z"/></svg>');
}

/* ── Wall: the tipjar handoff wall formalized (navy radial app card) ───── */

.provider-gate-wall {
    background-color: #1F2348;
    background-image: radial-gradient(100% 100% at 100% 100%, #260133, #1F2348);
    border-radius: 10px;
    box-shadow: 0 4px 28px rgba(0, 0, 0, 0.111);
    color: #FFFFFF;
    font-family: 'Mulish', 'Muli', system-ui, sans-serif;
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.provider-gate-wall .pgw-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 24px;
    text-align: center;
}

.provider-gate-wall .pgw-signet {
    display: block;
    width: 44px;
    height: 40px;
    flex: none;
}

.provider-gate-wall .pgw-title {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;
    color: #FFFFFF;
}

.provider-gate-wall .pgw-message {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.6);
    max-width: 280px;
}

/* The QR sits on a white tile so the light-blue modules read on the navy. */
.provider-gate-wall .pgw-qr {
    background: #FFFFFF;
    border-radius: 8px;
    padding: 12px;
    line-height: 0;
}
.provider-gate-wall .pgw-qr canvas {
    display: block;
    width: 180px;
    height: 180px;
}

.provider-gate-wall .pgw-action {
    width: 100%;
    max-width: 280px;
}
.provider-gate-wall .pgw-action .nq-button {
    display: block;
    width: 100%;
    min-width: 0;
    margin: 0;
}

/* Copy-link fallback: a quiet text link, never a second button. Blue on navy
   must be the on-dark variant (rule 20). */
.provider-gate-wall .pgw-secondary {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
}
.provider-gate-wall .pgw-link {
    background: none;
    border: 0;
    font: inherit;
    font-weight: 600;
    color: #0CA6FE;
    text-decoration: none;
    cursor: pointer;
    /* Negative-margin padding: a 36px tap target, no extra visual size */
    padding: 12px;
    margin: -12px;
}
.provider-gate-wall .pgw-link:hover {
    text-decoration: underline;
}
.provider-gate-wall .pgw-link:focus-visible {
    outline: 2px solid #0CA6FE;
    outline-offset: 3px;
    border-radius: 2px;
}
</style>
