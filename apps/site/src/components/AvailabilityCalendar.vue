<template>
  <div class="cal">
    <div class="cal__head">
      <button class="cal__nav" :disabled="atFirstMonth" aria-label="Previous month" @click="shift(-1)">
        ‹
      </button>
      <p class="cal__month" aria-live="polite">{{ monthLabel }}</p>
      <button class="cal__nav" aria-label="Next month" @click="shift(1)">›</button>
    </div>

    <div v-if="state === 'loading'" class="cal__msg">Checking availability…</div>

    <!-- If the feed is down or unconfigured, the page must still be useful:
         fall back to letting people enquire without a date. -->
    <div v-else-if="state === 'error'" class="cal__msg cal__msg--warn">
      Live availability is unavailable right now — please send a message and I'll confirm dates
      directly.
    </div>

    <template v-else>
      <div class="cal__grid" role="grid">
        <span v-for="d in dayNames" :key="d" class="cal__dow" role="columnheader">{{ d }}</span>

        <span v-for="n in leadingBlanks" :key="`b${n}`" class="cal__blank" />

        <button
          v-for="day in days"
          :key="day.iso"
          class="cal__day"
          :class="{
            'is-busy': day.busy,
            'is-past': day.past,
            'is-selected': day.iso === selected,
          }"
          :disabled="day.busy || day.past"
          :aria-label="dayLabel(day)"
          :aria-pressed="String(day.iso === selected)"
          @click="select(day.iso)"
        >
          {{ day.n }}
        </button>
      </div>

      <ul class="cal__key">
        <li><span class="swatch swatch--free" />Available</li>
        <li><span class="swatch swatch--busy" />Booked</li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'

const props = defineProps({ selected: { type: String, default: '' } })
const emit = defineEmits(['update:selected'])

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const today = new Date()
const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const cursor = ref(new Date(firstMonth))
const busyDates = ref(new Set())
const state = ref('loading')

const atFirstMonth = computed(
  () =>
    cursor.value.getFullYear() === firstMonth.getFullYear() &&
    cursor.value.getMonth() === firstMonth.getMonth(),
)

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
)

const leadingBlanks = computed(() =>
  new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1).getDay(),
)

const days = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const count = new Date(y, m + 1, 0).getDate()
  const todayIso = toIso(today)

  return Array.from({ length: count }, (_, i) => {
    const iso = `${y}-${pad(m + 1)}-${pad(i + 1)}`
    return { n: i + 1, iso, busy: busyDates.value.has(iso), past: iso < todayIso }
  })
})

function shift(delta) {
  const d = new Date(cursor.value)
  d.setMonth(d.getMonth() + delta)
  cursor.value = d
}

function select(iso) {
  emit('update:selected', iso === props.selected ? '' : iso)
}

function dayLabel(day) {
  const d = new Date(`${day.iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
  })
  if (day.past) return `${d}, in the past`
  return `${d}, ${day.busy ? 'booked' : 'available'}`
}

async function load() {
  state.value = 'loading'
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const from = `${y}-${pad(m + 1)}-01`
  const to = toIso(new Date(y, m + 1, 0))

  try {
    const res = await fetch(`/api/availability?from=${from}&to=${to}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    busyDates.value = new Set(data.busyDates ?? [])
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
}

const pad = (n) => String(n).padStart(2, '0')
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

onMounted(load)
watch(cursor, load)
</script>

<style scoped>
.cal {
  border: 1px solid var(--rule);
  background: #fff;
  padding: clamp(18px, 3vw, 28px);
}

.cal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.cal__month {
  font-family: var(--display);
  font-size: 20px;
  margin: 0;
}

.cal__nav {
  background: none;
  border: 1px solid var(--rule);
  width: 34px;
  height: 34px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
}
.cal__nav:disabled {
  opacity: 0.3;
  cursor: default;
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal__dow {
  text-align: center;
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
  padding-bottom: 8px;
}

.cal__blank {
  aspect-ratio: 1;
}

.cal__day {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  background: var(--paper);
  font: inherit;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.cal__day:hover:not(:disabled) {
  border-color: var(--ink);
}

.cal__day.is-selected {
  background: var(--ink);
  color: var(--paper);
}

/* Booked and past days are visually distinct AND disabled, so the state is not
   carried by colour alone. */
.cal__day.is-busy {
  background: repeating-linear-gradient(
    -45deg,
    var(--paper-alt),
    var(--paper-alt) 4px,
    #e7e1d8 4px,
    #e7e1d8 8px
  );
  color: var(--ink-faint);
  cursor: not-allowed;
  text-decoration: line-through;
}

.cal__day.is-past {
  background: transparent;
  color: #d5cfc6;
  cursor: default;
}

.cal__key {
  display: flex;
  gap: 20px;
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  font-size: 12px;
  color: var(--ink-soft);
}
.cal__key li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 14px;
  height: 14px;
  border: 1px solid var(--rule);
}
.swatch--free {
  background: var(--paper);
}
.swatch--busy {
  background: repeating-linear-gradient(
    -45deg,
    var(--paper-alt),
    var(--paper-alt) 3px,
    #e7e1d8 3px,
    #e7e1d8 6px
  );
}

.cal__msg {
  padding: 40px 10px;
  text-align: center;
  color: var(--ink-soft);
  font-size: 14px;
}
.cal__msg--warn {
  background: var(--paper-alt);
  color: var(--ink);
}
</style>
