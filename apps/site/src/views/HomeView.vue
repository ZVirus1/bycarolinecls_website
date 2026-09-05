<template>
  <!-- Banner: three portraits, the mark and headline over the middle one.
       The outer two are clean - only the centre carries a scrim, and only
       because white type has to stay legible over a photograph. -->
  <section class="hero">
    <figure
      v-for="(shot, i) in heroImages"
      :key="shot.src"
      class="hero__panel"
      :class="{ 'is-centre': i === 1 }"
    >
      <img
        :src="shot.src"
        :alt="i === 1 ? '' : shot.alt"
        loading="eager"
        :fetchpriority="i === 1 ? 'high' : 'auto'"
        decoding="async"
      />

      <figcaption v-if="i === 1" class="hero__overlay">
        <!-- The mark is black artwork on transparency, so invert paints it
             white without shipping a second copy that can drift. -->
        <img :src="logo" alt="" class="hero__mark" width="756" height="325" />
        <h1 class="hero__title">{{ heroHeadline }}</h1>
      </figcaption>
    </figure>
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
import logo from '../assets/logo.png'
import { business, heroHeadline, heroImages, instagramUrl } from '../content/site.js'
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
}

.hero__panel {
  position: relative;
  height: clamp(360px, 58vh, 620px);
  margin: 0;
  overflow: hidden;
  background: var(--paper-alt);
}

/* Direct child only. Without the combinator this also matches the mark inside
   the overlay and stretches it to fill the panel, cropping the wordmark. */
.hero__panel > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
}

/* Only the centre panel. It does dim that photograph, which is the cost of
   putting white type over a face - so the other two stay completely clean and
   the work still gets shown undimmed either side of it. */
.hero__panel.is-centre::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.5) 0%,
    rgba(0, 0, 0, 0.42) 34%,
    rgba(0, 0, 0, 0.42) 66%,
    rgba(0, 0, 0, 0.56) 100%
  );
}

.hero__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: var(--gutter);
  text-align: center;
}

.hero__mark {
  width: clamp(170px, 20vw, 290px);
  height: auto;
  /* Black-on-transparent artwork; invert paints it white and keeps the alpha,
     so there is no second file to keep in step with the header's. */
  filter: invert(1) drop-shadow(0 1px 12px rgba(0, 0, 0, 0.45));
}

.hero__title {
  font-family: var(--body);
  font-size: clamp(11.5px, 1.15vw, 14px);
  font-weight: 500;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  text-indent: 0.28em;
  color: #fff;
  margin: 0;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
}

@media (max-width: 860px) {
  /* Three panels on a narrow screen are three unreadable stripes, so the
     outer two step aside and the centre one carries the banner alone. */
  .hero {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .hero__panel:not(.is-centre) {
    display: none;
  }

  .hero__panel.is-centre {
    height: auto;
    aspect-ratio: 4 / 5;
    max-height: 78vh;
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
