<template>
    <div class="identicon">
        <img :src="dataUrl">
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components Identicon.vue.
// Requires npm dep @nimiq/iqons. Note: before the first render you must point
// Iqons.svgPath at the iqons.min.svg asset (the upstream component resolved it
// via webpack file-loader), e.g.:
//   Iqons.svgPath = 'https://cdn.jsdelivr.net/npm/@nimiq/iqons@1.6.0/dist/iqons.min.svg';
// or copy node_modules/@nimiq/iqons/dist/iqons.min.svg into your public assets.
import { ref, watch } from 'vue';
import Iqons from '@nimiq/iqons';

const props = defineProps<{
    address?: string,
}>();

// --- Inlined from @nimiq/utils@0.11.1 ValidationUtils (avoids the dependency) ---

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

function alphabetCheck(str: string): boolean {
    str = str.toUpperCase();
    for (let i = 0; i < str.length; i++) {
        if (!NIMIQ_ALPHABET.includes(str[i])) return false;
    }
    return true;
}

// ValidationUtils.isValidAddress
function isUserFriendlyAddress(str: string): boolean {
    if (!str) return false;
    str = str.replace(/ /g, '');
    if (str.substr(0, 2).toUpperCase() !== 'NQ') return false; // Addresses start with NQ
    if (str.length !== 36) return false; // Addresses are 36 chars (ignoring spaces)
    if (!alphabetCheck(str)) return false; // Address has invalid characters
    if (ibanCheck(str.substr(4) + str.substr(0, 4)) !== 1) return false; // Address checksum invalid
    return true;
}

// ValidationUtils.normalizeAddress
function formatAddress(address: string): string {
    return address
        .toUpperCase() // format as uppercase
        .replace(/[\s+-]|%20/g, '') // strip spaces and dashes
        .replace(/(.)(?=(.{4})+$)/g, '$1 '); // reformat with spaces, forming blocks of 4 chars
}

// --- end inlined helpers ---

// tslint:disable-next-line max-line-length
const placeholderDataUrl = 'data:image/svg+xml,<svg width="64" height="64" viewBox="0 -4 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="url(%23identicon_radial)"/><defs><radialGradient id="identicon_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-63.0033 0 0 -56 63 56)"><stop stop-color="%23260133"/><stop offset="1" stop-color="%231F2348"/></radialGradient></defs></svg>';

const dataUrl = ref<string>(placeholderDataUrl);

watch(() => props.address, async (address) => {
    if (address && isUserFriendlyAddress(address)) {
        dataUrl.value = await Iqons.toDataUrl(formatAddress(address));
    } else {
        dataUrl.value = placeholderDataUrl;
    }
}, { immediate: true });
</script>

<style scoped>
    .identicon {
        width: 10rem;
    }

    img {
        width: 100%;
        height: 100%;
    }
</style>
