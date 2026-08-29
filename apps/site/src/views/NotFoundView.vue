<template>
  <section class="section">
    <div class="shell nf">
      <p class="eyebrow">404</p>
      <h1>This page doesn't exist</h1>
      <p class="lede">The link may be out of date. Try the portfolio or get in touch.</p>
      <div class="nf__actions">
        <router-link to="/" class="btn">Back home</router-link>
        <router-link to="/portfolio" class="btn btn--ghost">Portfolio</router-link>
      </div>
    </div>
  </section>
</template>

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
