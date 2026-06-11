<template>
    <div class="page-body nq-card-body">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components PageBody (upstream: vue-property-decorator class component).
// Pure slot container — no props, no logic. Relies on the legacy framework's
// .nq-card-body rules (nimiq-style.min.css) for padding and child margin trimming,
// and expects a flex-column parent (e.g. SmallPage) so flex-grow can fill it.
</script>

<style scoped>
    .page-body {
        flex-grow: 1;
        overflow-y: auto;
    }
</style>
