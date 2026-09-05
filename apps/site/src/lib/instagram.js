/**
 * The Instagram feed, as the site consumes it.
 *
 * Talks to /api/instagram (a Pages Function - the token never reaches the
 * browser) and pages through with the cursor that endpoint hands back.
 *
 * If the feed is not configured yet, or Instagram is having a bad day, this
 * falls back to the portfolio bundled in site.js and reports `live: false`.
 * The portfolio page is the reason people visit; it does not get to be empty
 * because a third party is down.
 */
import { ref, shallowRef } from 'vue'
import { portfolio } from '../content/site.js'

const FALLBACK = portfolio.map((p) => ({
  id: p.src,
  src: p.src,
  alt: p.alt,
  type: 'image',
  permalink: null, // bundled images are not posts, so the tile is not a link
}))

export function useInstagramFeed({ pageSize = 12 } = {}) {
  const items = shallowRef([])
  const loading = ref(false)
  const done = ref(false)
  const live = ref(true)

  let cursor = null
  let started = false

  function fallback() {
    items.value = FALLBACK
    live.value = false
    done.value = true
  }

  async function loadMore() {
    if (loading.value || done.value) return
    loading.value = true
    started = true

    try {
      const url = new URL('/api/instagram', window.location.origin)
      url.searchParams.set('limit', String(pageSize))
      if (cursor) url.searchParams.set('after', cursor)

      const res = await fetch(url)
      if (!res.ok) throw new Error(`feed responded ${res.status}`)
      const data = await res.json()

      if (!data.configured || data.error) {
        // Only fall back on the FIRST page. Losing page three is a reason to
        // stop loading, not to throw away the two pages already on screen.
        if (!items.value.length) fallback()
        else done.value = true
        return
      }

      items.value = [...items.value, ...data.items]
      cursor = data.next
      if (!cursor || !data.items.length) done.value = true
    } catch {
      if (!items.value.length) fallback()
      else done.value = true
    } finally {
      loading.value = false
    }
  }

  /** Safe to call from more than one place; only the first call does work. */
  function start() {
    if (!started) loadMore()
  }

  return { items, loading, done, live, loadMore, start }
}
