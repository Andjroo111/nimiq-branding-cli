<template>
    <div class="backup-codes" :class="stepClass">
        <div v-for="n in [1, 2]" :key="n"
            class="message-bubble" :class="[`code-${n}`, bubbleClasses(n)]">
            <div class="background"></div>
            <div class="label">Nimiq Backup Code {{ n }}/2</div>
            <code class="code">{{ n === 1 ? code1 : code2 }}</code>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Port of Keyguard BackupCodesIllustration (BackupCodesIllustrationBase.js markup +
// _getMessageBubbleClasses state logic from BackupCodesIllustration.js). The export
// flow's view transitions are not ported; steps switch statically. Place on a dark card
// (.nq-blue-bg), 52.5rem wide in Keyguard.
type Step = 'intro' | 'send-code-1' | 'send-code-1-confirm' | 'send-code-2' | 'send-code-2-confirm' | 'success';

const props = withDefaults(defineProps<{
    /** Backup code 1 text. Empty shows the redacted placeholder bars. */
    code1?: string,
    /** Backup code 2 text. Empty shows the redacted placeholder bars. */
    code2?: string,
    /** Illustration step, mirroring BackupCodesIllustration.Steps (without the page prefix). */
    step?: Step,
    /** Pulses the active code while it is being generated (reduced-motion aware). */
    loading?: boolean,
}>(), {
    code1: '',
    code2: '',
    step: 'intro',
    loading: false,
});

const stepClass = computed(() => `backup-codes-${props.step}`);

// Verbatim translation of BackupCodesIllustration._getMessageBubbleClasses()
function bubbleClasses(codeIndex: number) {
    const step = props.step;
    const masked = step === 'intro'
        || (['send-code-1', 'send-code-1-confirm'].includes(step) && codeIndex === 2);
    const faded = (['send-code-1', 'send-code-1-confirm'].includes(step) && codeIndex === 2)
        || (['send-code-2', 'send-code-2-confirm'].includes(step) && codeIndex === 1);
    const zoomed = ['send-code-1', 'send-code-1-confirm', 'send-code-2', 'send-code-2-confirm'].includes(step);
    const complete = (['send-code-1-confirm', 'send-code-2'].includes(step) && codeIndex === 1)
        || ['send-code-2-confirm', 'success'].includes(step);
    return { masked, faded, zoomed, complete, loading: props.loading };
}
</script>

<style scoped>
    /* Keyguard BackupCodesIllustrationBase.css — verbatim, root renamed to
       .backup-codes, loading keyframes prefixed, view-transition setup omitted */
    .backup-codes {
        contain: size layout paint style;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        width: 100%;
        height: 26rem;
        padding: 0;
    }

    /* message-bubble variables */

    .message-bubble {
        --zoom: 1;
        /* to avoid rendering at sub-pixel precision, we round values */
        --message-bubble-width: round(calc(27rem * var(--zoom)), 1px);
        --message-bubble-min-height: round(calc(12rem * var(--zoom)), 1px);
        --message-bubble-padding: round(calc(1.5rem * var(--zoom)), 1px);
        --message-bubble-padding-bottom: round(calc(2.5rem * var(--zoom)), 1px);
        --label-font-size: round(calc(1.75rem * var(--zoom)), 1px);
        --label-margin-bottom: round(calc(1rem * var(--zoom)), 1px);
        --code-font-size: round(calc(1.75rem * var(--zoom)), 1px);
        --counter-size: round(calc(3rem * var(--zoom)), 1px);
        --counter-offset: round(calc(3rem * var(--zoom) * .4), 1px);
        --counter-font-size: round(calc(1.5rem * var(--zoom)), 1px);
        --counter-checkmark-size: round(calc(1.25rem * var(--zoom)), 1px);
    }

    /* fallback if rounding is not supported */
    @supports not (width: round(1.2px, 1px)) {
        .message-bubble {
            --message-bubble-width: calc(27rem * var(--zoom));
            --message-bubble-min-height: calc(12rem * var(--zoom));
            --message-bubble-padding: calc(1.5rem * var(--zoom));
            --message-bubble-padding-bottom: calc(2.5rem * var(--zoom));
            --label-font-size: calc(1.75rem * var(--zoom));
            --label-margin-bottom: calc(1rem * var(--zoom));
            --code-font-size: calc(1.75rem * var(--zoom));
            --counter-size: calc(3rem * var(--zoom));
            --counter-offset: calc(3rem * var(--zoom) * .4);
            --counter-font-size: calc(1.5rem * var(--zoom));
            --counter-checkmark-size: calc(1.25rem * var(--zoom));
        }
    }

    .message-bubble:not(.zoomed) {
        --code-font-size: calc(1.75rem * var(--zoom) * .995); /* no rounding on purpose */
    }

    /* common message-bubble styles */

    .message-bubble {
        position: absolute;

        width: var(--message-bubble-width);
        min-height: var(--message-bubble-min-height);
        padding: var(--message-bubble-padding);
        padding-bottom: var(--message-bubble-padding-bottom);

        line-height: 1;
        filter: drop-shadow(0 0 calc(20px * var(--zoom)) rgba(0, 0, 0, 0.3))
            drop-shadow(0 calc(1.34px * var(--zoom)) calc(4.47px * var(--zoom)) rgba(59, 76, 106, 0.0775))
            drop-shadow(0 calc(0.4px * var(--zoom)) calc(1.33px * var(--zoom)) rgba(59, 76, 106, 0.0525));
    }

    /* background */

    .message-bubble .background {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        z-index: -1;
    }
    .message-bubble.code-1 .background {
        /* left message bubble */
        background-image: radial-gradient(141.42% 141.42% at 100% 100%, #693BC4 0%, #8F3FD5 100%);
        mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216 96" preserveAspectRatio="none"><path d="M0 3a3 3 0 0 1 3-3h210a3 3 0 0 1 3 3v75.9a3 3 0 0 1-3 3H24.5a3 3 0 0 0-1.8.6l-18 13A3 3 0 0 1 0 93z"/></svg>');
    }
    .message-bubble.code-2 .background {
        /* right message bubble */
        background-image: radial-gradient(141.42% 141.42% at 0% 100%, #DC1845 0%, #F33F68 100%);
        mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 216 96" preserveAspectRatio="none"><path d="M216 3a3 3 0 0 0-3-3H3a3 3 0 0 0-3 3v75.9a3 3 0 0 0 3 3h188.5a3 3 0 0 1 1.8.6l18 13A3 3 0 0 0 216 93z"/></svg>');
    }

    /* label and backup code */

    .message-bubble .label {
        margin-bottom: var(--label-margin-bottom);
        font-size: var(--label-font-size);
        font-weight: 500;
        line-height: 1;
        color: rgba(255, 255, 255, .6);
    }

    .message-bubble .code {
        font-size: var(--code-font-size);
        font-family: inherit;
        font-weight: 500;
        line-height: 1.2;
        letter-spacing: -.0095em;
        word-break: break-all;
        overflow-wrap: anywhere;
        color: white;
    }

    /* counter circle */

    .message-bubble::after,
    .message-bubble .background::after {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        width: var(--counter-size);
        height: var(--counter-size);
        top: calc(-1 * var(--counter-offset));
        left: calc(-1 * var(--counter-offset));
        border-radius: 50%;
        font-size: var(--counter-font-size);
        font-weight: 700;
        background-color: white;
    }
    .message-bubble.code-1::after {
        content: '1';
        color: #8D3FD4;
    }
    .message-bubble.code-2::after {
        content: '2';
        color: #F33E67;
    }
    .message-bubble .background::after {
        /* copy of the counter circle casting its shadow onto the bubble background only */
        content: '';
        filter: drop-shadow(0 0 calc(20px * var(--zoom)) rgba(0, 0, 0, 0.2))
            drop-shadow(0 calc(1.34px * var(--zoom)) calc(4.47px * var(--zoom)) rgba(59, 76, 106, 0.1775))
            drop-shadow(0 calc(0.4px * var(--zoom)) calc(1.33px * var(--zoom)) rgba(59, 76, 106, 0.1525));
    }

    /* message-bubble states */

    .message-bubble:is(.masked, .loading) .label {
        color: white;
    }
    .message-bubble:is(.masked, .loading) .code {
        line-height: 1.2;
        color: transparent;
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 20" preserveAspectRatio="none"><rect opacity="0.15" width="192" height="14" y="3" rx="3" fill="white"/></svg>');
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        user-select: none;
        pointer-events: none;
    }
    .message-bubble:is(.masked, .loading) .code:empty::after {
        /* Placeholder content if no code is set yet */
        content: '----------------------------------------------------------';
    }

    .message-bubble:not(.faded).loading .code {
        animation: backup-codes-loading-animation .8s cubic-bezier(.76, .29, .29, .76) alternate infinite;
    }

    @keyframes backup-codes-loading-animation {
        from { opacity: 1; }
        to { opacity: .6; }
    }

    @media (prefers-reduced-motion: reduce) {
        .message-bubble:not(.faded).loading .code {
            animation: none;
        }
    }

    .message-bubble.faded {
        filter: none;
        opacity: .1;
    }
    .message-bubble.faded .background {
        background: white !important;
    }
    .message-bubble.faded::after,
    .message-bubble.faded .background::after {
        content: '' !important;
        background-image: none !important;
        filter: none;
    }

    .message-bubble.zoomed {
        --zoom: calc(10 / 7);
    }
    .message-bubble.zoomed .code {
        line-height: 1.35;
    }

    .backup-codes:not(.backup-codes-success) .message-bubble.complete.code-1 .background {
        background-image: radial-gradient(100% 100% at 100% 100%, #41A38E 0%, #21BCA5 100%);
    }
    .backup-codes:not(.backup-codes-success) .message-bubble.complete.code-2 .background {
        background-image: radial-gradient(100% 100% at 0% 100%, #41A38E 0%, #21BCA5 100%);
    }
    .message-bubble.complete::after {
        /* replace counter with a checkmark icon */
        content: '';
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" fill="none"><path stroke="%2313b59d" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 1 3.3 9 1 6.7"/></svg>');
        background-size: var(--counter-checkmark-size);
        background-repeat: no-repeat;
        background-position: center;
    }

    /* message-bubble positioning for individual steps (BackupCodesIllustration.css) */

    .backup-codes.backup-codes-intro .message-bubble.code-1,
    .backup-codes.backup-codes-success .message-bubble.code-1 {
        transform: translate(-4.5rem, -3.5rem);
        transform: translate(round(-4.5rem, 1px), round(-3.5rem, 1px));
    }
    .backup-codes.backup-codes-intro .message-bubble.code-2,
    .backup-codes.backup-codes-success .message-bubble.code-2 {
        transform: translate(4.5rem, 3.5rem);
        transform: translate(round(4.5rem, 1px), round(3.5rem, 1px));
    }

    .backup-codes.backup-codes-send-code-1 .message-bubble.code-2,
    .backup-codes.backup-codes-send-code-1-confirm .message-bubble.code-2 {
        transform: translate(12.5rem, 5.25rem);
        transform: translate(round(12.5rem, 1px), round(5.25rem, 1px));
        z-index: -1;
    }

    .backup-codes.backup-codes-send-code-2 .message-bubble.code-1,
    .backup-codes.backup-codes-send-code-2-confirm .message-bubble.code-1 {
        transform: translate(-12.5rem, -5.25rem);
        transform: translate(round(-12.5rem, 1px), round(-5.25rem, 1px));
    }
</style>
