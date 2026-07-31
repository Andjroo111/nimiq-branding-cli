<!--
  ConnectWalletPill: the fleet's wallet connect button (ORIGINAL composition,
  no upstream). One pill, four states: connect -> busy (spinner) -> connected
  chip (identicon + truncated address + optional NIM balance) <-> confirm
  (tap the chip, it flips to Disconnect; tap again to disconnect; outside
  click, Escape or 4s reverts).

  The connect callback is the only integration point, designed for the
  nimiq-app-shell createWallet seam but free of any hard dependency:

      <ConnectWalletPill
          :connect="() => wallet.connect()"
          :on-disconnect="() => wallet.disconnect()"
          ref="pill"
      />
      wallet.onAccountChange((account) => pill.value?.setAccount(account))

  A connect resolving null (cancel, or a mobile redirect in flight) returns
  the pill to idle. Set variant="dark" on navy surfaces (e.g. inside
  AppHeader's #tools slot).

  Identicons come from @nimiq/iqons (pinned 1.6.0, the house recipe). In Vite,
  point the sprite once at boot:
      import Iqons from '@nimiq/iqons'
      import iqonsSprite from '@nimiq/iqons/dist/iqons.min.svg?url'
      Iqons.svgPath = iqonsSprite
-->
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
// npm dep: @nimiq/iqons (identicon data-urls)
import Iqons from '@nimiq/iqons'

interface PillAccount {
    address: string
    label?: string
    balance?: number | string
}

const props = withDefaults(defineProps<{
    connect: () => Promise<PillAccount | null>
    onDisconnect?: () => void
    onError?: (err: unknown) => void
    account?: PillAccount | null
    variant?: 'light' | 'dark'
    labels?: { connect?: string; connecting?: string; disconnect?: string }
    formatBalance?: (balance: number | string) => string
}>(), {
    variant: 'light',
    account: null,
})

const emit = defineEmits<{
    (e: 'connected', account: PillAccount): void
    (e: 'disconnected'): void
}>()

const L = () => ({
    connect: 'Connect wallet',
    connecting: 'Connecting',
    disconnect: 'Disconnect',
    ...(props.labels || {}),
})

// The house identicon placeholder, shown until the real iqon resolves.
const PLACEHOLDER =
    'data:image/svg+xml,<svg width="64" height="64" viewBox="0 -4 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="url(%23cwp_placeholder_radial)"/><defs><radialGradient id="cwp_placeholder_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-63.0033 0 0 -56 63 56)"><stop stop-color="%23260133"/><stop offset="1" stop-color="%231F2348"/></radialGradient></defs></svg>'

type PillState = 'connect' | 'busy' | 'connected' | 'confirm'
const state = ref<PillState>(props.account?.address ? 'connected' : 'connect')
const account = ref<PillAccount | null>(props.account?.address ? props.account : null)
const identiconUrl = ref(PLACEHOLDER)

function formatAddress(address: string): string {
    const clean = String(address).replace(/\s+/g, '').toUpperCase()
    return (clean.match(/.{1,4}/g) || [clean]).join(' ')
}

/** First 7 + last 5 characters of the formatted address around an ellipsis. */
function truncateAddress(address: string): string {
    const formatted = formatAddress(address)
    if (formatted.length <= 14) return formatted
    return (formatted.slice(0, 7) + '…' + formatted.slice(-5)).replace(/\s*…\s*/, '…')
}

function fmtBalance(balance: number | string): string {
    if (props.formatBalance) return props.formatBalance(balance)
    if (typeof balance === 'string') return balance
    const text = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(balance)
    // Thin-space grouping, the house NIM formatting
    return text.replace(/,/g, ' ') + ' NIM'
}

function loadIdenticon(address: string) {
    identiconUrl.value = PLACEHOLDER
    Iqons.toDataUrl(address).then((url: string) => {
        if (account.value?.address === address) identiconUrl.value = url
    }).catch(() => {})
}
if (account.value) loadIdenticon(account.value.address)

// Confirm affordance: outside click, Escape or 4s reverts to connected.
let confirmTimer: ReturnType<typeof setTimeout> | undefined
const root = ref<HTMLElement | null>(null)
function onDocPointerDown(e: PointerEvent) {
    if (root.value && !root.value.contains(e.target as Node)) setState('connected')
}
function onDocKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') setState('connected')
}
function leaveConfirm() {
    clearTimeout(confirmTimer)
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    document.removeEventListener('keydown', onDocKeyDown, true)
}
function setState(next: PillState) {
    if (state.value === 'confirm') leaveConfirm()
    state.value = next
    if (next === 'confirm') {
        confirmTimer = setTimeout(() => { if (state.value === 'confirm') setState('connected') }, 4000)
        document.addEventListener('pointerdown', onDocPointerDown, true)
        document.addEventListener('keydown', onDocKeyDown, true)
    }
}
onBeforeUnmount(leaveConfirm)

function disconnect() {
    account.value = null
    setState('connect')
    props.onDisconnect?.()
    emit('disconnected')
}

async function onClick() {
    if (state.value === 'connect') {
        setState('busy')
        try {
            const result = await props.connect()
            if (result && result.address) {
                account.value = result
                loadIdenticon(result.address)
                setState('connected')
                emit('connected', result)
            } else {
                setState('connect') // cancelled, or a mobile redirect is in flight
            }
        } catch (err) {
            setState('connect')
            if (props.onError) props.onError(err)
            else console.error('ConnectWalletPill:', err)
        }
    } else if (state.value === 'connected') {
        setState('confirm')
    } else if (state.value === 'confirm') {
        disconnect()
    }
}

defineExpose({
    state,
    account,
    /** Drive from outside, e.g. wallet.onAccountChange: pass an account or null. */
    setAccount(next: PillAccount | null) {
        account.value = next && next.address ? next : null
        if (account.value) loadIdenticon(account.value.address)
        setState(account.value ? 'connected' : 'connect')
    },
    /** Update the balance shown on the connected chip. */
    setBalance(balance: number | string) {
        if (account.value) account.value = { ...account.value, balance }
    },
    disconnect,
})
</script>

<template>
    <button
        ref="root"
        type="button"
        class="connect-wallet-pill"
        :class="{ 'on-dark': variant === 'dark' }"
        :data-state="state"
        :disabled="state === 'busy'"
        :aria-busy="state === 'busy' || undefined"
        :title="state === 'connected' && account
            ? (account.label ? account.label + ' ' + formatAddress(account.address) : formatAddress(account.address))
            : undefined"
        @click="onClick"
    >
        <template v-if="state === 'connect'">
            <span class="cwp-label">{{ L().connect }}</span>
        </template>
        <template v-else-if="state === 'busy'">
            <!-- CircleSpinner arc geometry (upstream vue-components), currentColor -->
            <svg class="cwp-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="14" height="14" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path stroke="currentColor" d="M9,1c4.42,0,8,3.58,8,8"/><path stroke="currentColor" opacity=".3" d="M4.27,2.56C2.29,4.01,1,6.35,1,9c0,4.42,3.58,8,8,8c2.65,0,4.99-1.29,6.44-3.27"/></svg>
            <span class="cwp-label">{{ L().connecting }}</span>
        </template>
        <template v-else-if="state === 'connected' && account">
            <img class="cwp-identicon" :src="identiconUrl" alt="Nimiq identicon">
            <span class="cwp-address">{{ truncateAddress(account.address) }}</span>
            <span v-if="account.balance !== undefined && account.balance !== null" class="cwp-balance">{{ fmtBalance(account.balance) }}</span>
        </template>
        <template v-else-if="state === 'confirm'">
            <span class="cwp-label">{{ L().disconnect }}</span>
        </template>
    </button>
</template>

<style scoped>
.connect-wallet-pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 500px;
    font-family: 'Mulish', 'Muli', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    color: #FFFFFF;
    background-color: #1F2348;
    background-image: radial-gradient(100% 100% at 100% 100%, #260133, #1F2348);
    transition: background-color 0.3s cubic-bezier(0.25, 0, 0, 1);
}

/* Hover deepens the gradient, the house button pattern. */
.connect-wallet-pill::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: 500px;
    background-image: radial-gradient(100% 100% at 100% 100%, #180021, #151833);
    opacity: 0;
    transition: opacity 0.3s cubic-bezier(0.25, 0, 0, 1);
}
.connect-wallet-pill:hover::before,
.connect-wallet-pill:focus-visible::before {
    opacity: 1;
}
.connect-wallet-pill > * {
    position: relative;
    z-index: 1;
}

.connect-wallet-pill:focus-visible {
    outline: 2px solid #0582CA;
    outline-offset: 3px;
}

.connect-wallet-pill[disabled] {
    cursor: default;
}

.cwp-spinner {
    display: block;
    flex: none;
    animation: cwp-spin 1s linear infinite;
}
@keyframes cwp-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
    .cwp-spinner {
        animation: none;
    }
}

/* Connected and confirm: status, not a call to action (quiet .nq-button-s surface). */
.connect-wallet-pill[data-state="connected"],
.connect-wallet-pill[data-state="confirm"] {
    color: #1F2348;
    background-color: rgba(31, 35, 72, 0.07);
    background-image: none;
}
.connect-wallet-pill[data-state="connected"]::before,
.connect-wallet-pill[data-state="confirm"]::before {
    display: none;
}
.connect-wallet-pill[data-state="connected"]:hover,
.connect-wallet-pill[data-state="connected"]:focus-visible,
.connect-wallet-pill[data-state="confirm"]:hover,
.connect-wallet-pill[data-state="confirm"]:focus-visible {
    background-color: rgba(31, 35, 72, 0.12);
}
.connect-wallet-pill[data-state="connected"] {
    padding: 0 12px 0 5px;
}

.cwp-identicon {
    display: block;
    width: 24px;
    height: 24px;
    flex: none;
}

/* Address: a technical value, Fira Mono, uppercase by nature. */
.cwp-address {
    font-family: 'Fira Mono', monospace;
    font-size: 13px;
    font-weight: 400;
}

/* Optional balance: secondary, one opacity-ladder step down (60%). */
.cwp-balance {
    font-weight: 600;
    opacity: 0.6;
}

/* On navy surfaces: the shipped inverse small-button alphas, flat white-alpha
   surface for every state (flat fills are canonical for white/secondary pills). */
.connect-wallet-pill.on-dark,
.connect-wallet-pill.on-dark[data-state="connected"],
.connect-wallet-pill.on-dark[data-state="confirm"] {
    color: #FFFFFF;
    background-color: rgba(255, 255, 255, 0.2);
    background-image: none;
}
.connect-wallet-pill.on-dark::before {
    display: none;
}
.connect-wallet-pill.on-dark:hover,
.connect-wallet-pill.on-dark:focus-visible {
    background-color: rgba(255, 255, 255, 0.25);
}
.connect-wallet-pill.on-dark:focus-visible {
    outline-color: #0CA6FE;
}
</style>
