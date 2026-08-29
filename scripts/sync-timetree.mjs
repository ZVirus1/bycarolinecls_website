#!/usr/bin/env node
/**
 * Syncs a TimeTree .ics export into Firestore.
 *
 * Run by .github/workflows/timetree-sync.yml on a schedule. The admin calendar
 * and the public availability endpoint both read Firestore, so refreshing
 * either picks up whatever this last wrote.
 *
 * READ ONLY as far as TimeTree is concerned - this consumes a file that has
 * already been exported. Nothing here writes back to TimeTree.
 *
 *   node scripts/timetree-fetch.mjs --calendar <id> --out timetree.json
 *   node scripts/sync-timetree.mjs timetree.json
 *
 * Accepts either the JSON from timetree-fetch.mjs or a .ics file exported by
 * hand.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT (the
 * service account JSON, as a string).
 */
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  parseEvents,
  hasRecurrence,
  localDate,
  localTime,
  DEFAULT_TZ,
} from '../apps/admin/src/lib/ics.js'

const TZ = process.env.BUSINESS_TIMEZONE || DEFAULT_TZ
const icsPath = process.argv[2]

if (!icsPath) {
  console.error('usage: node scripts/sync-timetree.mjs <file.ics>')
  process.exit(1)
}

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) return cert(JSON.parse(raw))
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return cert(JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')))
  }
  throw new Error('No Firebase credentials: set FIREBASE_SERVICE_ACCOUNT')
}

initializeApp({ credential: credentials() })
const db = getFirestore()

// Sync a window around today rather than all history - past bookings never
// change, and a bounded window keeps each run cheap.
const now = new Date()
const from = new Date(now.getTime() - 60 * 86400000)
const to = new Date(now.getTime() + 400 * 86400000)

const raw = readFileSync(icsPath, 'utf8')

// True only when the fetch actually reached a message endpoint. When it is
// false an empty thread means "we could not ask", not "there is nothing", so
// messages are left alone rather than cleared.
let messagesFetched = false

const events = icsPath.endsWith('.json') ? fromJson(raw) : fromIcs(raw)
console.log(`Parsed ${events.length} event(s) in window.`)

/** Output of scripts/timetree-fetch.mjs. */
function fromJson(text) {
  const data = JSON.parse(text)
  if (!Array.isArray(data.events)) throw new Error('JSON has no events array')
  if (data.events.some((e) => e.recurring)) {
    console.warn('⚠ some events repeat; repeats are not expanded, only first occurrences sync')
  }
  messagesFetched = data.messagesFetched === true
  return data.events
    .map((e) => ({
      uid: e.uid,
      summary: e.title,
      note: e.note,
      location: e.location,
      allDay: e.allDay,
      messages: Array.isArray(e.messages) ? e.messages : [],
      start: new Date(e.start),
      end: new Date(e.end),
    }))
    .filter((e) => e.end > from && e.start < to)
}

/** A .ics exported by hand. */
function fromIcs(text) {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error(`${icsPath} is not a calendar file`)
  if (hasRecurrence(text)) {
    console.warn('⚠ feed contains RRULEs; repeats are not expanded, only first occurrences sync')
  }
  return parseEvents(text, { from, to, tz: TZ, includeDetails: true }).map((e) => ({
    ...e,
    note: e.description ?? '',
    messages: [],
  }))
}

const col = db.collection('appointments')

// Existing TimeTree-sourced docs, keyed by their TimeTree id.
const existingSnap = await col.where('source', '==', 'timetree').get()
const existing = new Map()
existingSnap.forEach((d) => {
  const uid = d.data().timetreeUid
  if (uid) existing.set(uid, { id: d.id, ...d.data() })
})

let created = 0
let updated = 0
const seenUids = new Set()
let batch = db.batch()
let queued = 0

/** Cheap deep-equal: threads are short, and only text and author can change. */
function sameMessages(a, b) {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  return left.every((m, i) => m.id === right[i].id && m.text === right[i].text)
}

async function flush() {
  if (queued) {
    await batch.commit()
    batch = db.batch()
    queued = 0
  }
}

for (const e of events) {
  const uid = e.uid || `${e.start.toISOString()}|${e.summary}`
  seenUids.add(uid)

  // hasInvoice is deliberately NOT in here: it belongs to us, not TimeTree.
  // Including it would wipe the invoice flag off a booking whose title or time
  // later changed in TimeTree, orphaning the invoice.
  const messages = (e.messages ?? []).map((m) => ({
    id: String(m.id ?? ''),
    author: m.author ?? '',
    text: String(m.text ?? ''),
    at: m.at ?? null,
  }))

  const payload = {
    clientName: e.summary || 'TimeTree event',
    appointmentDate: localDate(e.start, TZ),
    appointmentTime: e.allDay ? '' : localTime(e.start, TZ),
    // TimeTree shows a start and an end; the admin now shows the same range.
    appointmentEndTime: e.allDay ? '' : localTime(e.end, TZ),
    address: e.location || '',
    note: e.note || '',
    source: 'timetree',
    timetreeUid: uid,
    syncedAt: FieldValue.serverTimestamp(),
  }

  // Only claim a thread is empty when we actually managed to read threads.
  if (messagesFetched || messages.length) payload.messages = messages

  const prior = existing.get(uid)
  if (!prior) {
    batch.set(col.doc(), {
      ...payload,
      messages,
      hasInvoice: false,
      services: [],
      createdAt: FieldValue.serverTimestamp(),
    })
    created++
  } else if (
    prior.appointmentDate !== payload.appointmentDate ||
    prior.appointmentTime !== payload.appointmentTime ||
    prior.appointmentEndTime !== payload.appointmentEndTime ||
    prior.clientName !== payload.clientName ||
    (prior.note || '') !== payload.note ||
    (prior.address || '') !== payload.address ||
    ('messages' in payload && !sameMessages(prior.messages, payload.messages))
  ) {
    // Only touch docs that actually changed, so invoices attached to a booking
    // are never needlessly rewritten.
    batch.update(col.doc(prior.id), payload)
    updated++
  } else {
    continue
  }

  if (++queued >= 400) await flush()
}
await flush()

// Events deleted in TimeTree should disappear here too - but never delete a
// booking that has an invoice attached, since that is our record, not theirs.
let removed = 0
for (const [uid, doc] of existing) {
  if (seenUids.has(uid)) continue
  if (doc.hasInvoice) {
    console.warn(`⚠ ${uid} gone from TimeTree but has an invoice - keeping it`)
    continue
  }
  batch.delete(col.doc(doc.id))
  removed++
  if (++queued >= 400) await flush()
}
await flush()

// Stamp the run so the admin can show "Last synced" without guessing.
await db.doc('settings/sync').set({
  lastSyncAt: new Date().toISOString(),
  created,
  updated,
  removed,
  source: 'timetree',
})

console.log(`✓ created ${created}, updated ${updated}, removed ${removed}`)
