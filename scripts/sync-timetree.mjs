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
import { parseEvents, hasRecurrence, localDate, localTime, DEFAULT_TZ } from '../apps/admin/src/lib/ics.js'

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
const events = icsPath.endsWith('.json') ? fromJson(raw) : fromIcs(raw)
console.log(`Parsed ${events.length} event(s) in window.`)

/** Output of scripts/timetree-fetch.mjs. */
function fromJson(text) {
  const data = JSON.parse(text)
  if (!Array.isArray(data.events)) throw new Error('JSON has no events array')
  if (data.events.some((e) => e.recurring)) {
    console.warn('⚠ some events repeat; repeats are not expanded, only first occurrences sync')
  }
  return data.events
    .map((e) => ({
      uid: e.uid,
      summary: e.title,
      location: e.location,
      allDay: e.allDay,
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
  return parseEvents(text, { from, to, tz: TZ, includeDetails: true })
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

  const payload = {
    clientName: e.summary || 'TimeTree event',
    appointmentDate: localDate(e.start, TZ),
    appointmentTime: e.allDay ? '' : localTime(e.start, TZ),
    address: e.location || '',
    hasInvoice: false,
    source: 'timetree',
    timetreeUid: uid,
    syncedAt: FieldValue.serverTimestamp(),
  }

  const prior = existing.get(uid)
  if (!prior) {
    batch.set(col.doc(), { ...payload, services: [], createdAt: FieldValue.serverTimestamp() })
    created++
  } else if (
    prior.appointmentDate !== payload.appointmentDate ||
    prior.appointmentTime !== payload.appointmentTime ||
    prior.clientName !== payload.clientName
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
