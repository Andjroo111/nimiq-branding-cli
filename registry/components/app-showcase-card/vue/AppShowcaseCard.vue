<script setup>
// nimiq.com "THE APPS" showcase card — MARKETING component, layout calibrated
// against references/screenshots/nimiq-com/home-card-component.png and the
// THE APPS section of home-desktop-full.png.
//
// The device previews and hexagon marks are the REAL team-shipped assets
// (`nq add` copies them into your project at ./nimiq/assets/<subpath>):
//   img/nimiq-pay-preview.webp     490x916 Nimiq Pay phone screenshot (standard)
//   img/nimiq-wallet-preview.webp  1734x1164 Nimiq Wallet desktop screenshot (wide)
//   logos/official/white/nimiq_signet_white_base_size.svg   white signet (chip glyph)
//   logos/official/colored/nimiq_signet_rgb_base_size.svg   gold signet (wide-card mark)
// Pass `previewSrc` / `signetSrc` / `markSrc` resolved for your bundler (e.g.
// new URL('./nimiq/assets/img/nimiq-pay-preview.webp', import.meta.url).href).
//
// Standard: centered gold chip (white signet + label), title, 2-line gray
// subtitle and the phone screenshot clipped at the card's bottom edge.
// Set `wide` for the horizontal variant: bare gold signet + copy left,
// desktop window screenshot bleeding off the bottom-right.
//
// All styling lives in ../html/app-showcase-card.css (selectors namespaced
// under .nq-app-showcase-card). No npm dependencies.

defineProps({
    title: {
        type: String,
        default: 'Pay App',
    },
    subtitle: {
        type: String,
        default: 'Pay with NIM at more acceptance points every day',
    },
    // Short label inside the gold chip (standard variant only).
    appLabel: {
        type: String,
        default: 'Pay',
    },
    // Horizontal layout: bare gold signet + copy left, desktop screenshot right.
    wide: {
        type: Boolean,
        default: false,
    },
    // REAL product screenshot. Standard card expects the 490x916 phone shot
    // (nimiq-pay-preview.webp); wide card expects the 1734x1164 desktop shot
    // (nimiq-wallet-preview.webp).
    previewSrc: {
        type: String,
        required: true,
    },
    previewAlt: {
        type: String,
        default: '',
    },
    // White official signet shown inside the gold chip (standard variant).
    markSrc: {
        type: String,
        default: '',
    },
    // Colored official signet shown bare in the wide variant.
    signetSrc: {
        type: String,
        default: '',
    },
});
</script>

<template>
    <div class="nq-app-showcase-card" :class="{ wide }">
        <template v-if="!wide">
            <div class="asc-icon">
                <img v-if="markSrc" class="asc-icon-mark" :src="markSrc" alt="" width="72" height="64">
                <span class="asc-icon-label">{{ appLabel }}</span>
            </div>
            <h3 class="asc-title">{{ title }}</h3>
            <p class="asc-subtitle">{{ subtitle }}</p>
            <div class="asc-mock">
                <img class="asc-shot" :src="previewSrc" :alt="previewAlt" width="490" height="916">
            </div>
        </template>
        <template v-else>
            <div class="asc-copy">
                <img v-if="signetSrc" class="asc-signet" :src="signetSrc" alt="" width="72" height="64">
                <h3 class="asc-title">{{ title }}</h3>
                <p class="asc-subtitle">{{ subtitle }}</p>
            </div>
            <div class="asc-mock">
                <img class="asc-shot" :src="previewSrc" :alt="previewAlt" width="1734" height="1164">
            </div>
        </template>
    </div>
</template>

<style src="../html/app-showcase-card.css"></style>
