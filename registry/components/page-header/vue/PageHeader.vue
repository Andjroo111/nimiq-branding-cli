<template>
    <div class="page-header nq-card-header" :class="progressIndicator ? 'has-progress-indicator' : ''">
        <div v-if="progressIndicator" class="progress-indicator">
            <div v-for="thisStep in progressSteps" class="indicator"
                :class="thisStep <= step ? 'active' : ''" :key="thisStep"></div>
        </div>
        <a v-if="backArrow" href="#" class="page-header-back-button" @click.prevent="$emit('back')"
            title="Go back">
            <!-- ArrowLeftIcon (@nimiq/style arrow-left.svg), inlined -->
            <svg class="nq-icon" width="23" height="18" viewBox="0 0 23 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 9L3 9" stroke="currentColor" fill="none" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 16L2 9L9 2" stroke="currentColor" fill="none" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>
        <h1 class="nq-h1"><slot></slot></h1>
        <slot name="more"></slot>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    backArrow?: boolean,
    progressIndicator?: boolean,
    numberSteps?: number,
    step?: number,
}>(), {
    backArrow: false,
    progressIndicator: false,
    numberSteps: 6,
    step: 1,
});

defineEmits<{ (e: 'back'): void }>();

const progressSteps = computed(() => {
    const list: number[] = [];
    for (let i = 1; i <= props.numberSteps; i++) list.push(i);
    return list;
});
</script>

<style scoped>
    .page-header {
        position: relative;
    }

    .page-header-back-button {
        font-size: 3rem;
        position: absolute;
        left: 4rem;
        padding-top: .25rem;
        opacity: 0.4;
        transition: opacity .3s var(--nimiq-ease), transform .3s var(--nimiq-ease);
        color: inherit;
    }

    .page-header-back-button svg {
        display: block;
    }

    .page-header-back-button:hover,
    .page-header-back-button:focus {
        opacity: 1;
        transform: translate3D(-0.375rem, 0, 0);
        outline: none;
    }

    @media (max-width: 450px) {
        .page-header-back-button,
        /* Don't move button left on mobile */
        .page-header-back-button:hover,
        .page-header-back-button:focus {
            left: 3rem;
            transform: none;
        }
    }

    .page-header-back-button::after {
        content: '';
        display: block;
        position: absolute;
        left: -1.5rem;
        top: -1.5rem;
        right: -1.5rem;
        bottom: -1.5rem;
    }

    .progress-indicator {
        width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        padding: 0.5rem;
        position: absolute;
        left: 0;
        top: 0;
    }

    .progress-indicator .indicator {
        flex-grow: 1;
        height: 0.5rem;
        border-radius: 0.25rem;
        background: #e5e5e5;
        margin: 0.5rem;
    }

    .progress-indicator .indicator.active {
        background: #24bdb6;
    }

    .page-header.has-progress-indicator h1,
    .page-header.has-progress-indicator .page-header-back-button {
        margin-top: 1rem;
    }
</style>
