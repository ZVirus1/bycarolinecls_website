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

      <router-link to="/" class="hdr__logo">
        <span class="hdr__wordmark">{{ business.name }}</span>
        <span class="hdr__tagline">{{ business.tagline }}</span>
      </router-link>

      <router-link to="/book" class="btn hdr__cta">Enquire</router-link>

      <button
        class="hdr__burger"
        :aria-expanded="String(open)"
        aria-controls="primary-nav"
        @click="open = !open"
      >
        <span class="visually-hidden">{{ open ? 'Close menu' : 'Open menu' }}</span>
        <span aria-hidden="true">{{ open ? '✕' : '☰' }}</span>
      </button>
    </div>

    <nav id="primary-nav" class="hdr__nav" :class="{ 'is-open': open }" aria-label="Primary">
      <ul>
        <li v-for="item in nav" :key="item.to" :class="{ 'hdr__nav-cta': item.cta }">
          <router-link :to="item.to" @click="open = false">{{ item.label }}</router-link>
        </li>
      </ul>
    </nav>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SocialIcon from './SocialIcon.vue'
import { business, nav, socials } from '../content/site.js'

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

.hdr__social {
  display: flex;
  align-items: center;
  gap: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.hdr__social a {
  display: block;
  text-decoration: none;
  color: var(--ink-soft);
  transition: color 0.2s;
}
.hdr__social a:hover {
  color: var(--ink);
}

/* Wordmark rather than the old script logo, which read "Carolinecls". */
.hdr__logo {
  justify-self: center;
  display: grid;
  justify-items: center;
  gap: 6px;
  text-decoration: none;
  color: var(--ink);
}

.hdr__wordmark {
  font-family: var(--display);
  font-size: clamp(18px, 2.4vw, 26px);
  line-height: 1;
  letter-spacing: 0.17em;
  text-transform: uppercase;
  /* Letter-spacing hangs off the last character, so the word sits visually
     left of centre. Indenting by the same amount squares it back up. */
  text-indent: 0.17em;
  white-space: nowrap;
}

.hdr__tagline {
  font-size: 9px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--ink-faint);
  text-indent: 0.3em;
  white-space: nowrap;
}

.hdr__cta {
  justify-self: end;
}

.hdr__burger {
  display: none;
  justify-self: end;
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

.hdr__nav a {
  text-decoration: none;
  font-size: 11.5px;
  letter-spacing: 0.18em;
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
  /* Tighter here or the nowrap wordmark pushes the burger off a 375px
     screen once the social icons have taken their share of the bar. */
  .hdr__wordmark {
    font-size: 15px;
    letter-spacing: 0.12em;
    text-indent: 0.12em;
  }
  .hdr__tagline {
    font-size: 8px;
    letter-spacing: 0.24em;
    text-indent: 0.24em;
  }
  .hdr__cta {
    display: none;
  }
  .hdr__burger {
    display: block;
  }
  .hdr__nav {
    display: none;
  }
  .hdr__nav.is-open {
    display: block;
  }
  .hdr__nav ul {
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding-bottom: 28px;
  }
  .hdr__nav-cta {
    display: block;
  }
  .hdr__nav-cta a {
    border: 1px solid var(--ink);
    color: var(--ink);
    padding: 12px 26px;
  }
}
</style>
