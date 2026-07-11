<!--
  AppHeader: the fleet's brand bar, navy or light (ORIGINAL composition, no
  upstream). v2 after Andjroo's 2026-07-10 feedback, modeled on the
  nimiq.school flagship (NavBar.vue + the CommunityFooter brand lockup).

  Brand (left), the DEFAULT mode: your app's custom hexagon-family icon
  (#icon slot, drawn in currentColor; nimiq.school uses its globe-with-check)
  + appName in the "Nimiq.school" wordmark style. Without an #icon slot the
  universal hexagon carries the name; without appName the verbatim
  horizontal-white Nimiq logo renders as the fallback. Never place any icon
  next to that logo: it already contains the hexagon (rule 4).

  Tools (right): optional badge (the wallet's testnet treatment), the built-in
  language selector (current flag-hex + caret, dropdown of flag + native
  name — the NavBar pattern), and the #tools slot, the intended mount for
  ConnectWalletPill (variant "dark" on navy). Without badge, languages and
  tools the brand centers itself, matching the tipjar layout.

  Surfaces: variant "navy" (default, the --nimiq-blue-bg radial) or "light"
  (#FAFAFA + hairline shadow, the nimiq.school bar; works sticky from the
  host: position: sticky; top: 0; z-index: 50).

  Gradient/clip ids are generated per instance (module counter, the FlagHex
  pattern) so multiple headers never collide (rule 3). FlagHex generates its
  own clip ids; icons passed through #icon must namespace their own defs.

  props:
    appName?    string   custom brand mode: icon slot (or hexagon) + this name
    badge?      string   network badge (e.g. 'Testnet'), the wallet's orange
                         testnet treatment (Sidebar.vue .testnet-notice)
    href?       string   brand link target (default '/')
    variant?    'navy' | 'light'   surface (default 'navy')
    languages?  { id, name, flagUrl, fit? }[]   the language selector; flags
                         are vendored flag-icons files per the flag-hex
                         precedent (fit pans/zooms per flag, e.g. us aspect 4/3)
    language?   string   current language id (v-model:language)
  emits:
    update:language, change (both fire with the picked language id)
  slots:
    icon      the custom brand icon (inside the brand link, before the name)
    brand     replaces the whole brand link
    tools     right-side cluster, rendered after badge + language selector
-->
<script lang="ts">
// Module-scope counter -> a unique gradient id per instance (no prop needed).
let _appHeaderCounter = 0
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
// Registry dep: nq add flag-hex (copied alongside this file)
import FlagHex from './FlagHex.vue'

interface HeaderLanguage {
  id: string
  name: string
  flagUrl: string
  fit?: { scale?: number; dx?: number; dy?: number; aspect?: number }
}

const props = withDefaults(defineProps<{
  appName?: string
  badge?: string
  href?: string
  variant?: 'navy' | 'light'
  languages?: HeaderLanguage[]
  language?: string
}>(), {
  href: '/',
  variant: 'navy',
})

const emit = defineEmits<{
  (e: 'update:language', id: string): void
  (e: 'change', id: string): void
}>()

const gradId = `nq-app-header-grad-${(_appHeaderCounter += 1)}`

// Verbatim Nimiq hexagon path (rounded corners), 20x18 viewBox. Never redrawn.
const HEX =
  'M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688'

// Verbatim NIMIQ wordmark path from the horizontal-white logo.
const WORDMARK =
  'M34.91 3.656h1.829v10.688H35.33L29.582 6.89v7.453H27.76V3.656h1.403l5.748 7.453zm5.47 10.688V3.656h1.962v10.688zM54.82 3.656h1.543v10.688H54.68v-6.61l-2.874 6.61h-1.262l-2.874-6.61v6.61h-1.683V3.656h1.542l3.646 8.368zm5.189 10.688V3.656h1.962v10.688zm15.075-2.436c-.572 1.14-1.461 1.809-2.25 2.135.093.214.528.81.856 1.153s.673.692 1.11 1.046l-1.332 1.055c-.49-.343-.917-.754-1.351-1.232a9 9 0 01-1.142-1.595 9 9 0 01-.451.014c-1.085 0-1.991-.222-2.773-.663a4.4 4.4 0 01-1.792-1.913c-.379-.756-.623-1.766-.623-2.908s.21-2.076.628-2.908a4.44 4.44 0 011.8-1.913c.783-.444 1.697-.663 2.76-.663s1.991.222 2.773.663a4.4 4.4 0 011.792 1.913c.415.832.623 1.766.623 2.908s-.25 2.154-.628 2.908m-6.935.009q.849 1.02 2.375 1.02 1.528 0 2.375-1.02c.567-.684.85-1.646.85-2.917 0-1.263-.283-2.247-.85-2.922q-.849-1.014-2.375-1.016-1.528 0-2.375 1.007c-.567.673-.85 1.66-.85 2.931s.283 2.233.85 2.917'

// ---------- Language selector (the nimiq.school NavBar pattern) ----------
const open = ref(false)
const langRoot = ref<HTMLElement | null>(null)

const currentLang = computed(() => {
  const langs = props.languages ?? []
  return langs.find((l) => l.id === props.language) ?? langs[0]
})

function onPick(id: string): void {
  open.value = false
  emit('update:language', id)
  emit('change', id)
}
function onDocPointerDown(e: PointerEvent): void {
  if (open.value && langRoot.value && !langRoot.value.contains(e.target as Node)) open.value = false
}
function onDocKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onDocKeyDown, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onDocKeyDown, true)
})

const hasTools = computed(() => Boolean(props.badge || (props.languages && props.languages.length)))
</script>

<template>
    <header class="app-header" :class="{ 'app-header--light': variant === 'light' }">
        <slot name="brand">
            <a class="app-header-brand" :href="href" :aria-label="appName ?? 'Nimiq'">
                <!-- Custom brand (the default mode): your icon + the app name -->
                <template v-if="appName">
                    <slot name="icon">
                        <!-- Universal hexagon: the starting point anyone may build on -->
                        <svg class="app-header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18" aria-hidden="true">
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
                    </slot>
                    <span class="app-header-name">{{ appName }}</span>
                </template>
                <!-- Fallback: the verbatim horizontal-white Nimiq logo -->
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
        <div v-if="hasTools || $slots.tools" class="app-header-tools">
            <span v-if="badge" class="app-header-badge">{{ badge }}</span>
            <div v-if="languages && languages.length && currentLang" ref="langRoot" class="app-header-lang">
                <button
                    type="button"
                    class="app-header-lang-btn"
                    aria-label="Language"
                    aria-haspopup="listbox"
                    :aria-expanded="open"
                    @click="open = !open"
                >
                    <span class="app-header-lang-flag">
                        <FlagHex :url="currentLang.flagUrl" :fit="currentLang.fit"/>
                    </span>
                    <svg class="app-header-lang-caret" viewBox="0 0 10 6" aria-hidden="true">
                        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <ul v-if="open" class="app-header-lang-list" role="listbox" aria-label="Language">
                    <li v-for="lang in languages" :key="lang.id">
                        <button
                            type="button"
                            class="app-header-lang-option"
                            :class="{ current: lang.id === language }"
                            role="option"
                            :aria-selected="lang.id === language"
                            @click="onPick(lang.id)"
                        >
                            <span class="app-header-lang-flag">
                                <FlagHex :url="lang.flagUrl" :fit="lang.fit"/>
                            </span>
                            {{ lang.name }}
                        </button>
                    </li>
                </ul>
            </div>
            <slot name="tools"/>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px;
    row-gap: 10px;
    padding: 16px 20px;
    padding-left: max(20px, env(safe-area-inset-left, 0px));
    padding-right: max(20px, env(safe-area-inset-right, 0px));
    padding-top: calc(16px + env(safe-area-inset-top, 0px));
    background-color: #1F2348;
    background-image: radial-gradient(100% 100% at 100% 100%, #260133, #1F2348);
    color: #FFFFFF;
    font-family: 'Mulish', 'Muli', system-ui, sans-serif;
    container-type: inline-size;
}

/* With a tools cluster the brand anchors left and the tools anchor right. */
.app-header:has(.app-header-tools) {
    justify-content: space-between;
}

/* Light surface: the nimiq.school bar. #FAFAFA stage, hairline shadow
   (never a border), navy ink. */
.app-header--light {
    background-color: #FAFAFA;
    background-image: none;
    box-shadow: 0 1px 0 rgba(31, 35, 72, 0.08);
    color: #1F2348;
}

.app-header-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: inherit;
    text-decoration: none;
}
.app-header-brand svg,
.app-header-brand :deep(.app-header-icon) {
    display: block;
    flex: none;
}

/* Custom per-app brand icon: a hexagon-family SVG in currentColor. */
.app-header-brand :deep(.app-header-icon) {
    width: 24px;
    height: 24px;
}

/* App wordmark, the "Nimiq.school" style (NavBar: 17px/700, no tracking). */
.app-header-name {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: normal;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-header-tools {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    row-gap: 8px;
    margin-left: auto;
    flex: none;
    min-width: 0;
    max-width: 100%;
}

/* Network badge: the wallet's own testnet treatment (Sidebar.vue
   .testnet-notice). On the light bar the chip drops to the shipped
   navy .07 (the nq-button-s rest surface). */
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
.app-header--light .app-header-badge {
    background: rgba(31, 35, 72, 0.07);
}

/* Language selector (the nimiq.school NavBar pattern). */
.app-header-lang {
    position: relative;
    flex: none;
}

.app-header-lang-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    color: inherit;
    transition: background 0.2s cubic-bezier(0.25, 0, 0, 1);
}
.app-header-lang-btn:hover {
    background: rgba(255, 255, 255, 0.07);
}
.app-header--light .app-header-lang-btn:hover {
    background: rgba(31, 35, 72, 0.06);
}
.app-header-lang-btn:focus-visible {
    outline: 2px solid #0CA6FE;
    outline-offset: 2px;
}
.app-header--light .app-header-lang-btn:focus-visible {
    outline-color: #0582CA;
}

.app-header-lang-flag {
    display: block;
    width: 24px;
    height: 22px;
    flex: none;
}

.app-header-lang-caret {
    width: 10px;
    height: 6px;
    color: rgba(255, 255, 255, 0.6);
}
.app-header--light .app-header-lang-caret {
    color: rgba(31, 35, 72, 0.45);
}

/* The dropdown: a white card on either surface (NavBar verbatim). */
.app-header-lang-list {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 60;
    width: 220px;
    max-height: 320px;
    overflow-y: auto;
    scrollbar-width: thin;
    margin: 0;
    padding: 6px;
    list-style: none;
    background: #FFFFFF;
    border-radius: 10px;
    box-shadow: 0 4px 28px rgba(0, 0, 0, 0.16);
}

.app-header-lang-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: #1F2348;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s cubic-bezier(0.25, 0, 0, 1);
}
.app-header-lang-option:hover {
    background: rgba(31, 35, 72, 0.06);
}
.app-header-lang-option:focus-visible {
    outline: 2px solid #0582CA;
    outline-offset: -2px;
}
.app-header-lang-option.current {
    color: #0582CA;
}

/* Narrow bars (PWAs at 360px): the wordmark yields to the tools when the
   cluster is full (2+ tools); the icon alone carries the brand. */
@container (max-width: 419px) {
    .app-header:has(.app-header-tools > :nth-child(2)) .app-header-name {
        display: none;
    }
    .app-header-tools {
        gap: 8px;
    }
    .app-header-lang-btn {
        padding: 0 6px;
    }
}
</style>
