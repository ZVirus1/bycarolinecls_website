# Deploying bycarolinecls.com

Public site at `bycarolinecls.com`, admin tool at `bycarolinecls.com/admin`.
Hosting is Cloudflare Pages (free tier); the domain stays registered at GoDaddy.

---

## 1. Firebase (do this first — nothing works without it)

The project `bycarolinecls-2144b` already exists. It has never had working
credentials: the committed config was placeholder text, so every read and write
failed silently.

1. <https://console.firebase.google.com> → project **bycarolinecls-2144b**
2. **Project settings → General → Your apps**. If there is no Web app, click
   **Add app → Web** and name it `bycarolinecls`.
3. Copy the `firebaseConfig` values into `.env.local` (see `.env.example`).
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
5. **Authentication → Users → Add user.** Create one account per person (1–2).
   There is no public signup — this is the only way an account is created.
6. **Build → Firestore Database → Create database** if it does not exist.
   Start in *production mode*.
7. Publish the rules from `firestore.rules` and `storage.rules`
   (Firestore → Rules → paste → Publish; same for Storage).

> The `VITE_FIREBASE_*` values are **public by design** — Vite inlines them into
> the browser bundle. The API key identifies the project, it does not grant
> access. `firestore.rules` is what actually protects the data.

---

## 2. Push to GitHub

```sh
git push origin main
```

The standalone invoice repo and its GitHub Pages site are untouched and stay live.

---

## 3. Cloudflare Pages

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages →
   Connect to Git** → pick `bycarolinecls_website`.
2. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `20` (add env var `NODE_VERSION=20` if the build complains)
3. **Settings → Environment variables**, for *Production* and *Preview*:

   | Name | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | from step 1 |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `bycarolinecls-2144b.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `bycarolinecls-2144b` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `bycarolinecls-2144b.firebasestorage.app` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | from step 1 |
   | `VITE_FIREBASE_APP_ID` | from step 1 |
   | `FIREBASE_PROJECT_ID` | `bycarolinecls-2144b` |
   | `BUSINESS_TIMEZONE` | `Asia/Jakarta` |
4. Deploy. You get `<project>.pages.dev` — check it works before touching DNS.

### Authorise the domain in Firebase

**Authentication → Settings → Authorized domains** → add `bycarolinecls.com`,
`www.bycarolinecls.com` and your `.pages.dev` domain. Login fails without this.

---

## 4. Connect the GoDaddy domain

Two options. **A is cleaner; B avoids touching nameservers.**

### Option A — move nameservers to Cloudflare (recommended)

The domain stays *registered and paid for* at GoDaddy. Only DNS hosting moves.
This is required for the bare `bycarolinecls.com` to work: Cloudflare's docs are
explicit that an apex domain must be a zone on the Cloudflare account, and
GoDaddy has no ALIAS/ANAME record type to work around it.

1. Cloudflare dashboard → **Add a site** → `bycarolinecls.com` → Free plan.
2. Cloudflare scans your existing DNS. **Check the imported records carefully** —
   especially `MX` (email) and any `TXT` (SPF/DKIM/verification). If you use
   email on this domain, a missing MX record means mail stops arriving.
3. Cloudflare shows two nameservers, e.g. `xxx.ns.cloudflare.com`.
4. GoDaddy → **My Products → Domain → Nameservers → Change → I'll use my own** →
   enter Cloudflare's two → Save.
5. Wait for propagation (usually under an hour, up to 24h).
6. Pages project → **Custom domains → Set up a domain** → add
   `bycarolinecls.com` *and* `www.bycarolinecls.com`. Cloudflare creates the
   records itself.

### Option B — keep DNS at GoDaddy

Only `www.` can point at Pages.

1. Pages → **Custom domains** → add `www.bycarolinecls.com` **first**
   (adding the CNAME before registering the domain here causes error 522).
2. GoDaddy → **DNS → Add record**: type `CNAME`, name `www`,
   value `<project>.pages.dev`.
3. For the bare domain, GoDaddy → **Forwarding** → forward
   `bycarolinecls.com` → `https://www.bycarolinecls.com` (permanent, 301).

---

## 5. Verify

- `https://bycarolinecls.com` — landing page loads
- `/portfolio`, `/pricing`, `/about` — direct page loads work (SPA fallback)
- `/book` — calendar renders; **Continue on WhatsApp** opens the right number
- `/api/availability` — returns JSON with `busyDates`
- `/api/pricing` — returns JSON
- `/admin` — shows the login screen, **not** the invoice form
- Sign in → create a test invoice → confirm the PDF downloads and the booking
  appears under Invoices and on the Calendar
- `/admin` while signed out — must not expose data

---

## Keeping TimeTree in sync

TimeTree has no official API (shut down 22 Dec 2023) and no iCal subscription
feed, so there is no true real-time push available from anyone. The sync polls.

`.github/workflows/timetree-sync.yml` runs **every 5 minutes** and can also be
triggered by hand from the **Actions** tab. The admin calendar and the public
availability page read Firestore, so both pick up each sync on refresh.

### Secrets to set

GitHub repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `TIMETREE_EMAIL` | your TimeTree login email |
| `TIMETREE_PASSWORD` | your TimeTree password |
| `TIMETREE_CALENDAR_CODE` | the calendar to sync (run `timetree-exporter` once locally to list them) |
| `FIREBASE_SERVICE_ACCOUNT` | the service account JSON, pasted whole |

Get the service account from Firebase console → **Project settings → Service
accounts → Generate new private key**. Paste the entire file contents as the
secret value.

> This repo is public, but Actions secrets are encrypted and are not exposed to
> pull requests from forks, so they are not readable by others. Never paste
> these values into a file — only into the Secrets UI.

### Two caveats about the 5-minute interval

1. **GitHub schedules are best-effort.** 5 minutes is the shortest interval
   GitHub accepts, but scheduled runs are frequently delayed and occasionally
   skipped under load. Expect a real cadence closer to 5–20 minutes. Nothing
   can be done about this from our side.
2. **Each run signs in to TimeTree afresh** — roughly 288 logins a day against
   an unofficial endpoint. If exports start failing with auth or rate-limit
   errors, raise the cron to `*/15` or `*/30` in the workflow file. That is the
   first thing to try if syncing goes flaky.

### Safety properties

- The sync **never writes to TimeTree**. It only reads an export.
- A booking that already has an invoice is **never deleted** by the sync, even
  if it disappears from TimeTree — the invoice is your record, not theirs.
- Only changed documents are rewritten, so invoices attached to a booking are
  not needlessly touched.
- The exported `.ics` holds real client names and is deleted from the runner
  after every run, including on failure.
- Repeating events are not expanded; only the first occurrence syncs.

### If you ever want to drop the password

TimeTree's **Public Calendar** is an official free feature that can be read
without signing in. Set `TIMETREE_PUBLIC_CALENDAR_ID` instead of the email and
password and the workflow switches automatically. The trade-off is that a
Public Calendar is genuinely public, so event titles would be on the open web —
only viable if bookings are titled generically ("Booked") rather than with
client names.

## One-off import (no scheduling)



TimeTree removed its calendar export and shut the public API down on
22 Dec 2023, so there is no live feed to subscribe to. Do a **one-time** export
instead — run by hand, read-only, never on the server:

```sh
pipx install timetree-exporter
timetree-exporter -o bookings.ics
```

Then import `bookings.ics` into Google Calendar, or re-enter the bookings in
`/admin`. Nothing in production depends on TimeTree.

> `timetree-exporter` is an unofficial community tool using reverse-engineered
> endpoints. It only reads. Do not put it in an automated pipeline — it can
> break without notice, and a scraper in the critical path of a commercial
> booking site is a liability.

---

## Costs

| Item | Cost |
|---|---|
| Cloudflare Pages (static + 100k function req/day) | £0 |
| Cloudflare DNS | £0 |
| Firebase Spark (Firestore + Auth + Storage) | £0 at this volume |
| GoDaddy domain renewal | what you already pay |

The only realistic path off the free tier is Firebase Storage if PDFs pile up;
Spark includes 5 GB, which is thousands of invoices.
