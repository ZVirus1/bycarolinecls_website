/**
 * GET /api/instagram - the public Instagram feed, proxied.
 *
 * The browser cannot call Instagram directly: the Graph API has no CORS and
 * the access token must never reach the client, since it can read the account
 * on the holder's behalf. So the token stays in Cloudflare and this endpoint
 * hands back only what a grid needs - a thumbnail, a permalink and a type.
 *
 * Captions are deliberately NOT returned. They routinely tag photographers,
 * venues and clients by handle, and nothing on this site credits anyone; the
 * caption is reduced to alt text with handles and hashtags stripped out.
 *
 * Without IG_ACCESS_TOKEN this answers 200 with `configured: false` rather
 * than an error, and the site quietly falls back to its bundled portfolio.
 * A live feed that has not been set up yet is not a broken page.
 *
 * Query: ?limit=<1-50>&after=<cursor from a previous response>
 */

const GRAPH = 'https://graph.instagram.com/v21.0/me/media'
const FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}'

// Long enough that a busy day costs a handful of API calls, short enough that
// Instagram's signed CDN URLs are still valid when the browser follows them.
const EDGE_TTL = 1800
const BROWSER_TTL = 300

export async function onRequestGet(context) {
  const { request, env } = context

  const token = env.IG_ACCESS_TOKEN
  if (!token) {
    return json({ configured: false, items: [], next: null }, 200, 60)
  }

  const url = new URL(request.url)
  const limit = clamp(Number(url.searchParams.get('limit')) || 12, 1, 50)
  const after = url.searchParams.get('after') || ''

  // The token is not in the URL, so the incoming request is safe to use as a
  // cache key as-is: same limit + cursor means the same public payload.
  const cache = caches.default
  const cacheKey = new Request(url.toString(), { method: 'GET' })
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const query = new URLSearchParams({ fields: FIELDS, limit: String(limit), access_token: token })
  if (after) query.set('after', after)

  let payload
  try {
    const res = await fetch(`${GRAPH}?${query}`, { headers: { Accept: 'application/json' } })
    payload = await res.json()
    if (!res.ok) {
      // Surface the reason in the Function log, never to the browser: Graph
      // errors quote the token back in some subcodes.
      console.error('instagram fetch failed:', res.status, payload?.error?.message ?? '')
      return json({ configured: true, error: 'upstream', items: [], next: null }, 200, 60)
    }
  } catch (err) {
    console.error('instagram fetch threw:', err.message)
    return json({ configured: true, error: 'upstream', items: [], next: null }, 200, 60)
  }

  const items = (payload.data ?? []).map(toTile).filter((t) => t.src)
  const response = json(
    { configured: true, items, next: payload.paging?.cursors?.after ?? null },
    200,
    BROWSER_TTL,
    EDGE_TTL,
  )

  context.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

/**
 * One media object -> one grid tile.
 *
 * A VIDEO has no still of its own in `media_url` (that field is the mp4), and
 * a CAROUSEL_ALBUM sometimes omits `media_url` entirely - in both cases the
 * usable image is the thumbnail, or the first child's.
 */
function toTile(m) {
  const child = m.children?.data?.[0]
  const childSrc = child
    ? child.media_type === 'VIDEO'
      ? child.thumbnail_url
      : child.media_url
    : null

  let src
  if (m.media_type === 'VIDEO') src = m.thumbnail_url ?? childSrc
  else if (m.media_type === 'CAROUSEL_ALBUM') src = m.media_url ?? childSrc
  else src = m.media_url

  return {
    id: m.id,
    permalink: m.permalink,
    src: src ?? null,
    type:
      m.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : m.media_type === 'VIDEO' ? 'video' : 'image',
    alt: altFrom(m.caption),
  }
}

/** First line of the caption, with handles, hashtags and URLs removed. */
function altFrom(caption) {
  const fallback = 'Bridal makeup by Bycarolinecls'
  if (!caption) return fallback

  const cleaned = caption
    .split('\n')[0]
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[@#][\w.]+/g, '')
    // Emoji, skin-tone modifiers, variation selectors and ZWJ. A screen
    // reader says "dove, sparkles" out loud, which is noise in alt text.
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (cleaned.length < 4) return fallback
  return cleaned.length > 120 ? `${cleaned.slice(0, 117).trimEnd()}...` : cleaned
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

function json(body, status, maxAge, sMaxAge = maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
    },
  })
}
