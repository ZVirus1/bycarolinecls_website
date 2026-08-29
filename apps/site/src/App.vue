<template>
  <!-- Holding page mode: set VITE_SITE_MODE=coming-soon to hide the public site
       while it is still being filled in. /admin is a separate build and is not
       affected by this at all - it stays fully usable. Flip to 'live' (or
       remove the variable) to launch. -->
  <ComingSoonView v-if="comingSoon" />

  <template v-else>
    <a class="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
    <SiteFooter />
  </template>
</template>

<script setup>
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import ComingSoonView from './views/ComingSoonView.vue'

const comingSoon = import.meta.env.VITE_SITE_MODE === 'coming-soon'
</script>
