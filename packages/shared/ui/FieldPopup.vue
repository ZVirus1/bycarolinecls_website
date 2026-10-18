<template>
  <div ref="root" class="fp">
    <!-- Typed and picked, not one or the other. Picking a wedding date six
         months out is four taps through the months; typing it is nine digits.
         The field is the fast path and the button is the browsable one. -->
    <div
      v-if="editable"
      class="fp__field"
      :class="{ 'is-open': open, 'is-disabled': disabled, 'is-empty': !shown }"
    >
      <input
        ref="input"
        class="fp__input"
        type="text"
        :value="shown"
        :placeholder="placeholder"
        :disabled="disabled"
        :inputmode="inputmode"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        @input="draft = $event.target.value"
        @blur="commit"
        @keydown.enter.prevent="commitAndClose"
        @keydown.down.prevent="openPanel"
        @keydown.esc.stop="revert"
      />
      <button
        type="button"
        class="fp__pick"
        :disabled="disabled"
        :aria-expanded="String(open)"
        aria-haspopup="dialog"
        :aria-label="pickLabel"
        @click="toggle"
      >
        <FieldIcon :name="icon" :size="14" />
      </button>
    </div>

    <button
      v-else
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
      <FieldIcon :name="icon" :size="14" />
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
 * Native date, time and select popups are drawn by the browser and the OS, so
 * no amount of CSS reaches them. Replacing them is the only way to keep one
 * look across platforms - and the only way to be rid of the chrome each engine
 * draws inside the field itself.
 *
 * Shared by the public booking form and the admin. Sizing comes from the
 * `--fp-*` custom properties, so each app can match the plain text fields
 * beside it without this component knowing anything about either.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FieldIcon from './FieldIcon.vue'

const props = defineProps({
  display: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: 'chevron-down' },
  panelClass: { type: String, default: '' },
  /** Show a text field the value can be typed into, not just a button. */
  editable: Boolean,
  inputmode: { type: String, default: 'text' },
  /** Describes the button for a screen reader, e.g. "Open the calendar". */
  pickLabel: { type: String, default: 'Open picker' },
  disabled: Boolean,
})

const emit = defineEmits(['commit'])

const open = ref(false)
const root = ref(null)

/**
 * What is in the box while it is being typed into.
 *
 * null means "nothing typed since the last commit", and the field shows the
 * model's own formatting. Without this the input is controlled by `display`
 * and fights every keystroke, because a half-typed date does not parse and so
 * never reaches the model.
 */
const draft = ref(null)
const shown = computed(() => (draft.value === null ? props.display : draft.value))

// A value arriving from elsewhere - the calendar, or the parent - wins over
// whatever is half-typed.
watch(
  () => props.display,
  () => {
    draft.value = null
  },
)

function commit() {
  if (draft.value === null) return
  const raw = draft.value
  // Cleared first: if the parent rejects it, `shown` falls straight back to
  // the model's formatting, which is the revert.
  draft.value = null
  emit('commit', raw)
}

function commitAndClose() {
  commit()
  close()
}

function revert() {
  draft.value = null
  close()
}

function toggle() {
  open.value ? close() : openPanel()
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

/* ---------- the box, in both of its forms ---------- */

.fp__field,
.fp__trigger {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--fp-h, 42px);
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: var(--field-bg);
  color: var(--ink);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.fp__trigger {
  justify-content: space-between;
  gap: 10px;
  font: inherit;
  font-size: var(--fp-fs, 14px);
  text-align: left;
  padding: var(--fp-pad, 10px 12px);
  cursor: pointer;
}

.fp__field:hover:not(.is-disabled),
.fp__trigger:hover:not(:disabled) {
  border-color: #c9c2ad;
}

.fp__field.is-open,
.fp__field:focus-within,
.fp__trigger.is-open,
.fp__trigger:focus-visible {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(29, 29, 29, 0.08);
}

.fp__field.is-disabled,
.fp__trigger:disabled {
  background: #f7f5f0;
  color: #a09a90;
  cursor: default;
}

/* Two classes deep on purpose. Both apps carry global `input[type='text']`
   rules for their plain fields, and a single class would lose to them. */
.fp__field .fp__input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  border: 0;
  outline: none;
  background: none;
  box-shadow: none;
  font: inherit;
  font-family: var(--fp-font, var(--display, inherit));
  font-size: var(--fp-fs, 15.5px);
  letter-spacing: 0.01em;
  color: inherit;
  padding: var(--fp-pad, 10px 12px);
  /* The button supplies the gap on this side. */
  padding-right: 4px;
}

.fp__field .fp__input::placeholder {
  color: #a09a90;
  opacity: 1;
}

.fp__pick {
  flex: 0 0 auto;
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: 0;
  background: none;
  color: var(--ink-soft, #6b665e);
  cursor: pointer;
}

.fp__pick:hover:not(:disabled) {
  color: var(--ink);
}

.fp__pick:disabled {
  color: #c2bcb1;
  cursor: default;
}

.fp__trigger.is-empty .fp__value {
  color: #a09a90;
}

.fp__trigger :deep(.ficon),
.fp__pick :deep(.ficon) {
  font-size: 12px;
  color: var(--ink-soft, #6b665e);
  flex: 0 0 auto;
}

/* The display face, so a service name reads the same here as it does in the
   list on the homepage. Only the public site defines --display; in the admin
   this falls through to the body font. */
.fp__value {
  font-family: var(--fp-font, var(--display, inherit));
  font-size: var(--fp-fs, 15.5px);
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- the panel ---------- */

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

/* A calendar grid and a time wheel have a width of their own. Stretched to the
   field - which is what min-width: 100% does, and did - the grid hugs the left
   edge and the rest of the panel is empty paper. A select is the other way
   round: there the list should be exactly as wide as the field it belongs to,
   so it keeps the default. */
.fp__panel.is-sized {
  min-width: 0;
  width: max-content;
  max-width: calc(100vw - 24px);
}
</style>
