<template>
  <div class="fp" ref="root">
    <button
      type="button"
      class="fp__trigger"
      :class="{ 'is-open': open, 'is-empty': !display }"
      :disabled="disabled"
      :aria-expanded="String(open)"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown.down.prevent="openPanel"
    >
      <span class="fp__value">{{ display || placeholder }}</span>
      <i class="fas" :class="icon" aria-hidden="true"></i>
    </button>

    <div v-if="open" class="fp__panel" :class="panelClass">
      <slot :close="close" />
    </div>
  </div>
</template>

<script setup>
/**
 * The shell every custom control shares: a field-shaped trigger and a panel
 * that closes on outside click or Escape.
 *
 * Native date, time and select popups are drawn by the browser and OS, so no
 * amount of CSS reaches them. Replacing them is the only way to keep one look
 * across platforms.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  display: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: 'fa-chevron-down' },
  panelClass: { type: String, default: '' },
  disabled: Boolean,
})

const open = ref(false)
const root = ref(null)

function toggle() {
  open.value = !open.value
}
function openPanel() {
  open.value = true
}
function close() {
  open.value = false
}

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) close()
}
function onKey(e) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    close()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})

defineExpose({ close })
</script>

<style scoped>
.fp {
  position: relative;
  width: 100%;
}

.fp__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  font: inherit;
  font-size: 14px;
  text-align: left;
  padding: 10px 12px;
  min-height: 42px;
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: var(--field-bg);
  color: var(--ink);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.fp__trigger:hover:not(:disabled) {
  border-color: #c9c2ad;
}

.fp__trigger.is-open,
.fp__trigger:focus-visible {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(29, 29, 29, 0.08);
}

.fp__trigger:disabled {
  background: #f7f5f0;
  color: #a09a90;
  cursor: default;
}

.fp__trigger.is-empty .fp__value {
  color: #a09a90;
}

.fp__trigger i {
  font-size: 12px;
  color: var(--ink-soft, #6b665e);
  flex: 0 0 auto;
}

.fp__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fp__panel {
  position: absolute;
  z-index: 80;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  background: #fff;
  border: 1px solid var(--field-border);
  border-radius: 10px;
  box-shadow: 0 14px 34px rgba(29, 29, 29, 0.14);
  overflow: hidden;
}
</style>
