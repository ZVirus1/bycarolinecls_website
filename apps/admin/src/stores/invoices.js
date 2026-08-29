import {
  db,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from './firebase.js'

/**
 * Invoices live in the `appointments` collection alongside the booking they
 * belong to, flagged with hasInvoice: true. Keeping one record per booking
 * means the calendar and the invoice list can never disagree about a date.
 */

const COUNTER_DOC = ['settings', 'counters']

/**
 * Reserves the next invoice number, e.g. INV-2026-0007.
 *
 * Runs in a transaction because two tabs saving at the same moment would
 * otherwise read the same counter and mint duplicate numbers. Numbering
 * restarts each calendar year.
 */
export async function nextInvoiceNumber(now = new Date()) {
  const year = now.getFullYear()
  const ref = doc(db, ...COUNTER_DOC)

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists() ? snap.data() : {}
    const current = Number(data[`invoice_${year}`]) || 0
    const next = current + 1
    tx.set(ref, { ...data, [`invoice_${year}`]: next }, { merge: true })
    return next
  })

  return `INV-${year}-${String(seq).padStart(4, '0')}`
}

export async function listInvoices() {
  const snap = await getDocs(query(collection(db, 'appointments'), orderBy('appointmentDate', 'desc')))

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => a.hasInvoice)
    .map((a) => ({
      ...a,
      total: invoiceTotal(a),
      serviceSummary: (a.services ?? []).map((s) => s.description).filter(Boolean).join(', '),
    }))
}

/**
 * Prefers the stored subtotal; falls back to summing line items so invoices
 * saved before the subtotal field existed still show a total.
 */
export function invoiceTotal(a) {
  if (typeof a.subtotal === 'number' && a.subtotal > 0) return a.subtotal
  return (a.services ?? []).reduce((sum, s) => {
    const unit = Number(s.numericTotal ?? String(s.total ?? '').replace(/[^\d]/g, '')) || 0
    return sum + unit * (Number(s.quantity) || 1)
  }, 0)
}

/**
 * Fold a standalone invoice into a booking that came from TimeTree.
 *
 * The invoice's own document is the duplicate here: the TimeTree one is the
 * booking of record. So the invoice fields move onto the booking and the
 * standalone document goes. The PDF itself stays where it is in Storage - its
 * download URL keeps working, and moving the object would buy nothing.
 *
 * Writes before it deletes: if the write fails, nothing is lost.
 */
export async function linkInvoiceToEvent(invoiceId, eventId) {
  if (invoiceId === eventId) throw new Error('An invoice cannot be linked to itself.')

  const invoiceRef = doc(db, 'appointments', invoiceId)
  const eventRef = doc(db, 'appointments', eventId)

  const [invoiceSnap, eventSnap] = await Promise.all([getDoc(invoiceRef), getDoc(eventRef)])
  if (!invoiceSnap.exists()) throw new Error('That invoice no longer exists.')
  if (!eventSnap.exists()) throw new Error('That calendar event no longer exists.')
  if (eventSnap.data().hasInvoice) throw new Error('That event already has an invoice.')

  // Everything except the identity of the booking, which TimeTree owns.
  const { source, timetreeUid, appointmentDate, appointmentTime, createdAt, ...invoiceFields } =
    invoiceSnap.data()

  await setDoc(eventRef, { ...invoiceFields, hasInvoice: true, updatedAt: new Date() }, { merge: true })
  await deleteDoc(invoiceRef)

  return eventId
}

/** Bookings on a date that came from TimeTree and have no invoice yet. */
export async function unlinkedEventsOn(date) {
  if (!date) return []
  const snap = await getDocs(
    query(collection(db, 'appointments'), where('appointmentDate', '==', date)),
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => !a.hasInvoice)
}
