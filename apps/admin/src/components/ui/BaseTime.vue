<template>
  <FieldPopup :display="display" placeholder="--:--" icon="fa-clock" :disabled="disabled">
    <template #default="{ close }">
      <div class="tp">
        <div class="tp__cols">
          <div class="tp__col" role="listbox" aria-label="Hour">
            <button
              v-for="h in hours"
              :key="h"
              ref="hourEls"
              type="button"
              class="tp__cell"
              :class="{ 'is-on': h === hour12 }"
              @click="set({ h })"
            >
              {{ h }}
            </button>
          </div>

          <div class="tp__col" role="listbox" aria-label="Minute">
            <button
              v-for="m in minutes"
              :key="m"
              type="button"
              class="tp__cell"
              :class="{ 'is-on': m === minute }"
              @click="set({ m })"
            >
              {{ m }}
            </button>
          </div>

          <div class="tp__col tp__col--mer" role="listbox" aria-label="AM or PM">
            <button
              v-for="p in ['AM', 'PM']"
              :key="p"
              type="button"
              class="tp__cell"
              :class="{ 'is-on': p === meridiem }"
              @click="set({ p })"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <div class="tp__foot">
          <button type="button" class="tp__link" @click="clear(close)">Clear</button>
          <button type="button" class="tp__link tp__link--done" @click="close">Done</button>
        </div>
      </div>
    </template>
  </FieldPopup>
</template>

<script setup>
import { computed } from 'vue'
import FieldPopup from './FieldPopup.vue'

const props = defineProps({
  /** 24-hour HH:MM, matching what an <input type="time"> would give. */
  modelValue: { type: String, default: '' },
  /** Minute granularity. Bookings are never scheduled to the minute. */
  step: { type: Number, default: 5 },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const minutes = computed(() =>
  Array.from({ length: Math.floor(60 / props.step) }, (_, i) =>
    String(i * props.step).padStart(2, '0'),
  ),
)

const parsed = computed(() => {
  const [h, m] = (props.modelValue || '').split(':')
  const H = Number(h)
  if (isNaN(H)) return null
  return { H, m: m ?? '00' }
})

const hour12 = computed(() => {
  if (!parsed.value) return ''
  const h = parsed.value.H % 12 || 12
  return String(h).padStart(2, '0')
})
const minute = computed(() => parsed.value?.m ?? '')
const meridiem = computed(() => (!parsed.value ? '' : parsed.value.H < 12 ? 'AM' : 'PM'))
const display = computed(() =>
  parsed.value ? `${hour12.value}:${minute.value} ${meridiem.value.toLowerCase()}` : '',
)

function set({ h, m, p }) {
  const nextH = h ?? hour12.value ?? '09'
  const nextM = m ?? minute.value ?? '00'
  const nextP = p ?? meridiem.value ?? 'AM'

  let H = Number(nextH) % 12
  if (nextP === 'PM') H += 12
  emit('update:modelValue', `${String(H).padStart(2, '0')}:${nextM}`)
}

function clear(close) {
  emit('update:modelValue', '')
  close()
}
</script>

<style scoped>
.tp {
  padding: 8px;
  width: 232px;
}

.tp__cols {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
}

.tp__col {
  max-height: 214px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
}

.tp__col--mer {
  overflow: visible;
}

.tp__cell {
  border: 0;
  border-radius: 7px;
  background: none;
  font: inherit;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  padding: 8px 0;
  color: var(--ink);
  cursor: pointer;
}

.tp__cell:hover {
  background: #f4f1e9;
}

.tp__cell.is-on {
  background: var(--ink);
  color: #faf8f5;
  font-weight: 600;
}

.tp__foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 8px 4px 2px;
  border-top: 1px solid #eeebe4;
}

.tp__link {
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  color: var(--ink-soft, #6b665e);
  cursor: pointer;
  padding: 2px 4px;
}

.tp__link:hover {
  color: var(--ink);
  text-decoration: underline;
}

.tp__link--done {
  font-weight: 600;
  color: var(--ink);
}
</style>
