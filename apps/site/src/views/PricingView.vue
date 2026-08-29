<template>
  <section class="section">
    <div class="shell">
      <p class="eyebrow">Services</p>
      <h1 class="page-title">Pricing</h1>
      <p class="lede">
        All prices are in Indonesian Rupiah. Travel outside {{ business.location }} may incur an
        additional fee. Message me for a quote.
      </p>

      <div v-for="group in grouped" :key="group.name" class="group">
        <h2 class="group__name">{{ group.name }}</h2>
        <ul class="rows">
          <li v-for="s in group.items" :key="s.id ?? s.description">
            <span class="rows__label">{{ s.description }}</span>
            <span class="rows__dots" aria-hidden="true" />
            <span class="rows__price">{{ rupiah(s.price) }}</span>
          </li>
        </ul>
      </div>

      <div class="tail">
        <router-link to="/book" class="btn">Check availability</router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { business } from '../content/site.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { rupiah } from '@bycarolinecls/shared/format'

// Live prices are managed in /admin. The bundled list is the fallback so the
// page is never empty and never blocks on the network.
const services = ref(publicServices())

const grouped = computed(() => {
  const map = new Map()
  for (const s of services.value) {
    const key = s.category ?? 'Services'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(s)
  }
  return [...map].map(([name, items]) => ({ name, items }))
})

onMounted(async () => {
  try {
    const res = await fetch('/api/pricing')
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data.services) && data.services.length) {
      services.value = data.services.filter((s) => s.public !== false)
    }
  } catch {
    // Keep the bundled fallback.
  }
})
</script>

<style scoped>
.page-title {
  font-size: var(--step-h2);
  margin-bottom: 18px;
}

.group {
  margin-top: clamp(36px, 5vw, 56px);
}

.group__name {
  font-size: var(--step-h3);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ink);
  margin-bottom: 4px;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 720px;
}

.rows li {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 15px 0;
  border-bottom: 1px solid var(--rule);
}

.rows__dots {
  flex: 1;
  border-bottom: 1px dotted var(--ink-faint);
  transform: translateY(-3px);
}

.rows__price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tail {
  margin-top: 52px;
}
</style>
