/**
 * GET /api/pricing
 *
 * Returns the service menu managed in /admin so the public pricing page and
 * the invoice generator never drift apart.
 *
 * Reads the `settings/pricing` document through the Firestore REST API. That
 * document is world-readable by design (it IS the public price list), so no
 * credentials are involved - see firestore.rules. Writes remain admin-only.
 */

const CACHE_SECONDS = 300

export async function onRequestGet({ env }) {
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) return json({ error: 'Pricing not configured' }, 503)

  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents/settings/pricing`

  try {
    const res = await fetch(url, {
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
    })

    // No document yet just means the owner hasn't saved prices in /admin;
    // the site falls back to its bundled list.
    if (res.status === 404) return json({ services: [] }, 200, cacheHeaders())
    if (!res.ok) throw new Error(`upstream ${res.status}`)

    const doc = await res.json()
    const services = fromFirestore(doc?.fields?.services) ?? []
    return json({ services, updatedAt: doc.updateTime ?? null }, 200, cacheHeaders())
  } catch (err) {
    console.error('pricing fetch failed:', err.message)
    return json({ services: [] }, 200, cacheHeaders())
  }
}

/** Unwraps Firestore's typed-value JSON into plain JS. */
function fromFirestore(v) {
  if (v == null) return null
  if ('nullValue' in v) return null
  if ('stringValue' in v) return v.stringValue
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromFirestore)
  if ('mapValue' in v) {
    return Object.fromEntries(
      Object.entries(v.mapValue.fields ?? {}).map(([k, val]) => [k, fromFirestore(val)]),
    )
  }
  return null
}

const cacheHeaders = () => ({
  'Cache-Control': `public, max-age=60, s-maxage=${CACHE_SECONDS}`,
})

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}
