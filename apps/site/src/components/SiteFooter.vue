<template>
  <footer class="ftr">
    <div class="shell ftr__inner">
      <div>
        <p class="ftr__name">{{ business.name }}</p>
        <p class="ftr__meta">{{ business.tagline }} · {{ business.location }}</p>
      </div>

      <nav aria-label="Footer">
        <ul class="ftr__links">
          <li v-for="item in nav" :key="item.to">
            <router-link :to="item.to">{{ item.label }}</router-link>
          </li>
          <li v-for="s in socials" :key="s.label">
            <a :href="s.href" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          </li>
        </ul>
      </nav>
    </div>

    <p class="ftr__legal shell">© {{ year }} {{ business.name }}. All rights reserved.</p>
  </footer>
</template>

<script setup>
import { business, nav, socials } from '../content/site.js'
const year = new Date().getFullYear()
</script>

<style scoped>
.ftr {
  border-top: 1px solid var(--rule);
  background: var(--paper-alt);
  padding-block: clamp(40px, 6vw, 72px) 28px;
}

.ftr__inner {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: space-between;
  align-items: flex-start;
}

.ftr__name {
  font-family: var(--display);
  font-size: 22px;
  margin: 0 0 6px;
}

.ftr__meta {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
}

.ftr__links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 26px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.ftr__links a {
  text-decoration: none;
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.ftr__links a:hover {
  color: var(--ink);
}

.ftr__legal {
  margin: 48px 0 0;
  font-size: 12px;
  color: var(--ink-faint);
}
</style>
