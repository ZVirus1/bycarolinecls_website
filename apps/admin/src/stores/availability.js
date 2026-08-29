import { db, doc, setDoc, collection, getDocs } from './firebase.js'

/**
 * Publishes a PUBLIC, dates-only view of the booking calendar.
 *
 * The public site must never read the `appointments` collection - those
 * documents hold client names, phone numbers and addresses. Instead the admin
 * writes this derived document containing nothing but 'YYYY-MM-DD' strings, so
 * the public availability endpoint has no PII to leak even in principle.
 *
 * Recomputed from the full appointment list on every calendar load and after
 * every add or delete, so it is self-healing rather than incrementally patched.
 */

const AVAILABILITY_DOC = ['settings', 'availability']

/**
 * Every appointment, invoiced or not. A calendar-only event blocks a date just
 * as much as an invoiced one, so availability must be built from all of them.
 */
export async function loadAllAppointments() {
  const snap = await getDocs(collection(db, 'appointments'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function publishAvailability(appointments) {
  const busyDates = [
    ...new Set(
      appointments
        .map((a) => a.appointmentDate)
        .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)),
    ),
  ].sort()

  try {
    await setDoc(doc(db, ...AVAILABILITY_DOC), {
      busyDates,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    // Never block the admin UI on this - the public page falls back to
    // "message me to confirm dates".
    console.error('Could not publish public availability:', err)
  }

  return busyDates
}
