<!--
  EmptyState: the fleet's quiet nothing-here message. Radical simplicity:
  whitespace, one muted line, at most one optional emoji and one optional
  understated action. No borders, no boxes, no illustrations; the surrounding
  page or card supplies the surface.

  ORIGINAL composition. Fleet refs: chorecoin .empty (centered muted line with
  a big emoji), tipjar .tips-empty, drip .empty, nimpot/snappos .empty-note.
  The action is the legacy .nq-button-s capsule converted to px.

  props:
    message?      string   The single muted line. The default slot overrides it.
    size?         'block' | 'row'  (default 'block'): block is page level;
                  row is the smaller list-level line inside a card.
    dark?         boolean  (default false): white ink channel for navy surfaces.
    actionLabel?  string   Renders the ONE understated action (emits 'action').
                  Keep it to a single primary action, navy, never green.

  slots:
    icon     optional emoji (chorecoin style) or a real Nimiq icon riding
             currentColor. Skip it for the row size.
    default  overrides message.
    action   replaces the built-in action button entirely (still one action
             max; give your element class "es-action" to inherit the capsule).
-->
<script setup lang="ts">
withDefaults(defineProps<{
  message?: string
  size?: 'block' | 'row'
  dark?: boolean
  actionLabel?: string
}>(), {
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
    <p class="es-message"><slot>{{ message }}</slot></p>
    <slot name="action">
      <button v-if="actionLabel" class="es-action" type="button" @click="$emit('action')">{{ actionLabel }}</button>
    </slot>
  </div>
</template>

<style scoped>
.empty-state {
  /* one muted ink: navy 50% on light, white 60% with .on-dark */
  --es-muted: rgba(31, 35, 72, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 48px 24px;
  font-family: 'Mulish', 'Muli', system-ui, sans-serif;
  color: var(--es-muted);
}

.empty-state.on-dark {
  --es-muted: rgba(255, 255, 255, 0.6);
}

.es-icon {
  font-size: 44px;
  line-height: 1;
}

.es-message {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  max-width: 40ch;
  color: var(--es-muted);
}

/* row size: list-level empty line inside a card */
.empty-state.row {
  padding: 26px 16px;
  gap: 8px;
}

.empty-state.row .es-icon {
  font-size: 22px;
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
