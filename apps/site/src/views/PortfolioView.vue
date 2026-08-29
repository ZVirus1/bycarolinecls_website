<template>
  <section class="section">
    <div class="shell">
      <p class="eyebrow">Selected work</p>
      <h1 class="page-title">Portfolio</h1>

      <div v-if="portfolio.length" class="filters" role="tablist">
        <button
          v-for="cat in portfolioCategories"
          :key="cat"
          role="tab"
          class="filter"
          :class="{ 'is-active': cat === active }"
          :aria-selected="String(cat === active)"
          @click="active = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div v-if="visible.length" class="grid">
        <figure v-for="item in visible" :key="item.src">
          <img :src="item.src" :alt="item.alt" loading="lazy" />
          <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
        </figure>
      </div>

      <p v-else class="empty">
        No images yet. Drop photos into <code>apps/site/public/portfolio/</code> and list them in the
        <code>portfolio</code> array in <code>src/content/site.js</code>.
      </p>

      <div class="tail">
        <router-link to="/book" class="btn">Book Now</router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { portfolio, portfolioCategories } from '../content/site.js'

const active = ref('All')
const visible = computed(() =>
  active.value === 'All' ? portfolio : portfolio.filter((p) => p.category === active.value),
)
</script>

<style scoped>
.page-title {
  font-size: var(--step-h2);
  margin-bottom: 30px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 32px;
}

.filter {
  font: inherit;
  font-size: 11.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 9px 18px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
}

.filter.is-active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: 16px;
}

.grid figure {
  margin: 0;
}

.grid img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.grid figcaption {
  font-size: 12.5px;
  color: var(--ink-soft);
  padding-top: 8px;
}

.empty {
  color: var(--ink-faint);
  font-size: 14px;
  padding: 40px 0;
  border-block: 1px solid var(--rule);
}
.empty code {
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 5px;
}

.tail {
  margin-top: 48px;
}
</style>
