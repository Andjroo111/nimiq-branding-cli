<!--
  AppHeader: the fleet's navy brand bar (ORIGINAL composition, no upstream).
  Formalizes the bar tipjar pastes into 9+ pages and the splitlink hexagon +
  wordmark header, on shipped tokens only.

  Brand (left): the verbatim horizontal-white Nimiq logo by default, or the
  universal hexagon + appName (wordmark mode). Never both: the horizontal logo
  already contains the hexagon (rule 4).
  Tools (right): optional badge + #tools slot, the intended mount for
  ConnectWalletPill (variant "dark"). Without badge and tools the brand
  centers itself, matching the tipjar layout.

  The logo gradient id is generated per instance (module counter, the FlagHex
  pattern) so multiple headers or other gold gradients never collide (rule 3).

  props:
    appName?  string  wordmark mode: hexagon + this name instead of the logo
    badge?    string  network badge (e.g. 'Testnet'), the wallet's orange
                      testnet treatment (Sidebar.vue .testnet-notice)
    href?     string  brand link target (default '/')
  slots:
    brand     replaces the whole brand link
    tools     right-side cluster, rendered after the badge
-->
<script lang="ts">
// Module-scope counter -> a unique gradient id per instance (no prop needed).
let _appHeaderCounter = 0
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  appName?: string
  badge?: string
  href?: string
}>(), {
  href: '/',
})

const gradId = `nq-app-header-grad-${(_appHeaderCounter += 1)}`

// Verbatim Nimiq hexagon path (rounded corners), 20x18 viewBox. Never redrawn.
const HEX =
  'M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688'

// Verbatim NIMIQ wordmark path from the horizontal-white logo.
const WORDMARK =
  'M34.91 3.656h1.829v10.688H35.33L29.582 6.89v7.453H27.76V3.656h1.403l5.748 7.453zm5.47 10.688V3.656h1.962v10.688zM54.82 3.656h1.543v10.688H54.68v-6.61l-2.874 6.61h-1.262l-2.874-6.61v6.61h-1.683V3.656h1.542l3.646 8.368zm5.189 10.688V3.656h1.962v10.688zm15.075-2.436c-.572 1.14-1.461 1.809-2.25 2.135.093.214.528.81.856 1.153s.673.692 1.11 1.046l-1.332 1.055c-.49-.343-.917-.754-1.351-1.232a9 9 0 01-1.142-1.595 9 9 0 01-.451.014c-1.085 0-1.991-.222-2.773-.663a4.4 4.4 0 01-1.792-1.913c-.379-.756-.623-1.766-.623-2.908s.21-2.076.628-2.908a4.44 4.44 0 011.8-1.913c.783-.444 1.697-.663 2.76-.663s1.991.222 2.773.663a4.4 4.4 0 011.792 1.913c.415.832.623 1.766.623 2.908s-.25 2.154-.628 2.908m-6.935.009q.849 1.02 2.375 1.02 1.528 0 2.375-1.02c.567-.684.85-1.646.85-2.917 0-1.263-.283-2.247-.85-2.922q-.849-1.014-2.375-1.016-1.528 0-2.375 1.007c-.567.673-.85 1.66-.85 2.931s.283 2.233.85 2.917'
</script>

<template>
    <header class="app-header">
        <slot name="brand">
            <a class="app-header-brand" :href="href" :aria-label="appName ?? 'Nimiq'">
                <!-- Wordmark mode: the universal hexagon + the app's name -->
                <svg v-if="appName" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18" height="22" aria-hidden="true">
                    <g fill="none">
                        <path :fill="`url(#${gradId})`" :d="HEX"/>
                        <defs>
                            <radialGradient :id="gradId" cx="0" cy="0" r="1"
                                gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)"
                                gradientUnits="userSpaceOnUse">
                                <stop stop-color="#ec991c"/>
                                <stop offset="1" stop-color="#e9b213"/>
                            </radialGradient>
                        </defs>
                    </g>
                </svg>
                <span v-if="appName" class="app-header-name">{{ appName }}</span>
                <!-- Default: the verbatim horizontal-white Nimiq logo -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 18" height="22" aria-hidden="true">
                    <g fill="none">
                        <path :fill="`url(#${gradId})`" :d="HEX"/>
                        <path fill="#fff" :d="WORDMARK"/>
                        <defs>
                            <radialGradient :id="gradId" cx="0" cy="0" r="1"
                                gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)"
                                gradientUnits="userSpaceOnUse">
                                <stop stop-color="#ec991c"/>
                                <stop offset="1" stop-color="#e9b213"/>
                            </radialGradient>
                        </defs>
                    </g>
                </svg>
            </a>
        </slot>
        <div v-if="badge || $slots.tools" class="app-header-tools">
            <span v-if="badge" class="app-header-badge">{{ badge }}</span>
            <slot name="tools"/>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 16px 20px;
    padding-left: max(20px, env(safe-area-inset-left, 0px));
    padding-right: max(20px, env(safe-area-inset-right, 0px));
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
    background-color: #1F2348;
    background-image: radial-gradient(100% 100% at 100% 100%, #260133, #1F2348);
    color: #FFFFFF;
    font-family: 'Mulish', 'Muli', system-ui, sans-serif;
}

/* With a tools cluster the brand anchors left and the tools anchor right. */
.app-header:has(.app-header-tools) {
    justify-content: space-between;
}

.app-header-brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    color: #FFFFFF;
    text-decoration: none;
}
.app-header-brand svg {
    display: block;
    flex: none;
}

.app-header-name {
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
}

.app-header-tools {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex: none;
}

/* Network badge: the wallet's own testnet treatment (Sidebar.vue
   .testnet-notice), an orange uppercase label on a white .07 surface.
   Orange = warning, and a testnet flag is a warning. */
.app-header-badge {
    font-size: 12px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #FC8702;
    background: rgba(255, 255, 255, 0.07);
    padding: 5px 8px;
    border-radius: 4px;
}
</style>
