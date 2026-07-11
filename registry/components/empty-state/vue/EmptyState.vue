<!--
  EmptyState: the fleet's quiet nothing-here message. Radical simplicity:
  whitespace and a type ladder do the structural work. No borders, no boxes,
  no ornament; the surrounding page or card supplies the surface.

  ORIGINAL composition, calibrated against the wallet's real empty screen
  (full-ink bold primary line, muted secondary line, one action). Fleet refs:
  chorecoin .empty, tipjar .tips-empty, drip .empty, nimpot/snappos
  .empty-note. The action is the legacy .nq-button-s capsule converted to px.

  props:
    title?        string   The primary line: full ink, bold (block level).
    message?      string   The secondary line at the muted ink; in the row
                  size it is the single quiet line. The default slot overrides it.
    size?         'block' | 'row'  (default 'block'): block is page level;
                  row is the one-line list-level state inside a card.
    dark?         boolean  (default false): white ink ladder for navy surfaces.
    actionLabel?  string   Renders the ONE understated action (emits 'action').
                  Keep it to a single primary action, navy, never green.

  slots:
    icon     a real Nimiq duotone icon (assets/icons/duotone/*.svg) riding
             currentColor at the muted ink; sized to the 80px spot-illustration
             scale in the block and a 20px glyph in the row. An emoji still
             works (chorecoin legacy) but is not the default. Never a generic
             icon set.
    default  overrides message.
    action   replaces the built-in action button entirely (still one action
             max; give your element class "es-action" to inherit the capsule).
-->
<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  message?: string
  size?: 'block' | 'row'
  dark?: boolean
  actionLabel?: string
}>(), {
  title: '',
  message: '',
  size: 'block',
  dark: false,
  actionLabel: '',
})

defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <div class="empty-state" :class="{ row: size === 'row', 'on-dark': dark }">
    <div v-if="$slots.icon" class="es-icon" aria-hidden="true"><slot name="icon" /></div>
    <p v-if="title" class="es-title">{{ title }}</p>
    <p v-if="message || $slots.default" class="es-message"><slot>{{ message }}</slot></p>
    <slot name="action">
      <button v-if="actionLabel" class="es-action" type="button" @click="$emit('action')">{{ actionLabel }}</button>
    </slot>
  </div>
</template>

<style scoped>
.empty-state {
  /* two inks: full for the primary line, muted for everything else
     (navy on light, white with .on-dark) */
  --es-ink: #1F2348;
  --es-muted: rgba(31, 35, 72, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 48px 24px;
  font-family: 'Mulish', 'Muli', system-ui, sans-serif;
  color: var(--es-muted);
}

.empty-state.on-dark {
  --es-ink: #FFFFFF;
  --es-muted: rgba(255, 255, 255, 0.6);
}

/* the duotone icon rides currentColor at the muted ink; its secondary shapes
   ship opacity .4 inside the SVG (same color, never a second hue). Emoji via
   the slot inherits the 44px font-size (chorecoin legacy). */
.es-icon {
  margin-bottom: 14px;
  font-size: 44px;
  line-height: 1;
  color: var(--es-muted);
}

.es-icon :slotted(svg) {
  display: block;
  width: 80px;
  height: 80px;
}

.es-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  max-width: 40ch;
  color: var(--es-ink);
}

.es-message {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  max-width: 40ch;
  color: var(--es-muted);
}

/* row size: one quiet line inside a card or list, small glyph beside the text */
.empty-state.row {
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 26px 16px;
}

.empty-state.row .es-icon {
  margin: 0;
  font-size: 20px;
  display: flex;
  align-items: center;
}

.empty-state.row .es-icon :slotted(svg) {
  width: 20px;
  height: 20px;
}

.empty-state.row .es-message {
  font-size: 14px;
}

/* the ONE optional action: the legacy .nq-button-s capsule in px.
   :slotted() reaches a consumer element passed via the action slot. */
.es-action,
:slotted(.es-action) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 27px;
  margin-top: 18px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: #1F2348;
  background: rgba(31, 35, 72, 0.07);
  cursor: pointer;
  text-decoration: none;
  transition:
    color 0.3s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1)),
    background-color 0.3s var(--nimiq-ease, cubic-bezier(0.25, 0, 0, 1));
}

.es-action:hover,
.es-action:focus-visible,
:slotted(.es-action:hover),
:slotted(.es-action:focus-visible) {
  color: #151833;
  background: rgba(31, 35, 72, 0.12);
}

.es-action:focus-visible,
:slotted(.es-action:focus-visible) {
  outline: 2px solid #0582CA;
  outline-offset: 3px;
}

/* inverse action on dark (the .nq-button-s.inverse recipe) */
.empty-state.on-dark .es-action,
.empty-state.on-dark :slotted(.es-action) {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.2);
}

.empty-state.on-dark .es-action:hover,
.empty-state.on-dark .es-action:focus-visible,
.empty-state.on-dark :slotted(.es-action:hover),
.empty-state.on-dark :slotted(.es-action:focus-visible) {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .es-action,
  :slotted(.es-action) {
    transition: none;
  }
}
</style>
