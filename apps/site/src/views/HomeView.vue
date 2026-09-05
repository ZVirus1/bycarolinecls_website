<template>
  <!-- Hero. Two columns rather than text-over-image: every photo in this
       portfolio is portrait, and the makeup IS the product - a full-bleed crop
       would cut the face and a legibility scrim would dim the work.

       The photo is pinned to the right half out of flow so the copy can sit in
       an ordinary .shell and line up with every other heading on the site.
       Media first in the DOM so it stacks above the copy on mobile. -->
  <section class="hero">
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
          Add a portrait photo to <code>apps/site/public/</code> and set <code>heroImage</code> in
          <code>src/content/site.js</code>
        </p>
      </div>
    </div>

    <div class="shell hero__inner">
      <div class="hero__copy">
        <h1 class="hero__title">{{ business.tagline }}</h1>
        <p class="hero__meta">{{ business.location }}</p>
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
      <h2 class="featured__heading">Portfolio</h2>

      <InstagramGrid v-if="featured.length" :items="featured" :min-tile="230" />
      <p v-else class="empty">Loading the latest work…</p>

      <div class="featured__tail">
        <router-link to="/portfolio" class="btn btn--ghost">View full portfolio</router-link>
        <a :href="instagramUrl" target="_blank" rel="noopener noreferrer" class="btn btn--ghost">
          <SocialIcon name="instagram" :size="16" />
          Follow me on Instagram
        </a>
      </div>
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
import { computed, onMounted } from 'vue'
import InstagramGrid from '../components/InstagramGrid.vue'
import SocialIcon from '../components/SocialIcon.vue'
import { business, heroImage, instagramUrl } from '../content/site.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { useInstagramFeed } from '../lib/instagram.js'
import { whatsappLink, pricelistMessage } from '../lib/whatsapp.js'

// One page only. The home grid is a taster - "View full portfolio" is what
// leads to the feed that keeps loading.
const { items, start } = useInstagramFeed({ pageSize: 8 })
onMounted(start)

// The fallback set is longer than one Instagram page, so trim either source
// to the same eight tiles and the section keeps its shape.
const featured = computed(() => items.value.slice(0, 8))
const teaserServices = computed(() => publicServices().slice(0, 4))
const pricelistHref = whatsappLink(pricelistMessage())
</script>

<style scoped>
.hero {
  position: relative;
  background: var(--paper-alt);
  border-bottom: 1px solid var(--rule);
}

/* Out of flow and pinned right, so the copy below can be a plain .shell and
   inherit the site's alignment for free. Aligning it with padding instead
   would need a 100vw sum, which is out by the width of the scrollbar. */
.hero__media {
  position: absolute;
  inset: 0 0 0 auto;
  width: 52%;
}

/* The photo is 4:5 and the half it sits in is wider than that, so it crops
   top and bottom - never through the face, which object-position keeps up. */
.hero__media img,
.hero__placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
}

.hero__inner {
  /* Above the photo, and it is what sets the height of the whole band. */
  position: relative;
  display: flex;
  align-items: center;
  min-height: clamp(460px, 74vh, 780px);
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  /* Stops short of the photo's edge rather than running under it. */
  width: min(100%, 46%);
  padding-block: clamp(40px, 7vw, 96px);
}

.hero__title {
  font-size: var(--step-hero);
  max-width: 13ch;
  margin: 0;
  /* Optical: the display face sits large here, so pull the tracking in. */
  letter-spacing: -0.01em;
}

.hero__meta {
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 2px 0 0;
}

.hero__placeholder {
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, #3a3733, #1d1d1d);
  color: #a09a90;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

@media (max-width: 760px) {
  /* Back in flow and full width, so the photo keeps its true 4:5 and sets its
     own height rather than being cropped into a band. */
  .hero__media {
    position: static;
    width: 100%;
  }

  .hero__media img,
  .hero__placeholder {
    aspect-ratio: 4 / 5;
    height: auto;
    max-height: 76vh;
  }

  .hero__inner {
    display: block;
    min-height: 0;
  }

  .hero__copy {
    width: 100%;
    align-items: center;
    text-align: center;
    padding-block: clamp(28px, 8vw, 44px) clamp(34px, 9vw, 52px);
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

.featured__tail {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 36px;
}

.empty {
  color: var(--ink-faint);
  font-size: 14px;
  padding: 32px 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  margin-bottom: 32px;
}

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
