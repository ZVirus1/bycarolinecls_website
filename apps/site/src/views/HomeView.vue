<template>
  <!-- Hero. Two columns rather than text-over-image: every photo in this
       portfolio is portrait, and the makeup IS the product - a full-bleed crop
       would cut the face and a legibility scrim would dim the work. -->
  <section class="hero">
    <div class="hero__copy">
      <p class="hero__name">{{ business.artist }}</p>
      <h1 class="hero__title">{{ business.tagline }}</h1>
      <p class="hero__meta">{{ business.location }}</p>
      <router-link to="/book" class="btn hero__cta">Enquire</router-link>
    </div>

    <div class="hero__media">
      <img
        v-if="heroImage"
        :src="heroImage"
        alt=""
        width="1600"
        height="2000"
        fetchpriority="high"
      />
      <div v-else class="hero__placeholder">
        <p>
          Add a portrait photo to <code>apps/site/public/</code> and set
          <code>heroImage</code> in <code>src/content/site.js</code>
        </p>
      </div>
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

  <!-- Services. No prices: the pricelist goes out over WhatsApp so every
       quote can account for date, location and party size. -->
  <section class="section pricing-teaser">
    <div class="shell">
      <p class="eyebrow">Services</p>
      <h2 class="featured__heading">What I do</h2>
      <ul class="teaser__list">
        <li v-for="s in teaserServices" :key="s.id">
          <span>{{ s.description }}</span>
        </li>
      </ul>
      <a :href="pricelistHref" target="_blank" rel="noopener noreferrer" class="btn btn--ghost">
        Get our latest pricelist
      </a>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta">
    <div class="shell">
      <h2 class="cta__title">Ready to book?</h2>
      <p class="cta__sub">Send me your date and service, and I reply within 24 hours.</p>
      <router-link to="/book" class="btn btn--ondark">Enquire</router-link>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { business, portfolio, heroImage } from '../content/site.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { whatsappLink, pricelistMessage } from '../lib/whatsapp.js'

const featured = computed(() => portfolio.slice(0, 6))
const teaserServices = computed(() => publicServices().slice(0, 4))
const pricelistHref = whatsappLink(pricelistMessage())
</script>

<style scoped>
.hero {
  display: grid;
  /* Copy takes the narrower column: the photo is the thing worth looking at. */
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  align-items: stretch;
  background: var(--paper-alt);
  border-bottom: 1px solid var(--rule);
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 14px;
  padding: clamp(40px, 7vw, 96px) clamp(24px, 5vw, 72px);
}

.hero__name {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin: 0;
}

.hero__title {
  font-size: var(--step-hero);
  max-width: 13ch;
  margin: 0;
  /* Optical: the display face sits large here, so pull the tracking in. */
  letter-spacing: -0.01em;
}

.hero__meta {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 2px 0 10px;
}

.hero__cta {
  margin-top: 6px;
}

.hero__media {
  position: relative;
  /* Sets the height of the whole hero row. Without this the img falls back to
     its intrinsic 4:5 height (~980px at this column width) and the copy column
     stretches to match, stranding a block of empty paper beside it. */
  min-height: clamp(460px, 74vh, 780px);
}

/* Absolute so the image fills the box above rather than defining it. The photo
   is 4:5 and the column is wider than that, so it crops from top and bottom -
   never through the face, which the object-position keeps in frame. */
.hero__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
}

.hero__placeholder {
  width: 100%;
  min-height: clamp(460px, 74vh, 780px);
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #3a3733, #1d1d1d);
  color: #a09a90;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
  }

  /* Photo first on mobile - it does the selling before any copy is read. */
  .hero__media {
    order: -1;
  }

  .hero__media {
    min-height: 0;
  }

  /* Back to static on mobile so the photo keeps its true 4:5 and sets its own
     height, rather than being cropped into a band. */
  .hero__media img {
    position: static;
    aspect-ratio: 4 / 5;
    height: auto;
    max-height: 76vh;
  }

  .hero__copy {
    align-items: center;
    text-align: center;
    padding: clamp(28px, 8vw, 44px) var(--gutter) clamp(34px, 9vw, 52px);
  }

  .hero__title {
    max-width: 16ch;
  }
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
  aspect-ratio: 4 / 5;
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
  padding: 14px 0;
  border-bottom: 1px solid var(--rule);
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
