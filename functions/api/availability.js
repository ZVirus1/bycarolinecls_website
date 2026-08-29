/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Cloudflare Pages Function. Fetches the TimeTree iCal subscription feed
 * server-side and returns FREE/BUSY ONLY.
 *
 * Two things this deliberately does not do:
 *  - It never returns event titles, descriptions, locations or attendees.
 *    Those are clients' private details and must not reach a public page.
 *  - It never exposes TIMETREE_ICS_URL to the browser. That URL is an
 *    unauthenticated read capability on the whole calendar - anyone holding it
 *    can read every event.
 *
 * TimeTree shut down its public API in Dec 2023; the per-calendar iCal
 * subscription URL (calendar -> settings -> Calendar Settings) is the
 * remaining read path.
 */

const MAX_RANGE_DAYS = 120
const CACHE_SECONDS = 900 // 15 min - calendar changes are not urgent

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const icsUrl = env.TIMETREE_ICS_URL

  if (!icsUrl) {
    return json({ error: 'Calendar not configured' }, 503)
  }

  const from = parseDate(url.searchParams.get('from')) ?? startOfToday()
  const to = parseDate(url.searchParams.get('to')) ?? addDays(from, 60)

  if (to < from) return json({ error: '`to` must be on or after `from`' }, 400)
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return json({ error: `Range too large (max ${MAX_RANGE_DAYS} days)` }, 400)
  }

  let ics
  try {
    const res = await fetch(icsUrl, {
      // Edge cache the upstream fetch so bursts of visitors hit TimeTree once.
      cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      headers: { Accept: 'text/calendar' },
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    ics = await res.text()
  } catch (err) {
    // Don't leak the upstream URL or error detail to the client.
    console.error('TimeTree fetch failed:', err.message)
    return json({ error: 'Calendar temporarily unavailable' }, 502)
  }

  const busy = parseIcsBusy(ics, from, to)

  return json(
    {
      from: isoDate(from),
      to: isoDate(to),
      // Dates with at least one event. The UI greys these out.
      busyDates: [...new Set(busy.map((b) => isoDate(b.start)))].sort(),
      // Coarse intervals for same-day partial availability.
      busy: busy.map((b) => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
    },
    200,
    { 'Cache-Control': `public, max-age=300, s-maxage=${CACHE_SECONDS}` },
  )
}

/* ---------- iCal parsing ---------- */

/**
 * Minimal RFC 5545 reader: unfolds continuation lines, walks VEVENTs and keeps
 * only DTSTART/DTEND. Enough for a busy-time feed; it does not expand RRULEs
 * (see note below) and ignores every descriptive field on purpose.
 */
function parseIcsBusy(ics, from, to) {
  const lines = unfold(ics)
  const out = []
  let cur = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur?.start && !cur.cancelled) {
        // All-day events often omit DTEND; treat them as covering one full day.
        const end = cur.end ?? new Date(cur.start.getTime() + DAY_MS)
        if (end > from && cur.start < to) out.push({ start: cur.start, end })
      }
      cur = null
      continue
    }
    if (!cur) continue

    const idx = line.indexOf(':')
    if (idx === -1) continue
    const rawKey = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const key = rawKey.split(';')[0].toUpperCase()

    if (key === 'DTSTART') cur.start = parseIcsDate(value, rawKey)
    else if (key === 'DTEND') cur.end = parseIcsDate(value, rawKey)
    else if (key === 'STATUS' && value.toUpperCase() === 'CANCELLED') cur.cancelled = true
  }

  return out.sort((a, b) => a.start - b.start)
}

// RFC 5545 folds long lines with CRLF + a single leading space or tab.
function unfold(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

// Handles: 20260315T090000Z (UTC), 20260315T090000 (floating/local), 20260315 (date only)
function parseIcsDate(value, rawKey) {
  const v = value.trim()
  if (/^\d{8}$/.test(v)) {
    const [y, m, d] = [v.slice(0, 4), v.slice(4, 6), v.slice(6, 8)].map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  const n = (x) => Number(x)
  // Without a Z, the time is floating or carries a TZID we don't resolve here.
  // Treating it as UTC keeps day-level busy/free correct, which is all the
  // public page shows. If you need exact times across DST, add a TZID lookup.
  void z
  void rawKey
  return new Date(Date.UTC(n(y), n(mo) - 1, n(d), n(h), n(mi), n(s)))
}

/* ---------- helpers ---------- */

const DAY_MS = 86400000
const startOfToday = () => {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)
const daysBetween = (a, b) => Math.round((b - a) / DAY_MS)
const isoDate = (d) => d.toISOString().slice(0, 10)

function parseDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  return isNaN(d) ? null : d
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}
