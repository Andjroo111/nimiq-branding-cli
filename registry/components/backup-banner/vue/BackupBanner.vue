<template>
  <div class="backup-banner" :class="rootClasses">
    <span class="alert-text">
      <!-- AlertTriangleIcon (@nimiq/style alert-triangle.svg, inlined) -->
      <svg class="alert-icon" width="17" height="16" viewBox="0 0 17 16" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.913 13.333L9.68 1.433a1.333 1.333 0 0 0-2.362 0l-6.232 11.9a1.333 1.333 0 0 0 1.182 1.952H14.73a1.333 1.333 0 0 0 1.182-1.952zm-8.08-7.718a.667.667 0 0 1 1.334 0v4a.667.667 0 1 1-1.334 0v-4zm.682 7.674h.018a.983.983 0 0 0 .967-1.022 1.018 1.018 0 0 0-1.016-.978h-.019a.984.984 0 0 0-.965 1.02c.02.546.468.978 1.015.98z" fill="currentColor"/></svg>
      {{ message || defaults.message }}
    </span>
    <button :class="buttonClasses" @click.stop="emit('action')" @mousedown.prevent>
      {{ buttonLabel || defaults.button
      }}<!-- ArrowRightSmallIcon (@nimiq/style arrow-right-small.svg, inlined)
      --><svg class="nq-icon" width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg"><path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</template>

<script setup>
// BackupBanner — Vue 3 port of the wallet's persistent backup warning.
// Upstream source: wallet/src/components/layouts/AccountOverview.vue
// (.backup-warning block, both template branches):
//   words: account has unverified recovery words ->
//          .backup-warning.words.nq-orange + button.nq-button-pill.orange ("Backup")
//   file:  login file not saved ->
//          .backup-warning.file.nq-orange-bg + button.nq-button-s.inverse ("Login File")
// Requires the global legacy framework @nimiq/style (nimiq-style.min.css:
// html{font-size:8px}, .nq-orange/.nq-orange-bg, .nq-button-pill, .nq-button-s,
// --nimiq-ease). Upstream's @click handlers (router push to Backup / hub backup())
// are app wiring; this port emits 'action' instead.
import { computed } from 'vue';

const props = defineProps({
  /** words = orange on white with tonal inset border; file = solid orange gradient. */
  variant: {
    type: String,
    default: 'words',
    validator: (v) => ['words', 'file'].includes(v),
  },
  /** Alert line; defaults to the upstream copy for the variant. */
  message: { type: String, default: '' },
  /** Button label; defaults to the upstream copy for the variant. */
  buttonLabel: { type: String, default: '' },
});

const emit = defineEmits(['action']);

const COPY = {
  words: { message: 'There is no ‘forgot password’', button: 'Backup' },
  file: { message: 'Your account is not safe yet!', button: 'Login File' },
};

const defaults = computed(() => COPY[props.variant] ?? COPY.words);
const rootClasses = computed(() =>
  props.variant === 'file' ? 'file nq-orange-bg' : 'words nq-orange');
const buttonClasses = computed(() =>
  props.variant === 'file' ? 'nq-button-s inverse' : 'nq-button-pill orange');
</script>

<style scoped>
/* AccountOverview.vue scoped CSS — .backup-warning block, verbatim (SCSS expanded),
   renamed to the registry's .backup-banner namespace. The root supplies the
   wallet themes.scss vars and the wallet's global .flex-row helper. */
.backup-banner {
  --body-size: 2rem;
  --text-10: rgba(31, 35, 72, 0.1);

  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 0.625rem 1rem;
  border-radius: 0.75rem;
  font-size: var(--body-size);
}
.backup-banner .alert-text {
  margin: 0.625rem 0 0.625rem 1rem;
  font-weight: bold;
  line-height: 3.375rem; /* same height as .nq-button-s */
}
.backup-banner .alert-text .alert-icon {
  width: calc(1.0625 * var(--body-size));
  margin-bottom: -0.125em;
  flex-shrink: 0;
  display: inline;
}
.backup-banner button {
  margin: 0.625rem 0.25rem 0.625rem 1rem;
}
.backup-banner button .nq-icon {
  display: inline-block;
  font-size: 1.25rem;
  vertical-align: middle;
  margin-bottom: 0.25rem;
  margin-left: 0.625rem;
  transition: transform 0.25s var(--nimiq-ease);
}
.backup-banner button:hover .nq-icon,
.backup-banner button:focus .nq-icon {
  transform: translateX(0.25rem);
}
/* words variant: tonal inset border on white */
.backup-banner.words {
  box-shadow: inset 0 0 0 1.5px var(--text-10);
}
</style>
