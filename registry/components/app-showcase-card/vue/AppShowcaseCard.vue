<script setup>
// nimiq.com "THE APPS" showcase card — MARKETING component, screenshot-referenced
// (no upstream Vue source; calibrated against references/screenshots/nimiq-com/
// home-card-component.png and the THE APPS section of home-desktop-full.png).
//
// Standard: centered gold app-icon chip, title, 2-line gray subtitle and a
// CSS-built phone mock ("Payment successful" toast + amount) clipped at the
// card's bottom edge. Set `wide` for the horizontal variant: icon + copy left,
// dashboard window mock bleeding off the bottom-right.
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
    // Short label inside the gold chip (hidden automatically in the wide variant).
    appLabel: {
        type: String,
        default: 'Pay',
    },
    // Horizontal layout: icon + copy left, dashboard mock right.
    wide: {
        type: Boolean,
        default: false,
    },
    // Mock content
    amount: {
        type: String,
        default: '150,00 €',
    },
    amountSecondary: {
        type: String,
        default: '151,000 NIM',
    },
    delta: {
        type: String,
        default: '+4.1%',
    },
    topUpLabel: {
        type: String,
        default: 'Top up',
    },
    counter: {
        type: String,
        default: '230',
    },
    toastText: {
        type: String,
        default: 'Payment successful',
    },
});
</script>

<template>
    <div class="nq-app-showcase-card" :class="{ wide }">
        <template v-if="!wide">
            <div class="asc-icon">
                <span class="asc-icon-hex"></span>
                <span class="asc-icon-label">{{ appLabel }}</span>
            </div>
            <h3 class="asc-title">{{ title }}</h3>
            <p class="asc-subtitle">{{ subtitle }}</p>
            <div class="asc-mock">
                <div class="asc-phone">
                    <span class="asc-phone-btn"></span>
                    <div class="asc-phone-top">
                        <span class="asc-burger"><i></i><i></i><i></i></span>
                        <span class="asc-counter">{{ counter }}</span>
                    </div>
                    <div class="asc-toast">
                        <svg viewBox="0 0 14 12"><path d="M1.5 6.5 5 10 12.5 1.5"/></svg>
                        {{ toastText }}
                    </div>
                    <div class="asc-amount">{{ amount }}</div>
                    <div class="asc-amount-sub">
                        {{ amountSecondary }}
                        <svg viewBox="0 0 14 9"><path d="M1 7.5 5 4l3 2.5L13 1.5M13 1.5h-3M13 1.5v3"/></svg>
                        {{ delta }}
                    </div>
                    <div><span class="asc-topup">{{ topUpLabel }}</span></div>
                    <div class="asc-row">
                        <span class="asc-row-avatar"></span>
                        <span class="asc-row-bar"></span>
                        <span class="asc-row-bar amount"></span>
                    </div>
                </div>
            </div>
        </template>
        <template v-else>
            <div class="asc-copy">
                <div class="asc-icon">
                    <span class="asc-icon-hex"></span>
                    <span class="asc-icon-label">{{ appLabel }}</span>
                </div>
                <h3 class="asc-title">{{ title }}</h3>
                <p class="asc-subtitle">{{ subtitle }}</p>
            </div>
            <div class="asc-mock">
                <div class="asc-window">
                    <div class="asc-window-side"><i></i><i></i><i></i><i></i></div>
                    <div class="asc-window-main">
                        <div class="asc-toast">
                            <svg viewBox="0 0 14 12"><path d="M1.5 6.5 5 10 12.5 1.5"/></svg>
                            {{ toastText }}
                        </div>
                        <div class="asc-amount">{{ amount }}</div>
                        <div class="asc-amount-sub">
                            {{ amountSecondary }}
                            <svg viewBox="0 0 14 9"><path d="M1 7.5 5 4l3 2.5L13 1.5M13 1.5h-3M13 1.5v3"/></svg>
                            {{ delta }}
                        </div>
                        <div class="asc-row">
                            <span class="asc-row-avatar"></span>
                            <span class="asc-row-bar"></span>
                            <span class="asc-row-bar amount"></span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style src="../html/app-showcase-card.css"></style>
