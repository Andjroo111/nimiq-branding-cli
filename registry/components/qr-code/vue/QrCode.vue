<template>
    <canvas v-if="!!data" ref="canvas$" class="qr-code"></canvas>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components QrCode.vue.
// Requires npm dep: qr-creator (the upstream lazy-loads it as a webpack chunk;
// here it is imported directly — pair with your bundler's code-splitting if needed).
import { ref, watch, nextTick } from 'vue';
import QrCreator from 'qr-creator';

const props = withDefaults(defineProps<{
    data: string,
    /** Error correction level according to QR specs. */
    errorCorrection?: 'L' | 'M' | 'H' | 'Q',
    /** Roundness of QR code modules, 0–0.5. Recommended value: 0.5. */
    radius?: number,
    /** Fill of QR code: hex color string or qr-creator gradient descriptor. */
    fill?: string | QrCreator.LinearGradient | QrCreator.RadialGradient,
    /** Background color of QR code. null means transparent. */
    background?: string | null,
    /** Width and height of QR code. */
    size?: number,
}>(), {
    errorCorrection: 'M',
    radius: 0.5,
    // default equivalent to nimiq-light-blue-bg
    fill: () => ({
        type: 'radial-gradient',
        // circle centered in bottom right corner with radius of the size of qr code diagonal
        position: [1, 1, 0, 1, 1, Math.sqrt(2)],
        colorStops: [
            [0, '#265DD7'],
            [1, '#0582CA'], // nimiq-light-blue
        ],
    } as QrCreator.RadialGradient),
    background: null,
    size: 240,
});

const canvas$ = ref<HTMLCanvasElement | null>(null);

async function updateQrCode() {
    if (!props.data) return;
    await nextTick(); // Make sure the canvas is in the DOM (it depends on !!data)
    if (!canvas$.value) return;
    QrCreator.render({
        text: props.data,
        radius: props.radius,
        ecLevel: props.errorCorrection,
        fill: props.fill,
        background: props.background,
        size: props.size,
    }, canvas$.value);
}

watch(
    () => [props.data, props.errorCorrection, props.radius, props.fill, props.background, props.size],
    updateQrCode,
    { immediate: true, deep: true },
);

async function toDataUrl(type = 'image/png'): Promise<string> {
    if (!props.data) return 'data:,';
    await nextTick(); // Make sure the canvas is in the DOM (it depends on !!data)
    return canvas$.value!.toDataURL(type);
}

defineExpose({ toDataUrl });
</script>

<!-- Upstream QrCode.vue has no <style> block; the canvas is unstyled. -->
