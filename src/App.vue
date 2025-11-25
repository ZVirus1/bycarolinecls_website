<template>
  <div id="app">
    <!-- Navigation Header -->
    <header class="nav-header">
      <div class="nav-container">
        <router-link to="/" class="nav-logo">
          <img :src="logo" alt="CarolineCLS Logo" />
          <span>Bycarolinecls</span>
        </router-link>
        <nav class="nav-links">
          <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
            Invoice Generator
          </router-link>
          <router-link
            to="/calendar"
            class="nav-link"
            :class="{ active: $route.path === '/calendar' }"
          >
            Calendar
          </router-link>
        </nav>
      </div>
    </header>

    <router-view />
  </div>
</template>

<script>
import logo from './assets/bycarolinecls.png'

export default {
  name: 'App',
  data() {
    return {
      logo,
    }
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
  height: auto; /* Changed from 60px */
  min-height: 60px; /* Added */
  padding: 8px 0; /* Added */
}

/* Add mobile responsive styles */
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
    gap: 12px;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 14px;
  }
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
  gap: 24px;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-link:hover {
  background: #f5f5f5;
}

.nav-link.active {
  background: #111;
  color: white;
}

/* Optional self-hosted header font */
@font-face {
  font-family: 'Roxborough CF';
  src: url('./fonts/RoxboroughCF.ttf') format('ttf');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
</style>
