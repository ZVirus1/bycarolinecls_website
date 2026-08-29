// Prices in IDR (whole rupiah). Single source of truth for both the public
// pricing page and the admin invoice generator.
//
// `public: false` hides a row from the public pricing page but keeps it
// available as an invoice line item (e.g. complimentary trials).
export const SERVICES = [
  { id: 'party',            description: 'Makeup Party / Graduation',            price: 1_000_000, public: true,  category: 'Makeup' },
  { id: 'bridesmaid',       description: 'Makeup Sister / Bridesmaid',           price: 1_000_000, public: true,  category: 'Makeup' },
  { id: 'bridesmaid-retouch', description: 'Makeup Sister / Bridesmaid + Retouch', price: 1_700_000, public: true, category: 'Makeup' },
  { id: 'mom',              description: 'Makeup Mom / Mature',                  price: 1_200_000, public: true,  category: 'Makeup' },
  { id: 'mom-retouch',      description: 'Makeup Mom / Mature + Retouch',        price: 1_800_000, public: true,  category: 'Makeup' },
  { id: 'wedding-half',     description: 'Makeup Wedding Half Day',              price: 3_800_000, public: true,  category: 'Wedding' },
  { id: 'wedding-full',     description: 'Makeup Wedding Full Day',              price: 6_000_000, public: true,  category: 'Wedding' },
  { id: 'engagement',       description: 'Makeup Engagement',                    price: 1_800_000, public: true,  category: 'Wedding' },
  { id: 'prewedding',       description: 'Makeup Prewedding',                    price: 1_500_000, public: true,  category: 'Wedding' },
  { id: 'trial',            description: 'Makeup Trial',                         price: 0,         public: false, category: 'Makeup' },
]

// Backwards-compatible alias for the existing invoice components.
export const PREDEFINED_SERVICES = SERVICES.map(({ description, price }) => ({ description, price }))

export const publicServices = () => SERVICES.filter((s) => s.public)
