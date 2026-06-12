<template>
    <div class="container" ref="containerDiv">
        <div class="search-bar cover-all" @click="searchBarInput && searchBarInput.focus()" @pointerdown.prevent
            :style="{ 'max-width': maxWidth }">
            <svg fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2" />
                <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z"
                    fill="currentColor" />
            </svg>
            <input ref="searchBarInput" type="text" :value="modelValue" :placeholder="placeholderText"
                @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                @focus="handleFocus" @blur="handleBlur" />
            <Transition name="fade">
                <!-- upstream CrossCloseButton.vue, inlined -->
                <button v-if="isInputActive" class="cross-close-button reset" @click="handleClose">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
                        <path d="M1 1l10 10M11 1L1 11" fill="none" stroke="currentColor"
                            stroke-linecap="round" stroke-miterlimit="10" stroke-width="2"/>
                    </svg>
                </button>
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
// Vue 3 port of upstream/wallet/src/components/SearchBar.vue (value -> modelValue).
// Upstream's $t() i18n calls are inlined to their English strings.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = withDefaults(defineProps<{
    modelValue?: string,
}>(), {
    modelValue: '',
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void,
}>();

const containerDiv = ref<HTMLDivElement | null>(null);
const searchBarInput = ref<HTMLInputElement | null>(null);
const inputWidth = ref(1000);
const containerWidth = ref(1000);
const isInputFocused = ref(false);

const observer = ref<ResizeObserver>();

const placeholderText = computed(() => {
    if (containerWidth.value < 100) return '';
    if (maxWidth.value === '100%' && (containerWidth.value > 400 || inputWidth.value > 350)) {
        return 'Search transactions by contact, address, etc.';
    }
    if (containerWidth.value > 210 || inputWidth.value > 150) return 'Search transactions';
    return 'Search';
});

const maxWidth = computed(() => {
    if (!searchBarInput.value) return '100%';
    return isInputActive.value ? '100%' : 'var(--default-sb-width)';
});

const handleFocus = () => {
    isInputFocused.value = true;
};

const handleBlur = () => {
    isInputFocused.value = false;
};

const inputValue = computed(() => props.modelValue);

const isInputActive = computed(() => {
    // Only collapse if not focused and no text
    if (!isInputFocused.value && inputValue.value === '') return false;
    return true;
});

const handleClose = (e: Event) => {
    emit('update:modelValue', '');
    // Prevent the search bar from losing or gaining focus when not intended
    e.stopImmediatePropagation();
};

watch([observer, searchBarInput, containerDiv], () => {
    if (!observer.value) return;
    if (searchBarInput.value) observer.value.observe(searchBarInput.value);
    if (containerDiv.value) observer.value.observe(containerDiv.value);
});

onMounted(() => {
    if ('ResizeObserver' in window) {
        observer.value = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                if (entry.target === containerDiv.value) {
                    containerWidth.value = entry.contentBoxSize
                        ? ('length' in entry.contentBoxSize
                            ? entry.contentBoxSize[0].inlineSize
                            : (entry.contentBoxSize as any).inlineSize)
                        : entry.contentRect.width;
                } else if (entry.target === searchBarInput.value) {
                    inputWidth.value = entry.contentBoxSize
                        ? ('length' in entry.contentBoxSize
                            ? entry.contentBoxSize[0].inlineSize
                            : (entry.contentBoxSize as any).inlineSize)
                        : entry.contentRect.width;
                }
            }
        });
    }
});

onUnmounted(() => {
    if (observer.value) {
        if (containerDiv.value) observer.value.unobserve(containerDiv.value);
        if (searchBarInput.value) observer.value.unobserve(searchBarInput.value);
    }
});
</script>

<style scoped>
/* Upstream SearchBar.vue scoped SCSS, expanded.
   Wallet theme vars defined here so the component is self-contained;
   --attr-duration/--nimiq-ease/--nimiq-light-blue come from the legacy framework CSS. */
.container {
    --body-size: 2rem;
    --text-16: rgba(31, 35, 72, 0.16);
    --text-22: rgba(31, 35, 72, 0.22);
    --light-blue-40: rgba(5, 130, 202, 0.4);
    --bg-primary: var(--nimiq-white);

    width: 100%;
    min-width: 5.5rem;
}

.search-bar {
    --default-sb-width: clamp(5.5rem, 100%, 30rem);

    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    cursor: text;
    padding: 0.75rem 0;
    min-width: var(--default-sb-width);

    transition-property: color, max-width;
    transition-duration: var(--attr-duration);
    transition-timing-function: var(--nimiq-ease);
}

.search-bar::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    box-shadow: inset 0 0 0 0.1875rem var(--text-16); /* 1.5px */
    border-radius: 500px;

    transition: box-shadow var(--attr-duration) var(--nimiq-ease);
}

.search-bar:hover::after {
    box-shadow: inset 0 0 0 0.1875rem var(--text-22);
}

.search-bar:focus-within {
    color: var(--nimiq-light-blue);
}

.search-bar:focus-within > svg {
    opacity: 1;
}

.search-bar:focus-within::after {
    box-shadow: inset 0 0 0 0.1875rem var(--light-blue-40);
}

.search-bar > svg {
    justify-self: left;
    flex-grow: 0;
    margin-left: 1.75rem;
    margin-right: 1rem;
    flex-shrink: 0;
    opacity: 0.4;
    width: 1.75rem;
    height: 1.75rem;

    transition: opacity var(--attr-duration) var(--nimiq-ease);
}

input {
    font-family: inherit;
    font-weight: 600;
    color: inherit;
    justify-self: right;
    flex-grow: 1;
    border: 0;
    line-height: 2.75rem;
    font-size: var(--body-size);
    margin: 0;
    padding: 0;
    padding-right: 4rem;
    background: none;
    min-width: 0;
}

input:focus {
    outline: none;
}

input::placeholder {
    font-weight: normal;
    color: inherit;
    opacity: 0.4;
}

@media (max-width: 768px) { /* $mobileBreakpoint — full mobile breakpoint */
    input::placeholder {
        font-weight: 600;
    }

    .fade-enter-active {
        transition-delay: 0s;
    }
}

.cross-close-button {
    position: absolute;
    z-index: 1;
    right: 1rem;
    cursor: pointer;
}

.fade-enter-active {
    transition-duration: calc(var(--attr-duration) / 2);
    transition-delay: calc(var(--attr-duration) * 0.6);
}

.fade-leave-active {
    transition-duration: calc(var(--attr-duration) / 2);
}

@media (min-width: 768px) and (max-width: 960px) { /* $mobileBreakpoint..$tabletBreakpoint */
    .cover-all:focus-within {
        position: absolute;
        top: 0;
        z-index: 10;
        background: var(--bg-primary);
        box-shadow: 0 0 0 1rem var(--bg-primary);
        border-radius: 6rem;

        width: calc(100% - 5rem);
    }
}

/* Upstream CrossCloseButton.vue scoped styles + the wallet's global button.reset */
button.reset {
    background: none;
    border: none;
    outline: none;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    color: inherit;
}

.cross-close-button {
    font-size: 1.5rem;
    padding: 0.5rem;
    border-radius: 50%;
}

.cross-close-button svg {
    height: 1em;
    width: 1em;
    display: block;
    opacity: 0.7;
    transition: opacity 0.2s var(--nimiq-ease);
}

.cross-close-button:hover svg,
.cross-close-button:active svg,
.cross-close-button:focus svg {
    opacity: 1 !important;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
    transition-property: opacity;
}
</style>
