<template>
  <!-- The admin draws these with Font Awesome. The public site loads no icon
       font and should not start for six glyphs, so they are inline here. -->
  <svg
    class="ficon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
    <circle v-if="name === 'clock'" cx="12" cy="12" r="9" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 14 },
})

const ICONS = {
  'chevron-down': ['M6 9.5l6 6 6-6'],
  'chevron-left': ['M15 5.5l-6 6.5 6 6.5'],
  'chevron-right': ['M9 5.5l6 6.5-6 6.5'],
  check: ['M4.5 12.5l5 5 10-11'],
  calendar: [
    'M4 7.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
    'M8 3.5v4',
    'M16 3.5v4',
    'M4 11h16',
  ],
  clock: ['M12 7.5V12l3 1.8'],
}

const paths = computed(() => ICONS[props.name] ?? ICONS['chevron-down'])
</script>

<style scoped>
.ficon {
  display: block;
  flex: 0 0 auto;
}
</style>
