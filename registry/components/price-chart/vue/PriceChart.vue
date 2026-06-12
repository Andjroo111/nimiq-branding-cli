<template>
    <div class="price-chart-widget">
        <div class="price-chart-wrapper">
            <div class="price-chart" :style="{ opacity: points.length >= 2 ? 1 : 0 }">
                <div class="line-chart" ref="lineChart$">
                    <svg xmlns="http://www.w3.org/2000/svg" :viewBox="viewBox" preserveAspectRatio="none">
                        <path :d="path" fill="none" stroke="currentColor" :opacity="strokeOpacity"
                            :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <button v-if="showTimespanLabel" class="timespan" type="button"
                        @click="$emit('timespan')">{{ timeRange }}</button>
                    <div class="meta">
                        <strong>{{ currency.toUpperCase() }}</strong>
                        <div class="price">
                            <span class="fiat-amount">{{ formattedPrice }}</span>
                            <div v-if="change !== undefined" class="change"
                                :class="change > 0 ? 'positive' : change < 0 ? 'negative' : 'none'">
                                {{ (change * 100).toFixed(1) }}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * **PriceChart** — the wallet sidebar's price sparkline on its navy background.
 *
 * Port of upstream wallet PriceChart.vue + LineChart.vue, rendered in the
 * Sidebar.vue context (24rem-wide navy excerpt). Upstream fetches an 18-point
 * price history from the fiat API and derives price/change from stores; this
 * port takes them as props so renders stay deterministic. The smoothed path is
 * computed with LineChart's exact algorithm (cubic control points, smoothing
 * factor 0.2) against the measured svg box, and the fiat price is formatted
 * like @nimiq/vue-components' FiatAmount (decimals grow until the rounded
 * value deviates < 0.1%).
 *
 * For the wallet's sidebar pairing, stack a second instance with
 * `currency="btc"` and `:show-timespan-label="false"`.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';

interface Point { x: number; y: number }

const props = withDefaults(defineProps<{
    /** Crypto ticker shown bottom-left (rendered uppercase). */
    currency?: string,
    /** Current fiat price. */
    price?: number,
    /** Fiat currency code used for formatting. */
    fiatCurrency?: string,
    /** Relative change over the time range (0.001 = +0.1%). Only positive gets colored (green), as upstream. */
    change?: number,
    /** History points. Defaults to the deterministic 18-point sample NIM series. */
    points?: Point[],
    showTimespanLabel?: boolean,
    timeRange?: '24h' | '7d',
}>(), {
    currency: 'nim',
    price: 0.000501,
    fiatCurrency: 'usd',
    change: 0.001,
    points: () => [500, 499, 497, 494, 495, 492, 490, 491, 494, 493, 496, 499, 498, 501, 503, 502, 500, 500.5]
        .map((y, x) => ({ x, y })),
    showTimespanLabel: true,
    timeRange: '24h',
});

defineEmits<{ (e: 'timespan'): void }>();

const strokeWidth = 2.5;
const strokeOpacity = 0.5;
const padding = 5; // viewBox padding, as LineChart.vue
const smoothingFactor = 0.2;

// Measure the svg box like upstream LineChart.vue (default = sidebar layout's 144x52)
const lineChart$ = ref<HTMLElement | null>(null);
const dimensions = ref({ width: 144, height: 52 });
const onResize = () => requestAnimationFrame(() => {
    const svg = lineChart$.value?.querySelector('svg');
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    dimensions.value = { width: box.width, height: box.height };
});
onMounted(() => { window.addEventListener('resize', onResize); onResize(); });
onUnmounted(() => window.removeEventListener('resize', onResize));

const viewBox = computed(() => `-${strokeWidth / 2} -${padding} `
    + `${dimensions.value.width + strokeWidth} ${dimensions.value.height + 2 * padding}`);

// LineChart.vue calculatePath, verbatim (inlined)
const path = computed(() => {
    const points = props.points;
    if (points.length < 2) return '';
    const { width, height } = dimensions.value;

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const xScaleFactor = width / (maxX - minX || 1);
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const yScaleFactor = height / (maxY - minY || 1);

    const normalizedPoints = points.map((point) => ({
        x: (point.x - minX) * xScaleFactor,
        y: height - (point.y - minY) * yScaleFactor, // SVG y-axis 0 is on top
    }));

    const lineFromPointToPoint = (start: Point, end: Point) => {
        const x = start.x - end.x;
        const y = start.y - end.y;
        return { length: Math.sqrt(x ** 2 + y ** 2), angle: Math.atan2(y, x) };
    };

    const controlPoint = (current: Point, previous: Point | null, next: Point | null, isEnd = false): Point => {
        const p = previous || current;
        const n = next || current;
        const line = lineFromPointToPoint(p, n);
        return {
            x: current.x - Math.cos(line.angle + (isEnd ? Math.PI : 0)) * line.length * smoothingFactor,
            y: current.y - Math.sin(line.angle + (isEnd ? Math.PI : 0)) * line.length * smoothingFactor,
        };
    };

    return normalizedPoints.map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = normalizedPoints[index - 1];
        const next = index < normalizedPoints.length - 1 ? normalizedPoints[index + 1] : null;
        const cp1 = controlPoint(prev, normalizedPoints[index - 2] || null, point);
        const cp2 = controlPoint(point, prev, next, true);
        return `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${point.x} ${point.y}`;
    }).join(' ');
});

// FiatAmount-style formatting: grow decimals until rounding deviates < maxRelativeDeviation
const formattedPrice = computed(() => {
    const maxRelativeDeviation = 0.001;
    const currency = props.fiatCurrency.toUpperCase();
    let digits = new Intl.NumberFormat('en', { style: 'currency', currency })
        .resolvedOptions().maximumFractionDigits ?? 2;
    let formatted = '';
    while (digits <= 20) {
        formatted = props.price.toLocaleString('en', {
            style: 'currency', currency, useGrouping: false,
            minimumFractionDigits: digits, maximumFractionDigits: digits,
        });
        const parsed = Number.parseFloat(formatted.replace(/[^\d.-]/g, ''));
        if (!props.price || Math.abs((props.price - parsed) / props.price) <= maxRelativeDeviation) break;
        digits += 1;
    }
    return formatted;
});
</script>

<style scoped>
.price-chart-widget {
    /* wallet theme vars (themes.scss) scoped to the component root */
    --body-size: 2rem;
    --small-size: 1.75rem;
    --tiny-label-size: 1.375rem;
    --bg-secondary: var(--nimiq-blue, #1F2348); /* Sidebar */

    width: 24rem; /* --sidebar-width (App.vue) */
    padding: 0 1.5rem; /* --padding-sides (Sidebar.vue) */
    background: var(--bg-secondary);
    color: white;
    font-family: 'Mulish', 'Muli', system-ui, sans-serif;
    font-size: var(--body-size);
}
.price-chart-widget,
.price-chart-widget * {
    box-sizing: border-box;
}

/* Sidebar.vue .price-chart-wrapper (scroll-fade mask of the full sidebar omitted) */
.price-chart-wrapper {
    overflow-y: auto;
    width: 100%;
    scrollbar-width: none;
}
.price-chart-wrapper::-webkit-scrollbar {
    width: 0;
}

/* PriceChart.vue root + Sidebar.vue sizing */
.price-chart {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 15rem;
    width: 100%;
    padding: 1.5rem;
}
.price-chart:first-child { margin-top: 1.25rem; }
.price-chart:last-child { margin-bottom: .75rem; }

/* LineChart.vue */
.line-chart {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}
.line-chart svg {
    flex-grow: 1;
    transition: opacity .3s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}

/* PriceChart.vue .timespan (button.reset baked in; left/top 1.5rem = Sidebar override) */
.timespan {
    position: absolute;
    left: 1.5rem;
    top: 1.5rem;
    text-transform: uppercase;
    background: rgb(109, 112, 135); /* rgba(255, 255, 255, 0.35) on Nimiq Blue */
    border: 0.25rem solid var(--bg-secondary);
    outline: none;
    margin: -0.25rem;
    border-radius: calc(0.25rem + 0.25rem);
    padding: 0.375rem;
    font-family: inherit;
    font-size: var(--tiny-label-size); /* 11px */
    line-height: 1;
    font-weight: bold;
    color: var(--bg-secondary);
    letter-spacing: 0.055em;
    text-align: inherit;
    cursor: pointer;
}

/* PriceChart.vue .meta row */
.meta {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    min-height: 4.5rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: var(--small-size);
    margin-top: 1rem;
}
.price {
    text-align: right;
}
.change {
    font-weight: bold;
}
.change.positive {
    color: var(--nimiq-green, #21BCA5);
}
.change.positive::before {
    content: '+';
}
/* upstream styles only .positive — negative stays 60% white, bold */
</style>
