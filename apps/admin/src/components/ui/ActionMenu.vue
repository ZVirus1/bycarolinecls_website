<template>
  <button
    ref="trigger"
    type="button"
    class="am__trigger"
    :class="{ 'is-open': open }"
    aria-haspopup="menu"
    :aria-expanded="String(open)"
    @click="toggle"
  >
    {{ label }}
    <i class="fas fa-chevron-down am__chev" aria-hidden="true"></i>
  </button>

  <!-- Out to the body, not into the row. The invoice table scrolls sideways
       inside a clipping container, and a menu positioned inside it would be
       cut off at the table's edge on any screen narrower than the table. -->
  <Teleport to="body">
    <div v-if="open" class="am__scrim" @click="close"></div>
    <div v-if="open" ref="menu" class="am__menu" role="menu" :style="style">
      <button
        v-for="item in items"
        :key="item.label"
        type="button"
        class="am__item"
        :class="{ 'am__item--danger': item.tone === 'danger' }"
        role="menuitem"
        :disabled="item.disabled"
        @click="choose(item)"
      >
        <i v-if="item.icon" class="fas am__icon" :class="item.icon" aria-hidden="true"></i>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * A button that opens a short list of actions.
 *
 * Exists because a row of five bare links was reading as five equally
 * important things to do, when only one of them is ever what you came for.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  label: { type: String, default: 'Actions' },
  /** [{ label, icon?, tone?: 'danger', disabled?, onSelect }] */
  items: { type: Array, required: true },
})

const open = ref(false)
const trigger = ref(null)
const menu = ref(null)
const style = ref({})

function toggle() {
  open.value ? close() : openMenu()
}

async function openMenu() {
  open.value = true
  await nextTick()
  place()
}

function close() {
  open.value = false
}

/**
 * Pin the menu under the button in viewport coordinates.
 *
 * Right edges are aligned rather than left, because the trigger sits in the
 * last column: a left-aligned menu would hang off the side of the page.
 */
function place() {
  const btn = trigger.value?.getBoundingClientRect()
  const box = menu.value?.getBoundingClientRect()
  if (!btn || !box) return

  const margin = 8
  const below = window.innerHeight - btn.bottom
  // Flip above the button when there is not room beneath it - which is most
  // of the time for the last row on a phone.
  const top = below < box.height + margin ? btn.top - box.height - 6 : btn.bottom + 6

  let left = btn.right - box.width
  left = Math.min(Math.max(left, margin), window.innerWidth - box.width - margin)

  style.value = {
    top: `${Math.max(margin, top)}px`,
    left: `${left}px`,
    minWidth: `${Math.max(btn.width, 180)}px`,
  }
}

function choose(item) {
  if (item.disabled) return
  close()
  item.onSelect?.()
}

// Scrolling or resizing moves the button out from under a fixed menu, and
// re-measuring on every scroll frame is worse than simply closing it.
function onDismiss(event) {
  if (event?.type === 'keydown' && event.key !== 'Escape') return
  close()
}

watch(open, (isOpen) => {
  const method = isOpen ? 'addEventListener' : 'removeEventListener'
  window[method]('scroll', onDismiss, true)
  window[method]('resize', onDismiss)
  window[method]('keydown', onDismiss)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onDismiss, true)
  window.removeEventListener('resize', onDismiss)
  window.removeEventListener('keydown', onDismiss)
})
</script>

<style scoped>
.am__trigger {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-size: 12.5px;
  color: #1d1d1d;
  background: #fff;
  border: 1px solid #e0dcd4;
  border-radius: 6px;
  padding: 5px 11px;
  cursor: pointer;
  white-space: nowrap;
}

.am__trigger:hover,
.am__trigger.is-open {
  background: #f5f3ee;
  border-color: #d2ccc0;
}

.am__chev {
  font-size: 9px;
  color: #8a857c;
  transition: transform 0.15s ease;
}

.am__trigger.is-open .am__chev {
  transform: rotate(180deg);
}

/* Catches the click that closes the menu. Transparent on purpose: a menu this
   small does not need the page dimmed behind it. */
.am__scrim {
  position: fixed;
  inset: 0;
  z-index: 80;
}

.am__menu {
  position: fixed;
  z-index: 81;
  display: flex;
  flex-direction: column;
  padding: 6px;
  background: #fff;
  border: 1px solid #e0dcd4;
  border-radius: 10px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
}

.am__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 8px 12px;
  border: 0;
  border-radius: 6px;
  background: none;
  font: inherit;
  font-size: 13px;
  color: #1d1d1d;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.am__item:hover:not(:disabled) {
  background: #f5f3ee;
}

.am__item:disabled {
  color: #a09a90;
  cursor: default;
}

/* Red, and separated by a rule. The destructive item sits in the same list as
   the harmless ones, so colour alone is doing the work of telling them apart -
   the rule gives a second signal and a moment's pause before the last row. */
.am__item--danger {
  margin-top: 5px;
  padding-top: 11px;
  border-top: 1px solid #eeebe4;
  border-radius: 0 0 6px 6px;
  color: #a3382f;
}

.am__item--danger .am__icon {
  color: #c07268;
}

.am__item--danger:hover:not(:disabled) {
  background: #fdf0ef;
  color: #8d2f27;
}

/* A fixed column so the labels line up whether or not every item has a mark. */
.am__icon {
  width: 15px;
  text-align: center;
  font-size: 12px;
  color: #8a857c;
}
</style>
