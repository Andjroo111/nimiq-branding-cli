<template>
    <svg class="circle-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18"   fill="none" stroke-width="2" stroke-linecap="round"><path stroke="#0582CA" d="M9,1c4.42,0,8,3.58,8,8"/><path stroke="#1F2348" opacity=".3" d="M4.27,2.56C2.29,4.01,1,6.35,1,9c0,4.42,3.58,8,8,8c2.65,0,4.99-1.29,6.44-3.27"/></svg>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components CircleSpinner.vue (upstream is a
// functional template with no props or state). Size via the svg width/height
// attributes or CSS on .circle-spinner.
</script>

<style scoped>
    .circle-spinner {
        animation: circle-spinner-spin 1s linear infinite;
    }

    @keyframes circle-spinner-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }

    /* House addition: hold the rest frame for users who ask for less motion. */
    @media (prefers-reduced-motion: reduce) {
        .circle-spinner {
            animation: none;
        }
    }
</style>
