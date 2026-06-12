<template>
    <Tooltip class="timer"
        v-bind="{
            preferredPosition: 'bottom right',
            theme: theme === 'inverse' || theme === 'white' ? 'inverse' : 'normal',
            ...tooltipProps,
            styles: {
                width: '18.25rem',
                pointerEvents: 'none',
                ...(tooltipProps ? (tooltipProps as any).styles : undefined),
            },
        }"
        @show="detailsShown = true"
        @hide="detailsShown = false"
        :class="{
            'time-shown': detailsShown || alwaysShowTime,
            'little-time-left': progress >= .75,
            'inverse-theme': theme === 'inverse',
            'white-theme': theme === 'white',
        }"
    >
        <template #trigger>
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
                    <g v-if="!detailsShown && !alwaysShowTime" class="info-exclamation-icon">
                        <rect x="12" y="9" width="2" height="2" rx="1" />
                        <rect x="12" y="12.5" width="2" height="4.5" rx="1" />
                    </g>
                    <text v-else class="countdown" x="50%" y="50%">
                        {{ toSimplifiedTime(timeLeft, false, maxUnit) }}
                    </text>
                </transition>
            </svg>
        </template>
        <template #default>
            {{ $t('This offer expires in {timer}.', { timer: toSimplifiedTime(timeLeft, true, maxUnit) }) }}
        </template>
    </Tooltip>
</template>

<script setup lang="ts">
/**
 * Minimal Vue 3 port of @nimiq/vue-components Timer.vue, shipped with the
 * payment-info-line registry component (Timer is not a standalone registry
 * component). Tooltip.vue comes from the 'tooltip' registry component — copy it
 * next to this file.
 *
 * Simplifications vs upstream: the trigger circle radius snaps between 8 and 12
 * instead of tweening (upstream uses @nimiq/utils Tweenable), and the re-render
 * interval is the upstream formula without the per-time-unit jump clamping.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Tooltip from './Tooltip.vue';

const REM_FACTOR = 8; // size of 1rem
const BASE_SIZE = 3.25 * REM_FACTOR;
const BASE_RADIUS = REM_FACTOR;
const RADIUS_GROWTH_FACTOR = 1.5;

const TIME_STEPS: Array<{ unit: string, factor: number }> = [
    { unit: 'minute', factor: 60 },
    { unit: 'hour', factor: 60 },
    { unit: 'day', factor: 24 },
];

const props = withDefaults(defineProps<{
    startTime?: number,
    endTime?: number,
    alwaysShowTime?: boolean,
    theme?: 'normal' | 'inverse' | 'white',
    strokeWidth?: number,
    tooltipProps?: object,
    maxUnit?: 'second' | 'minute' | 'hour' | 'day',
}>(), {
    alwaysShowTime: true,
    theme: 'normal',
    strokeWidth: 2,
});

const emit = defineEmits<{ (e: 'end', endTime?: number): void }>();

// I18nMixin stub: identity translation with variable interpolation.
const $t = (key: string, vars?: Record<string, unknown>) => !vars
    ? key
    : key.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));

function toSimplifiedTime(millis: number, includeUnit: boolean, maxUnit?: string): number | string {
    // find appropriate unit, starting with second
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

const detailsShown = ref(false);
const timeOffset = ref(0);
const sampledTime = ref(0);
const size = ref(BASE_SIZE);
let endTimeoutId = -1;
let updateTimeoutId = -1;

const radius = computed(() => detailsShown.value || props.alwaysShowTime
    ? BASE_RADIUS * RADIUS_GROWTH_FACTOR
    : BASE_RADIUS);
const fullCircleLength = computed(() => 2 * Math.PI * radius.value);

const totalTime = computed(() => props.startTime === undefined || props.endTime === undefined
    ? 0
    : Math.max(0, props.endTime - props.startTime));

const timeLeft = computed(() => props.startTime === undefined || props.endTime === undefined
    ? 0
    : Math.max(0, Math.min(totalTime.value, props.endTime - sampledTime.value)));

const progress = computed(() => totalTime.value === 0 ? 0 : 1 - timeLeft.value / totalTime.value);

const timeCircleInfo = computed(() => {
    // Have a max length to make it more recognizable that this is a timer by never rendering a full circle.
    const maxLength = fullCircleLength.value - 2.5 * props.strokeWidth;
    const length = Math.min(maxLength, (1 - progress.value) * fullCircleLength.value);
    const lengthWithLineCaps = length + props.strokeWidth; // add line caps with strokeWidth/2 radius
    const gap = fullCircleLength.value - length;
    const offset = fullCircleLength.value / 4 - gap;
    return { length, lengthWithLineCaps, gap, offset, strokeWidth: props.strokeWidth };
});

const fillerCircleInfo = computed(() => {
    // Filler circle is rendered in the gap left by the time circle with a margin of strokeWidth.
    const availableSpace = fullCircleLength.value - timeCircleInfo.value.lengthWithLineCaps
        - 2 * props.strokeWidth;
    const lengthWithLineCaps = Math.max(0, availableSpace);
    const strokeWidth = Math.min(props.strokeWidth, lengthWithLineCaps);
    const length = Math.max(0, lengthWithLineCaps - strokeWidth); // subtract rounded line caps
    const gap = fullCircleLength.value - length;
    const offset = fullCircleLength.value / 4 // rotate by 90 degrees
        - props.strokeWidth / 2 // skip rounded line cap of time circle
        - props.strokeWidth // margin
        - strokeWidth / 2; // account for our own line cap
    return { length, lengthWithLineCaps, gap, offset, strokeWidth };
});

function calculateUpdateInterval(): number {
    const scaleFactor = size.value / BASE_SIZE;
    const circleLengthPixels = fullCircleLength.value * scaleFactor;
    const steps = circleLengthPixels * 3; // update every .33 pixel change for smooth transitions
    const minInterval = 1000 / 60; // up to 60 fps
    const maxInterval = 500; // at least twice per second to not skip a second in the countdown
    return Math.min(maxInterval, Math.max(minInterval, totalTime.value / steps));
}

function rerender() {
    sampledTime.value = Date.now() + timeOffset.value;
    if (timeLeft.value === 0) return;
    window.clearTimeout(updateTimeoutId);
    updateTimeoutId = window.setTimeout(rerender, calculateUpdateInterval());
}

function setTimer() {
    sampledTime.value = Date.now() + timeOffset.value;
    window.clearTimeout(endTimeoutId);
    if (props.startTime && props.endTime) {
        endTimeoutId = window.setTimeout(() => emit('end', props.endTime),
            props.endTime - sampledTime.value);
        rerender();
    }
}

watch([() => props.startTime, () => props.endTime, timeOffset], setTimer, { immediate: true });

function synchronize(referenceTime: number) {
    timeOffset.value = referenceTime - Date.now();
}

function onResize() {
    size.value = (document.querySelector('.timer') as HTMLElement)?.offsetWidth || BASE_SIZE;
}

onMounted(() => {
    requestAnimationFrame(onResize);
    window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
    window.clearTimeout(endTimeoutId);
    window.clearTimeout(updateTimeoutId);
    window.removeEventListener('resize', onResize);
});

defineExpose({ synchronize });
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

    .tooltip :deep(.trigger),
    svg {
        display: block;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    svg {
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
