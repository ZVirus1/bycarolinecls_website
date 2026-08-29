#!/usr/bin/env node
/**
 * Fetches your own TimeTree calendar. Read only.
 *
 * Written from scratch so there is no third-party package between you and
 * TimeTree. Every request goes to timetreeapp.com and nowhere else, and all of
 * them are GETs apart from the sign-in. No dependencies beyond Node 20's
 * built-in fetch, so there is no supply chain to trust.
 *
 * Your password:
 *   - is read from the TIMETREE_PASSWORD environment variable only, never from
 *     a command-line argument (arguments leak into shell history and `ps`)
 *   - is sent in exactly one request, to TimeTree's own sign-in endpoint
 *   - is never written to disk, never logged, never held after that request
 *
 * TimeTree shut down its official API in Dec 2023. These are the endpoints its
 * own web client uses. They are undocumented and could change without notice.
 * This only ever READS - there is no code here that writes to TimeTree.
 *
 * Usage:
 *   export TIMETREE_EMAIL='you@example.com'
 *   read -rs TIMETREE_PASSWORD && export TIMETREE_PASSWORD   # no echo, no history
 *
 *   node scripts/timetree-fetch.mjs --list
 *   node scripts/timetree-fetch.mjs --calendar <id> --out timetree.json
 */

const API = 'https://timetreeapp.com/api/v1'
const UA = 'web/2.1.0/en'

/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`
TimeTree fetch (read only)

  --list                  list your calendars and their ids
  --calendar <id>         which calendar to read
  --out <file>            write events as JSON (default: stdout)
  --no-messages           skip the message threads (events only, fewer requests)
  --inspect               print the raw shape of one event and one message
  --help

Credentials come from TIMETREE_EMAIL and TIMETREE_PASSWORD.
`)
  process.exit(0)
}

const email = process.env.TIMETREE_EMAIL
const password = process.env.TIMETREE_PASSWORD

if (!email || !password) {
  fail(
    'Set TIMETREE_EMAIL and TIMETREE_PASSWORD first.\n\n' +
      "  export TIMETREE_EMAIL='you@example.com'\n" +
      '  read -rs TIMETREE_PASSWORD && export TIMETREE_PASSWORD',
  )
}

const sessionId = await signIn(email, password)
console.error('✓ signed in')

const calendars = await getCalendars(sessionId)

if (args.list || !args.calendar) {
  console.error(`\n${calendars.length} calendar(s):\n`)
  for (const c of calendars) {
    console.error(`  id ${String(c.id).padEnd(10)} ${c.name ?? c.alias_name ?? '(unnamed)'}`)
  }
  console.error('\nRe-run with:  --calendar <id> --out timetree.json')
  process.exit(0)
}

const events = await getEvents(sessionId, args.calendar)
console.error(`✓ fetched ${events.length} event(s)`)

if (args.inspect && events[0]) {
  console.error('\nraw event keys:', Object.keys(events[0]).sort().join(', '))
}

const normalised = events.map(normalise).filter(Boolean)

// Tells the sync whether an empty thread means "no messages" or "we could not
// ask" - without it, one bad run would wipe every message we already have.
let messagesFetched = false
if (!args.noMessages) {
  messagesFetched = await attachMessages(sessionId, args.calendar, normalised)
}

const output = JSON.stringify(
  {
    calendarId: args.calendar,
    fetchedAt: new Date().toISOString(),
    messagesFetched,
    events: normalised,
  },
  null,
  2,
)

if (args.out) {
  const { writeFileSync } = await import('node:fs')
  writeFileSync(args.out, output)
  console.error(`✓ wrote ${args.out}`)
  console.error('  This file contains real client names - delete it when done.')
} else {
  process.stdout.write(output + '\n')
}

/* ------------------------------------------------------------------ */

/** The ONLY request that ever sees your password. */
async function signIn(uid, pw) {
  const res = await fetch(`${API}/auth/email/signin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Timetreea': UA },
    body: JSON.stringify({ uid, password: pw, uuid: crypto.randomUUID().replace(/-/g, '') }),
  })

  if (!res.ok) {
    const code = await res
      .json()
      .then((b) => b?.error?.code)
      .catch(() => null)
    if (code === -702) fail('Wrong email or password.')
    if (code === -495) fail('TimeTree is rate limiting sign-ins. Wait a while and retry.')
    fail(`Sign-in failed (HTTP ${res.status}).`)
  }

  // Node exposes multiple Set-Cookie headers via getSetCookie().
  const cookies = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? '']
  const match = cookies.join('\n').match(/_session_id=([^;]+)/)
  if (!match) fail('Signed in but no session cookie came back.')
  return match[1]
}

/** user id -> display name, so a message can say who typed it. */
const people = new Map()

async function getCalendars(session) {
  const body = await authedGet(`${API}/calendars?since=0`, session, 'calendar list')
  for (const u of body.users ?? []) {
    if (u?.id != null) people.set(String(u.id), u.name ?? u.display_name ?? '')
  }
  return body.calendars ?? []
}

/** Events arrive in chunks; `chunk: true` means there is another page. */
async function getEvents(session, calendarId) {
  const all = []
  let since = 0

  for (let page = 0; page < 100; page++) {
    const body = await authedGet(
      `${API}/calendar/${encodeURIComponent(calendarId)}/events/sync?since=${since}`,
      session,
      'events',
    )
    all.push(...(body.events ?? []))
    if (body.chunk !== true) break
    since = body.since
  }

  return all
}

/* ---------------- message threads ---------------- */

/**
 * Each TimeTree event carries a chat thread - the brief Caroline types into
 * the app. These endpoints are undocumented and have moved before, so nothing
 * here is load-bearing: if none of them answer, we log it and carry on with
 * events alone rather than failing the whole sync.
 *
 * A calendar-wide feed is tried first, because one paged request beats one
 * request per event against an API that rate limits.
 */
const BULK_PATHS = ['activities/sync', 'comments/sync', 'messages/sync']
const PER_EVENT_PATHS = ['activities', 'comments', 'messages']

async function attachMessages(session, calendarId, list) {
  const byUid = new Map(list.map((e) => [e.uid, e]))

  const bulk = await fetchBulkMessages(session, calendarId)
  if (bulk) {
    let matched = 0
    for (const [uid, msgs] of bulk) {
      const event = byUid.get(uid)
      if (!event) continue
      event.messages = msgs
      matched += msgs.length
    }
    console.error(`✓ ${matched} message(s) across ${bulk.size} event(s)`)
    return true
  }

  // No calendar-wide feed. Fall back to one request per event, over a narrower
  // window than the sync itself so a run stays well under any rate limit.
  const now = Date.now()
  const window = list.filter((e) => {
    const start = Date.parse(e.start)
    return start > now - 30 * 86400000 && start < now + 200 * 86400000
  })

  console.error(`  no calendar-wide message feed; asking per event (${window.length})`)

  let path = null
  let total = 0
  let failures = 0

  await inBatches(window, 3, async (event) => {
    const base = `${API}/calendar/${encodeURIComponent(calendarId)}/event/${encodeURIComponent(event.uid)}`
    for (const candidate of path ? [path] : PER_EVENT_PATHS) {
      const body = await authedTry(`${base}/${candidate}?since=0`, session)
      if (!body) continue
      path = candidate
      const msgs = collectMessages(body)
      if (msgs.length) {
        event.messages = msgs
        total += msgs.length
      }
      return
    }
    failures++
  })

  if (!path) {
    console.error('⚠ no message endpoint answered; events synced without their threads')
    return false
  }
  console.error(`✓ ${total} message(s) via /${path}${failures ? ` (${failures} failed)` : ''}`)
  // Events outside the narrower per-event window were never asked about, so
  // this run cannot claim their threads are empty.
  return window.length === list.length
}

/** Returns uid -> messages, or null when no calendar-wide feed exists. */
async function fetchBulkMessages(session, calendarId) {
  for (const path of BULK_PATHS) {
    const rows = []
    let since = 0
    let ok = false

    for (let page = 0; page < 100; page++) {
      const body = await authedTry(
        `${API}/calendar/${encodeURIComponent(calendarId)}/${path}?since=${since}`,
        session,
      )
      if (!body) break
      ok = true
      rows.push(...pickRows(body))
      if (body.chunk !== true) break
      since = body.since
    }

    if (!ok) continue
    if (args.inspect && rows[0]) {
      console.error('raw message keys:', Object.keys(rows[0]).sort().join(', '))
    }

    const grouped = new Map()
    for (const row of rows) {
      const msg = normaliseMessage(row)
      const uid = String(row?.event_id ?? row?.eventId ?? row?.event_uuid ?? '')
      if (!msg || !uid) continue
      if (!grouped.has(uid)) grouped.set(uid, [])
      grouped.get(uid).push(msg)
    }
    for (const msgs of grouped.values()) msgs.sort((a, b) => (a.at < b.at ? -1 : 1))
    return grouped
  }
  return null
}

function collectMessages(body) {
  return pickRows(body)
    .map(normaliseMessage)
    .filter(Boolean)
    .sort((a, b) => (a.at < b.at ? -1 : 1))
}

/** The payload key varies by endpoint; take whichever array came back. */
function pickRows(body) {
  if (Array.isArray(body)) return body
  for (const key of ['activities', 'comments', 'messages', 'data']) {
    if (Array.isArray(body?.[key])) return body[key]
  }
  return []
}

/**
 * Keeps only what a person actually typed. TimeTree interleaves system entries
 * ("Event created", "Date updated") into the same thread; those carry a type
 * of their own and no text, so both checks below drop them.
 */
function normaliseMessage(c) {
  if (!c || c.deactivated_at) return null

  const text = ['message', 'comment', 'content', 'body', 'text']
    .map((k) => (typeof c[k] === 'string' ? c[k] : ''))
    .find((v) => v.trim())
  if (!text) return null

  const type = String(c.type ?? c.kind ?? c.activity_type ?? 'comment').toLowerCase()
  if (!/comment|message|chat|text/.test(type)) return null

  const authorId = String(c.user_id ?? c.author_id ?? c.user?.id ?? '')
  const at = toDate(c.created_at ?? c.updated_at ?? c.at)

  return {
    id: String(c.id ?? c.uuid ?? `${authorId}-${at?.getTime() ?? 0}`),
    author: c.user?.name ?? people.get(authorId) ?? '',
    text: text.trim(),
    at: at ? at.toISOString() : null,
  }
}

/** Small fixed concurrency: polite to an undocumented API, still not serial. */
async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

/* ---------------- transport ---------------- */

async function authedGet(url, session, what) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Timetreea': UA,
      Cookie: `_session_id=${session}`,
    },
  })
  if (!res.ok) fail(`Could not fetch ${what} (HTTP ${res.status}).`)
  return res.json()
}

/** Like authedGet, but returns null instead of exiting - used while probing. */
async function authedTry(url, session) {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Timetreea': UA,
        Cookie: `_session_id=${session}`,
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Trim TimeTree's payload to the fields the sync actually uses. */
function normalise(e) {
  if (!e || e.deactivated_at) return null // deleted events
  const start = toDate(e.start_at)
  if (!start) return null
  return {
    uid: String(e.id ?? e.uuid ?? ''),
    title: e.title ?? '',
    note: e.note ?? '',
    location: e.location ?? e.location_name ?? '',
    allDay: !!e.all_day,
    start: start.toISOString(),
    end: (toDate(e.end_at) ?? start).toISOString(),
    startTimezone: e.start_timezone ?? null,
    recurring: !!(e.recurrences?.length || e.recurring_uuid),
    messages: [],
  }
}

// TimeTree sends epoch milliseconds.
function toDate(v) {
  if (v == null) return null
  const d = new Date(typeof v === 'number' ? v : Number(v))
  return isNaN(d.getTime()) ? null : d
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--list') out.list = true
    else if (a === '--help' || a === '-h') out.help = true
    else if (a === '--calendar') out.calendar = argv[++i]
    else if (a === '--out') out.out = argv[++i]
    else if (a === '--no-messages') out.noMessages = true
    else if (a === '--inspect') out.inspect = true
  }
  return out
}

function fail(msg) {
  console.error(`\n${msg}\n`)
  process.exit(1)
}
