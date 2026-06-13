<!--
  FlagHex — a country flag clipped into the Nimiq rounded hexagon (the same
  shape as the @nimiq/iqons identicon), for language / country pickers.

  WHY THIS COMPONENT EXISTS (hard-won, see meta.json notes):
    - The Nimiq hexagon is POINTED left/right, so a naive clip crops
      vertical-stripe flags (France, Mexico) into slivers and leaves white at
      the tips. This handles the overscan + edge so every flag reads cleanly.
    - `preserveAspectRatio="slice"` on a *referenced SVG* <image> is
      letterboxed by browsers -> white gaps. Fix: size the image box to the
      flag's OWN aspect ratio (`fit.aspect`) so it covers with no letterbox.
    - Wide/striped flags (US) must use the natural 4:3 source; the square (1x1)
      version stretches the canton to ~76% width.
    - Panning a flag uncovers the opposite edge unless you also zoom:
      scale >= (10 + |pan|) / 11. `fit.scale` + `fit.dx/dy` repositions
      off-center symbols (US stripes, China stars) while staying covered.
    - Every flag gets ONE faint gray edge so the shape + tips always read; the
      svg is overflow:visible so the stroke isn't clipped at the points.

  Flags are PUBLIC DOMAIN; vendor them from `flag-icons` (MIT) into your app
  and pass the resolved URL via `url`. Use the 1x1 file for most, the 4x3 file
  (+ fit.aspect = 4/3) for wide flags.

  props:
    url   string  — flag SVG/PNG url (consumer-provided)
    fit?  { scale?, dx?, dy?, aspect? }  — pan/zoom; aspect = flag w/h (default 1)
-->
<script lang="ts">
// Module-scope counter -> a unique clipPath id per instance (no prop needed).
let _flagHexCounter = 0
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  url: string
  fit?: { scale?: number; dx?: number; dy?: number; aspect?: number }
}>()

const uid = `flaghex-${(_flagHexCounter += 1)}`

// Verbatim Nimiq hexagon path (rounded corners), 20x18 viewBox — pointed L/R.
const HEX =
  'M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688'

// The image box MATCHES the flag's aspect ratio (a = w/h) and is sized to
// COVER the 20x18 hexagon (+ overscan). Box-aspect == flag-aspect means the
// flag fills with no letterbox regardless of how the browser resolves
// preserveAspectRatio on the referenced SVG. scale zooms; dx/dy pan (+x right).
const box = computed(() => {
  const a = props.fit?.aspect ?? 1
  const s = props.fit?.scale ?? 1
  const dx = props.fit?.dx ?? 0
  const dy = props.fit?.dy ?? 0
  const OVER = 1.08
  const w = Math.max(20, 18 * a) * OVER * s
  const h = w / a
  return { x: 10 + dx - w / 2, y: 9 + dy - h / 2, w, h }
})
</script>

<template>
  <svg class="flag-hex" viewBox="0 0 20 18" aria-hidden="true">
    <defs>
      <clipPath :id="uid">
        <path :d="HEX" />
      </clipPath>
    </defs>
    <image
      :href="url"
      :x="box.x"
      :y="box.y"
      :width="box.w"
      :height="box.h"
      preserveAspectRatio="xMidYMid slice"
      :clip-path="`url(#${uid})`"
    />
    <!-- One consistent gray edge on every flag (defines the shape + the tips). -->
    <path
      :d="HEX"
      fill="none"
      stroke="rgba(31,35,72,0.22)"
      stroke-width="0.4"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.flag-hex {
  display: block;
  width: 100%;
  height: 100%;
  /* let the edge stroke reach past the viewBox at the tips (not clipped) */
  overflow: visible;
}
</style>
