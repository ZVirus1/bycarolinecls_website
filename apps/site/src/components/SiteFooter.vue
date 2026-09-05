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
            <a :href="s.href" target="_blank" rel="noopener noreferrer" class="ftr__social">
              <SocialIcon :name="s.icon" :size="15" />
              {{ s.label }}
            </a>
          </li>
        </ul>
      </nav>
    </div>

    <p class="ftr__legal shell">Copyright © {{ year }} {{ business.name }}, all rights reserved</p>
  </footer>
</template>

<script setup>
import SocialIcon from './SocialIcon.vue'
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
  letter-spacing: 0.03em;
  margin: 0 0 8px;
}

/* Was 14px sentence-case sans - the one line on the page that belonged to no
   type style at all. Now the same micro-label as the nav above it. */
.ftr__meta {
  margin: 0;
  color: var(--ink-soft);
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
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
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-soft);
}
.ftr__links a:hover {
  color: var(--ink);
}

.ftr__social {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

/* Centred and set large: it is the last thing on every page, and the business
   name is what should be left in mind. Set entirely in the display face - it
   used to be sans with the name in serif mid-sentence, which read as a
   mistake rather than emphasis. */
.ftr__legal {
  /* `auto` sides, not 0 - this element also carries .shell, whose
     margin-inline: auto is what centres the block itself. A margin shorthand
     with 0 sides silently overrides it and pins it flush left. */
  margin: 56px auto 0;
  text-align: center;
  font-family: var(--display);
  font-size: clamp(13px, 1.1vw, 15px);
  letter-spacing: 0.03em;
  color: var(--ink-soft);
}
</style>
