<template>
  <ul class="ig-grid">
    <li v-for="(item, i) in items" :key="item.id">
      <!-- A post tile is a link out to Instagram; a bundled fallback image is
           not a post, so it renders as a plain figure with no dead link. -->
      <component
        :is="item.permalink ? 'a' : 'div'"
        class="ig-tile"
        :class="{ 'is-link': item.permalink }"
        v-bind="
          item.permalink
            ? { href: item.permalink, target: '_blank', rel: 'noopener noreferrer' }
            : {}
        "
      >
        <!-- The first row is above the fold on any screen, so it loads
             eagerly. Lazy-loading what is already in view just delays the
             largest paint. Everything after it stays lazy. -->
        <img
          :src="item.src"
          :alt="item.alt"
          :loading="i < eager ? 'eager' : 'lazy'"
          :fetchpriority="i < eager ? 'high' : 'auto'"
          decoding="async"
          referrerpolicy="no-referrer"
        />

        <span v-if="item.type === 'carousel'" class="ig-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="7.5" y="2.5" width="14" height="14" rx="3" />
            <path d="M16.5 21.5h-11a3 3 0 0 1-3-3v-11" />
          </svg>
        </span>

        <span v-if="item.type === 'video'" class="ig-play" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
        </span>

        <span v-if="item.permalink" class="visually-hidden">View this post on Instagram</span>
      </component>
    </li>
  </ul>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
  // How many leading tiles load eagerly - roughly one row.
  eager: { type: Number, default: 4 },
})
</script>

<style scoped>
/* Flex, not grid: a grid leaves a partial last row hanging off the left edge,
   and ten tiles only divide evenly into some of these column counts. */
.ig-grid {
  --ig-cols: 5;
  --ig-gap: 14px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--ig-gap);
  list-style: none;
  margin: 0;
  padding: 0;
}

.ig-grid > li {
  flex: 0 1 calc((100% - (var(--ig-cols) - 1) * var(--ig-gap)) / var(--ig-cols));
  min-width: 0;
}

@media (max-width: 1180px) {
  .ig-grid {
    --ig-cols: 4;
  }
}

@media (max-width: 900px) {
  .ig-grid {
    --ig-cols: 3;
  }
}

@media (max-width: 620px) {
  .ig-grid {
    --ig-cols: 2;
    --ig-gap: 10px;
  }
}

.ig-tile {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--paper-alt);
}

/* 4:5, the shape the rest of the site is built on. Instagram serves a mix of
   1:1, 4:5 and 9:16, and 4:5 is the crop that takes the least off any of them. */
.ig-tile img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  transition:
    transform 0.5s ease,
    opacity 0.3s ease;
}

.ig-tile.is-link:hover img,
.ig-tile.is-link:focus-visible img {
  transform: scale(1.035);
  opacity: 0.9;
}

.ig-tile.is-link:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.ig-badge,
.ig-play {
  position: absolute;
  color: #fff;
  /* The tile underneath can be any brightness, so the mark carries its own
     contrast rather than trusting the photo. */
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

.ig-badge {
  top: 12px;
  right: 12px;
}

/* Fixed px, deliberately. A percentage here cannot resolve against a
   shrink-to-fit parent, and the parent ends up spanning the whole tile - which
   drags the badge from the top right over to the top left. */
.ig-badge svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.ig-play {
  inset: 0;
  display: grid;
  place-items: center;
}

.ig-play svg {
  width: clamp(42px, 24%, 68px);
  height: auto;
  fill: currentColor;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
