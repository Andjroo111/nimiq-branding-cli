<template>
    <div ref="root$" class="carousel" :class="{ disabled }">
        <div v-for="entry in entries" :key="entry"
            :ref="(el) => setEntryRef(entry, el)"
            :class="{ selected: effectiveSelected === entry }"
            @click="!disabled && updateSelection(entry)"
            @focusin="!disabled && updateSelection(entry)">
            <slot :name="entry"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components Carousel.vue.
// The Tweenable helper from @nimiq/utils is inlined verbatim below (no npm dep).
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// --- Inlined verbatim from @nimiq/utils (src/tweenable/Tweenable.ts) ---

const Easing = {
    LINEAR: (t: number) => t,
    EASE_IN_OUT_CUBIC: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
};

class Tweenable {
    constructor(
        public targetValue: number = 0,
        public startValue: number = targetValue,
        public tweenTime: number = 0,
        public startTime: number = Date.now(),
        public easing: (progress: number) => number = Easing.EASE_IN_OUT_CUBIC,
    ) {}

    public get currentValue(): number {
        const easedProgress = this.easing(this.progress);
        return this.startValue + (this.targetValue - this.startValue) * easedProgress;
    }

    public get progress(): number {
        if (this.tweenTime === 0) return 1;
        return Math.min(1, (Date.now() - this.startTime) / this.tweenTime);
    }

    public get finished(): boolean {
        return this.progress === 1;
    }

    public tweenTo(targetValue: number, tweenTime = this.tweenTime) {
        if (targetValue === this.targetValue) return;
        this.startValue = this.currentValue;
        this.targetValue = targetValue;
        this.startTime = Date.now();
        this.tweenTime = tweenTime;
    }
}

// --- end inlined helper ---

const props = withDefaults(defineProps<{
    /** Slide names; each names a slot that provides that slide's content. */
    entries: string[],
    /** Entry to bring to the front; invalid values fall back to the first entry. */
    selected?: string,
    /** Minimum gap in px between neighboring slides. */
    entryMargin?: number,
    /** Tween duration in ms. */
    animationDuration?: number,
    /** display:none for entries on the back half of the circle. */
    hideBackgroundEntries?: boolean,
    disabled?: boolean,
}>(), {
    entryMargin: 16,
    animationDuration: 1000,
    hideBackgroundEntries: false,
    disabled: false,
});

const emit = defineEmits<{
    (event: 'select', entry: string): void,
}>();

const root$ = ref<HTMLElement | null>(null);
const entryRefs = new Map<string, HTMLElement>();
function setEntryRef(entry: string, el: any) {
    if (el) entryRefs.set(entry, el as HTMLElement);
    else entryRefs.delete(entry);
}

const effectiveSelected = ref('');
const radius = new Tweenable();
const rotations = new Map<string, Tweenable>(); // map entry -> rotation
let requestAnimationFrameId: number | null = null;

// Add a dummy circle position for <= 2 entries so the second entry is not
// hidden exactly behind the selected one on the opposite side of the circle.
const hasDummyPosition = () => props.entries.length <= 2;
const totalPositionCount = () => props.entries.length + (hasDummyPosition() ? 1 : 0);

onMounted(async () => {
    document.addEventListener('keydown', onKeydown);
    // trigger these manually instead of via immediate watcher to avoid animating on first render
    await updateDimensions(false);
    updateSelection(props.selected || '');
    updateRotations(false);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
    if (requestAnimationFrameId === null) return;
    cancelAnimationFrame(requestAnimationFrameId);
});

watch(() => props.entryMargin, () => updateDimensions(true));

async function updateDimensions(tween: boolean = true) {
    await nextTick(); // let Vue render new entries
    let largestHeight = 0;
    let largestMinDistance = 0;
    for (let i = 0; i < props.entries.length; ++i) {
        const el1 = entryRefs.get(props.entries[i])!;
        const el2 = entryRefs.get(props.entries[(i + 1) % props.entries.length])!;
        largestHeight = Math.max(largestHeight, el1.offsetHeight);
        const minDistance = el1.offsetWidth / 2 + el2.offsetWidth / 2 + props.entryMargin;
        largestMinDistance = Math.max(largestMinDistance, minDistance);
    }
    // Choose radius big enough such that two items can be rendered side by side without overlapping.
    // Calculate on a right triangle formed by radius, half distance and perpendicular from center point
    // to distance line.
    const centerAngle = 2 * Math.PI / totalPositionCount() / 2; // angle at circle center point
    const newRadius = (largestMinDistance / 2) / Math.sin(centerAngle);
    radius.tweenTo(newRadius, tween ? props.animationDuration : 0);
    if (root$.value) root$.value.style.minHeight = `${largestHeight}px`;
    rerender();
}

watch(() => props.entries, async () => {
    await updateDimensions();
    updateSelection(effectiveSelected.value); // re-validate
    updateRotations();
});

watch(() => props.selected, (newSelection) => updateSelection(newSelection || ''));

function updateSelection(newSelection: string) {
    const oldSelection = effectiveSelected.value;
    const isNewSelectionValid = props.entries.includes(newSelection);
    const isOldSelectionValid = props.entries.includes(oldSelection);
    if (isNewSelectionValid) {
        effectiveSelected.value = newSelection;
    } else if (!isOldSelectionValid) {
        effectiveSelected.value = props.entries[0];
    } // else keep the old selection

    if (effectiveSelected.value !== oldSelection) {
        emit('select', effectiveSelected.value);
    }
}

watch(effectiveSelected, () => updateRotations(true));
watch(() => props.disabled, () => updateRotations(true));

function updateRotations(tween: boolean = true) {
    // clean up removed entries
    for (const entry of rotations.keys()) {
        if (props.entries.includes(entry)) continue;
        rotations.delete(entry);
    }
    // update rotations
    for (const entry of props.entries) {
        const rotation = rotations.get(entry) || new Tweenable();
        const tweenTime = tween ? props.animationDuration : 0;
        rotation.tweenTo(calculateTargetRotation(entry, rotation.currentValue), tweenTime);
        rotations.set(entry, rotation);
    }
    rerender();
}

function calculateTargetRotation(entry: string, currentRotation: number): number {
    if (props.disabled && entry !== effectiveSelected.value) {
        // hide not selected entries at other end of circle
        return currentRotation + calculateRotationInClosestDirection(currentRotation, Math.PI);
    }
    const stepSize = 2 * Math.PI / totalPositionCount();
    const entryIndex = props.entries.indexOf(entry);
    const selectedIndex = props.entries.indexOf(effectiveSelected.value);
    let offset = entryIndex - selectedIndex;
    if (hasDummyPosition() && offset > totalPositionCount() / 2) {
        // skip dummy position
        offset += 1;
    }
    return currentRotation + calculateRotationInClosestDirection(currentRotation, offset * stepSize);
}

watch(() => props.hideBackgroundEntries, () => rerender());

function rerender() {
    if (requestAnimationFrameId !== null) return;
    requestAnimationFrameId = requestAnimationFrame(() => {
        const zCoordinatesForEntries: Array<[string, number]> = [];
        let finished = radius.finished;
        for (const [entry, rotation] of rotations) {
            const currentRotation = rotation.currentValue;
            const currentRadius = radius.currentValue;
            const x = Math.sin(currentRotation) * currentRadius;
            const z = Math.cos(currentRotation) * currentRadius - currentRadius;
            const el = entryRefs.get(entry);
            if (!el) continue;
            el.style.transform = `translate3d(calc(${x}px - 50%),-50%,${z}px)`;
            el.style.display = shouldHide(entry) ? 'none' : '';
            zCoordinatesForEntries.push([entry, z]);
            finished = finished && rotation.finished;
        }

        // Note that instead of setting z-index manually, we could use transform-style: preserve-3d to order
        // automatically by z coordinate. But unfortunately, this makes the entries not clickable anymore.
        zCoordinatesForEntries.sort(([, z1], [, z2]) => z1 - z2);
        for (let i = 0; i < zCoordinatesForEntries.length; ++i) {
            const el = entryRefs.get(zCoordinatesForEntries[i][0]);
            if (el) el.style.zIndex = `${i}`;
        }

        requestAnimationFrameId = null;
        if (!finished) rerender();
    });
}

function calculateRotationInClosestDirection(fromAngle: number, toAngle: number): number {
    // angle offset modulo full rotations
    const rotation = (toAngle - fromAngle) % (2 * Math.PI);
    // determine rotation in opposite direction (subtracting or adding a full circle depending on direction (sign))
    const rotationOppositeDirection = rotation - Math.sign(rotation) * 2 * Math.PI;
    if (Math.abs(Math.abs(rotation) - Math.abs(rotationOppositeDirection)) < 1e-10) {
        // in case of ambiguity chose a default direction
        return Math.min(rotation, rotationOppositeDirection);
    } else if (Math.abs(rotation) < Math.abs(rotationOppositeDirection)) {
        return rotation;
    } else {
        return rotationOppositeDirection;
    }
}

function shouldHide(entry: string): boolean {
    const rotation = rotations.get(entry);
    if (!rotation || (!props.disabled && !props.hideBackgroundEntries)) return false;
    const absoluteRotation = Math.abs(calculateRotationInClosestDirection(0, rotation.currentValue));
    if (props.disabled) {
        // Hide disabled elements once they reached the opposite end of the circle, also to avoid that they are
        // still reachable via tab. While they're animating to get there, display them even when they're in the
        // back part of the circle.
        return Math.abs(absoluteRotation - Math.PI) < 1e-10;
    }
    // Hide entries in the back part of the circle as these will not be visible behind the front entries
    const stepSize = 2 * Math.PI / totalPositionCount();
    const threshold = Math.PI / 2 + stepSize / (totalPositionCount() - 1); // just a heuristic but works ok
    return absoluteRotation > threshold;
}

function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const firstRotation = rotations.values().next().value;
    if (props.disabled
        || target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || !firstRotation
        || firstRotation.progress < .5 // block if previous change not animated far enough
    ) return;
    const currentIndex = props.entries.indexOf(effectiveSelected.value);
    let newIndex;
    if (event.key === 'ArrowLeft') {
        newIndex = (currentIndex - 1 + props.entries.length) % props.entries.length;
    } else if (event.key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % props.entries.length;
    } else {
        return;
    }
    updateSelection(props.entries[newIndex]);
}

defineExpose({ updateDimensions });
</script>

<style scoped>
    .carousel {
        position: relative;
        padding: 4rem;
        box-sizing: content-box;
        perspective: 1500px;
    }

    .carousel > * {
        position: absolute;
        left: 50%;
        top: 50%;
    }

    .carousel:not(.disabled) > :not(.selected) {
        cursor: pointer;
    }

    .carousel > :not(.selected) :deep(*) {
        pointer-events: none !important;
    }
</style>
