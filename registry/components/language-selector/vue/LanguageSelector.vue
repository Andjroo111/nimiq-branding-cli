<template>
    <div class="language-selector"
        :tabindex="!isListShown && languages.length > 1 ? 0 : undefined"
        @focus.capture="showList"
        @blur.capture="
            // Do not hide the list immediately to wait whether the next focused element is also a language list entry,
            // because blurs also occur when moving between the list entries.
            hideList(50)
        ">
        <div class="trigger" :class="{ 'has-arrow': languages.length > 1 }">{{ selectedLanguage }}</div>
        <transition name="transition-fade">
            <div v-if="isListShown && languages.length > 1" class="list">
                <div v-for="language of languages"
                    :ref="setListEntryRef"
                    tabindex="0"
                    class="list-entry"
                    :key="language"
                    @mouseenter="($event.target as HTMLElement).focus()"
                    @click="selectedLanguage = language; hideList()"
                    @keydown.space.enter.prevent="selectedLanguage = language; hideList()"
                    @keydown.down.prevent="moveListFocus(+1)"
                    @keydown.up.prevent="moveListFocus(-1)"
                    @keydown.left.esc.prevent="hideList()"
                >
                    <span class="list-entry-label has-arrow">{{ language }}</span>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of @nimiq/vue-components LanguageSelector.vue.
import { nextTick, onBeforeUpdate, ref, watch } from 'vue';

const props = defineProps<{
    /** Locale codes to offer, e.g. ['en', 'de', 'es', 'fr']. Must not be empty. */
    languages: string[],
    /** The selected locale (upstream Vue 2 v-model prop; pairs with the 'input' emit). */
    value?: string,
}>();

const emit = defineEmits<{
    /** Emitted with the locale code when the selection changes (upstream Vue 2 v-model event). */
    (e: 'input', value: string): void,
}>();

const selectedLanguage = ref(props.languages[0]);
const isListShown = ref(false);
let closeTimeout = -1;

let listEntries: HTMLDivElement[] = [];
onBeforeUpdate(() => { listEntries = []; });
function setListEntryRef(el: unknown) {
    if (el) listEntries.push(el as HTMLDivElement);
}

watch(() => props.languages, (languages) => {
    if (languages.includes(selectedLanguage.value)) return;
    selectedLanguage.value = languages[0];
});

watch(() => props.value, (value) => {
    if (value === undefined || !props.languages.includes(value)) return;
    selectedLanguage.value = value;
}, { immediate: true });

watch(selectedLanguage, (value) => {
    emit('input', value);
});

async function showList() {
    window.clearTimeout(closeTimeout);
    if (isListShown.value) return;
    isListShown.value = true;
    await nextTick();
    focusListEntry(selectedLanguage.value);
}

function hideList(delay = 0) {
    window.clearTimeout(closeTimeout);
    closeTimeout = window.setTimeout(() => isListShown.value = false, delay);
}

function moveListFocus(offset: number) {
    const currentIndex = listEntries.indexOf(document.activeElement as HTMLDivElement);
    if (currentIndex === -1) return;
    const newIndex = (props.languages.length + currentIndex + offset) % props.languages.length;
    focusListEntry(props.languages[newIndex]);
}

function focusListEntry(language: string) {
    const listEntry = listEntries[props.languages.indexOf(language)];
    if (!listEntry) return;
    listEntry.focus();
}
</script>

<style scoped>
    .language-selector {
        contain: layout style; /* no paint because list overflows */
        position: relative;
        width: max-content;
        font-size: 2.25rem;
        font-weight: 600;
        letter-spacing: .125rem;
        text-transform: uppercase;
    }

    .has-arrow::after {
        content: '';
        position: absolute;
        height: 0;
        width: 0;
        border: .5rem solid transparent;
        border-right: .5rem solid var(--arrow-color);
        border-bottom: .5rem solid var(--arrow-color);
        border-radius: .25rem;
        transform: scale(1, 0.8) rotate(135deg);
        transform-origin: 70% 70%;
    }

    .trigger {
        contain: layout paint style;
        padding-right: 2rem;
        outline: none; /* avoid default browser focus style */
    }
    .trigger.has-arrow {
        cursor: pointer;
    }

    .trigger.has-arrow::after {
        --arrow-color: var(--nimiq-blue);
        right: .5rem;
        top: 25%;
        opacity: .3;
        transition: transform .2s var(--nimiq-ease);
    }
    .language-selector:not(:where(:hover, :focus-within, :has(.list))) .trigger.has-arrow::after {
        transform: scale(0.6, 0.9) rotate(45deg);
    }

    .list {
        contain: layout paint style;
        display: flex;
        flex-direction: column;
        position: absolute;
        /*left: -2.25rem;*/
        left: -1rem;
        bottom: -2rem;
        border-radius: .5rem;
        color: white;
        background: var(--nimiq-blue-bg);
        box-shadow: 0 .25rem .3125rem 0 rgba(31, 35, 72, 0.02),
            0 .875rem 1.0625rem 0 rgba(31, 35, 72, 0.04),
            0 2.25rem 4.75rem 0 rgba(31, 35, 72, 0.07);
    }

    .list-entry {
        contain: layout paint style;
        padding: .375rem 1.5rem .375rem 1.5rem;
        outline: none; /* avoid default browser focus style */
        cursor: pointer;
    }
    .list-entry:first-child {
        padding-top: 1.375rem;
    }
    .list-entry:last-child {
        padding-bottom: 1.375rem;
    }

    .list-entry-label {
        position: relative;
        display: inline-block;
        padding-right: 1.375rem;
        opacity: .4;
        transition: opacity .2s var(--nimiq-ease);
    }

    .list-entry-label.has-arrow::after {
        --arrow-color: white;
        top: .75rem;
        right: 0;
        opacity: 0;
        transition: opacity .2s var(--nimiq-ease);
    }
    .list-entry:focus-within .list-entry-label,
    .list-entry:focus-within .list-entry-label.has-arrow::after {
        opacity: 1;
    }

    .transition-fade-enter-active,
    .transition-fade-leave-active {
        transition: opacity .3s var(--nimiq-ease);
    }

    /* Vue 3 rename: upstream's Vue 2 '.transition-fade-enter' is '-enter-from' in Vue 3. */
    .transition-fade-enter-from,
    .transition-fade-leave-to {
        opacity: 0 !important;
    }
</style>
