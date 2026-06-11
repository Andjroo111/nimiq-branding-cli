<template>
  <div class="alert" :class="type">
    <div class="icon">
      <!-- info -->
      <svg v-if="type === 'info'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="8" r="0.5" fill="currentColor"/></svg>
      <!-- success -->
      <svg v-else-if="type === 'success'" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <!-- warning -->
      <svg v-else-if="type === 'warning'" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <!-- error -->
      <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </div>
    <span><slot>{{ message }}</slot></span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** Alert severity — selects Nimiq tint color (blue/green/orange/red) and icon. */
  type?: 'info' | 'success' | 'warning' | 'error',
  /** Alert text; the default slot takes precedence when provided. */
  message?: string,
}>(), {
  type: 'info',
  message: '',
});
</script>

<style scoped>
/* Nimiq status alert — tint colors from the Nimiq palette.
   Note: @nimiq/style sets html { font-size: 62.5% }, so px units are used throughout. */

.alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.alert .icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.alert .icon svg {
  width: 12px;
  height: 12px;
}

/* Info (Blue) */
.alert.info {
  background: rgba(5, 130, 202, 0.08);
  border: 1px solid rgba(5, 130, 202, 0.2);
  color: #1F2348;
}
.alert.info .icon {
  background: rgba(5, 130, 202, 0.15);
}
.alert.info .icon svg { fill: #0582CA; }

/* Success (Green) */
.alert.success {
  background: rgba(33, 188, 165, 0.08);
  border: 1px solid rgba(33, 188, 165, 0.2);
  color: #1F2348;
}
.alert.success .icon {
  background: rgba(33, 188, 165, 0.15);
}
.alert.success .icon svg { fill: #21BCA5; }

/* Warning (Orange) */
.alert.warning {
  background: rgba(236, 153, 28, 0.08);
  border: 1px solid rgba(236, 153, 28, 0.2);
  color: #1F2348;
}
.alert.warning .icon {
  background: rgba(236, 153, 28, 0.15);
}
.alert.warning .icon svg { fill: #EC991C; }

/* Error (Red) */
.alert.error {
  background: rgba(217, 68, 50, 0.08);
  border: 1px solid rgba(217, 68, 50, 0.2);
  color: #1F2348;
}
.alert.error .icon {
  background: rgba(217, 68, 50, 0.15);
}
.alert.error .icon svg { fill: #D94432; }
</style>
