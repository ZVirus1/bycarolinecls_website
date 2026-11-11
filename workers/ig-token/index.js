/**
 * The Instagram feed, and the token that reaches it.
 *
 * Instagram hands out long-lived tokens that last sixty days and no longer.
 * One can be swapped for a fresh sixty days at any point after its first day,
 * but only while it is still valid - once it lapses there is no way back
 * except signing in to Meta by hand, which is what happened in November 2026
 * and left the portfolio showing its bundled photographs for a week.
 *
 * So this Worker runs daily and swaps the token whenever the one on hand is
 * more than a week old, which leaves fifty-three days of margin on a schedule
 * that could be missed for a month without anything expiring. The live token
 * lives in KV, where nothing else can read it; IG_ACCESS_TOKEN is only the
 * seed KV was first filled from.
 *
 * The feed is served from here rather than from the Pages Function for the
 * same reason: the token never leaves this Worker. /api/instagram passes this
 * answer through to the browser, so the site still calls its own origin.
 *
 * Deploy:
 *   cd workers/ig-token
 *   npx wrangler deploy
 *   npx wrangler secret put IG_ACCESS_TOKEN   # the token from Meta, once
 *
 * Check on it:
 *   npx wrangler tail bycarolinecls-ig-token
 */
import { clampLimit, fetchFeed, json } from '../../packages/instagram/feed.js'

const REFRESH = 'https://graph.instagram.com/refresh_access_token'

/** Instagram will not refresh a token in its first 24 hours; a week is safe. */
const REFRESH_AFTER_DAYS = 7
const DAY = 86400000

// Long enough that a busy day costs a handful of API calls, short enough that
// Instagram's signed CDN URLs are still valid when the browser follows them.
const EDGE_TTL = 1800
const BROWSER_TTL = 300

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(keepAlive(env))
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/feed') return feed(request, env, ctx)

    // The same scheduled job, on demand, for checking it by hand. Behind a
    // secret: an open endpoint that spends an API call per request is a free
    // way to get the account rate-limited.
    if (url.pathname === '/refresh') {
      const key = url.searchParams.get('key')
      if (!env.REFRESH_KEY || key !== env.REFRESH_KEY) {
        return new Response('Not found', { status: 404 })
      }
      return Response.json(await keepAlive(env))
    }

    return new Response('Not found', { status: 404 })
  },
}

async function feed(request, env, ctx) {
  const url = new URL(request.url)
  const limit = clampLimit(url.searchParams.get('limit'))
  const after = url.searchParams.get('after') || ''

  // No token in the URL, so the request itself is the cache key: same page of
  // the same feed means the same public payload.
  const cache = caches.default
  const cacheKey = new Request(`${url.origin}/feed?limit=${limit}&after=${after}`, {
    method: 'GET',
  })
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const token = await currentToken(env)
  const body = await fetchFeed({ token, limit, after })

  const response = json(
    body,
    200,
    body.error || !body.configured ? 60 : BROWSER_TTL,
    body.error || !body.configured ? 60 : EDGE_TTL,
  )
  if (!body.error && body.configured) ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

/** KV holds the live token; the variable is what KV was seeded from. */
async function currentToken(env) {
  try {
    const stored = await env.IG_TOKEN?.get('token', { type: 'json' })
    if (stored?.token) return stored.token
  } catch (err) {
    console.error('could not read the stored token:', err.message)
  }
  return env.IG_ACCESS_TOKEN || ''
}

export async function keepAlive(env) {
  if (!env.IG_TOKEN) {
    console.error('no KV binding; nothing to keep')
    return { ok: false, did: 'no-kv' }
  }

  let stored = null
  try {
    stored = await env.IG_TOKEN.get('token', { type: 'json' })
  } catch (err) {
    console.error('could not read the stored token:', err.message)
  }

  // First run, or KV emptied: adopt whatever was set as the seed. Dated now
  // rather than at its real birthday, which Instagram does not tell us - a
  // week later it is replaced anyway, and that is well inside sixty days.
  if (!stored?.token) {
    if (!env.IG_ACCESS_TOKEN) {
      console.error('no token in KV and no IG_ACCESS_TOKEN to seed it with')
      return { ok: false, did: 'no-token' }
    }
    await put(env, env.IG_ACCESS_TOKEN, 'seeded')
    return { ok: true, did: 'seeded' }
  }

  const age = (Date.now() - Date.parse(stored.refreshedAt)) / DAY
  if (age < REFRESH_AFTER_DAYS) return { ok: true, did: 'nothing', ageDays: round(age) }

  let payload
  try {
    const res = await fetch(`${REFRESH}?grant_type=ig_refresh_token&access_token=${stored.token}`, {
      headers: { Accept: 'application/json' },
    })
    payload = await res.json()
    if (!res.ok || !payload.access_token) {
      // Never log the body: Instagram quotes the token back in some errors.
      console.error('refresh refused:', res.status, payload?.error?.code ?? '')
      return { ok: false, did: 'refused', status: res.status, ageDays: round(age) }
    }
  } catch (err) {
    console.error('refresh threw:', err.message)
    return { ok: false, did: 'threw', ageDays: round(age) }
  }

  await put(env, payload.access_token, 'refreshed', payload.expires_in)
  return { ok: true, did: 'refreshed', expiresInDays: round((payload.expires_in ?? 0) / 86400) }
}

async function put(env, token, how, expiresIn) {
  await env.IG_TOKEN.put(
    'token',
    JSON.stringify({
      token,
      refreshedAt: new Date().toISOString(),
      expiresIn: expiresIn ?? null,
      how,
    }),
  )
  console.log(`token ${how}`)
}

function round(n) {
  return Math.round(n * 10) / 10
}
