<template>
  <!-- Nothing renders until Firebase has restored (or rejected) the session,
       so the login screen doesn't flash on every reload. -->
  <div v-if="!isAuthReady" class="auth-booting">Loading…</div>

  <LoginGate v-else-if="!isAuthenticated" />

  <div v-else id="app" class="shell">
    <button
      class="sidebar-toggle"
      :aria-expanded="String(navOpen)"
      aria-controls="admin-nav"
      @click="navOpen = !navOpen"
    >
      <i class="fas" :class="navOpen ? 'fa-xmark' : 'fa-bars'"></i>
      <span class="sr-only">{{ navOpen ? 'Close menu' : 'Open menu' }}</span>
    </button>

    <aside id="admin-nav" class="sidebar" :class="{ 'is-open': navOpen }">
      <router-link to="/" class="brand" @click="navOpen = false">
        <img :src="logo" alt="" />
        <span>Bycarolinecls</span>
      </router-link>

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
        <a href="/" class="view-site">View public site ↗</a>
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
        { to: '/', label: 'New Invoice', icon: 'fa-file-invoice' },
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
  methods: {
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
}

body {
  margin: 0;
  background: #f6f6f2;
  color: var(--ink);
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

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #111;
  font-weight: 700;
  font-size: 15px;
  padding: 6px 8px 18px;
  border-bottom: 1px solid #eeebe4;
  margin-bottom: 14px;
}

.brand img {
  width: 30px;
  height: 30px;
  object-fit: contain;
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
  background: #1d1d1d;
  color: #fff;
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

.view-site {
  display: block;
  padding: 9px 12px;
  font-size: 12px;
  color: #a09a90;
  text-decoration: none;
}

.view-site:hover {
  color: #1d1d1d;
}

.content {
  flex: 1;
  min-width: 0;
}

.sidebar-toggle {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 60;
  width: 42px;
  height: 42px;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
  color: #1d1d1d;
}

.scrim {
  display: none;
}

@media (max-width: 860px) {
  .sidebar-toggle {
    display: grid;
    place-items: center;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 70;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.12);
  }

  .sidebar.is-open {
    transform: none;
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 65;
    background: rgba(0, 0, 0, 0.35);
  }

  .content {
    padding-top: 62px;
  }
}
</style>
