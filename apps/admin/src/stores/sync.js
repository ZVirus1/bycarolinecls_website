/**
 * TimeTree sync status.
 *
 * The sync itself runs in GitHub Actions (scripts/sync-timetree.mjs) because
 * that is where the TimeTree credentials live. It stamps settings/sync when it
 * finishes; this is how the admin knows when data last arrived.
 */
import { doc, getDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from './firebase.js'

export async function loadSyncStatus() {
  const snap = await getDoc(doc(db, 'settings', 'sync'))
  return snap.exists() ? snap.data() : null
}

/**
 * Ask the scheduled workflow to run now. Resolves to a reason string when the
 * trigger is not available, so the caller can say why rather than fail mutely.
 */
export async function requestSync() {
  const token = await getAuth().currentUser?.getIdToken()
  if (!token) return { ok: false, reason: 'signed-out' }

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, reason: body.error ?? `http-${res.status}`, message: body.message }
}

export function formatSyncedAt(iso) {
  if (!iso) return 'never'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'never'
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
