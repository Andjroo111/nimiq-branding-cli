<!--
  AppFooter: slim "Built on Nimiq" attribution footer for fleet mini apps.

  ORIGINAL composition, no upstream design exists for this surface. Not the
  registry page-footer (that is the wallet card action row) and not the
  nimiq.com marketing footer (link columns + newsletter + honeycomb band).
  Fleet refs: swellet footer(), tipjar landing. Logo paths are VERBATIM from
  assets/logos/nimiq-icons-logos/logos-nimiq-horizontal-mono.svg, hexagon
  gradient flattened to fill="currentColor" (the asset's gradient has two
  identical currentColor stops, so this is pixel-identical and avoids
  gradient-id collisions across instances).

  props:
    dark?  boolean  (default false): white ink for navy app surfaces
    href?  string   (default https://nimiq.com): brand link target

  slots (both optional):
    version : a version string, rendered in Fira Mono (load the font yourself)
    links   : one or two dev links (plain <a>, sentence case; the component
              styles them bold, not underlined, 50% ink, hover full ink)

  Place it statically at the end of the page flow, never position:fixed. In a
  flex-column page its margin-top:auto pins it to the bottom; the bottom
  padding respects env(safe-area-inset-bottom) for iOS PWAs.
-->
<script setup lang="ts">
withDefaults(defineProps<{
  dark?: boolean
  href?: string
}>(), {
  dark: false,
  href: 'https://nimiq.com',
})
</script>

<template>
  <footer class="app-footer" :class="{ 'on-dark': dark }">
    <a class="af-brand" :href="href" target="_blank" rel="noopener">
      <span>Built on</span>
      <svg class="af-logo" viewBox="0 0 76 18" role="img" aria-label="Nimiq">
        <path fill="currentColor" d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/>
        <path fill="currentColor" d="M34.91 3.656h1.829v10.688H35.33L29.582 6.89v7.453H27.76V3.656h1.403l5.748 7.453zm5.47 10.688V3.656h1.962v10.688zM54.82 3.656h1.543v10.688H54.68v-6.61l-2.874 6.61h-1.262l-2.874-6.61v6.61h-1.683V3.656h1.542l3.646 8.368zm5.189 10.688V3.656h1.962v10.688zm15.075-2.436c-.572 1.14-1.461 1.809-2.25 2.135.093.214.528.81.856 1.153s.673.692 1.11 1.046l-1.332 1.055c-.49-.343-.917-.754-1.351-1.232a9 9 0 01-1.142-1.595 9 9 0 01-.451.014c-1.085 0-1.991-.222-2.773-.663a4.4 4.4 0 01-1.792-1.913c-.379-.756-.623-1.766-.623-2.908s.21-2.076.628-2.908a4.44 4.44 0 011.8-1.913c.783-.444 1.697-.663 2.76-.663s1.991.222 2.773.663a4.4 4.4 0 011.792 1.913c.415.832.623 1.766.623 2.908s-.25 2.154-.628 2.908m-6.935.009q.849 1.02 2.375 1.02 1.528 0 2.375-1.02c.567-.684.85-1.646.85-2.917 0-1.263-.283-2.247-.85-2.922q-.849-1.014-2.375-1.016-1.528 0-2.375 1.007c-.567.673-.85 1.66-.85 2.931s.283 2.233.85 2.917"/>
      </svg>
    </a>
    <span v-if="$slots.version" class="af-version"><slot name="version" /></span>
    <nav v-if="$slots.links" class="af-links" aria-label="App links"><slot name="links" /></nav>
  </footer>
</template>

<style scoped>
.app-footer {
  /* one ink channel: navy on light surfaces; .on-dark switches it to white */
  --af-ink: 31, 35, 72;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  column-gap: 32px;
  row-gap: 12px;
  /* pins to the bottom of a flex-column page; computes to 0 in normal block flow */
  margin-top: auto;
  padding: 24px 24px calc(24px + env(safe-area-inset-bottom));
  font-family: 'Mulish', 'Muli', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1;
  color: rgba(var(--af-ink), 0.5);
}

.app-footer.on-dark {
  --af-ink: 255, 255, 255;
}

/* links rest at 50% ink and hover to full ink (rule 21: bold, sentence case,
   never underlined). :slotted() reaches the consumer's dev links. */
.app-footer a,
.af-links :slotted(a) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: rgba(var(--af-ink), 0.5);
  text-decoration: none;
  transition: color 0.2s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}

.app-footer a:hover,
.app-footer a:focus-visible,
.af-links :slotted(a:hover),
.af-links :slotted(a:focus-visible) {
  color: rgb(var(--af-ink));
}

.af-brand {
  white-space: nowrap;
}

/* the horizontal mono logo rides currentColor, so it dims and hovers with the link */
.af-logo {
  display: block;
  height: 16px;
  width: auto;
}

/* version string is a technical value: Fira Mono when loaded, any mono otherwise */
.af-version {
  font-family: 'Fira Mono', monospace;
  font-size: 12px;
}

.af-links {
  display: inline-flex;
  align-items: center;
  gap: 20px;
}
</style>
