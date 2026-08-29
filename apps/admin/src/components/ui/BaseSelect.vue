<template>
  <FieldPopup ref="popup" :display="display" :placeholder="placeholder" :disabled="disabled">
    <template #default="{ close }">
      <ul class="opts" role="listbox">
        <li v-for="opt in options" :key="String(opt.value)">
          <button
            type="button"
            class="opt"
            :class="{ 'is-on': opt.value === modelValue, 'is-rule': opt.rule }"
            role="option"
            :aria-selected="opt.value === modelValue"
            @click="pick(opt.value, close)"
          >
            <span class="opt__label">{{ opt.label }}</span>
            <i v-if="opt.value === modelValue" class="fas fa-check" aria-hidden="true"></i>
          </button>
        </li>
        <li v-if="!options.length" class="opts__empty">{{ emptyText }}</li>
      </ul>
    </template>
  </FieldPopup>
</template>

<script setup>
import { computed, ref } from 'vue'
import FieldPopup from './FieldPopup.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  /** [{ value, label, rule? }] - rule draws a divider above the option. */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Choose…' },
  emptyText: { type: String, default: 'Nothing to choose from' },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const popup = ref(null)
const display = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? '')

function pick(value, close) {
  emit('update:modelValue', value)
  close()
}
</script>

<style scoped>
.opts {
  list-style: none;
  margin: 0;
  padding: 5px;
  max-height: 280px;
  overflow-y: auto;
}

.opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  padding: 9px 11px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--ink);
  cursor: pointer;
}

.opt:hover {
  background: #f4f1e9;
}

.opt.is-on {
  background: var(--btn-bg);
  font-weight: 600;
}

.opt.is-rule {
  margin-top: 5px;
  border-top: 1px solid #eeebe4;
  padding-top: 12px;
  border-radius: 0 0 7px 7px;
}

.opt i {
  font-size: 11px;
  color: var(--ink-soft, #6b665e);
}

.opt__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opts__empty {
  padding: 14px 12px;
  font-size: 12.5px;
  color: #a09a90;
  text-align: center;
}
</style>
