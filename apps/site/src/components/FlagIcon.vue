<template>
  <!-- Drawn rather than an emoji flag: Windows ships no flag glyphs at all, so
       🇮🇩 renders there as the letters "ID" in a box. -->
  <svg
    class="flag"
    viewBox="0 0 60 40"
    role="img"
    :aria-label="label"
    focusable="false"
    preserveAspectRatio="xMidYMid slice"
  >
    <template v-if="locale === 'id'">
      <rect width="60" height="20" fill="#ce1126" />
      <rect y="20" width="60" height="20" fill="#fff" />
    </template>
    <template v-else>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#fff" stroke-width="7" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" stroke-width="3.5" />
      <path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12" />
      <path d="M30 0V40M0 20H60" stroke="#c8102e" stroke-width="7" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  locale: { type: String, required: true },
  label: { type: String, default: '' },
})
</script>

<style scoped>
/* The white half of the Indonesian flag would otherwise float on the cream
   ground. A ring, not a border, so the box stays exactly 18x12. */
.flag {
  display: block;
  width: 18px;
  height: 12px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(29, 29, 29, 0.14);
}
</style>
