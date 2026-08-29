import { ref as vueRef } from 'vue'
import { db, doc, getDoc, setDoc } from './firebase.js'
import { SERVICES as DEFAULT_SERVICES } from '@bycarolinecls/shared/services'

/**
 * The service menu, stored in Firestore at settings/pricing.
 *
 * One document is the source of truth for three consumers:
 *   - the invoice generator's service dropdown
 *   - the public /pricing page (via /api/pricing)
 *   - the public booking form's service list
 *
 * The bundled SERVICES list is the seed and the offline fallback, so nothing
 * breaks before the owner has saved prices for the first time.
 */

const PRICING_DOC = ['settings', 'pricing']

export const services = vueRef([...DEFAULT_SERVICES])
export const loaded = vueRef(false)

export async function loadPricing({ force = false } = {}) {
  if (loaded.value && !force) return services.value
  try {
    const snap = await getDoc(doc(db, ...PRICING_DOC))
    if (snap.exists() && Array.isArray(snap.data().services)) {
      services.value = snap.data().services
    }
  } catch (err) {
    console.error('Could not load pricing, using bundled defaults:', err)
  } finally {
    loaded.value = true
  }
  return services.value
}

export async function savePricing(next) {
  const clean = next
    .filter((s) => s.description?.trim())
    .map((s, i) => ({
      id: s.id || slug(s.description) || `service-${i + 1}`,
      description: s.description.trim(),
      price: Number(s.price) || 0,
      category: s.category?.trim() || 'Services',
      public: s.public !== false,
      order: i,
    }))

  await setDoc(doc(db, ...PRICING_DOC), { services: clean, updatedAt: new Date().toISOString() })
  services.value = clean
  return clean
}

export function blankService() {
  return { id: '', description: '', price: 0, category: 'Makeup', public: true }
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
