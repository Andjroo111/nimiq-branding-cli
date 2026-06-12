<template>
    <div class="slider-toggle" :class="[`type-${type}`, { 'no-transition': noTransitions, loading }]" ref="root$">
        <!-- Loading state -->
        <label v-if="loading">
            <!-- LoadingSpinner.vue inlined -->
            <svg height="48" width="54" viewBox="0 0 54 48" color="inherit" class="loading-spinner">
                <path class="big-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.4" stroke-dasharray="92.5 60"/>
                <path class="small-hex" d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="47.5 105"/>
            </svg>Loading
        </label>
        <template v-else>
            <!-- Active box that moves and changes width based on the selected slot -->
            <div class="active-box"
                ref="activeBox$"
                :style="{
                    '--center': `${activeBoxStyles.center}px`,
                    '--width': `${activeBoxStyles.width}px`,
                }"
            ></div>
            <!-- Slot buttons -->
            <label v-for="(slotName, index) in slotNames"
                :ref="(el) => { if (el) labels$[index] = el as HTMLLabelElement; }"
                :key="index"
                :class="{ active: localValue === slotName }"
            >
                <input type="radio" :name="name" :value="slotName" v-model="localValue"/>
                <slot :name="slotName"></slot>
            </label>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, onMounted, onUnmounted, ref, useSlots, watch } from 'vue';

export interface SliderToggleRadio {
    label: string;
    value: string;
}

export enum SliderToggleType {
    CURRENCY = 'currency',
    DEFAULT = 'default',
}

const props = withDefaults(defineProps<{
    /** The radio input group name. */
    name: string,
    /** The currently selected option (slot name). */
    value: string,
    /** Visual style: 'currency' is compact, 'default' is large. */
    type?: SliderToggleType | 'currency' | 'default',
    /** Replaces the options with a loading spinner. */
    loading?: boolean,
}>(), {
    type: SliderToggleType.DEFAULT,
    loading: false,
});

const emit = defineEmits<{
    /** Emitted with the newly selected slot name (upstream Vue 2 v-model event). */
    (e: 'input', value: string): void,
}>();

const slots = useSlots();
const slotNames = computed(() => Object.keys(slots));

const root$ = ref<HTMLDivElement | null>(null);
const activeBox$ = ref<HTMLDivElement | null>(null);
const labels$ = ref<HTMLLabelElement[]>([]);
onBeforeUpdate(() => { labels$.value = []; });

const localValue = ref<string | null>(props.value);
const activeBoxStyles = ref<{ center: number, width: number }>({ center: 0, width: 0 });
let isUpdatingActiveBoxPosition = false;
const noTransitions = ref(true);

async function updateActiveBoxPosition() {
    if (isUpdatingActiveBoxPosition) return;
    isUpdatingActiveBoxPosition = true;
    try {
        await nextTick();
        // Wait for browser to update styles, after which getBoundingClientRect should be cheaper
        await new Promise<unknown>((resolve) => { window.requestAnimationFrame(resolve); });

        if (!labels$.value.length || !activeBox$.value || !root$.value) return;

        const label = labels$.value.find(({ className }) => className === 'active') || labels$.value[0];
        if (!label) return;

        const labelRect = label.getBoundingClientRect();
        const containerRect = root$.value.getBoundingClientRect();

        const labelCenter = (labelRect.left - containerRect.left) + (labelRect.width / 2);

        activeBoxStyles.value.center = labelCenter;
        activeBoxStyles.value.width = labelRect.width;
    } finally {
        isUpdatingActiveBoxPosition = false;
    }
}

onMounted(async () => {
    window.addEventListener('resize', updateActiveBoxPosition);
    await updateActiveBoxPosition();
    await nextTick();
    // Wait for browser to update styles
    await new Promise((resolve) => { window.requestAnimationFrame(resolve); });
    noTransitions.value = false;
});

onUnmounted(() => {
    window.removeEventListener('resize', updateActiveBoxPosition);
});

watch(slotNames, (names) => {
    if (!names.some((name) => localValue.value === name)) {
        // New options do not include current localValue
        // localValue update will also trigger updateActiveBoxPosition
        localValue.value = names[0];
    } else {
        updateActiveBoxPosition();
    }
});

watch(() => props.value, (value) => { localValue.value = value; });

watch(localValue, (value) => {
    updateActiveBoxPosition();
    if (value !== null) emit('input', value);
});

// watch for style changes associated with type changes / UI changes when component gets enabled
watch([() => props.type, () => props.loading], updateActiveBoxPosition);
</script>

<style scoped>
.slider-toggle {
    --borderRadius: 9999px;
    --transitionDuration: 200ms;
    --padding: .5rem;

    contain: layout style; /* not paint to not cutoff active-box box-shadow */
    position: relative;
    display: flex;

    background-color: var(--nimiq-highlight-bg);
    border-radius: var(--borderRadius);
    padding: var(--padding);
}

/* Currency type styles */
.slider-toggle,
.slider-toggle.type-currency {
    --inactiveOpacity: .5;
    --horizontalPadding: 16px;
    --verticalPadding: 14px;

    font-size: 1.75rem;
    letter-spacing: 0.1em;
    font-weight: bold;
}

/* Purpose type styles */
.slider-toggle.type-default {
    --inactiveOpacity: .625;
    --horizontalPadding: 2.5rem;
    --verticalPadding: 1.125rem;

    font-size: 2.5rem;
    letter-spacing: 0;
    font-weight: 600;
    color: rgba(31, 35, 72, 0.8); /* --nimiq-blue */
}

/* Loading state styles */
.slider-toggle.loading {
    letter-spacing: initial;
    font-size: 2rem;
    font-weight: 600;
    line-height: 2.5rem;
}

.slider-toggle.loading svg {
    height: 2.5rem;
    width: auto;
    margin-right: 1.5rem;
}

.slider-toggle.loading label {
    opacity: 1;
}

.slider-toggle.loading.no-transition { --transitionDuration: 0ms }


input { display: none }

label {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    isolation: isolate; /* create a separate stacking context to avoid being hidden behind active-box */

    line-height: 150%;

    padding: var(--verticalPadding) var(--horizontalPadding);
    cursor: pointer;

    transition: opacity var(--transitionDuration) var(--nimiq-ease);
}

label:not(.active) {
    opacity: var(--inactiveOpacity);
}

label:not(.active):hover {
    opacity: calc(var(--inactiveOpacity) + .12);
}

label * { pointer-events: none }

.active-box {
    /* variables dynamically updated in updateActiveBoxPosition() */
    --center: 0px;
    --width: 0px;

    contain: size layout paint style;
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(calc(-50% + var(--center)), -50%);

    background-color: white;
    height: calc(100% - (var(--padding) * 2));
    border-radius: var(--borderRadius);
    width: var(--width);

    box-shadow: 0px 13px 27px rgba(31, 35, 72, .07), /* --nimiq-blue */
        0px 5px 6px rgba(31, 35, 72, .04), /* --nimiq-blue */
        0px 1px 2px rgba(31, 35, 72, .02); /* --nimiq-blue */

    transition: transform var(--transitionDuration) var(--nimiq-ease),
                width var(--transitionDuration) var(--nimiq-ease);
}

/* LoadingSpinner.vue scoped styles, inlined (id selectors converted to classes
   to avoid duplicate ids when multiple spinners are on the page) */
/* Hexagon circumfence: 152.5 */
.big-hex {
    stroke-dashoffset: -40.5;
    animation: big-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

.small-hex {
    stroke-dashoffset: 13;
    animation: small-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

@keyframes small-hex {
    0%   { stroke-dashoffset: 13 }
    17%  { stroke-dashoffset: 38.42 }
    33%  { stroke-dashoffset: 63.84 }
    50%  { stroke-dashoffset: 89.25 }
    67%  { stroke-dashoffset: 114.66 }
    83%  { stroke-dashoffset: 140.08 }
    100% { stroke-dashoffset: 165.5 }
}

@keyframes big-hex {
    0%   { stroke-dashoffset: -40.5 }
    17%  { stroke-dashoffset: -15.08 }
    33%  { stroke-dashoffset: 10.33 }
    50%  { stroke-dashoffset: 35.75 }
    67%  { stroke-dashoffset: 61.17 }
    83%  { stroke-dashoffset: 86.58 }
    100% { stroke-dashoffset: 112 }
}
</style>
