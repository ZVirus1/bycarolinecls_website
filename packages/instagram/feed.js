/**
 * The Instagram feed, as both ends of this site consume it.
 *
 * The Worker in workers/ig-token calls Instagram with the token it keeps
 * alive; the Pages Function at /api/instagram passes that Worker's answer
 * through to the browser. The mapping from a Graph media object to a grid
 * tile lives here so the two can never disagree about the shape of a tile.
 *
 * Captions are deliberately dropped. They routinely tag photographers, venues
 * and clients by handle, and nothing on this site credits anyone; the caption
 * is reduced to alt text with handles and hashtags stripped out.
 */
const GRAPH = 'https://graph.instagram.com/v21.0/me/media'
const FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}'

/**
 * Ask Instagram for a page of media.
 *
 * Never throws and never returns the token or Graph's own error text: some
 * error subcodes quote the token straight back. A caller gets either tiles or
 * the word 'upstream'.
 */
export async function fetchFeed({ token, limit = 12, after = '' }) {
  if (!token) return { configured: false, items: [], next: null }

  const query = new URLSearchParams({ fields: FIELDS, limit: String(limit), access_token: token })
  if (after) query.set('after', after)

  let payload
  try {
    const res = await fetch(`${GRAPH}?${query}`, { headers: { Accept: 'application/json' } })
    payload = await res.json()
    if (!res.ok) {
      console.error('instagram fetch failed:', res.status, payload?.error?.code ?? '')
      return { configured: true, error: 'upstream', items: [], next: null }
    }
  } catch (err) {
    console.error('instagram fetch threw:', err.message)
    return { configured: true, error: 'upstream', items: [], next: null }
  }

  return {
    configured: true,
    items: (payload.data ?? []).map(toTile).filter((t) => t.src),
    next: payload.paging?.cursors?.after ?? null,
  }
}

/**
 * One media object -> one grid tile.
 *
 * A VIDEO has no still of its own in `media_url` (that field is the mp4), and
 * a CAROUSEL_ALBUM sometimes omits `media_url` entirely - in both cases the
 * usable image is the thumbnail, or the first child's.
 */
export function toTile(m) {
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

export function clampLimit(n) {
  return Math.min(50, Math.max(1, Math.round(Number(n) || 12)))
}

export function json(body, status, maxAge, sMaxAge = maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
    },
  })
}
