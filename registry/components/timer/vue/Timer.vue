<template>
    <div class="timer"
        :class="{
            'time-shown': timeShown,
            'little-time-left': progress >= .75,
            'inverse-theme': theme === 'inverse',
            'white-theme': theme === 'white',
        }"
        :title="`This offer expires in ${simplifiedTimeWithUnit}.`"
        @mouseenter="hovered = true"
        @mouseleave="hovered = false"
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26">
            <circle class="time-circle" cx="50%" cy="50%" :r="radius"
                :stroke-dasharray="`${timeCircleInfo.length} ${timeCircleInfo.gap}`"
                :stroke-dashoffset="timeCircleInfo.offset"
                :stroke-width="timeCircleInfo.strokeWidth"></circle>
            <circle class="filler-circle" cx="50%" cy="50%" :r="radius"
                :stroke-dasharray="`${fillerCircleInfo.length} ${fillerCircleInfo.gap}`"
                :stroke-dashoffset="fillerCircleInfo.offset"
                :stroke-width="fillerCircleInfo.strokeWidth"></circle>

            <transition name="transition-fade">
                <g v-if="!timeShown" class="info-exclamation-icon">
                    <rect x="12" y="9" width="2" height="2" rx="1" />
                    <rect x="12" y="12.5" width="2" height="4.5" rx="1" />
                </g>
                <text v-else class="countdown" x="50%" y="50%">{{ simplifiedTime }}</text>
            </transition>
        </svg>
    </div>
</template>

<script setup lang="ts">
/**
 * **Timer** — Vue 3 port of @nimiq/vue-components Timer.vue.
 *
 * Circular countdown (Hub checkout "offer expires" indicator). The arc shrinks
 * clockwise as time runs out and turns orange when >= 75% has elapsed. With
 * `alwaysShowTime` (default) the remaining time is shown permanently on a larger
 * ring; otherwise an info icon is shown until hover.
 *
 * Porting notes vs upstream (Vue 2 class component):
 * - The Tooltip wrapper is replaced by a native `title`; pair with the registry
 *   tooltip component if the styled tooltip is needed.
 * - @nimiq/utils Tweenable is inlined as a tiny rAF tween (radius 8 <-> 12).
 * - I18nMixin is dropped; unit strings are en-only.
 * - The adaptive update-interval logic is simplified to upstream's base formula
 *   (totalTime / (circleLength * 3) clamped to [1/60s, 500ms]).
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    startTime?: number,
    endTime?: number,
    alwaysShowTime?: boolean,
    theme?: 'normal' | 'inverse' | 'white',
    strokeWidth?: number,
    maxUnit?: 'second' | 'minute' | 'hour' | 'day',
}>(), {
    alwaysShowTime: true,
    theme: 'normal',
    strokeWidth: 2,
});

const emit = defineEmits<{ (e: 'end', endTime?: number): void }>();

const BASE_RADIUS = 8;
const RADIUS_GROWTH_FACTOR = 1.5;
const TIME_STEPS = [
    { unit: 'minute', factor: 60 },
    { unit: 'hour', factor: 60 },
    { unit: 'day', factor: 24 },
];

const hovered = ref(false);
const timeShown = computed(() => hovered.value || props.alwaysShowTime);

// --- radius tween (inlined @nimiq/utils Tweenable, ease-in-out) ---
const radius = ref(timeShown.value ? BASE_RADIUS * RADIUS_GROWTH_FACTOR : BASE_RADIUS);
let tweenFrame: number | null = null;
function tweenRadius(target: number, duration = 300) {
    if (tweenFrame !== null) cancelAnimationFrame(tweenFrame);
    const from = radius.value;
    const start = performance.now();
    const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const ease = 0.5 - Math.cos(Math.PI * t) / 2;
        radius.value = from + (target - from) * ease;
        if (t < 1) tweenFrame = requestAnimationFrame(step);
        else tweenFrame = null;
    };
    tweenFrame = requestAnimationFrame(step);
}
watch(timeShown, (shown) => tweenRadius(shown ? BASE_RADIUS * RADIUS_GROWTH_FACTOR : BASE_RADIUS));

// --- time keeping ---
const timeOffset = ref(0);
const sampledTime = ref(Date.now());
let endTimeoutId: ReturnType<typeof setTimeout> | null = null;
let updateTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Synchronize the timer with a reference clock (e.g. a server time). */
function synchronize(referenceTime: number) {
    timeOffset.value = referenceTime - Date.now();
}
defineExpose({ synchronize });

const totalTime = computed(() => (props.startTime === undefined || props.endTime === undefined)
    ? 0
    : Math.max(0, props.endTime - props.startTime));

const timeLeft = computed(() => (props.startTime === undefined || props.endTime === undefined)
    ? 0
    : Math.max(0, Math.min(totalTime.value, props.endTime - sampledTime.value)));

const progress = computed(() => totalTime.value === 0 ? 0 : 1 - timeLeft.value / totalTime.value);

const fullCircleLength = computed(() => 2 * Math.PI * radius.value);

const timeCircleInfo = computed(() => {
    // Never render a full circle so it stays recognizable as a timer; the gap is
    // 1.5 strokeWidths plus the two rounded line caps (strokeWidth/2 each).
    const maxLength = fullCircleLength.value - 2.5 * props.strokeWidth;
    const length = Math.min(maxLength, (1 - progress.value) * fullCircleLength.value);
    const lengthWithLineCaps = length + props.strokeWidth;
    const gap = fullCircleLength.value - length;
    const offset = fullCircleLength.value / 4 - gap; // gap first, path ends on top
    return { length, lengthWithLineCaps, gap, offset, strokeWidth: props.strokeWidth };
});

const fillerCircleInfo = computed(() => {
    // Fill the gap left by the time circle with a strokeWidth margin; if space is
    // tight, shrink the filler stroke width instead.
    const availableSpace = fullCircleLength.value - timeCircleInfo.value.lengthWithLineCaps
        - 2 * props.strokeWidth;
    const lengthWithLineCaps = Math.max(0, availableSpace);
    const strokeWidth = Math.min(props.strokeWidth, lengthWithLineCaps);
    const length = Math.max(0, lengthWithLineCaps - strokeWidth);
    const gap = fullCircleLength.value - length;
    const offset = fullCircleLength.value / 4 // rotate by 90 degrees
        - props.strokeWidth / 2 // skip rounded line cap of time circle
        - props.strokeWidth // margin
        - strokeWidth / 2; // account for our own line cap
    return { length, gap, offset, strokeWidth };
});

function toSimplifiedTime(millis: number, includeUnit: boolean, maxUnit?: string): string | number {
    let resultTime = millis / 1000;
    let resultUnit = 'second';
    for (const { unit, factor } of TIME_STEPS) {
        if (resultTime / factor < 1 || resultUnit === maxUnit) break;
        resultTime /= factor;
        resultUnit = unit;
    }
    resultTime = Math.floor(resultTime);
    if (!includeUnit) return resultTime;
    return `${resultTime} ${resultUnit}${resultTime !== 1 ? 's' : ''}`;
}

const simplifiedTime = computed(() => toSimplifiedTime(timeLeft.value, false, props.maxUnit));
const simplifiedTimeWithUnit = computed(() => toSimplifiedTime(timeLeft.value, true, props.maxUnit));

function rerender() {
    sampledTime.value = Date.now() + timeOffset.value;
    if (updateTimeoutId !== null) clearTimeout(updateTimeoutId);
    if (timeLeft.value === 0) return;
    // ~3 updates per arc pixel, clamped to [60fps, 2 per second]
    const interval = Math.min(500,
        Math.max(1000 / 60, totalTime.value / (fullCircleLength.value * 3)));
    updateTimeoutId = setTimeout(rerender, interval);
}

watch([() => props.startTime, () => props.endTime, timeOffset], () => {
    sampledTime.value = Date.now() + timeOffset.value;
    if (endTimeoutId !== null) clearTimeout(endTimeoutId);
    if (props.startTime !== undefined && props.endTime !== undefined) {
        endTimeoutId = setTimeout(() => emit('end', props.endTime),
            Math.max(0, props.endTime - sampledTime.value));
        rerender();
    }
}, { immediate: true });

onBeforeUnmount(() => {
    if (endTimeoutId !== null) clearTimeout(endTimeoutId);
    if (updateTimeoutId !== null) clearTimeout(updateTimeoutId);
    if (tweenFrame !== null) cancelAnimationFrame(tweenFrame);
});
</script>

<style scoped>
    .timer {
        width: 3.25rem;
        position: relative;
    }

    /* for setting height automatically depending on width */
    .timer::before {
        content: '';
        padding-top: 100%;
        display: block;
    }

    svg {
        display: block;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        fill: none;
        stroke-linecap: round;
    }

    circle {
        stroke: var(--nimiq-blue);
        transition: stroke .3s var(--nimiq-ease), opacity .3s var(--nimiq-ease);
    }

    .inverse-theme circle,
    .white-theme circle {
        stroke: white;
    }

    .filler-circle {
        opacity: .2;
    }

    .time-circle {
        opacity: .3;
    }

    .time-shown .time-circle {
        stroke: var(--nimiq-light-blue);
        opacity: 1;
    }

    .inverse-theme.time-shown:not(.little-time-left) .time-circle {
        stroke: var(--nimiq-light-blue-on-dark, var(--nimiq-light-blue));
    }

    .white-theme.time-shown:not(.little-time-left) .time-circle {
        stroke: rgba(255, 255, 255, 0.4);
    }

    .little-time-left .time-circle {
        stroke: var(--nimiq-orange);
        opacity: 1;
    }

    .info-exclamation-icon {
        fill: var(--nimiq-blue);
        opacity: .4;
        transform-origin: center;
        transition: fill .3s var(--nimiq-ease), opacity .3s var(--nimiq-ease), transform .3s var(--nimiq-ease);
    }

    .inverse-theme .info-exclamation-icon,
    .white-theme .info-exclamation-icon {
        fill: white;
    }

    .little-time-left .info-exclamation-icon {
        fill: var(--nimiq-orange);
        opacity: 1;
        transform: rotate(180deg); /* turn info icon into an exclamation mark */
    }

    .countdown {
        font-size: 12px; /* relative to svg viewBox */
        font-weight: bold;
        text-anchor: middle;
        dominant-baseline: central;
        fill: var(--nimiq-light-blue);
        transition: fill .3s var(--nimiq-ease);
    }

    .inverse-theme .countdown {
        fill: var(--nimiq-light-blue-on-dark, var(--nimiq-light-blue));
    }

    .white-theme .countdown {
        fill: rgba(255, 255, 255, 0.6);
    }

    .little-time-left .countdown {
        fill: var(--nimiq-orange);
    }

    .transition-fade-enter-active,
    .transition-fade-leave-active {
        transition: opacity .3s var(--nimiq-ease);
    }

    .transition-fade-enter-from,
    .transition-fade-leave-to {
        opacity: 0 !important;
    }
</style>
