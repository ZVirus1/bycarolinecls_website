import {
  db,
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  deleteField,
  updateDoc,
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
  const snap = await getDocs(
    query(collection(db, 'appointments'), orderBy('appointmentDate', 'desc')),
  )

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => a.hasInvoice)
    .map((a) => ({
      ...a,
      total: invoiceTotal(a),
      serviceSummary: (a.services ?? [])
        .map((s) => s.description)
        .filter(Boolean)
        .join(', '),
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

  await setDoc(
    eventRef,
    { ...invoiceFields, hasInvoice: true, updatedAt: new Date() },
    { merge: true },
  )
  await deleteDoc(invoiceRef)

  return eventId
}

/**
 * Mark an invoice settled, or put it back to the 50% deposit.
 *
 * `settled`, not `paid`: generating an invoice already writes `paid` as a
 * NUMBER - the deposit amount - so a boolean of the same name would have read
 * as truthy on every invoice ever made and shown the lot as settled.
 *
 * `settledDate` is a plain YYYY-MM-DD string rather than a timestamp: it is
 * printed on the invoice as a calendar date, and a timestamp read back in
 * whatever timezone the browser happens to be in can move it by a day.
 */
export async function setInvoiceSettled(id, settled, settledDate = todayISO()) {
  await setDoc(
    doc(db, 'appointments', id),
    {
      settled,
      // Written either way. Unmarking leaves the date on the record so that
      // re-marking offers the one it had rather than silently moving it to
      // today, and nothing reads settledDate unless `settled` is true.
      settledDate,
      updatedAt: new Date(),
    },
    { merge: true },
  )
}

/**
 * Everything the invoice put on the record, and nothing the booking owns.
 *
 * `clientName`, `appointmentDate` and `appointmentTime` are absent on purpose:
 * on a booking that came from TimeTree they are the booking, and TimeTree is
 * what maintains them.
 */
const INVOICE_FIELDS = [
  'hasInvoice',
  'invoiceNumber',
  'invoiceDate',
  'services',
  'subtotal',
  'paid',
  'balance',
  'settled',
  'settledDate',
  'bank',
  'accountName',
  'accountNo',
  'pdfUrl',
  'phone',
  'address',
]

/**
 * Remove an invoice.
 *
 * Two different things depending on where the record came from. A standalone
 * invoice is its own document and goes entirely. An invoice written onto a
 * TimeTree booking is only some of that document's fields, so those are
 * stripped and the booking stays - deleting it would take a real appointment
 * out of the calendar, and the next sync would put it back without the invoice
 * anyway.
 *
 * Returns 'deleted' or 'cleared' so the caller can say which happened.
 */
export async function deleteInvoice(id) {
  const invoiceRef = doc(db, 'appointments', id)
  const snap = await getDoc(invoiceRef)
  if (!snap.exists()) return 'deleted'

  if (snap.data().timetreeUid) {
    await updateDoc(
      invoiceRef,
      Object.fromEntries([
        ...INVOICE_FIELDS.map((f) => [f, deleteField()]),
        ['updatedAt', new Date()],
      ]),
    )
    return 'cleared'
  }

  await deleteDoc(invoiceRef)
  return 'deleted'
}

/** Today where the user is standing, as YYYY-MM-DD. */
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Bookings on a date that came from TimeTree and have no invoice yet. */
export async function unlinkedEventsOn(date) {
  if (!date) return []
  const snap = await getDocs(
    query(collection(db, 'appointments'), where('appointmentDate', '==', date)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => !a.hasInvoice)
}
