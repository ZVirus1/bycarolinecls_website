// The service catalogue: names and categories, NO PRICES.
//
// This module is imported by the PUBLIC site, so anything in it ships in the
// browser bundle that anyone can read. Prices deliberately live in ./prices.js
// instead, which only the admin imports - the public site shows service names
// and sends the pricelist over WhatsApp, so an amount appearing here would
// leak into the public bundle even though no page renders it.
//
// `public: false` keeps a row out of the site's service lists while leaving it
// available as an invoice line item (e.g. complimentary trials).
export const SERVICE_CATALOGUE = [
  { id: 'party',              description: 'Makeup Party / Graduation',            public: true,  category: 'Makeup' },
  { id: 'bridesmaid',         description: 'Makeup Sister / Bridesmaid',           public: true,  category: 'Makeup' },
  { id: 'bridesmaid-retouch', description: 'Makeup Sister / Bridesmaid + Retouch', public: true,  category: 'Makeup' },
  { id: 'mom',                description: 'Makeup Mom / Mature',                  public: true,  category: 'Makeup' },
  { id: 'mom-retouch',        description: 'Makeup Mom / Mature + Retouch',        public: true,  category: 'Makeup' },
  { id: 'wedding-half',       description: 'Makeup Wedding Half Day',              public: true,  category: 'Wedding' },
  { id: 'wedding-full',       description: 'Makeup Wedding Full Day',              public: true,  category: 'Wedding' },
  { id: 'engagement',         description: 'Makeup Engagement',                    public: true,  category: 'Wedding' },
  { id: 'prewedding',         description: 'Makeup Prewedding',                    public: true,  category: 'Wedding' },
  { id: 'trial',              description: 'Makeup Trial',                         public: false, category: 'Makeup' },
]

/** Services the public site may name. Still no prices - see the note above. */
export const publicServices = () => SERVICE_CATALOGUE.filter((s) => s.public)
