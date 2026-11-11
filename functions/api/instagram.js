/**
 * GET /api/instagram - the public Instagram feed, proxied.
 *
 * The browser cannot call Instagram directly: the Graph API has no CORS and
 * the access token must never reach the client, since it can read the account
 * on the holder's behalf. The token does not live here either - it lives in
 * the ig-token Worker, which keeps it from expiring and answers with the same
 * payload this hands back: a thumbnail, a permalink and a type per tile.
 *
 * This endpoint stays because the site calls its own origin. One hop, both
 * ends inside Cloudflare, and the feed's URL never changes.
 *
 * Captions are deliberately NOT returned - see packages/instagram/feed.js.
 *
 * If the Worker is unreachable this answers 200 with an `error`, and the site
 * quietly falls back to its bundled portfolio. A feed having a bad day is not
 * a broken page.
 *
 * Query: ?limit=<1-50>&after=<cursor from a previous response>
 */
import { clampLimit, json } from '../../packages/instagram/feed.js'

const FEED = 'https://bycarolinecls-ig-token.vinzcompany12.workers.dev/feed'

// Long enough that a busy day costs a handful of calls, short enough that
// Instagram's signed CDN URLs are still valid when the browser follows them.
const EDGE_TTL = 1800
const BROWSER_TTL = 300

export async function onRequestGet(context) {
  const { request, env } = context

  const url = new URL(request.url)
  const limit = clampLimit(url.searchParams.get('limit'))
  const after = url.searchParams.get('after') || ''

  const cache = caches.default
  const cacheKey = new Request(url.toString(), { method: 'GET' })
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const upstream = new URL(env.IG_FEED_URL || FEED)
  upstream.searchParams.set('limit', String(limit))
  if (after) upstream.searchParams.set('after', after)

  let body
  try {
    const res = await fetch(upstream, { headers: { Accept: 'application/json' } })
    body = await res.json()
    if (!res.ok) throw new Error(`feed worker answered ${res.status}`)
  } catch (err) {
    console.error('instagram feed unreachable:', err.message)
    return json({ configured: true, error: 'upstream', items: [], next: null }, 200, 60)
  }

  const ok = body?.configured && !body?.error && Array.isArray(body.items)
  // `configured: false` is passed on as it stands - a feed nobody has set up
  // yet is not a feed having a bad day, and the two read differently in a log.
  const fallback =
    body?.configured === false
      ? { configured: false, items: [], next: null }
      : { configured: true, error: 'upstream', items: [], next: null }

  const response = json(ok ? body : fallback, 200, ok ? BROWSER_TTL : 60, ok ? EDGE_TTL : 60)

  if (ok) context.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
