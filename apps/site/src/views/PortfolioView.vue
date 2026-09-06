<template>
  <section class="section">
    <div class="shell">
      <!-- Heading and the follow link share a line: the grid is the page, so
           this should not cost it a whole band of vertical space. -->
      <div class="page-head">
        <h1 class="page-title">{{ t('portfolio.title') }}</h1>

        <a
          :href="instagramUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn--ghost page-follow"
        >
          <SocialIcon name="instagram" :size="16" />
          {{ t('home.follow') }}
        </a>
      </div>

      <InstagramGrid v-if="items.length" :items="items" />

      <p v-else-if="!loading" class="empty">
        {{ t('portfolio.emptyBefore') }}
        <a :href="instagramUrl" target="_blank" rel="noopener noreferrer">Instagram</a
        >{{ t('portfolio.emptyAfter') }}
      </p>

      <!-- Infinite scroll: the sentinel sits below the grid and asks for the
           next page while it is still 600px off screen, so the grid fills in
           before the reader reaches the bottom of it. -->
      <div v-if="!done" ref="sentinel" class="sentinel" aria-hidden="true"></div>
      <p v-if="loading" class="loading">{{ t('portfolio.loading') }}</p>
      <p v-else-if="done && live && items.length" class="caught-up">
        {{ t('portfolio.caughtUp') }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import InstagramGrid from '../components/InstagramGrid.vue'
import SocialIcon from '../components/SocialIcon.vue'
import { instagramUrl } from '../content/site.js'
import { useInstagramFeed } from '../lib/instagram.js'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()

const { items, loading, done, live, loadMore, start } = useInstagramFeed({ pageSize: 12 })

const sentinel = ref(null)
let observer = null

/**
 * Re-arm the observer.
 *
 * IntersectionObserver only reports *changes*, and observing an element makes
 * it report the current state once. Both of those matter here: the very first
 * callback arrives while page one is still in flight and gets dropped, and a
 * page of tiles may not be tall enough to push the sentinel back out of view,
 * so no further change is ever reported. Re-observing after each load asks the
 * question again instead of waiting for a change that will not come.
 */
function rearm() {
  if (!observer || !sentinel.value || done.value) return
  observer.unobserve(sentinel.value)
  observer.observe(sentinel.value)
}

// A load finishing is the cue to ask again - see rearm().
watch(loading, async (busy) => {
  if (busy || done.value) return
  await nextTick()
  rearm()
})

onMounted(async () => {
  start()
  await nextTick()

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore()
    },
    { rootMargin: '600px 0px' },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px 24px;
  margin-bottom: 34px;
}

.page-title {
  font-size: var(--step-h2);
  margin: 0;
}

.page-follow {
  flex: none;
}

.sentinel {
  height: 1px;
}

.loading,
.caught-up {
  text-align: center;
  font-size: var(--micro);
  letter-spacing: var(--micro-track);
  text-transform: uppercase;
  color: var(--ink-faint);
  margin: 32px 0 0;
}

.empty {
  color: var(--ink-faint);
  font-size: 14px;
  padding: 40px 0;
  border-block: 1px solid var(--rule);
}
</style>
