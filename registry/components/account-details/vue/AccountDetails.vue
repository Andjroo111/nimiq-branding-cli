<template>
    <div class="account-details">
        <CloseButton class="top-right" @click="emit('close')"/>

        <!-- Upstream renders an <Account layout="column"> here; Account.vue has no
             own registry entry, so its column markup is inlined (the row/cashlink
             variants are never used by AccountDetails). -->
        <div class="account column" :class="{ editable }">
            <div class="identicon-and-label">
                <img v-if="showImage" class="identicon account-image" :src="image"
                    @error="showImage = false">
                <Identicon v-else-if="isValidAddress(address)" :address="address"/>

                <div v-if="!editable" class="label"
                    :class="{ 'address-font': isValidAddress(displayedLabel) }">{{ displayedLabel }}</div>
                <div v-else class="label editable"
                    :class="{ 'address-font': isValidAddress(displayedLabel) }">
                    <LabelInput :maxBytes="63" :value="displayedLabel" :placeholder="placeholder"
                        ref="labelInput$" @input="emit('changed', $event)"/>
                </div>

                <div v-if="walletLabel" class="nq-label wallet-label">{{ walletLabel }}</div>
            </div>

            <Amount v-if="balance || balance === 0" class="balance" :amount="balance" :decimals="2"/>
        </div>

        <!-- Upstream renders <AddressDisplay copyable/>, whose root element IS a
             Copyable (both components merge onto one node in Vue 2). The registry
             AddressDisplay port does not embed Copyable, so we wrap it — visually
             identical, one extra wrapper in the DOM. -->
        <Copyable class="address-display-copyable" :text="normalizedAddress">
            <AddressDisplay :address="address"/>
        </Copyable>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components AccountDetails.vue.
// Identicon.vue, Amount.vue, AddressDisplay.vue, Copyable.vue, CloseButton.vue
// and LabelInput.vue come from the registry components of the same names —
// copy them next to this file (see meta.json dependsOn).
import { computed, ref, watch } from 'vue';
import Identicon from './Identicon.vue';
import Amount from './Amount.vue';
import AddressDisplay from './AddressDisplay.vue';
import Copyable from './Copyable.vue';
import CloseButton from './CloseButton.vue';
import LabelInput from './LabelInput.vue';

const props = defineProps<{
    address: string,
    /** Optional image URL (e.g. shop logo) shown instead of the identicon. */
    image?: string,
    label?: string,
    walletLabel?: string,
    /** Balance in luna. Rendered through Amount with 2 decimals (Account's default). */
    balance?: number,
    editable?: boolean,
    placeholder?: string,
}>();

const emit = defineEmits<{
    (event: 'close'): void,
    (event: 'changed', label: string): void,
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

// ValidationUtils.isValidAddress
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

// ValidationUtils.normalizeAddress
function normalizeAddress(address: string): string {
    return address
        .toUpperCase()
        .replace(/[\s+-]|%20/g, '')
        .replace(/(.)(?=(.{4})+$)/g, '$1 ');
}

// --- end inlined helpers ---

// Upstream: :label="label !== address ? label : ''"
const displayedLabel = computed(() => (props.label !== props.address ? props.label ?? '' : ''));
const normalizedAddress = computed(() => (props.address ? normalizeAddress(props.address) : ''));

const showImage = ref(!!props.image);
watch(() => props.image, (image) => { showImage.value = !!image; });

const labelInput$ = ref<InstanceType<typeof LabelInput> | null>(null);

/** Focuses the label input when the panel is editable. */
function focus() {
    if (props.editable && labelInput$.value) labelInput$.value.focus();
}

defineExpose({ focus });
</script>

<style scoped>
    /* AccountDetails.vue scoped styles, verbatim ('>>>' -> :deep()) */
    .account-details {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
        position: relative;
        padding: 4rem;
        border-radius: 1rem;
        width: 100%;
        height: 100%;
        z-index: 2;
        box-sizing: border-box;
    }

    /* Account.vue scoped styles (column layout), inlined since the markup is inlined */
    .account {
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        flex-shrink: 0;
        font-size: 2rem;
        line-height: 1.2;
        overflow: hidden;
    }

    .account.column {
        flex-direction: column;
    }

    .identicon-and-label {
        display: flex;
        align-items: center;
        flex-direction: column;
    }

    .account :deep(.identicon) {
        flex-shrink: 0;
        position: relative;
    }

    .account-image {
        border-radius: 1rem;
    }

    .label,
    .wallet-label {
        overflow: hidden;
        text-align: center;
        line-height: 1.5;
    }

    .wallet-label {
        margin-bottom: 0;
    }

    .label.address-font {
        font-family: 'Fira Mono', 'Andale Mono', monospace;
        font-weight: normal;
        text-transform: uppercase;
    }

    .balance {
        flex-shrink: 0;
    }

    /* AccountDetails.vue overrides, verbatim */
    .account {
        padding: 0;
        width: 100%;
    }

    .account .identicon-and-label {
        width: 100%;
    }

    .account :deep(.identicon),
    .account .account-image {
        width: 18rem;
        height: 18rem;
        margin-bottom: 3rem;
    }

    .account .label {
        font-size: 3rem;
        font-weight: 600;
        opacity: 1;
    }

    .account .wallet-label {
        margin-top: .5rem;
    }

    .account .label,
    .account .wallet-label {
        max-width: unset;
        max-height: unset;
    }

    .account .balance {
        font-size: 3rem;
        margin-top: 3rem;
    }

    /* Upstream puts these margins on the AddressDisplay root (which IS the
       Copyable there); here they go on the wrapping Copyable. */
    .address-display-copyable {
        margin-top: 3rem;
        margin-bottom: 1.5rem;
    }

    .address-display-copyable :deep(.address-display) {
        margin: 0;
    }
</style>
