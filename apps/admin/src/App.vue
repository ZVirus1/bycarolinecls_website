<template>
  <!-- Nothing renders until Firebase has restored (or rejected) the session,
       so the login screen doesn't flash on every reload. -->
  <div v-if="!isAuthReady" class="auth-booting">Loading…</div>

  <LoginGate v-else-if="!isAuthenticated" />

  <div v-else id="app" class="shell">
    <header class="topbar">
      <button
        class="menu-btn"
        aria-controls="admin-nav"
        :aria-expanded="String(navOpen)"
        @click="navOpen = !navOpen"
      >
        <i class="fas" :class="navOpen ? 'fa-xmark' : 'fa-bars'"></i>
        <span class="sr-only">{{ navOpen ? 'Close menu' : 'Open menu' }}</span>
      </button>
      <a href="/" class="topbar__brand" title="View the public site">
        <img :src="logo" alt="Bycarolinecls" />
      </a>
    </header>

    <aside id="admin-nav" class="sidebar" :class="{ 'is-open': navOpen }">
      <div class="sidebar__head">
        <a href="/" class="brand" title="View the public site">
          <img :src="logo" alt="Bycarolinecls" />
        </a>
      </div>

      <nav class="side-nav" aria-label="Admin sections">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="side-link"
          @click="navOpen = false"
        >
          <i class="fas" :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-foot">
        <p class="who" :title="email">{{ email }}</p>
        <button class="signout" @click="handleSignOut">
          <i class="fas fa-right-from-bracket"></i> Sign out
        </button>
      </div>
    </aside>

    <div v-if="navOpen" class="scrim" @click="navOpen = false" />

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script>
import logo from './assets/bycarolinecls.png'
import '@fortawesome/fontawesome-free/css/all.css'
import LoginGate from './components/LoginGate.vue'
import { isAuthenticated, isAuthReady, currentUser, signOut } from './stores/auth.js'

export default {
  name: 'App',
  components: { LoginGate },
  data() {
    return {
      logo,
      navOpen: false,
      navItems: [
        { to: '/', label: 'New Invoice', icon: 'fa-plus' },
        { to: '/invoices', label: 'Invoices', icon: 'fa-folder-open' },
        { to: '/calendar', label: 'Calendar', icon: 'fa-calendar' },
        { to: '/pricing', label: 'Pricing', icon: 'fa-tags' },
      ],
    }
  },
  computed: {
    isAuthenticated: () => isAuthenticated.value,
    isAuthReady: () => isAuthReady.value,
    email() {
      return currentUser.value?.email ?? ''
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.navOpen = false
    },
    async handleSignOut() {
      await signOut()
    },
  },
}
</script>

<style>
/* ---------- globals (relied on by the invoice preview) ---------- */
* {
  box-sizing: border-box;
}

:root {
  --paper-w: 794px; /* A4 @96dpi-ish */
  --paper-h: 1123px;
  --ink: #1d1d1d;
  --rule: #c6c6c6;
  --rule-strong: #aaaaaa;
  --sidebar-w: 232px;
  --btn-bg: #ece8db;
  --btn-bg-hover: #ded9c6;
  --btn-fg: #1d1d1d;
  --btn-border: #ddd8c6;
  --field-bg: #fff;
  --field-border: #ddd8c6;
  --field-radius: 8px;
  --page-w: 1400px;
}

body {
  margin: 0;
  background: #f6f6f2;
  color: var(--ink);
  /* iOS inflates text per block, by a factor that depends on how wide that
     block is. That made Pricing render noticeably smaller than the other
     pages. Pin it so every page renders at the size it was authored at. */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif;
  line-height: 1.35;
}

@font-face {
  font-family: 'Roxborough CF';
  src: url('/admin/fonts/RoxboroughCF.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* ---------- form controls ----------
   One look for every text, number, date, time and select field, so the admin
   matches the public site instead of using each browser's default chrome. */
input[type='text'],
input[type='number'],
input[type='date'],
input[type='time'],
input[type='email'],
input[type='password'],
input[type='search'],
select,
textarea {
  font: inherit;
  font-size: 14px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: var(--field-bg);
  color: var(--ink);
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(29, 29, 29, 0.08);
}

input:disabled,
select:disabled,
textarea:disabled {
  background: #f7f5f0;
  color: #a09a90;
}

/* Native select chrome varies wildly by platform, so draw our own chevron. */
select {
  appearance: none;
  cursor: pointer;
  padding-right: 36px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b665e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 14px;
}

/* Safari on iOS otherwise renders date/time fields at its own height. */
input[type='date'],
input[type='time'] {
  appearance: none;
  min-height: 42px;
}

input[type='date']::-webkit-calendar-picker-indicator,
input[type='time']::-webkit-calendar-picker-indicator {
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

input[type='date']::-webkit-calendar-picker-indicator:hover,
input[type='time']::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

input[type='search']::-webkit-search-cancel-button {
  cursor: pointer;
}

/* Safari on iOS paints button text in the system blue when no colour is set.
   Anything with its own colour still wins - this is only the floor. */
button {
  color: var(--ink);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.auth-booting {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #8a857c;
  font-size: 14px;
}

/* ---------- layout ---------- */
.shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: var(--sidebar-w);
  flex: 0 0 var(--sidebar-w);
  background: #fff;
  border-right: 1px solid #e6e3dc;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar__head {
  padding-bottom: 16px;
  border-bottom: 1px solid #eeebe4;
  margin-bottom: 14px;
}

/* The logo is the only brand element, so let it fill the sidebar's inner width. */
.brand {
  display: block;
  padding: 4px 6px;
}

.brand img {
  display: block;
  width: 100%;
  height: auto;
}

/* Named to avoid colliding with the scoped .icon-btn in PricingView. */
.menu-btn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border: 0;
  border-radius: 10px;
  background: none;
  font-size: 18px;
  color: #1d1d1d;
  cursor: pointer;
}

.menu-btn:hover {
  background: #f5f3ee;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.side-link {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: #4a463f;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s;
}

.side-link i {
  width: 17px;
  text-align: center;
  font-size: 14px;
}

.side-link:hover {
  background: #f5f3ee;
}

/* exact match so "New Invoice" (/) doesn't stay lit on every route */
.side-link.router-link-exact-active {
  background: var(--btn-bg);
  color: var(--btn-fg);
}

.sidebar-foot {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #eeebe4;
}

.who {
  font-size: 11.5px;
  color: #a09a90;
  margin: 0 0 10px;
  padding-inline: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signout {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: none;
  font: inherit;
  font-size: 13.5px;
  color: #4a463f;
  cursor: pointer;
}

.signout:hover {
  background: #f5f3ee;
}

.content {
  flex: 1;
  min-width: 0;
}

/* Mobile top bar: hamburger on the left, logo beside it. Hidden on desktop. */
.topbar {
  display: none;
  position: fixed;
  inset: 0 0 auto 0;
  /* Above the drawer (70) and scrim (65): the header is shared chrome, and the
     drawer's shadow would otherwise tint the strip of header above it. */
  z-index: 80;
  align-items: center;
  gap: 12px;
  height: 58px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e6e3dc;
}

.topbar__brand {
  display: block;
  min-width: 0;
}

.topbar__brand img {
  display: block;
  height: 26px;
  width: auto;
}

.scrim {
  display: none;
}

@media (max-width: 860px) {
  .topbar {
    display: flex;
  }

  .sidebar {
    position: fixed;
    inset: 58px auto 0 0;
    height: auto;
    z-index: 70;
    width: min(78vw, 280px);
    flex-basis: auto;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.12);
  }

  .sidebar.is-open {
    transform: none;
  }

  /* The logo already sits in the top bar, so the drawer is nav only. */
  .sidebar__head {
    display: none;
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 58px 0 0 0;
    z-index: 65;
    background: rgba(0, 0, 0, 0.35);
  }

  .content {
    padding-top: 58px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
