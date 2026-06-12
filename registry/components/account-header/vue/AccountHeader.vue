<script setup>
/**
 * Nimiq Account Header — Vue 3 port of the wallet AddressOverview header
 * (upstream: wallet AddressOverview.vue .active-address + .actions,
 *  SearchBar.vue, StakingButton.vue green CTA tooltip, StakingIcon.vue).
 * Requires the legacy nimiq-style CSS + account-header.css (or the scoped
 * equivalent below) + Mulish & Fira Mono fonts.
 * npm dep: @nimiq/iqons (identicon generation, pinned 1.6.0 recipe).
 */
import { ref, watchEffect } from 'vue';

const props = defineProps({
    label: { type: String, default: 'Indigo Address' },
    address: { type: String, default: 'NQ87 JY9X JUEE HA17 JNBB HPGM 5ETQ VT1G CVN2' },
    balance: { type: String, default: '995' },
    ticker: { type: String, default: 'NIM' },
    fiatValue: { type: String, default: '$0.50' },
    searchPlaceholder: { type: String, default: 'Search transactions' },
    showStakeTooltip: { type: Boolean, default: true },
    stakeTooltipText: { type: String, default: 'Earn NIM every month by staking your NIM' },
});

const emit = defineEmits(['search', 'stake', 'send', 'receive']);

const searchString = ref('');
watchEffect(() => emit('search', searchString.value));

// Hexagon placeholder shown until the iqon resolves (same as the wallet).
const PLACEHOLDER = 'data:image/svg+xml,<svg width="64" height="64" viewBox="0 -4 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="url(%23identicon_radial)"/><defs><radialGradient id="identicon_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-63.0033 0 0 -56 63 56)"><stop stop-color="%23260133"/><stop offset="1" stop-color="%231F2348"/></radialGradient></defs></svg>';
const identiconSrc = ref(PLACEHOLDER);

watchEffect(async () => {
    const address = props.address;
    try {
        const { default: Iqons } = await import('@nimiq/iqons');
        identiconSrc.value = await Iqons.toDataUrl(address);
    } catch (e) { /* keep placeholder */ }
});
</script>

<template>
    <div class="account-header">
        <div class="active-address flex-row">
            <div class="identicon-wrapper">
                <div class="identicon" :data-address="address">
                    <img :src="identiconSrc" alt="Nimiq identicon">
                </div>
            </div>
            <div class="meta">
                <div class="flex-row">
                    <div class="label">{{ label }}</div>
                    <span class="amount">{{ balance }} <span class="currency" :class="ticker.toLowerCase()">{{ ticker }}</span></span>
                </div>
                <div class="flex-row">
                    <div class="copyable">
                        <div class="address">{{ address }}</div>
                    </div>
                    <span class="fiat-amount">{{ fiatValue }}</span>
                </div>
            </div>
        </div>

        <div class="actions flex-row">
            <div class="container">
                <div class="search-bar">
                    <svg fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2" />
                        <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z" fill="currentColor" />
                    </svg>
                    <input type="text" v-model="searchString" :placeholder="searchPlaceholder">
                </div>
            </div>

            <div class="flex-row ml-auto">
                <div class="staking-button show-text">
                    <span v-if="showStakeTooltip" class="tooltip staking-feature-tip position-bottom-center shown">
                        <a href="javascript:void(0);" tabindex="0" class="trigger"></a>
                        <div class="tooltip-box" style="top: 100%; left: 50%; transform: translate(-50%, 1rem);">
                            {{ stakeTooltipText }}
                        </div>
                    </span>
                    <button class="stake nq-button-pill green" @click="emit('stake')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" class="nq-icon staking-icon">
                            <path opacity=".6" fill="none" stroke="#21bca5" stroke-width="3.02" d="M70 22h0a48 48 0 0148 48v0a48 48 0 01-48 48h0a48 48 0 01-48-48v0a48 48 0 0148-48z"/>
                            <path opacity=".4" fill="none" stroke="#21bca5" stroke-width="3.02" d="M70 12h0a58 58 0 0158 58h0a58 58 0 01-58 58h0a58 58 0 01-58-58h0a58 58 0 0158-58z" />
                            <path opacity=".2" fill="none" stroke="none" stroke-width="3.02" d="M70 2.25h0A67.75 67.75 0 01137.75 70v0A67.75 67.75 0 0170 137.75h0A67.75 67.75 0 012.25 70v0A67.75 67.75 0 0170 2.25z" />
                            <path d="M70 28.23a41.76 41.76 0 110 83.52 41.76 41.76 0 110-83.52z" fill="none"/>
                            <path d="M70.71 69.1v21.56m18.71-26.11c0 12.4-6.31 18.89-18.71 18.89 0-17.56 5.28-18.89 18.71-18.89zM54.18 53.98c0 13.33 4.13 20.07 16.53 20.07 0-13.43-1.03-20.07-16.53-20.07z" fill="none" stroke="#fff" stroke-width="4.0316" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="stake-text">Stake</span>
                    </button>
                </div>

                <div class="vertical-separator"></div>

                <button class="send nq-button-pill light-blue flex-row" @click="emit('send')">
                    <svg class="nq-icon" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Send
                </button>
                <button class="receive nq-button-s flex-row" @click="emit('receive')">
                    <svg class="nq-icon" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Receive
                </button>
            </div>
        </div>
    </div>
</template>

<style src="../html/account-header.css"></style>
