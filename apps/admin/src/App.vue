<template>
  <!-- Nothing renders until Firebase has restored (or rejected) the session,
       so the login screen doesn't flash on every reload. -->
  <div v-if="!isAuthReady" class="auth-booting">Loading...</div>

  <LoginGate v-else-if="!isAuthenticated" />

  <div v-else id="app">
    <!-- Navigation Header -->
    <header class="nav-header">
      <div class="nav-container">
        <router-link to="/" class="nav-logo">
          <img :src="logo" alt="CarolineCLS Logo" />
          <span>Bycarolinecls</span>
        </router-link>
        <nav class="nav-links">
          <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
            <i class="fas fa-file-invoice"></i>
            <span class="nav-text">Invoice Generator</span>
          </router-link>
          <router-link
            to="/calendar"
            class="nav-link"
            :class="{ active: $route.path === '/calendar' }"
          >
            <i class="fas fa-calendar"></i>
            <span class="nav-text">Calendar</span>
          </router-link>
          <button class="nav-link nav-signout" title="Sign out" @click="handleSignOut">
            <i class="fas fa-right-from-bracket"></i>
            <span class="nav-text">Sign out</span>
          </button>
        </nav>
      </div>
    </header>

    <router-view />
  </div>
</template>

<script>
import logo from './assets/bycarolinecls.png'
import '@fortawesome/fontawesome-free/css/all.css' // Import FontAwesome
import LoginGate from './components/LoginGate.vue'
import { isAuthenticated, isAuthReady, signOut } from './stores/auth.js'

export default {
  name: 'App',
  components: { LoginGate },
  data() {
    return {
      logo,
    }
  },
  computed: {
    isAuthenticated: () => isAuthenticated.value,
    isAuthReady: () => isAuthReady.value,
  },
  methods: {
    async handleSignOut() {
      await signOut()
    },
  },
}
</script>

<style>
/* Fonts */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

/* Global styles from original index.html */
* {
  box-sizing: border-box;
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
    'Liberation Sans',
    sans-serif;
  line-height: 1.35;
}

:root {
  --paper-w: 794px; /* A4 @96dpi-ish */
  --paper-h: 1123px;
  --ink: #1d1d1d;
  --rule: #c6c6c6;
  --rule-strong: #aaaaaa;
}

.auth-booting {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #8a857c;
  font-size: 14px;
}

.nav-signout {
  background: none;
  border: 0;
  font: inherit;
  cursor: pointer;
}

/* Navigation */
.nav-header {
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 0 16px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1250px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: auto;
  min-height: 60px;
  padding: 8px 0;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 18px;
  color: #111;
  text-decoration: none;
}

.nav-logo img {
  height: 32px;
  width: 32px;
  object-fit: contain;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link:hover {
  background: #f5f5f5;
}

.nav-link.active {
  background: #111;
  color: white;
}

/* FontAwesome icons */
.nav-link i {
  font-size: 16px;
  width: 16px;
  text-align: center;
}

/* Mobile styles - hide text, show only icons */
@media (max-width: 768px) {
  .nav-header {
    padding: 0 12px;
  }

  .nav-container {
    min-height: 50px;
    padding: 6px 0;
  }

  .nav-logo {
    font-size: 16px;
  }

  .nav-logo img {
    height: 28px;
    width: 28px;
  }

  .nav-links {
    gap: 8px;
  }

  .nav-link {
    padding: 8px;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    justify-content: center;
  }

  .nav-text {
    display: none; /* Hide text on mobile */
  }

  .nav-link i {
    font-size: 16px;
    margin: 0;
  }
}

/* Very small screens */
@media (max-width: 360px) {
  .nav-link {
    width: 36px;
    height: 36px;
    padding: 6px;
  }

  .nav-link i {
    font-size: 14px;
  }
}

/* Optional self-hosted header font */
@font-face {
  font-family: 'Roxborough CF';
  src: url('/admin/fonts/RoxboroughCF.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
</style>
