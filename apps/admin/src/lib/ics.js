/**
 * Minimal RFC 5545 reader, used by the TimeTree import screen.
 *
 * TimeTree removed its calendar export and shut its public API down on
 * 22 Dec 2023, so bookings arrive as a .ics file the owner exports by hand
 * (or via the scheduled job in .github/workflows/). Nothing here talks to
 * TimeTree directly.
 *
 * Recurrence rules are NOT expanded - see hasRecurrence().
 */

export const DAY_MS = 86400000
export const DEFAULT_TZ = 'Asia/Jakarta'

/** True if the feed contains RRULEs, which this parser does not expand. */
export function hasRecurrence(ics) {
  return /^RRULE[:;]/m.test(ics)
}

/**
 * Parses VEVENTs overlapping [from, to).
 *
 * `includeDetails` gates every human-readable field. Public callers MUST leave
 * it false: summaries and locations are clients' private details.
 */
export function parseEvents(ics, { from, to, tz = DEFAULT_TZ, includeDetails = false } = {}) {
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
        // All-day events often omit DTEND; treat as covering one full day.
        const end = cur.end ?? new Date(cur.start.getTime() + DAY_MS)
        if (end > from && cur.start < to) {
          const event = { start: cur.start, end, allDay: !!cur.allDay }
          if (includeDetails) {
            event.uid = cur.uid ?? null
            event.summary = cur.summary ?? ''
            event.location = cur.location ?? ''
            event.description = cur.description ?? ''
          }
          out.push(event)
        }
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

    switch (key) {
      case 'DTSTART':
        cur.start = parseIcsDate(value, tz)
        cur.allDay = /VALUE=DATE(?!-TIME)/i.test(rawKey) || /^\d{8}$/.test(value.trim())
        break
      case 'DTEND':
        cur.end = parseIcsDate(value, tz)
        break
      case 'STATUS':
        if (value.toUpperCase() === 'CANCELLED') cur.cancelled = true
        break
      case 'UID':
        cur.uid = value
        break
      case 'SUMMARY':
        cur.summary = unescapeText(value)
        break
      case 'LOCATION':
        cur.location = unescapeText(value)
        break
      case 'DESCRIPTION':
        cur.description = unescapeText(value)
        break
    }
  }

  return out.sort((a, b) => a.start - b.start)
}

/** RFC 5545 folds long lines with CRLF + a single leading space or tab. */
function unfold(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

const unescapeText = (s) =>
  s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\')

/** Handles 20260315T090000Z (UTC), 20260315T090000 (floating/TZID), 20260315 (all-day). */
export function parseIcsDate(value, tz = DEFAULT_TZ) {
  const v = value.trim()
  const n = Number

  if (/^\d{8}$/.test(v)) {
    return zonedToUtc(n(v.slice(0, 4)), n(v.slice(4, 6)), n(v.slice(6, 8)), 0, 0, 0, tz)
  }

  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v)
  if (!m) return null
  const [, y, mo, d, h, mi, sec, z] = m

  if (z) return new Date(Date.UTC(n(y), n(mo) - 1, n(d), n(h), n(mi), n(sec)))

  // Floating, or carrying a TZID we do not resolve. Both read far better as
  // the artist's local wall-clock time than as UTC.
  return zonedToUtc(n(y), n(mo), n(d), n(h), n(mi), n(sec), tz)
}

/* ---------- timezone ---------- */

/** Offset (ms) that `tz` runs ahead of UTC at the given instant. */
export function tzOffsetMs(instant, tz) {
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

/** Wall-clock time in `tz` -> the UTC instant it refers to. */
export function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  // Two passes so the offset is evaluated at the resulting instant, which
  // matters on DST boundaries. Jakarta has no DST, so this is exact there.
  let ts = guess - tzOffsetMs(new Date(guess), tz)
  ts = guess - tzOffsetMs(new Date(ts), tz)
  return new Date(ts)
}

/** YYYY-MM-DD as seen in `tz`. */
export function localDate(instant, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** HH:MM as seen in `tz`. */
export function localTime(instant, tz) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(instant)
}

/**
 * Every local calendar day an interval touches. `end` is exclusive, so an
 * event finishing exactly at midnight does not claim the following day.
 */
export function localDatesSpanned(start, end, tz, cap = 120) {
  const days = [localDate(start, tz)]
  const last = localDate(new Date(Math.max(start.getTime(), end.getTime() - 1)), tz)
  let cursor = start
  while (days[days.length - 1] !== last && days.length < cap) {
    cursor = new Date(cursor.getTime() + DAY_MS)
    days.push(localDate(cursor, tz))
  }
  return days
}

/** Midnight today as the artist experiences it, not as UTC does. */
export function startOfToday(tz) {
  const [y, m, d] = localDate(new Date(), tz).split('-').map(Number)
  return zonedToUtc(y, m, d, 0, 0, 0, tz)
}

export const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS)
export const daysBetween = (a, b) => Math.round((b - a) / DAY_MS)

export function parseDateParam(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  return isNaN(d) ? null : d
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}
