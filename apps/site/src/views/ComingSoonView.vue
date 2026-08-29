<template>
  <div class="soon">
    <img :src="logo" alt="" class="soon__mark" width="96" height="96" />

    <p class="soon__eyebrow">{{ business.location }}</p>
    <h1 class="soon__title">{{ business.tagline }}</h1>
    <p class="soon__body">
      A new site is on its way. In the meantime, message me directly for bookings and enquiries —
      I reply within 24 hours.
    </p>

    <div class="soon__actions">
      <a :href="waHref" class="soon__btn" target="_blank" rel="noopener noreferrer">
        Message on WhatsApp
      </a>
      <a
        v-if="instagram"
        :href="instagram"
        class="soon__btn soon__btn--quiet"
        target="_blank"
        rel="noopener noreferrer"
      >
        Instagram
      </a>
    </div>

    <p class="soon__foot">© {{ year }} {{ business.name }}</p>
  </div>
</template>

<script setup>
import logo from '../assets/logo.png'
import { business, socials } from '../content/site.js'
import { whatsappLink, enquiryMessage } from '../lib/whatsapp.js'

const waHref = whatsappLink(enquiryMessage())
const instagram = socials.find((s) => s.icon === 'instagram')?.href
const year = new Date().getFullYear()
</script>

<style scoped>
.soon {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0;
  padding: 48px var(--gutter);
  background: var(--paper);
}

.soon__mark {
  width: 96px;
  height: 96px;
  object-fit: contain;
  margin-bottom: 30px;
}

.soon__eyebrow {
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 0 0 16px;
}

.soon__title {
  font-family: var(--display);
  font-size: clamp(2rem, 5.5vw, 3.4rem);
  line-height: 1.1;
  max-width: 15ch;
  margin: 0 0 24px;
  text-wrap: balance;
}

.soon__body {
  max-width: 46ch;
  color: var(--ink-soft);
  margin: 0 0 36px;
}

.soon__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.soon__btn {
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 14px 28px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  text-decoration: none;
  transition:
    background 0.25s ease,
    color 0.25s ease;
}

.soon__btn:hover {
  background: transparent;
  color: var(--ink);
}

.soon__btn--quiet {
  background: transparent;
  color: var(--ink);
}

.soon__btn--quiet:hover {
  background: var(--ink);
  color: var(--paper);
}

.soon__foot {
  margin: 56px 0 0;
  font-size: 12px;
  color: var(--ink-faint);
}
</style>
