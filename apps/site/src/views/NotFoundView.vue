<template>
  <section class="section">
    <div class="shell nf">
      <p class="eyebrow">{{ t('notfound.eyebrow') }}</p>
      <h1>{{ t('notfound.title') }}</h1>
      <p class="lede">{{ t('notfound.body') }}</p>
      <div class="nf__actions">
        <router-link :to="lp('/')" class="btn">{{ t('notfound.home') }}</router-link>
        <router-link :to="lp('/portfolio')" class="btn btn--ghost">{{
          t('nav.portfolio')
        }}</router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from '../i18n/index.js'

const { t, lp } = useI18n()
</script>

<style scoped>
.nf h1 {
  font-size: var(--step-h2);
  margin-bottom: 16px;
}
.nf__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 32px;
}
</style>
