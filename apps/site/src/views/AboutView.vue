<template>
  <section class="section">
    <div class="shell about">
      <div>
        <p class="eyebrow">{{ t('about.eyebrow') }}</p>
        <h1 class="about__title">{{ t('about.title', { artist: business.artist }) }}</h1>
        <p v-for="k in ['about.p1', 'about.p2']" :key="k" class="about__para">{{ t(k) }}</p>
        <router-link :to="lp('/book')" class="btn">{{ t('about.book') }}</router-link>
      </div>

      <aside class="about__aside">
        <dl>
          <dt>{{ t('about.basedIn') }}</dt>
          <dd>{{ business.location }}</dd>
          <dt>{{ t('about.enquiries') }}</dt>
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
import { computed } from 'vue'
import { business, socials } from '../content/site.js'
import { useI18n } from '../i18n/index.js'
import { whatsappLink, enquiryMessage } from '../lib/whatsapp.js'

const { t, lp, locale } = useI18n()
// The prefilled WhatsApp text follows the page, so an Indonesian visitor does
// not land in a chat that opens in English.
const waHref = computed(() => whatsappLink(enquiryMessage({ locale: locale.value })))
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
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 4px;
}

.about__aside dd {
  margin: 0 0 20px;
  font-size: 15px;
}

/* These two are the page's actual contact points. As bare inline links they
   were 19px tall - a thumb's worth of box, with the row spacing absorbed so
   the list keeps its rhythm. */
.about__aside dd a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-block: -12px;
}

@media (max-width: 800px) {
  .about {
    grid-template-columns: 1fr;
  }
}
</style>
