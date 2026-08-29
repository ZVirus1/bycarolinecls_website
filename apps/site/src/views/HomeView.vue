<template>
  <!-- Hero -->
  <section class="hero">
    <div class="hero__media">
      <img v-if="heroImage" :src="heroImage" alt="" fetchpriority="high" />
      <div v-else class="hero__placeholder">
        <p>
          Add a photo to <code>apps/site/public/</code> and set
          <code>heroImage</code> in <code>src/content/site.js</code>
        </p>
      </div>
    </div>

    <div class="hero__copy">
      <p class="hero__name">{{ business.artist }}</p>
      <h1 class="hero__title">{{ business.tagline }}</h1>
      <router-link to="/book" class="btn btn--ondark">Book a Service</router-link>
    </div>
  </section>

  <!-- Intro -->
  <section class="section intro">
    <div class="shell">
      <h2 class="intro__heading">Hello, I am {{ business.artist }}</h2>
      <p class="lede intro__body">{{ business.intro }}</p>
      <router-link to="/about" class="btn btn--ghost">More about me</router-link>
    </div>
  </section>

  <!-- Featured work -->
  <section class="section featured">
    <div class="shell">
      <p class="eyebrow">Selected work</p>
      <h2 class="featured__heading">Portfolio</h2>

      <div v-if="featured.length" class="featured__grid">
        <figure v-for="item in featured" :key="item.src">
          <img :src="item.src" :alt="item.alt" loading="lazy" />
        </figure>
      </div>
      <p v-else class="empty">
        Portfolio images go in <code>apps/site/public/portfolio/</code>, then list them in
        <code>src/content/site.js</code>.
      </p>

      <router-link to="/portfolio" class="btn btn--ghost">View full portfolio</router-link>
    </div>
  </section>

  <!-- Pricing teaser -->
  <section class="section pricing-teaser">
    <div class="shell">
      <p class="eyebrow">Services</p>
      <h2 class="featured__heading">Pricing</h2>
      <ul class="teaser__list">
        <li v-for="s in teaserServices" :key="s.id">
          <span>{{ s.description }}</span>
          <span class="teaser__dots" aria-hidden="true" />
          <span class="teaser__price">{{ rupiah(s.price) }}</span>
        </li>
      </ul>
      <router-link to="/pricing" class="btn btn--ghost">See all pricing</router-link>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <div class="shell">
      <h2 class="cta__title">Ready to book?</h2>
      <p class="cta__sub">Check available dates and send a message. I reply within 24 hours.</p>
      <router-link to="/book" class="btn btn--ondark">Book Now</router-link>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { business, portfolio, heroImage } from '../content/site.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { rupiah } from '@bycarolinecls/shared/format'

const featured = computed(() => portfolio.slice(0, 6))
const teaserServices = computed(() => publicServices().slice(0, 4))
</script>

<style scoped>
.hero {
  position: relative;
  min-height: clamp(440px, 72vh, 720px);
  display: grid;
}

.hero__media,
.hero__copy {
  grid-area: 1 / 1;
}

.hero__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #3a3733, #1d1d1d);
  color: #a09a90;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

.hero__copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 18px;
  padding: 40px var(--gutter);
  color: #fff;
  /* Scrim keeps the headline legible over any photo. */
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.5));
}

.hero__name {
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  margin: 0;
  opacity: 0.9;
}

.hero__title {
  font-size: var(--step-hero);
  max-width: 14ch;
  margin: 0;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
}

.intro {
  text-align: center;
}
.intro__heading {
  font-size: var(--step-h2);
  max-width: 22ch;
  margin-inline: auto;
}
.intro__body {
  margin: 24px auto 32px;
}

.featured__heading {
  font-size: var(--step-h2);
  margin-bottom: 36px;
}

.featured__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 14px;
  margin-bottom: 36px;
}

.featured__grid img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.featured__grid figure {
  margin: 0;
}

.empty {
  color: var(--ink-faint);
  font-size: 14px;
  padding: 32px 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  margin-bottom: 32px;
}

.empty code,
.hero__placeholder code {
  font-size: 0.9em;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 5px;
}

.pricing-teaser {
  background: var(--paper-alt);
}

.teaser__list {
  list-style: none;
  margin: 0 0 36px;
  padding: 0;
  max-width: 640px;
}

.teaser__list li {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule);
}

.teaser__dots {
  flex: 1;
  border-bottom: 1px dotted var(--ink-faint);
  transform: translateY(-3px);
}

.teaser__price {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cta {
  background: var(--ink);
  color: #fff;
  text-align: center;
  padding-block: clamp(56px, 8vw, 100px);
}

.cta__title {
  font-size: var(--step-h2);
  margin-bottom: 12px;
}

.cta__sub {
  color: rgba(255, 255, 255, 0.75);
  margin: 0 auto 30px;
  max-width: 48ch;
}
</style>
