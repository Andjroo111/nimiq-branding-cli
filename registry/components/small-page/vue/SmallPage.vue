<template>
    <div class="small-page nq-card">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components SmallPage.
// No props, no logic — a pure layout container. Requires nimiq-style (legacy)
// for the .nq-card look (background, border-radius, shadow, text color).
</script>

<style scoped>
    .small-page {
        width: 100%;
        max-width: 52.5rem; /* 420px */
        height: 70.5rem; /* 564px */
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        margin: 0 1.25rem;
    }
</style>
