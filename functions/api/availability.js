/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * PUBLIC endpoint. Returns booked DATES only.
 *
 * Reads settings/availability - a document the admin app maintains that holds
 * nothing but 'YYYY-MM-DD' strings. The public path deliberately never touches
 * the `appointments` collection, which holds client names, phone numbers and
 * addresses. There is therefore no private data here to leak, by construction
 * rather than by filtering.
 *
 * The document is world-readable (see firestore.rules), so no credentials are
 * involved. Writes stay admin-only.
 */
import { DEFAULT_TZ, startOfToday, addDays, daysBetween, parseDateParam, json } from '../_lib/ics.js'

const MAX_RANGE_DAYS = 400
const CACHE_SECONDS = 120 // short: a new booking should disappear promptly

export async function onRequestGet({ request, env }) {
  const projectId = env.FIREBASE_PROJECT_ID
  if (!projectId) return json({ error: 'Calendar not configured' }, 503)

  const url = new URL(request.url)
  const tz = env.BUSINESS_TIMEZONE || DEFAULT_TZ

  const from = parseDateParam(url.searchParams.get('from')) ?? startOfToday(tz)
  const to = parseDateParam(url.searchParams.get('to')) ?? addDays(from, 60)

  if (to < from) return json({ error: '`to` must be on or after `from`' }, 400)
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return json({ error: `Range too large (max ${MAX_RANGE_DAYS} days)` }, 400)
  }

  const fromIso = from.toISOString().slice(0, 10)
  const toIso = to.toISOString().slice(0, 10)

  const docUrl =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents/settings/availability`

  let busyDates = []
  try {
    const res = await fetch(docUrl, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } })

    // 404 just means nothing has been booked yet.
    if (res.ok) {
      const data = await res.json()
      busyDates = (data?.fields?.busyDates?.arrayValue?.values ?? [])
        .map((v) => v.stringValue)
        .filter(Boolean)
    } else if (res.status !== 404) {
      throw new Error(`upstream ${res.status}`)
    }
  } catch (err) {
    console.error('availability fetch failed:', err.message)
    // Fail open: an empty list shows every date as available, and the booking
    // form still hands off to WhatsApp where a human confirms. Better than a
    // dead calendar.
    return json({ from: fromIso, to: toIso, timezone: tz, busyDates: [], degraded: true }, 200, {
      'Cache-Control': 'public, max-age=30',
    })
  }

  return json(
    {
      from: fromIso,
      to: toIso,
      timezone: tz,
      busyDates: busyDates.filter((d) => d >= fromIso && d <= toIso).sort(),
    },
    200,
    { 'Cache-Control': `public, max-age=60, s-maxage=${CACHE_SECONDS}` },
  )
}
