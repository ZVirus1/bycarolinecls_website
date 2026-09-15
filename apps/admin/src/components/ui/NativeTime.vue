<template>
  <div class="nfield">
    <input
      ref="input"
      type="time"
      :value="modelValue"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <i class="fas fa-clock nfield__icon" aria-hidden="true"></i>
  </div>
</template>

<script setup>
/**
 * A time field that opens the platform's own picker - the wheel, on a phone.
 * The counterpart to NativeDate.vue; see the note there.
 *
 * The value stays 24-hour HH:MM whatever the device displays, because that is
 * what `input[type=time]` reports and what the rest of the app stores.
 */
defineProps({
  /** HH:MM, 24-hour */
  modelValue: { type: String, default: '' },
  disabled: Boolean,
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.nfield {
  position: relative;
  display: block;
}

/* Sized here rather than inherited: a parent's scoped styles stop at this
   component's boundary, so without this the field falls back to the smaller
   global default and stands out in a form whose other fields are 15px.
   Height is set outright instead of built from padding because a native date
   control's inner edit box runs two pixels taller than a text input's line at
   the same font size - which is exactly the kind of ragged row this change set
   out to fix. The four steps mirror InvoiceForm's own field sizes; the numbers
   are the measured heights of the text inputs beside them. */
input {
  font-size: 15px;
  height: 44px;
  padding: 0 38px 0 12px;
  /* iOS otherwise centres the value rather than ranging it left. */
  text-align: left;
}

/* 16px exactly: iOS zooms the whole page in on focusing any field set smaller,
   and never zooms back out. */
@media (max-width: 768px) {
  input {
    font-size: 16px;
    height: 52px;
    padding: 0 38px 0 14px;
  }
}

@media (max-width: 480px) {
  input {
    font-size: 14px;
    height: 45px;
    padding: 0 36px 0 12px;
  }
}

@media (max-width: 360px) {
  input {
    font-size: 13px;
    height: 42px;
    padding: 0 34px 0 10px;
  }
}

/* Safari draws its own small clock glyph, and Chrome a different one, so
   ours replaces both. The native indicator stays - stretched invisibly over
   the whole field - because on WebKit it is what actually opens the picker,
   and a tap anywhere in the field should do that. */
input::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}

input::-webkit-date-and-time-value {
  text-align: left;
}

.nfield__icon {
  position: absolute;
  top: 50%;
  right: 13px;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--ink);
  opacity: 0.55;
  pointer-events: none;
}

input:disabled ~ .nfield__icon {
  opacity: 0.25;
}
</style>
