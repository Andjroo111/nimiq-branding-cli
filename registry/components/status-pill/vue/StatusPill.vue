<!--
  StatusPill: the fleet's semantic status chip, the ONE legitimate pill
  (skill rule 17). Strictly semantic state, never decorative.

  ORIGINAL composition. Heritage: the legacy .nq-button-s colored recipe
  (semantic color at 10% alpha + full-strength ink), the wallet Sidebar.vue
  .testnet-notice (orange on the white .07 chip, on dark) and swellet
  brand.ts pill() (one class per MEANING). Metrics match the app-header
  badge exactly, so app-header's badge slot can host this pill.

  props:
    type?   string  (default 'neutral'): a semantic family
                    success | warning | error | info | neutral
                    or an environment preset that maps onto one
                    testnet -> warning, simulated -> warning,
                    mainnet -> success, live -> success, demo -> neutral.
                    Unknown values fall back to neutral.
    dark?   boolean (default false): on-dark inks + the white .07 chip for
                    navy surfaces (the wallet testnet treatment).
    label?  string  Pill text; defaults to the type word. The default slot
                    overrides both. CSS uppercases it.

  Keep the text a status word. No dots, no icons: the colored-dot chip is a
  banned ornament.
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  type?: string
  dark?: boolean
  label?: string
}>(), {
  type: 'neutral',
  dark: false,
})

// one class per MEANING (the swellet brand.ts PILL_FAMILY pattern):
// environment presets resolve to their semantic family.
const FAMILY: Record<string, string> = {
  success: 'success', warning: 'warning', error: 'error', info: 'info', neutral: 'neutral',
  mainnet: 'success', live: 'success', testnet: 'warning', simulated: 'warning', demo: 'neutral',
}
const family = computed(() => FAMILY[props.type] ?? 'neutral')
</script>

<template>
  <span class="status-pill" :class="[family, { 'on-dark': dark }]">
    <slot>{{ label ?? type }}</slot>
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  font-family: 'Mulish', 'Muli', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  padding: 5px 8px;
  border-radius: 4px;
  white-space: nowrap;
  /* neutral default: the .nq-button-s neutral recipe */
  background: rgba(31, 35, 72, 0.07);
  color: rgba(31, 35, 72, 0.7);
}

/* Semantic families on light: 10% tint (the legacy .nq-button-s colored
   recipe) + the darkest palette-true ink of the same hue. Contrast on a white
   card: success 4.81, warning 4.81, error 5.35, info 5.10, neutral 5.34
   (all >= 4.5:1; full table in meta.json notes). */
.status-pill.success { background: rgba(33, 188, 165, 0.1); color: #3A766F; }
.status-pill.warning { background: rgba(252, 135, 2, 0.1); color: #985F1D; }
.status-pill.error { background: rgba(217, 68, 50, 0.1); color: #B53121; }
.status-pill.info { background: rgba(5, 130, 202, 0.1); color: #265DD7; }

/* On dark: semantic ink on the white .07 chip (wallet testnet-notice).
   Chip contrast: green 5.14, orange 5.02, red 4.59, blue 4.61, neutral 6.89. */
.status-pill.on-dark { background: rgba(255, 255, 255, 0.07); color: rgba(255, 255, 255, 0.7); }
.status-pill.on-dark.success { color: #21BCA5; }
.status-pill.on-dark.warning { color: #FC8702; }
.status-pill.on-dark.error { color: #FF735D; }
.status-pill.on-dark.info { color: #0CA6FE; }
</style>
