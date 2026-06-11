<template>
    <div class="nq-card">
        <div v-if="$slots.header" class="nq-card-header">
            <slot name="header"></slot>
        </div>
        <div class="nq-card-body">
            <slot></slot>
        </div>
        <div v-if="$slots.footer" class="nq-card-footer">
            <slot name="footer"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
// Vue 3 wrapper for the @nimiq/style card. There is no upstream Card.vue in
// @nimiq/vue-components — the card is a pure-CSS pattern from @nimiq/style
// (nq-card / nq-card-header / nq-card-body / nq-card-footer). This component
// just provides slot-based ergonomics; ALL styling comes from nimiq-style
// (legacy) css. No props, no logic.
//
// Usage:
//   <NqCard>
//     <template #header><h1 class="nq-h1">Card Title</h1></template>
//     <p class="nq-text">Body text…</p>
//     <template #footer><button class="nq-button">Continue</button></template>
//   </NqCard>
</script>
