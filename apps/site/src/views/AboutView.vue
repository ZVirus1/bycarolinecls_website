<template>
  <section class="section">
    <div class="shell about">
      <div>
        <p class="eyebrow">{{ about.heading }}</p>
        <h1 class="about__title">Hello, I am {{ business.artist }}</h1>
        <p v-for="(para, i) in about.body" :key="i" class="about__para">{{ para }}</p>
        <router-link to="/book" class="btn">Book Now</router-link>
      </div>

      <aside class="about__aside">
        <dl>
          <dt>Based in</dt>
          <dd>{{ business.location }}</dd>
          <dt>Enquiries</dt>
          <dd><a :href="waHref">WhatsApp</a></dd>
          <dt>Instagram</dt>
          <dd>
            <a :href="socials[0].href" target="_blank" rel="noopener noreferrer">@bycarolinecls</a>
          </dd>
        </dl>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { about, business, socials } from '../content/site.js'
import { whatsappLink, enquiryMessage } from '../lib/whatsapp.js'

const waHref = whatsappLink(enquiryMessage())
</script>

<style scoped>
.about {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 72px);
  align-items: start;
}

.about__title {
  font-size: var(--step-h2);
  margin-bottom: 24px;
}

.about__para {
  max-width: var(--measure);
  color: var(--ink-soft);
  margin: 0 0 18px;
}

.about__aside {
  border-top: 1px solid var(--ink);
  padding-top: 20px;
}

.about__aside dl {
  margin: 0;
}

.about__aside dt {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 4px;
}

.about__aside dd {
  margin: 0 0 20px;
  font-size: 15px;
}

@media (max-width: 800px) {
  .about {
    grid-template-columns: 1fr;
  }
}
</style>
