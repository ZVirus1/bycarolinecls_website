// Seed prices in IDR (whole rupiah), keyed by the ids in ./services.js.
//
// ADMIN ONLY. Do not import this from apps/site - Vite would inline these
// amounts into the public browser bundle, which is exactly what publishing the
// pricelist over WhatsApp instead of on the site is meant to avoid. (Minifiers
// rewrite 1_000_000 as 1e6, so a leak is easy to miss by eye.)
//
// This is only the seed and the offline fallback. The live price list is
// settings/pricing in Firestore, edited in /admin.
import { SERVICE_CATALOGUE } from './services.js'

export const SEED_PRICES = {
  'party': 1_000_000,
  'bridesmaid': 1_000_000,
  'bridesmaid-retouch': 1_700_000,
  'mom': 1_200_000,
  'mom-retouch': 1_800_000,
  'wedding-half': 3_800_000,
  'wedding-full': 6_000_000,
  'engagement': 1_800_000,
  'prewedding': 1_500_000,
  'trial': 0,
}

/** The catalogue with prices attached. */
export const SERVICES = SERVICE_CATALOGUE.map((s) => ({ ...s, price: SEED_PRICES[s.id] ?? 0 }))

// Backwards-compatible alias for the existing invoice components.
export const PREDEFINED_SERVICES = SERVICES.map(({ description, price }) => ({ description, price }))
