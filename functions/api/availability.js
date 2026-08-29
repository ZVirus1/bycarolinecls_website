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
const DEFAULT_TZ = 'Asia/Jakarta'

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const icsUrl = env.TIMETREE_ICS_URL

  if (!icsUrl) {
    return json({ error: 'Calendar not configured' }, 503)
  }

  // Bookings are bucketed by the artist's local day, not UTC. Without this an
  // 19:00 Jakarta booking (12:00Z) is fine, but a 01:00 Jakarta booking
  // (18:00Z the previous day) would grey out the wrong date on the public site.
  const tz = env.BUSINESS_TIMEZONE || DEFAULT_TZ

  const from = parseDate(url.searchParams.get('from')) ?? startOfToday(tz)
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

  const busy = parseIcsBusy(ics, from, to, tz)

  return json(
    {
      from: isoDate(from),
      to: isoDate(to),
      timezone: tz,
      // Local dates with at least one event. The UI greys these out. An event
      // spanning midnight marks every local day it touches.
      busyDates: [...new Set(busy.flatMap((b) => localDatesSpanned(b.start, b.end, tz)))].sort(),
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
function parseIcsBusy(ics, from, to, tz) {
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

    if (key === 'DTSTART') cur.start = parseIcsDate(value, rawKey, tz)
    else if (key === 'DTEND') cur.end = parseIcsDate(value, rawKey, tz)
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

// Handles: 20260315T090000Z (UTC), 20260315T090000 (floating or TZID), 20260315 (all-day)
function parseIcsDate(value, rawKey, tz) {
  const v = value.trim()
  const n = (x) => Number(x)

  // All-day: a bare date is already a local calendar day.
  if (/^\d{8}$/.test(v)) {
    return zonedToUtc(n(v.slice(0, 4)), n(v.slice(4, 6)), n(v.slice(6, 8)), 0, 0, 0, tz)
  }

  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v)
  if (!m) return null
  const [, y, mo, d, h, mi, sec, z] = m

  // Trailing Z means a real UTC instant.
  if (z) return new Date(Date.UTC(n(y), n(mo) - 1, n(d), n(h), n(mi), n(sec)))

  // Otherwise the time is floating, or carries a TZID we do not resolve. Both
  // are far better read as the artist's local wall-clock time than as UTC.
  void rawKey
  return zonedToUtc(n(y), n(mo), n(d), n(h), n(mi), n(sec), tz)
}

/* ---------- timezone ---------- */

// Offset (ms) that `tz` is ahead of UTC at the given instant.
function tzOffsetMs(instant, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - instant.getTime()
}

// Wall-clock time in `tz` -> the UTC instant it refers to.
function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  // Two passes so the offset is evaluated at the resulting instant, which
  // matters on DST boundaries. Jakarta has no DST, so this is exact there.
  let ts = guess - tzOffsetMs(new Date(guess), tz)
  ts = guess - tzOffsetMs(new Date(ts), tz)
  return new Date(ts)
}

// YYYY-MM-DD as seen in `tz`.
function localDate(instant, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

// Every local calendar day an interval touches. `end` is exclusive, so an event
// finishing exactly at midnight does not claim the following day.
function localDatesSpanned(start, end, tz) {
  const days = [localDate(start, tz)]
  const lastInstant = new Date(Math.max(start.getTime(), end.getTime() - 1))
  const last = localDate(lastInstant, tz)
  let cursor = start
  while (days[days.length - 1] !== last && days.length < MAX_RANGE_DAYS) {
    cursor = new Date(cursor.getTime() + DAY_MS)
    days.push(localDate(cursor, tz))
  }
  return days
}

/* ---------- helpers ---------- */

const DAY_MS = 86400000
// Midnight today as the artist experiences it, not as UTC does.
const startOfToday = (tz) => {
  const [y, m, d] = localDate(new Date(), tz).split('-').map(Number)
  return zonedToUtc(y, m, d, 0, 0, 0, tz)
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
