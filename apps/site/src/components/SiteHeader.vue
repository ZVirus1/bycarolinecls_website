<template>
  <header class="hdr">
    <div class="hdr__bar shell">
      <ul class="hdr__social">
        <li v-for="s in socials" :key="s.label">
          <a :href="s.href" target="_blank" rel="noopener noreferrer" :aria-label="s.label">
            <SocialIcon :name="s.icon" :size="19" />
          </a>
        </li>
      </ul>

      <router-link :to="lp('/')" class="hdr__logo" :aria-label="t('header.home')">
        <img :src="logo" alt="" width="756" height="325" />
      </router-link>

      <div class="hdr__end">
        <!-- A plain link, not a state toggle: the two languages are two URLs,
             which is the only reason Google can rank the Indonesian pages. -->
        <router-link :to="swap" class="hdr__lang" :title="t('locale.switch')" :hreflang="other">
          <span aria-hidden="true">{{ t('locale.other') }}</span>
          <span class="visually-hidden">{{ t('locale.switch') }}</span>
        </router-link>

        <router-link :to="lp('/book')" class="btn hdr__cta">{{ t('nav.contact') }}</router-link>

        <button
          class="hdr__burger"
          :aria-expanded="String(open)"
          aria-controls="primary-nav"
          @click="open = !open"
        >
          <span class="visually-hidden">{{
            open ? t('header.closeMenu') : t('header.openMenu')
          }}</span>
          <span aria-hidden="true">{{ open ? '✕' : '☰' }}</span>
        </button>
      </div>
    </div>

    <nav id="primary-nav" class="hdr__nav" :class="{ 'is-open': open }" aria-label="Primary">
      <ul>
        <li v-for="item in nav" :key="item.to" :class="{ 'hdr__nav-cta': item.cta }">
          <router-link :to="lp(item.to)" @click="open = false">{{
            t(`nav.${item.key}`)
          }}</router-link>
        </li>
      </ul>
    </nav>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SocialIcon from './SocialIcon.vue'
import logo from '../assets/logo.png'
import { nav, socials } from '../content/site.js'
import { useI18n } from '../i18n/index.js'

const { t, lp, swap, other } = useI18n()

const open = ref(false)
const route = useRoute()
watch(
  () => route.fullPath,
  () => (open.value = false),
)
</script>

<style scoped>
.hdr {
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
}

.hdr__bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding-block: 22px;
}

.hdr__end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
}

/* Same micro voice as the nav, with a rule so it reads as a control rather
   than another nav word. */
.hdr__lang {
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-indent: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-soft);
  text-decoration: none;
  /* Sized for a thumb, not for the two letters inside it. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  min-width: 42px;
  padding: 0 10px;
  border: 1px solid var(--rule);
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.hdr__lang:hover {
  color: var(--ink);
  border-color: var(--ink);
}

/* The gap moved inside the links. A 19px icon with a 16px gap is a 19x19 tap
   target; padding makes it 41x41 without moving the icon, and the negative
   margin keeps the first one flush with the page gutter. */
.hdr__social {
  display: flex;
  align-items: center;
  gap: 0;
  list-style: none;
  margin: 0 0 0 -11px;
  padding: 0;
}

.hdr__social a {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px;
  text-decoration: none;
  color: var(--ink-soft);
  transition: color 0.2s;
}
.hdr__social a:hover {
  color: var(--ink);
}

.hdr__logo {
  justify-self: center;
  display: block;
  line-height: 0;
}

/* Sized by width, height auto: the mark is 756x325 and carries "MAKEUP
   ARTIST" in its lower fifth, so forcing it into a square box (as this once
   did, at 88x88 with object-fit) shrinks that line to nothing. */
.hdr__logo img {
  width: clamp(160px, 15vw, 210px);
  height: auto;
}

.hdr__burger {
  display: none;
  background: none;
  border: 0;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  color: var(--ink);
}

.hdr__nav ul {
  display: flex;
  justify-content: center;
  gap: clamp(20px, 3.5vw, 44px);
  list-style: none;
  margin: 0;
  padding: 0 var(--gutter) 22px;
}

/* An overlay extends the touch area without moving the underline, which is
   this element's own border. The row gap never drops below 20px, so these do
   not collide with one another. */
.hdr__nav a::after {
  content: '';
  position: absolute;
  inset: -14px -8px;
}

.hdr__nav a {
  position: relative;
  text-decoration: none;
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-soft);
  padding-bottom: 4px;
  border-bottom: 1px solid transparent;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.hdr__nav a:hover,
.hdr__nav a.router-link-active {
  color: var(--ink);
  border-bottom-color: var(--ink);
}

.hdr__nav-cta {
  display: none;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .hdr__bar {
    padding-block: 14px;
  }
  /* Smaller here or the mark crowds the icons and burger on a 375px screen. */
  .hdr__logo img {
    width: 132px;
  }
  .hdr__cta {
    display: none;
  }
  .hdr__burger {
    display: block;
    min-width: 42px;
    min-height: 42px;
  }
  /* The toggle and the burger share the right-hand column once the CTA drops
     out. They fit from 375px up with room to spare. */
  .hdr__end {
    gap: 8px;
  }
  .hdr__lang {
    min-width: 40px;
    padding: 0 7px;
  }
  .hdr__nav {
    display: none;
  }
  .hdr__nav.is-open {
    display: block;
  }
  .hdr__nav ul {
    flex-direction: column;
    align-items: stretch;
    /* Real padding rather than the desktop overlay: stacked 42px targets only
       20px apart would overlap each other. */
    gap: 0;
    padding-bottom: 20px;
  }
  .hdr__nav li {
    display: flex;
    justify-content: center;
  }
  .hdr__nav a {
    padding: 15px 12px 11px;
  }
  .hdr__nav a::after {
    inset: 0;
  }
  .hdr__nav-cta {
    display: flex;
  }
  .hdr__nav-cta a {
    border: 1px solid var(--ink);
    color: var(--ink);
    padding: 13px 26px;
    margin-top: 8px;
  }
}

/* Measured, not guessed: at 375px the right-hand column has ~20px of slack,
   but a 320px handset is 8px short. The mark gives that back.
   Nothing about the menu belongs here - it broke once already by living in
   this block instead of the one above, which left every phone wider than
   380px with a desktop nav row and no Contact button. */
@media (max-width: 380px) {
  .hdr__logo img {
    width: 118px;
  }
  .hdr__end {
    gap: 6px;
  }
  .hdr__lang {
    min-width: 40px;
    padding: 0 5px;
  }
}
</style>
