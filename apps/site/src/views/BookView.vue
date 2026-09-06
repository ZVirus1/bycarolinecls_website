<template>
  <section class="section">
    <div class="shell book">
      <div class="book__intro">
        <h1 class="page-title">{{ t('book.title') }}</h1>
        <p class="lede">{{ t('book.note') }}</p>
      </div>

      <!-- One form, not two. Prices and dates used to be separate routes, but
           they are the same conversation: whether the message asks for the
           pricelist or about a date is decided by whether a date was picked,
           not by which button was pressed. -->
      <form class="book__form" @submit.prevent>
        <div class="field">
          <span class="field__label">{{ t('book.service') }}</span>
          <BaseSelect
            v-model="service"
            :options="serviceOptions"
            :placeholder="t('book.servicePlaceholder')"
          />
        </div>

        <div class="field">
          <span class="field__label">{{ t('book.date') }}</span>
          <BaseDate v-model="date" />
        </div>

        <div class="field">
          <span class="field__label">{{ t('book.time') }}</span>
          <BaseTime v-model="time" />
        </div>

        <a :href="waHref" target="_blank" rel="noopener noreferrer" class="btn book__go">
          {{ t('book.submit') }}
        </a>

        <p class="book__note">{{ t('book.footnote') }}</p>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import BaseDate from '../components/ui/BaseDate.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import BaseTime from '../components/ui/BaseTime.vue'
import { useI18n } from '../i18n/index.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { whatsappLink, enquiryMessage } from '../lib/whatsapp.js'

const { t, locale } = useI18n()

const service = ref('')
const date = ref('')
const time = ref('')

// Same list the homepage names, so what is advertised and what can be asked
// for never drift apart. The blank option is how a chosen service is undone.
// Service names stay in English in both languages: they are the trade terms
// Caroline uses on the pricelist and the admin turns into invoice lines.
const serviceOptions = computed(() => [
  { value: '', label: t('book.servicePlaceholder') },
  ...publicServices().map((s) => ({ value: s.description, label: s.description })),
])

const waHref = computed(() =>
  whatsappLink(
    enquiryMessage({
      service: service.value,
      date: date.value,
      time: time.value,
      locale: locale.value,
    }),
  ),
)
</script>

<style scoped>
.book {
  max-width: 560px;
}

.book__intro {
  margin-bottom: clamp(28px, 4vw, 40px);
}

.page-title {
  font-size: var(--step-h2);
  margin-bottom: 16px;
}

.book__form {
  border: 1px solid var(--rule);
  background: var(--paper-alt);
  padding: clamp(20px, 3vw, 30px);
}

.field {
  display: block;
  margin-bottom: 18px;
}

.field__label {
  display: block;
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-bottom: 7px;
}

.book__go {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}

.book__note {
  font-size: 12.5px;
  color: var(--ink-faint);
  margin: 14px 0 0;
  line-height: 1.6;
}
</style>
