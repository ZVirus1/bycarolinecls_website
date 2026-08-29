/**
 * Date and timezone helpers for the Pages Functions.
 *
 * Bookings are bucketed by the artist's local day, not UTC: an 01:00 Jakarta
 * booking is 18:00Z the previous day, and bucketing that in UTC would grey out
 * the wrong date on the public calendar.
 */

export const DAY_MS = 86400000
export const DEFAULT_TZ = 'Asia/Jakarta'

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
