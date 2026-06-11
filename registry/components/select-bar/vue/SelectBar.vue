<template>
    <div class="select-bar">
        <div v-for="option of sortedOptions" :key="option.value">
            <input :value="option" type="radio" :name="name" :id="String(option.value)"
                :checked="selectedOption === option" @change="selectedOption = option">
            <label :for="String(option.value)" class="nq-label" :class="getColor(option)">{{ option.text }}</label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

export interface SelectBarOption {
    color: string;
    value: number;
    text: string;
    index: number;
}

const props = defineProps<{
    name?: string,
    options?: SelectBarOption[],
    selectedValue?: number,
}>();

const emit = defineEmits<{
    (e: 'changed', value: number): void,
}>();

// Upstream sorts the options prop in created(); we sort into a computed instead.
const sortedOptions = computed(() => [...(props.options || [])].sort((a, b) => a.index - b.index));

const selectedOption = ref<SelectBarOption | null>(
    props.selectedValue !== undefined && props.selectedValue !== 0 // upstream: `this.selectedValue ?` (falsy 0 → first option)
        ? sortedOptions.value.find((val) => val.value === props.selectedValue)!
        : sortedOptions.value[0] || null,
);

// Upstream exposes a public `value` getter; expose it for parents using template refs.
const value = computed(() => selectedOption.value!.value);
defineExpose({ value });

function getColor(option: SelectBarOption) {
    if (option.index <= selectedOption.value!.index) {
        return selectedOption.value!.color;
    } else return 'nq-highlight-bg';
}

watch(selectedOption, (option) => {
    if (option) emit('changed', option.value);
});
</script>

<style scoped>
    .select-bar {
        display: flex;
        border-radius: 3.75rem;
        overflow: hidden;
        width: 100%;
    }

    .select-bar > div {
        display: flex;
        flex-grow: 1;
        flex-basis: 0;
    }

    .select-bar > div + div {
        margin-left: .25rem;
    }

    input {
        display: none;
    }

    label {
        padding: 1.75rem 2rem;
        margin: 0;
        width: 100%;
        text-align: center;
        cursor: pointer;
        border-radius: .5rem;
    }

    .nq-highlight-bg {
        background: var(--nimiq-highlight-bg);
    }
</style>
