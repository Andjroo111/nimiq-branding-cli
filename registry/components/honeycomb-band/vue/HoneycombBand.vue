<template>
    <section class="nq-honeycomb-band">
        <a class="nq-honeycomb-band__cta" :href="ctaHref">{{ ctaLabel }}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 8h10.4M8.6 3.6 13 8l-4.4 4.4" stroke="#fff" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>

        <div class="nq-honeycomb-band__mosaic">
            <div class="nq-honeycomb-band__grid">
                <div v-for="(col, c) in LAYOUT" :key="c" class="nq-honeycomb-band__col"
                    :class="{ 'nq-honeycomb-band__col--offset': col.offset }">
                    <template v-for="(tone, h) in col.hexes">
                        <a v-if="isSocial(tone)" :key="`s${h}`"
                            class="nq-honeycomb-band__hex" :class="`nq-honeycomb-band__hex--${tone}`"
                            :href="socialHref(tone)" :aria-label="SOCIAL_LABELS[tone]">
                            <svg v-if="tone === 'youtube'" width="44" height="31" viewBox="0 0 44 31" aria-hidden="true">
                                <rect width="44" height="31" rx="7" fill="#fff"/>
                                <path d="M18.5 9.4 29.5 15.5 18.5 21.6Z" fill="#e60012"/>
                            </svg>
                            <svg v-else-if="tone === 'x'" width="32" height="32" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                        <span v-else :key="`t${h}`"
                            class="nq-honeycomb-band__hex" :class="`nq-honeycomb-band__hex--${tone}`"/>
                    </template>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
/**
 * **HoneycombBand** — the nimiq.com "Join our live community" honeycomb band.
 *
 * MARKETING component, screenshot-referenced (no upstream source): a blue
 * "Community →" pill centered above a flat-top hexagon mosaic in very light
 * grays with three brand-colored social hexagons (YouTube red play, X black,
 * Facebook blue f). The rounded-hexagon technique (SVG mask-image, tone
 * palette, 16 overlapping flex columns with half-hex offsets) is reused from
 * nimiq-branding-skill/banner.html. The layout is a hardcoded constant —
 * deterministic, no randomness. The grid is 1650px wide and clips at the
 * section edges; keep the section at least ~1000px wide so all three social
 * hexagons stay visible.
 */
type Tone = 'vlight' | 'light' | 'gray' | 'spacer' | 'youtube' | 'x' | 'facebook';

const props = withDefaults(defineProps<{
    /** Label of the blue pill above the mosaic. */
    ctaLabel?: string,
    /** Link target of the pill. */
    ctaHref?: string,
    /** Link target of the red YouTube hexagon. */
    youtubeHref?: string,
    /** Link target of the black X hexagon. */
    xHref?: string,
    /** Link target of the blue Facebook hexagon. */
    facebookHref?: string,
}>(), {
    ctaLabel: 'Community',
    ctaHref: '#',
    youtubeHref: '#',
    xHref: '#',
    facebookHref: '#',
});

// Deterministic honeycomb layout (column-major, top to bottom).
const LAYOUT: ReadonlyArray<{ offset: boolean, hexes: Tone[] }> = [
    { offset: true,  hexes: ['light', 'light', 'light'] },
    { offset: false, hexes: ['spacer', 'light', 'light'] },
    { offset: true,  hexes: ['vlight', 'gray', 'light'] },
    { offset: false, hexes: ['light', 'youtube', 'light'] },
    { offset: true,  hexes: ['light', 'gray', 'vlight'] },
    { offset: false, hexes: ['light', 'light'] },
    { offset: true,  hexes: ['gray', 'light', 'gray'] },
    { offset: false, hexes: ['gray', 'light', 'gray'] },
    { offset: true,  hexes: ['vlight', 'gray'] },
    { offset: false, hexes: ['light', 'gray'] },
    { offset: true,  hexes: ['light', 'gray'] },
    { offset: false, hexes: ['light', 'x'] },
    { offset: true,  hexes: ['facebook', 'light'] },
    { offset: false, hexes: ['gray', 'light'] },
    { offset: true,  hexes: ['gray', 'light'] },
    { offset: false, hexes: ['gray', 'vlight'] },
];

const SOCIAL_LABELS: Record<string, string> = {
    youtube: 'YouTube',
    x: 'X (Twitter)',
    facebook: 'Facebook',
};

function isSocial(tone: Tone): boolean {
    return tone === 'youtube' || tone === 'x' || tone === 'facebook';
}

function socialHref(tone: Tone): string {
    return tone === 'youtube' ? props.youtubeHref
        : tone === 'x' ? props.xHref
        : props.facebookHref;
}
</script>

<style scoped>
.nq-honeycomb-band {
    font-family: 'Mulish', sans-serif;
    background: #fff;
    text-align: center;
    overflow: hidden;
}

/* Blue "Community →" pill (nimiq light-blue gradient from nimiq-style) */
.nq-honeycomb-band__cta {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    height: 38px;
    padding: 0 21px;
    border-radius: 999px;
    background: radial-gradient(100% 100% at bottom right, #265DD7, #0582CA);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.1px;
    text-decoration: none;
    transition: background 0.3s ease;
}
.nq-honeycomb-band__cta:hover,
.nq-honeycomb-band__cta:focus {
    background: radial-gradient(100% 100% at bottom right, #2355C4, #0071C3);
}
.nq-honeycomb-band__cta svg { display: block; }

/* Mosaic: wider than the container, clipped at both edges */
.nq-honeycomb-band__mosaic {
    margin-top: 56px;
    display: flex;
    justify-content: center;
}
.nq-honeycomb-band__grid {
    display: flex;
    align-items: flex-start;
    flex: 0 0 auto;
}
.nq-honeycomb-band__col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 0 -9px;
    flex-shrink: 0;
}
.nq-honeycomb-band__col--offset { margin-top: 60px; }

/* Rounded flat-top hexagon via SVG mask (smooth corners) */
.nq-honeycomb-band__hex {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 110px;
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'%3E%3Cpath d='M35,3 L85,3 Q90,3 93,8 L118,47 Q121,52 118,57 L93,97 Q90,102 85,102 L35,102 Q30,102 27,97 L2,57 Q-1,52 2,47 L27,8 Q30,3 35,3 Z' fill='black'/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 110'%3E%3Cpath d='M35,3 L85,3 Q90,3 93,8 L118,47 Q121,52 118,57 L93,97 Q90,102 85,102 L35,102 Q30,102 27,97 L2,57 Q-1,52 2,47 L27,8 Q30,3 35,3 Z' fill='black'/%3E%3C/svg%3E");
    -webkit-mask-size: 100% 100%;
    mask-size: 100% 100%;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    transition: background-color 0.3s ease, transform 0.35s ease;
}

/* Gray tones (one shade darker on hover) */
.nq-honeycomb-band__hex--vlight { background-color: rgba(225, 225, 230, 0.08); }
.nq-honeycomb-band__hex--light  { background-color: rgba(210, 212, 220, 0.22); }
.nq-honeycomb-band__hex--gray   { background-color: rgba(195, 197, 208, 0.42); }
.nq-honeycomb-band__hex--vlight:hover { background-color: rgba(210, 212, 220, 0.22); }
.nq-honeycomb-band__hex--light:hover  { background-color: rgba(195, 197, 208, 0.42); }
.nq-honeycomb-band__hex--gray:hover   { background-color: rgba(180, 182, 195, 0.55); }
.nq-honeycomb-band__hex--spacer { visibility: hidden; }

/* Brand-colored social hexagons */
.nq-honeycomb-band__hex--youtube  { background-color: #e60012; cursor: pointer; }
.nq-honeycomb-band__hex--x        { background-color: #1a1a1a; cursor: pointer; }
.nq-honeycomb-band__hex--facebook { background-color: #1877F2; cursor: pointer; }
.nq-honeycomb-band__hex--youtube:hover,
.nq-honeycomb-band__hex--x:hover,
.nq-honeycomb-band__hex--facebook:hover { transform: scale(1.12); }
.nq-honeycomb-band__hex svg { display: block; }
</style>
