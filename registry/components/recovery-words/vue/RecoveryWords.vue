<template>
    <div class="recovery-words">
        <div class="words-container" :class="{ blurred: !revealed }">
            <div class="word-section">
                <div v-for="(word, i) in paddedWords" :key="i"
                    class="word recovery-words-input-field"
                    :class="{ complete: !!word }">
                    <span class="word-number">{{ String(i + 1).padStart(2, '0') }}</span>
                    <span class="word-content" :title="`word #${i + 1}`">{{ revealed ? word : '' }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Port of Keyguard RecoveryWords (display mode, providesInput = false):
// upstream/keyguard src/components/RecoveryWords.js + RecoveryWords.css, geometry from
// src/request/export/Export.css. Place on a dark card (.nq-blue-bg) — text is white.
const props = withDefaults(defineProps<{
    /** The 24 recovery words, in order. Shorter arrays are padded with empty tiles. */
    words?: string[],
    /**
     * When false, word text is withheld from the DOM and the grid gets the upstream
     * background-page treatment (blur(10px) at 40% opacity, from Export.css
     * .page#recovery-words:not(:target) .words-container).
     */
    revealed?: boolean,
}>(), {
    words: () => [],
    revealed: true,
});

const paddedWords = computed(() => Array.from({ length: 24 }, (_, i) => props.words[i] || ''));
</script>

<style scoped>
    /* Keyguard RecoveryWords.css, verbatim (display-mode rules) */
    .recovery-words {
        overflow: hidden scroll;
    }

    .words-container {
        width: 100%;
        box-sizing: border-box;
    }

    .words-container .word-section {
        display: flex;
        flex-wrap: wrap;
        overflow: hidden; /* prevent scrollbar from showing when input shakes */
    }

    .word {
        margin: .5rem;
        flex: 1 0 25%;
        position: relative;
        height: 5rem;
        line-height: 5rem;
        border-radius: 0.5rem;
    }

    .word.complete {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .word .word-number {
        flex-grow: 0;
        margin: 0 1rem;
        opacity: 0.3;
        font-weight: 600;
        font-size: 1.75rem;
    }

    .word .word-content {
        flex-grow: 1;
        font-size: 2rem;
    }

    .recovery-words ::selection {
        background: var(--nimiq-blue); /* WebKit/Blink Browsers */
    }

    .recovery-words ::-moz-selection {
        background: var(--nimiq-blue); /* Gecko Browsers */
    }

    /* Keyguard Export.css geometry (page id scoping removed; the 39rem scroll viewport
       and its fade mask omitted so the full 24-word grid is shown) */
    .recovery-words {
        position: relative;
        padding: 0 3rem;
        overflow-x: hidden;
    }

    .words-container .word-section {
        padding: 4rem 0rem;
    }

    /* scrollbar hidden for the static full-grid display (upstream scrolls this area) */
    .recovery-words { scrollbar-width: none; }
    .recovery-words::-webkit-scrollbar { display: none; }

    /* Hidden state — upstream blurs the grid when its page is in the background
       (Export.css .page#recovery-words:not(:target) .words-container) */
    .words-container {
        transition: filter .6s, opacity .6s;
    }
    .words-container.blurred {
        filter: blur(10px);
        opacity: .4;
    }
    @media (prefers-reduced-motion: reduce) {
        .words-container { transition: none; }
    }
</style>
