<template>
    <div class="address-display" :class="`format-${format}`">
        <span
            v-for="(chunk, index) in chunks"
            :key="chunk + index"
            class="chunk"
        >{{ chunk }}<span v-if="chunkTrailingSpaces" class="space">&nbsp;</span></span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    address: string,
    /** 'nimiq' | 'ethereum' | anything else renders the address as a single chunk */
    format?: string,
    /**
     * Upstream wraps the display in a Copyable component when true. The Copyable
     * component is not part of this port; consumers can wrap AddressDisplay in
     * their own copy handler (the full address text is exposed via `text`).
     */
    copyable?: boolean,
}>(), {
    format: 'nimiq',
    copyable: false,
});

// Inlined from @nimiq/utils ValidationUtils.normalizeAddress:
// uppercase, strip spaces/dashes/%20, regroup into blocks of 4.
function normalizeAddress(address: string): string {
    return address
        .toUpperCase()
        .replace(/[\s+-]|%20/g, '')
        .replace(/(.)(?=(.{4})+$)/g, '$1 ');
}

const chunks = computed<string[]>(() => {
    switch (props.format) {
        case 'nimiq':
            if (!props.address) return new Array(9).fill('-');
            return normalizeAddress(props.address).split(' ');
        case 'ethereum':
            if (!props.address) return new Array(3).fill('-');
            return props.address.replace(/[+ ]/g, '').match(/.{14}/g)!;
        default:
            return [props.address];
    }
});

const text = computed<string>(() => {
    switch (props.format) {
        case 'nimiq': return chunks.value.join(' ').toUpperCase();
        case 'ethereum': return chunks.value.join('');
        default: return props.address;
    }
});

const chunkTrailingSpaces = computed(() => props.format === 'nimiq');

defineExpose({ text });
</script>

<style scoped>
    /* Hardened grid build: locks the 3 columns (can't reflow) and self-imports
       Fira Mono so a missing font link can't make the 3×3 drift. */
    @import url('https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500&display=swap');

    .address-display {
        display: grid;
        justify-items: center;
        width: 100%;
        box-sizing: content-box;
        color: rgba(31, 35, 72, .5); /* nimiq-blue with .5 opacity */
        font-size: 3rem;
        font-family: 'Fira Mono', monospace;
    }

    .format-nimiq {
        grid-template-columns: repeat(3, 33%);
        justify-content: space-between;
        max-width: 28.25rem;
    }

    .format-ethereum {
        grid-template-columns: 1fr;
        max-width: 27rem;
    }

    .address-display.copyable:hover,
    .address-display.copyable:focus,
    .address-display.copyable.copied {
        font-weight: 500;
    }

    .chunk {
        margin: 0.875rem 0;
        line-height: 1.11;
        text-align: center;
        box-sizing: border-box;
        white-space: nowrap;
    }

    .format-nimiq .chunk {
        text-transform: uppercase;
    }

    .space {
        font-size: 0;
    }
</style>
