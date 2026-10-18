<template>
  <FieldPopup
    :display="display"
    placeholder="dd/mm/yyyy"
    icon="calendar"
    panel-class="is-sized cal-panel"
    editable
    inputmode="numeric"
    pick-label="Open the calendar"
    :disabled="disabled"
    @commit="typed"
  >
    <template #default="{ close }">
      <div class="cal">
        <div class="cal__head">
          <button type="button" class="cal__nav" aria-label="Previous month" @click="shift(-1)">
            <FieldIcon name="chevron-left" :size="13" />
          </button>
          <span class="cal__month">{{ monthLabel }}</span>
          <button type="button" class="cal__nav" aria-label="Next month" @click="shift(1)">
            <FieldIcon name="chevron-right" :size="13" />
          </button>
        </div>

        <div class="cal__dow">
          <span v-for="d in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="d">{{ d }}</span>
        </div>

        <div class="cal__grid">
          <button
            v-for="cell in cells"
            :key="cell.iso"
            type="button"
            class="cal__day"
            :class="{
              'is-out': cell.outside,
              'is-today': cell.iso === todayIso,
              'is-on': cell.iso === modelValue,
            }"
            @click="pick(cell.iso, close)"
          >
            {{ cell.day }}
          </button>
        </div>

        <div class="cal__foot">
          <button type="button" class="cal__link" @click="pick(todayIso, close)">Today</button>
          <button type="button" class="cal__link" @click="pick('', close)">Clear</button>
        </div>
      </div>
    </template>
  </FieldPopup>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import FieldPopup from './FieldPopup.vue'
import FieldIcon from './FieldIcon.vue'

const props = defineProps({
  /** YYYY-MM-DD */
  modelValue: { type: String, default: '' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())

function parts(iso) {
  const [y, m] = (iso || todayIso).split('-').map(Number)
  return { y, m }
}

const cursor = ref(parts(props.modelValue))
watch(
  () => props.modelValue,
  (v) => {
    if (v) cursor.value = parts(v)
  },
)

const display = computed(() => {
  if (!props.modelValue) return ''
  const [y, m, d] = props.modelValue.split('-')
  return `${d}/${m}/${y}`
})

const monthLabel = computed(() =>
  new Date(cursor.value.y, cursor.value.m - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  }),
)

const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Six weeks starting Monday, so the grid never reflows between months. */
const cells = computed(() => {
  const { y, m } = cursor.value
  const first = new Date(y, m - 1, 1)
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const out = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m - 1, 1 - offset + i)
    out.push({
      day: d.getDate(),
      iso: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      outside: d.getMonth() !== m - 1,
    })
  }
  return out
})

function shift(delta) {
  let { y, m } = cursor.value
  m += delta
  if (m < 1) {
    m = 12
    y--
  } else if (m > 12) {
    m = 1
    y++
  }
  cursor.value = { y, m }
}

function pick(value, close) {
  emit('update:modelValue', value)
  close()
}

/**
 * Read a date the way somebody would actually write one.
 *
 * Accepts 19/10/2026 and 19-10-2026 and 19.10.2026 and 19 10 2026, the same
 * with a single-digit day or month, a two-digit year, a bare run of digits
 * (19102026 - which is all an iOS number pad can produce), and the ISO form
 * the model itself uses.
 *
 * Returns '' to clear, or null for anything it cannot read - and null means
 * the field snaps back to the value it had, which is the whole reason this
 * does not try to be clever about half-finished input.
 */
function parseTyped(raw) {
  const s = String(raw).trim()
  if (!s) return ''

  let y, m, d
  const asIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (asIso) {
    ;[, y, m, d] = asIso
  } else {
    const hit =
      s.match(/^(\d{1,2})\s*[/\-. ]\s*(\d{1,2})\s*[/\-. ]\s*(\d{2}|\d{4})$/) ||
      s.match(/^(\d{2})(\d{2})(\d{4})$/)
    if (!hit) return null
    ;[, d, m, y] = hit
  }

  y = Number(y)
  m = Number(m)
  d = Number(d)
  if (y < 100) y += 2000

  // Round-tripped through Date, which silently rolls 31/02 forward into March
  // rather than rejecting it.
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null

  return iso(y, m, d)
}

function typed(raw) {
  const next = parseTyped(raw)
  if (next === null) return
  emit('update:modelValue', next)
}
</script>

<style scoped>
.cal {
  padding: 12px;
  width: 274px;
}

.cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cal__month {
  font-size: 13.5px;
  font-weight: 600;
}

.cal__nav {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--ink-soft, #6b665e);
  font-size: 11px;
  cursor: pointer;
}

.cal__nav:hover {
  background: #f4f1e9;
  color: var(--ink);
}

.cal__dow,
.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal__dow span {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: #a09a90;
  padding-bottom: 5px;
}

.cal__day {
  aspect-ratio: 1;
  border: 0;
  border-radius: 7px;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: var(--ink);
  cursor: pointer;
}

.cal__day:hover {
  background: #f4f1e9;
}

.cal__day.is-out {
  color: #cfc9bd;
}

.cal__day.is-today {
  box-shadow: inset 0 0 0 1px var(--field-border);
}

.cal__day.is-on {
  background: var(--ink);
  color: #faf8f5;
  font-weight: 600;
}

.cal__foot {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eeebe4;
}

.cal__link {
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  color: var(--ink-soft, #6b665e);
  cursor: pointer;
  padding: 2px 4px;
}

.cal__link:hover {
  color: var(--ink);
  text-decoration: underline;
}
</style>
