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

// Three near-equal rows, which is what the `ethereum` format has always LOOKED
// like: a 42-character address is 14/14/14, byte-identical to the original
// `.match(/.{14}/g)`.
//
// The difference is what happens at any other length. `.match(/.{14}/g)`
// returns only whole fourteen-character groups and silently discards the tail,
// so a 34-character legacy BTC address rendered as 28 characters, truncated,
// and looked perfectly tidy while doing it. For a string people paste money
// into that is not a rounding error. Splitting into thirds keeps every
// character at any length, which matters now that this format is used for
// Polygon, Bitcoin and anything else that is not NIM.
//
// Three rows, not some other count, because that is the invariant this
// component holds across formats: `nimiq` is nine four-character chunks in
// three columns and this is three chunks in one, so both blocks occupy the
// same height and read as siblings.
function splitIntoThreeRows(address: string): string[] {
    const base = Math.floor(address.length / 3);
    const wide = address.length % 3; // this many rows carry one extra character
    const rows: string[] = [];
    let at = 0;
    for (let i = 0; i < 3; i++) {
        const size = base + (i < wide ? 1 : 0);
        if (!size) continue;
        rows.push(address.slice(at, at + size));
        at += size;
    }
    return rows;
}

const chunks = computed<string[]>(() => {
    switch (props.format) {
        case 'nimiq':
            if (!props.address) return new Array(9).fill('-');
            return normalizeAddress(props.address).split(' ');
        case 'ethereum':
            if (!props.address) return new Array(3).fill('-');
            return splitIntoThreeRows(props.address.replace(/[+ ]/g, ''));
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
