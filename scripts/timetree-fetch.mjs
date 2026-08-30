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

// Declared up here, not beside the functions that use them: the script runs
// its work at the top level, and `const` is not hoisted.
const BULK_PATHS = ['activities/sync', 'comments/sync', 'messages/sync']
const PER_EVENT_PATHS = ['activities', 'comments', 'messages', 'chats', 'comment', 'activity']

/** user id -> display name, so a message can say who typed it. */
const people = new Map()

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

// Everything runs inside main(), called from the foot of the file. Top-level
// await would start work before the const declarations below it had been
// initialised, and any helper reached from here would fail on first use.
async function main() {
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

  if (events[0]) {
    // Key names only. Tells us what TimeTree hands over without ever putting a
    // client's details into a log.
    console.error(`  event fields: ${Object.keys(events[0]).sort().join(', ')}`)
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

  const path = await findEventPath(session, calendarId, window)
  if (!path) return false

  let total = 0
  await inBatches(window, 3, async (event) => {
    const body = await authedTry(eventUrl(calendarId, event.uid, path), session)
    if (!body) return
    const msgs = collectMessages(body)
    if (!msgs.length) return
    event.messages = msgs
    total += msgs.length
  })

  console.error(`✓ ${total} message(s) via /${path}`)
  // Events outside the narrower per-event window were never asked about, so
  // this run cannot claim their threads are empty.
  return window.length === list.length
}

function eventUrl(calendarId, uid, path) {
  return `${API}/calendar/${encodeURIComponent(calendarId)}/event/${encodeURIComponent(uid)}/${path}?since=0`
}

/**
 * Finds which candidate path actually carries the chat, by probing a handful of
 * events against all of them.
 *
 * A path is only accepted once it yields a real message. /activities answers
 * 200 with nothing useful, and locking onto the first endpoint that merely
 * responds means never trying the one that works.
 *
 * Diagnostics name the keys and type values that came back, never the message
 * text - these logs are readable by anyone who can see the Actions run, and
 * that text is a client's name, address and phone number.
 */
async function findEventPath(session, calendarId, list, sample = 12) {
  const keys = new Set()
  const types = new Set()
  const bodyKeys = new Set()
  const answered = new Set()
  let rows = 0

  for (const event of list.slice(0, sample)) {
    for (const candidate of PER_EVENT_PATHS) {
      const body = await authedTry(eventUrl(calendarId, event.uid, candidate), session)
      if (!body) continue
      answered.add(candidate)
      Object.keys(body).forEach((k) => bodyKeys.add(`${candidate}.${k}`))

      const raw = pickRows(body)
      rows += raw.length
      for (const r of raw) {
        Object.keys(r ?? {}).forEach((k) => keys.add(k))
        const t = r?.type ?? r?.kind ?? r?.activity_type
        if (t != null) types.add(String(t))
      }

      if (raw.map(normaliseMessage).filter(Boolean).length) return candidate
    }
  }

  if (!answered.size) {
    console.error('⚠ no message endpoint answered; events synced without their threads')
  } else {
    console.error(
      `⚠ /${[...answered].join(', /')} answered but yielded no typed messages ` +
        `across ${Math.min(sample, list.length)} event(s)`,
    )
    console.error(`  rows seen: ${rows}`)
    if (bodyKeys.size) console.error(`  body keys: ${[...bodyKeys].sort().join(', ')}`)
    if (keys.size) console.error(`  row keys: ${[...keys].sort().join(', ')}`)
    if (types.size) console.error(`  row types: ${[...types].sort().join(', ')}`)
  }

  await probeEventDetail(session, calendarId, list[0])
  return null
}

/**
 * Last resort: ask for the event itself. If the thread is embedded in the event
 * rather than served from its own path, its field names will say so.
 */
async function probeEventDetail(session, calendarId, event) {
  if (!event) return
  const url = `${API}/calendar/${encodeURIComponent(calendarId)}/event/${encodeURIComponent(event.uid)}`
  const body = await authedTry(url, session)
  if (!body) {
    console.error('  event detail endpoint: no answer')
    return
  }
  const shape = body.event ?? body
  console.error(`  event detail fields: ${Object.keys(shape).sort().join(', ')}`)
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
  for (const key of ['event_activities', 'activities', 'comments', 'messages', 'data']) {
    if (Array.isArray(body?.[key])) return body[key]
  }
  // Unknown wrapper: fall back to the first array-valued field rather than
  // reporting an empty thread, which is how event_activities was missed.
  return Object.values(body ?? {}).find(Array.isArray) ?? []
}

/** "Event created", "Date updated" and friends - never something a person typed. */
const SYSTEM_ACTIVITY = /creat|updat|delet|deactivat|join|leav|invit|remind|like|pin|attach/i

/**
 * Keeps only what a person actually typed.
 *
 * The test is inverted on purpose: keep anything carrying text unless its type
 * says it is a system entry. Matching an allowlist of type names assumes we
 * know what TimeTree calls a comment, and a numeric or renamed type would then
 * silently drop every real message.
 */
function normaliseMessage(c) {
  if (!c || c.deactivated_at) return null

  const text = ['message', 'comment', 'content', 'body', 'text']
    .map((k) => (typeof c[k] === 'string' ? c[k] : ''))
    .find((v) => v.trim())
  if (!text) return null

  const type = String(c.type ?? c.kind ?? c.activity_type ?? '')
  if (SYSTEM_ACTIVITY.test(type)) return null

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

/* ------------------------------------------------------------------ */

await main()
