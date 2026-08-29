# bycarolinecls.com

Public site for a hair & makeup artist, plus a private admin tool for invoices,
bookings and pricing.

| | |
|---|---|
| Public site | `bycarolinecls.com` |
| Admin | `bycarolinecls.com/admin` (Firebase Auth, no public signup) |
| Hosting | Cloudflare Pages + Pages Functions |
| Data | Firebase Firestore + Storage |

## Layout

```
apps/site/       public site      -> dist/
apps/admin/      invoice, calendar, invoices, pricing -> dist/admin/
packages/shared/ service menu + formatters, used by both
functions/api/   Cloudflare Pages Functions
```

Two separate Vite builds, not one app: the admin pulls in jsPDF, html2canvas and
the Firebase SDK (~336 kB gzipped) and none of that belongs on a landing page
(40 kB gzipped). Admin assets also land under `/admin/`, so one path rule covers
the whole tool.

## Running locally

```sh
npm install
cp .env.example .env.local     # fill in from the Firebase console
npm run dev                    # public site  -> localhost:5173
npm run dev:admin              # admin        -> localhost:5174
```

The booking calendar calls `/api/availability`. To exercise the functions
locally, build and serve through Wrangler instead:

```sh
npm run build && npm run preview
```

## Editing content

- **Site copy, portfolio, social links**: `apps/site/src/content/site.js`
- **Photos**: drop into `apps/site/public/portfolio/`, then list them in that file
- **Prices**: edit in `/admin` → Pricing. That drives the invoice dropdown *and*
  the public pricing page. `packages/shared/services.js` is only the seed and
  offline fallback.

## How data flows

`appointments` is one collection holding both calendar events and invoices. An
invoice is an appointment with `hasInvoice: true` and a `pdfUrl`. The calendar
and the invoice list therefore cannot disagree about a date.

Client names, phones and addresses live in `appointments`, which is **never**
readable by the public site. The admin instead publishes `settings/availability`
containing nothing but `YYYY-MM-DD` strings, and that is what the public booking
calendar reads. There is no PII on the public path to leak, by construction.

Invoice numbers (`INV-YYYY-NNNN`) are minted in a Firestore transaction, so two
tabs saving at once cannot produce duplicates.

## Deploying

See [DEPLOY.md](./DEPLOY.md).

## Notes

- The invoice app also lives standalone at
  [ZVirus1/bycarolinecls-invoice](https://github.com/ZVirus1/bycarolinecls-invoice)
  with its own GitHub Pages deployment. That repo is untouched; its history was
  merged into `apps/admin/` here.
- TimeTree has no live integration. Its export was removed and its API shut down
  on 22 Dec 2023. See the migration section in DEPLOY.md.
