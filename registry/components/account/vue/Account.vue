<template>
    <div class="account" :class="[{ editable }, layout, { cashlink: displayAsCashlink }]">
        <div class="identicon-and-label">
            <img v-if="showImage" class="identicon account-image" :src="image" alt="" @error="showImage = false">
            <div v-else-if="displayAsCashlink" class="identicon">
                <div class="nq-blue-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="white" stroke-linecap="round" stroke-width="2.5"><path d="M40.25 23.25v-.5a6.5 6.5 0 0 0-6.5-6.5h-3.5a6.5 6.5 0 0 0-6.5 6.5v6.5a6.5 6.5 0 0 0 6.5 6.5h2"/><path d="M23.75 40.75v.5a6.5 6.5 0 0 0 6.5 6.5h3.5a6.5 6.5 0 0 0 6.5-6.5v-6.5a6.5 6.5 0 0 0-6.5-6.5h-2"/><path d="M32 11.25v4M32 48.75v4"/></svg>
                </div>
            </div>
            <Identicon v-else-if="isNimiqAddress" :address="address"/>

            <div v-if="!editable" class="label" :class="{ 'address-font': isLabelNimiqAddress }">{{ label }}</div>
            <div v-else class="label editable" :class="{ 'address-font': isLabelNimiqAddress }">
                <LabelInput :maxBytes="63" :value="label" :placeholder="placeholder"
                    @input="(value: string) => emit('changed', value)" ref="labelInput$"/>
            </div>

            <div v-if="layout === 'column' && walletLabel" class="nq-label wallet-label">{{ walletLabel }}</div>
        </div>

        <Amount v-if="balance || balance === 0" class="balance" :amount="balance" :decimals="decimals" />
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components Account.vue.
// Identicon.vue, Amount.vue and LabelInput.vue come from the 'identicon',
// 'amount' and 'label-input' registry components — copy them next to this
// file (see meta.json dependsOn).
import { computed, ref, watch } from 'vue';
import Identicon from './Identicon.vue';
import Amount from './Amount.vue';
import LabelInput from './LabelInput.vue';

const props = withDefaults(defineProps<{
    /** The account's display label; Nimiq-address-shaped labels render in Fira Mono. */
    label: string,
    /** User-friendly Nimiq address rendered as identicon (only when checksum-valid). */
    address?: string,
    /** Image URL shown instead of the identicon (falls back on load error). */
    image?: string,
    /** Render the cashlink glyph (white link icon on a navy gradient circle) instead of an identicon. */
    displayAsCashlink?: boolean,
    /** Placeholder for the editable label input. */
    placeholder?: string,
    /** Secondary nq-label line under the label (column layout only). */
    walletLabel?: string,
    /** Balance in luna; rendered through Amount when set (0 included). */
    balance?: number,
    /** Exact decimals for the balance Amount. */
    decimals?: number,
    /** Render the label as a LabelInput field; emits 'changed' on input. */
    editable?: boolean,
    /** 'row' (identicon left, balance right) or 'column' (stacked, 10rem identicon). */
    layout?: 'row' | 'column',
}>(), {
    displayAsCashlink: false,
    decimals: 2,
    layout: 'row',
});

const emit = defineEmits<{
    /** Emitted with the new label on every accepted keystroke of the editable label. */
    (e: 'changed', label: string): void,
}>();

const labelInput$ = ref<InstanceType<typeof LabelInput> | null>(null);

const showImage = ref(!!props.image);
watch(() => props.image, (image) => { showImage.value = !!image; }, { immediate: true });

// --- Inlined from @nimiq/utils@0.11.1 ValidationUtils.isValidAddress ---

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

function isValidAddress(str?: string): boolean {
    if (!str) return false;
    str = str.replace(/ /g, '');
    if (str.substr(0, 2).toUpperCase() !== 'NQ') return false; // Addresses start with NQ
    if (str.length !== 36) return false; // Addresses are 36 chars (ignoring spaces)
    if (!alphabetCheck(str)) return false; // Address has invalid characters
    if (ibanCheck(str.substr(4) + str.substr(0, 4)) !== 1) return false; // Address checksum invalid
    return true;
}

// --- end inlined helper ---

const isNimiqAddress = computed(() => isValidAddress(props.address));
const isLabelNimiqAddress = computed(() => isValidAddress(props.label));

function focus() {
    if (props.editable && labelInput$.value) {
        labelInput$.value.focus();
    }
}

defineExpose({ focus });
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
        overflow: hidden; /* hide chevron right on hover*/
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

    .cashlink .identicon {
        padding: .5rem;
    }

    .cashlink .identicon div {
        width: 100%;
        height: 100%;
        border-radius: 50%;
    }
    .cashlink .identicon:before {
        display: block;
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: .25rem solid rgba(31, 35, 72, .2); /* based on nimiq-blue */
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
