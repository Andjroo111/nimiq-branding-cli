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
    .address-display {
        width: 100%;
        box-sizing: content-box;
        color: rgba(31, 35, 72, .5); /* nimiq-blue with .5 opacity */
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        font-size: 3rem;
    }

    .format-nimiq {
        max-width: 28.25rem;
    }

    .format-ethereum {
        max-width: 27rem;
    }

    .address-display.copyable:hover,
    .address-display.copyable:focus,
    .address-display.copyable.copied {
        font-weight: 500;
    }

    .chunk {
        font-family: 'Fira Mono', monospace;
        margin: 0.875rem 0;
        line-height: 1.11;
        text-align: center;
        box-sizing: border-box;
    }

    .format-nimiq .chunk {
        width: 33%;
        text-transform: uppercase;
    }

    .format-ethereum .chunk {
        width: 100%;
    }

    .space {
        font-size: 0;
    }
</style>
