<template>
  <section class="section">
    <div class="shell book">
      <div class="book__intro">
        <p class="eyebrow">Booking</p>
        <h1 class="page-title">Make an enquiry</h1>
        <p class="lede">{{ bookingNote }}</p>
      </div>

      <form class="book__form" @submit.prevent>
        <h2 class="book__sub">Your enquiry</h2>

        <label class="field">
          <span class="field__label">Service</span>
          <select v-model="service" class="field__input">
            <option value="">Not sure yet</option>
            <option v-for="s in services" :key="s.id" :value="s.description">
              {{ s.description }} ({{ rupiah(s.price) }})
            </option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">Preferred date</span>
          <input v-model="selectedDate" type="date" :min="today" class="field__input" />
        </label>

        <label class="field">
          <span class="field__label">Preferred time</span>
          <input v-model="time" type="time" class="field__input" />
        </label>

        <a :href="waHref" target="_blank" rel="noopener noreferrer" class="btn book__go">
          Continue on WhatsApp
        </a>

        <p class="book__note">
          This opens WhatsApp with your details filled in. Nothing is booked until I confirm.
        </p>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { bookingNote } from '../content/site.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { rupiah } from '@bycarolinecls/shared/format'
import { whatsappLink, enquiryMessage } from '../lib/whatsapp.js'

const services = publicServices()
const selectedDate = ref('')
const service = ref('')
const time = ref('')

// Jakarta/Medan local today, so the picker cannot offer a date already past.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())

const waHref = computed(() =>
  whatsappLink(
    enquiryMessage({ service: service.value, date: selectedDate.value, time: time.value }),
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

.book__sub {
  font-size: var(--step-h3);
  margin-bottom: 22px;
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
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-bottom: 7px;
}

.field__input {
  font: inherit;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid var(--rule);
  background: #fff;
  color: var(--ink);
}

.chosen {
  font-size: 14px;
  color: var(--ink-soft);
  padding: 12px 0 18px;
  border-top: 1px solid var(--rule);
  margin: 22px 0 0;
}

.book__go {
  width: 100%;
  justify-content: center;
}

.book__note {
  font-size: 12px;
  color: var(--ink-faint);
  margin: 14px 0 0;
  line-height: 1.55;
}

</style>
