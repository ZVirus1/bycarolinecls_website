<template>
  <section class="section">
    <div class="shell book">
      <div class="book__intro">
        <p class="eyebrow">Enquire</p>
        <h1 class="page-title">Get in touch</h1>
        <p class="lede">{{ bookingNote }}</p>
      </div>

      <!-- Price shoppers first: they have no date in mind yet, so asking for
           one before they know the cost is the wrong order. -->
      <div class="book__pricelist">
        <h2 class="book__sub">Just after prices?</h2>
        <p class="book__note book__note--lead">{{ pricelistNote }}</p>
        <a
          :href="pricelistHref"
          target="_blank"
          rel="noopener noreferrer"
          class="btn book__go"
        >
          Get our latest pricelist
        </a>
      </div>

      <div class="book__or"><span>or</span></div>

      <form class="book__form" @submit.prevent>
        <h2 class="book__sub">Enquire about a date</h2>

        <label class="field">
          <span class="field__label">Service</span>
          <select v-model="service" class="field__input">
            <option value="">Not sure yet</option>
            <option v-for="s in services" :key="s.id" :value="s.description">
              {{ s.description }}
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
import { bookingNote, pricelistNote } from '../content/site.js'
import { publicServices } from '@bycarolinecls/shared/services'
import { whatsappLink, enquiryMessage, pricelistMessage } from '../lib/whatsapp.js'

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

// Static, so it is computed once rather than on every keystroke in the form.
const pricelistHref = whatsappLink(pricelistMessage())
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

.book__pricelist,
.book__form {
  border: 1px solid var(--rule);
  background: var(--paper-alt);
  padding: clamp(20px, 3vw, 30px);
}

.book__note--lead {
  margin: 0 0 20px;
  font-size: 13.5px;
  color: var(--ink-soft);
}

/* A rule with the word sitting in the gap, so the two routes read as
   alternatives rather than as steps in a sequence. */
.book__or {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 26px 0;
  color: var(--ink-faint);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.book__or::before,
.book__or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--rule);
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
  font-size: 15px;
  width: 100%;
  padding: 12px 13px;
  border: 1px solid var(--rule);
  background: #fff;
  color: var(--ink);
  border-radius: 0;
  box-sizing: border-box;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.field__input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(29, 29, 29, 0.07);
}

/* Draw our own chevron: native select chrome differs on every platform. */
select.field__input {
  appearance: none;
  cursor: pointer;
  padding-right: 38px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b665e' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 14px;
}

/* Safari on iOS otherwise sizes these to its own liking. */
input[type='date'].field__input,
input[type='time'].field__input {
  appearance: none;
  min-height: 45px;
}

.field__input::-webkit-calendar-picker-indicator {
  opacity: 0.45;
  cursor: pointer;
  transition: opacity 0.18s ease;
}

.field__input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
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
