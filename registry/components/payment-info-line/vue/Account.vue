<template>
    <div class="account" :class="layout">
        <div class="identicon-and-label">
            <img v-if="showImage" class="identicon account-image" :src="image" @error="showImage = false">
            <Identicon v-else-if="isNimiqAddress" :address="address"/>

            <div class="label" :class="{ 'address-font': isLabelNimiqAddress }">{{ label }}</div>

            <div v-if="layout === 'column' && walletLabel" class="nq-label wallet-label">{{ walletLabel }}</div>
        </div>

        <Amount v-if="balance || balance === 0" class="balance" :amount="balance" :decimals="decimals" />
    </div>
</template>

<script setup lang="ts">
/**
 * Minimal Vue 3 port of @nimiq/vue-components Account.vue, shipped with the
 * payment-info-line registry component (Account is not a standalone registry
 * component). Omitted upstream features: editable labels (LabelInput) and the
 * cashlink display. Identicon.vue comes from the 'identicon' registry component,
 * Amount.vue from 'amount' — copy them next to this file.
 */
import { ref, computed, watch } from 'vue';
import Identicon from './Identicon.vue';
import Amount from './Amount.vue';

const props = withDefaults(defineProps<{
    label?: string,
    address?: string,
    image?: string,
    walletLabel?: string,
    balance?: number,
    decimals?: number,
    layout?: 'row' | 'column',
}>(), {
    decimals: 2,
    layout: 'row',
});

const showImage = ref(!!props.image);
watch(() => props.image, () => showImage.value = !!props.image);

// --- Inlined from @nimiq/utils ValidationUtils.isValidAddress ---
const NIMIQ_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

function ibanCheck(str: string): number {
    const num = str.split('').map((c) => {
        const code = c.toUpperCase().charCodeAt(0);
        return code >= 48 && code <= 57 ? c : (code - 55).toString();
    }).join('');
    let tmp = '';
    for (let i = 0; i < Math.ceil(num.length / 6); i++) {
        tmp = (parseInt(tmp + num.substr(i * 6, 6), 10) % 97).toString();
    }
    return parseInt(tmp, 10);
}

function isValidAddress(address?: string): boolean {
    if (!address) return false;
    const str = address.replace(/ /g, '');
    if (str.substr(0, 2).toUpperCase() !== 'NQ') return false;
    if (str.length !== 36) return false;
    for (const c of str.toUpperCase()) {
        if (!NIMIQ_ALPHABET.includes(c)) return false;
    }
    return ibanCheck(str.substr(4) + str.substr(0, 4)) === 1;
}

const isNimiqAddress = computed(() => isValidAddress(props.address));
const isLabelNimiqAddress = computed(() => isValidAddress(props.label));
</script>

<style scoped>
    .account {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.75rem 2rem;
        box-sizing: border-box;
        flex-shrink: 0;
        font-size: 2rem;
        line-height: 1.2;
        overflow: hidden;
    }

    .account.row {
        width: 100%;
        flex-direction: row;
    }

    .account.column {
        flex-direction: column;
    }

    .identicon-and-label {
        display: flex;
        align-items: center;
    }

    .row .identicon-and-label {
        flex-direction: row;
        overflow: hidden;
        min-width: 5.625rem;
        flex-grow: 1;
    }

    .column .identicon-and-label {
        flex-direction: column;
    }

    .identicon {
        flex-shrink: 0;
        position: relative;
    }

    .row .identicon {
        width: 5.625rem;
        height: 5.625rem;
        margin-right: 1.5rem;
    }

    .column .identicon {
        width: 10rem;
        height: 10rem;
        margin-bottom: 1.25rem;
    }

    .account-image {
        border-radius: 1rem;
    }

    .wallet-label {
        margin-bottom: 0;
    }

    .label,
    .wallet-label {
        overflow: hidden;
    }

    .row .label:not(.editable) {
        opacity: 0.7;
        padding-left: 1rem;
    }

    .row .label,
    .row .wallet-label {
        white-space: nowrap;
        font-weight: 600;
        mask-image: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
    }

    .row .label {
        flex-grow: 1;
    }

    .column .label,
    .column .wallet-label {
        max-width: 18.5rem; /* 148px, the width the automatic labels are designed for */
        text-align: center;
        line-height: 1.5;
        max-height: calc(2 * 1em * 1.5); /* #lines * font-size * line-height */
    }

    .label.address-font {
        font-family: "Fira Mono", "Andale Mono", monospace;
        font-weight: normal;
        text-transform: uppercase;
    }

    .balance {
        flex-shrink: 0;
    }

    .row .balance {
        margin-left: 1rem;
        font-weight: bold;
        opacity: 0.7;
    }

    .column .balance {
        margin-top: 1.5rem;
    }
</style>
