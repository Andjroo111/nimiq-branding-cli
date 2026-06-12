<template>
    <button class="nq-button" :class="[color, { inverse }]" :disabled="disabled">
        <slot></slot>
    </button>
</template>

<script setup lang="ts">
// Thin Vue 3 wrapper around nimiq-style's .nq-button CSS-framework class.
// There is no upstream Vue component for primary buttons — all styling lives
// in nimiq-style (legacy/nimiq-style.min.css), which must be loaded globally.
withDefaults(defineProps<{
    /** Color variant; empty string = default Nimiq blue gradient. */
    color?: '' | 'light-blue' | 'green' | 'orange' | 'red' | 'gold',
    /** White button with colored text, for use on colored backgrounds. */
    inverse?: boolean,
    /** Disabled state: gray background, no shadow, not-allowed cursor. */
    disabled?: boolean,
}>(), {
    color: '',
    inverse: false,
    disabled: false,
});
</script>

<!-- No scoped styles: .nq-button and its color variants come from nimiq-style. -->
