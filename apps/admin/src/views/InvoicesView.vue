<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1 class="page__title">Invoices</h1>
        <p class="page__sub">{{ filtered.length }} of {{ invoices.length }} shown</p>
      </div>
      <router-link to="/" class="btn"><i class="fas fa-plus"></i> New invoice</router-link>
    </header>

    <div class="toolbar">
      <label class="search">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input
          v-model="q"
          type="search"
          placeholder="Search name, invoice number or service…"
          aria-label="Search invoices"
        />
      </label>

      <div class="sel">
        <BaseSelect v-model="sortKey" :options="sortOptions" />
      </div>
    </div>

    <p v-if="error" class="banner banner--bad">{{ error }}</p>

    <div v-if="loading" class="empty">Loading invoices…</div>

    <div v-else-if="!invoices.length" class="empty">
      No invoices yet. <router-link to="/">Create the first one →</router-link>
    </div>

    <div v-else-if="!filtered.length" class="empty">No invoices match “{{ q }}”.</div>

    <div v-else class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Name</th>
            <th>Booking date</th>
            <th>Services</th>
            <th class="num">Total</th>
            <th>Status</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in filtered" :key="inv.id">
            <td class="mono">{{ inv.invoiceNumber || '-' }}</td>
            <td>
              <span class="name">{{ inv.clientName || '-' }}</span>
              <span v-if="inv.phone" class="sub">{{ inv.phone }}</span>
            </td>
            <td>
              {{ formatDate(inv.appointmentDate) }}
              <span v-if="inv.appointmentTime" class="sub">{{ inv.appointmentTime }}</span>
            </td>
            <td class="services" :title="inv.serviceSummary">{{ inv.serviceSummary || '-' }}</td>
            <td class="num">{{ rupiah(inv.total) }}</td>
            <td>
              <span class="pill" :class="inv.settled ? 'pill--paid' : 'pill--due'">{{
                inv.settled ? 'Paid' : '50% paid'
              }}</span>
              <span v-if="inv.settled && inv.settledDate" class="sub">{{
                formatDate(inv.settledDate)
              }}</span>
            </td>
            <td class="actions">
              <span v-if="busyId === inv.id" class="working">{{ busyLabel }}</span>
              <ActionMenu v-else :items="actionsFor(inv)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Off-screen, and only while a rebuild is running. The capture needs a
         laid-out page at full size; `display: none` would have no box to
         photograph, and `visibility: hidden` would still take up the column. -->
    <div v-if="rebuildProps" class="offscreen" aria-hidden="true">
      <InvoicePreview
        :form-data="rebuildProps.formData"
        :items="rebuildProps.items"
        :paid="rebuildProps.paid"
        :paid-date="rebuildProps.paidDate"
      />
    </div>

    <p v-if="rebuildError" class="banner banner--bad">{{ rebuildError }}</p>
    <p v-if="notice" class="banner banner--ok">{{ notice }}</p>

    <!-- A phone cannot usefully be sent to a blob URL in a new tab, and it
         only opens its share sheet while the tap that asked for one is still
         fresh - which a PDF takes too long to build to manage. So on a phone
         the rebuilt invoice waits here for a second tap. -->
    <div v-if="ready" class="ready">
      <div class="ready__text">
        <strong>{{ ready.title }}</strong>
        <span class="ready__file">{{ ready.fileName }}</span>
      </div>
      <button class="ready__btn" type="button" @click="savePdf">
        <i class="fas fa-share-from-square" aria-hidden="true"></i> Save or share
      </button>
    </div>

    <div v-if="deleting" class="sheet" @click.self="cancelDelete">
      <div class="sheet__card" role="dialog" aria-modal="true" aria-labelledby="del-title">
        <button class="sheet__close" aria-label="Close" @click="cancelDelete">
          <i class="fas fa-xmark"></i>
        </button>

        <p class="sheet__eyebrow">Delete invoice</p>
        <h2 id="del-title" class="sheet__name">
          {{ deleting.invoiceNumber || deleting.clientName || 'This invoice' }}
        </h2>

        <!-- Spells out which of the two things is about to happen, because
             they are very different and the row gives no clue which. -->
        <p class="sheet__note">
          <template v-if="deleting.timetreeUid">
            This invoice was written onto a booking from TimeTree. The invoice is removed and the
            appointment stays in the calendar, free to be invoiced again.
          </template>
          <template v-else>
            This invoice has no booking behind it, so the whole record goes. It cannot be undone,
            and the PDF cannot be rebuilt afterwards.
          </template>
        </p>

        <p v-if="deleteError" class="banner banner--bad">{{ deleteError }}</p>

        <div class="sheet__actions">
          <button class="sheet__btn" :disabled="deleteBusy" @click="cancelDelete">Keep it</button>
          <button
            class="sheet__btn sheet__btn--danger"
            :disabled="deleteBusy"
            @click="confirmDelete"
          >
            {{ deleteBusy ? 'Deleting…' : deleting.timetreeUid ? 'Remove invoice' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="linking" class="sheet" @click.self="closeLink">
      <div class="sheet__card" role="dialog" aria-modal="true" aria-labelledby="link-title">
        <button class="sheet__close" aria-label="Close" @click="closeLink">
          <i class="fas fa-xmark"></i>
        </button>

        <p class="sheet__eyebrow">Link to calendar event</p>
        <h2 id="link-title" class="sheet__name">{{ linking.clientName || 'Invoice' }}</h2>

        <p class="sheet__note">
          Bookings on {{ formatDate(linking.appointmentDate) }} with no invoice yet. Linking moves
          this invoice onto the booking, so the calendar shows one entry instead of two.
        </p>

        <div v-if="candidatesLoading" class="empty">Loading…</div>
        <div v-else-if="!candidates.length" class="empty">No unlinked bookings on that date.</div>
        <ul v-else class="cand">
          <li v-for="c in candidates" :key="c.id">
            <button class="cand__btn" :disabled="busy" @click="confirmLink(c)">
              <span class="cand__name">{{ c.clientName || 'Unnamed' }}</span>
              <span v-if="c.appointmentTime" class="cand__time">{{ c.appointmentTime }}</span>
            </button>
          </li>
        </ul>

        <p v-if="linkError" class="banner banner--bad">{{ linkError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  listInvoices,
  linkInvoiceToEvent,
  deleteInvoice,
  setInvoiceSettled,
  todayISO,
  unlinkedEventsOn,
} from '../stores/invoices.js'
import { rupiah } from '@bycarolinecls/shared/format'
import ActionMenu from '../components/ui/ActionMenu.vue'
import BaseSelect from '@bycarolinecls/shared/ui/BaseSelect.vue'
import InvoicePreview from '../components/InvoicePreview.vue'
import {
  buildInvoicePdfBlob,
  canSharePdf,
  deliverPdf,
  invoiceFileName,
  invoiceToPreviewProps,
  showPdfBlob,
} from '../lib/invoicePdf.js'

const invoices = ref([])
const loading = ref(true)
const error = ref('')
// Prefilled when the calendar sends us here for one particular invoice.
const route = useRoute()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const sortKey = ref('date-desc')
const sortOptions = [
  { value: 'date-desc', label: 'Newest booking first' },
  { value: 'date-asc', label: 'Oldest booking first' },
  { value: 'total-desc', label: 'Highest value' },
  { value: 'name-asc', label: 'Name A to Z' },
]

const linking = ref(null)
const candidates = ref([])
const candidatesLoading = ref(false)
const linkError = ref('')
const busy = ref(false)

async function openLink(inv) {
  linking.value = inv
  linkError.value = ''
  candidates.value = []
  candidatesLoading.value = true
  try {
    candidates.value = (await unlinkedEventsOn(inv.appointmentDate)).filter((c) => c.id !== inv.id)
  } catch (err) {
    linkError.value = `Could not load bookings: ${err.message}`
  } finally {
    candidatesLoading.value = false
  }
}

function closeLink() {
  linking.value = null
  linkError.value = ''
}

async function confirmLink(target) {
  busy.value = true
  linkError.value = ''
  try {
    await linkInvoiceToEvent(linking.value.id, target.id)
    invoices.value = await listInvoices()
    closeLink()
  } catch (err) {
    linkError.value = err.message
  } finally {
    busy.value = false
  }
}

const rebuildProps = ref(null)
const rebuildError = ref('')
/** A rebuilt PDF a phone has yet to be given: { blob, fileName, title }. */
const ready = ref(null)
const canShare = canSharePdf()
// One row at a time, and the row says what it is doing rather than the page.
const busyId = ref('')
const busyLabel = ref('')

/**
 * What the Actions button offers for one invoice.
 *
 * Built per row rather than held in the template so the two shapes - settled
 * and outstanding - read as two lists rather than as four v-ifs.
 */
function actionsFor(inv) {
  const items = inv.settled
    ? [
        {
          label: 'View original invoice',
          icon: 'fa-file-invoice',
          onSelect: () => openPdf(inv, false),
        },
        { label: 'View paid invoice', icon: 'fa-receipt', onSelect: () => openPdf(inv, true) },
        {
          label: 'Mark as unpaid',
          icon: 'fa-rotate-left',
          onSelect: () => toggleSettled(inv, false),
        },
      ]
    : [
        { label: 'View invoice', icon: 'fa-file-invoice', onSelect: () => openPdf(inv, false) },
        {
          label: 'Mark as paid',
          icon: 'fa-circle-check',
          onSelect: () => toggleSettled(inv, true),
        },
      ]

  if (!inv.timetreeUid) {
    items.push({
      label: 'Link to calendar event',
      icon: 'fa-link',
      onSelect: () => openLink(inv),
    })
  }

  // Last, and set apart, because it is the one that cannot be undone.
  items.push({
    label: 'Delete invoice',
    icon: 'fa-trash',
    tone: 'danger',
    onSelect: () => askDelete(inv),
  })
  return items
}

/**
 * Draw the invoice from the saved record and show it.
 *
 * Always redrawn, never fetched: the stored copy in Firebase Storage is an
 * archive, it is the unpaid version only, and while the project's billing
 * account is closed every request for one comes back 402. The record holds
 * everything the invoice was made of, so the PDF can be made again at any
 * time - which is also what makes a paid version possible at all.
 */
async function openPdf(inv, paid) {
  if (busyId.value) return
  busyId.value = inv.id
  busyLabel.value = paid ? 'Building paid…' : 'Building…'
  rebuildError.value = ''
  ready.value = null
  // Opened on the click, before any await, or iOS Safari blocks it. Skipped
  // where the share sheet is the better way out - see the panel at the top.
  const viewer = canShare ? null : window.open('', '_blank')
  try {
    rebuildProps.value = { ...invoiceToPreviewProps(inv), paid }
    await nextTick()
    const paper = document.querySelector('.offscreen #paper')
    const blob = await buildInvoicePdfBlob(paper)
    const fileName = invoiceFileName(inv, { paid })
    if (viewer) showPdfBlob(viewer, blob, fileName)
    else
      ready.value = {
        blob,
        fileName,
        title: `${inv.invoiceNumber || inv.clientName || 'Invoice'} — ${
          paid ? 'paid copy' : 'original'
        }`,
      }
  } catch (err) {
    if (viewer && !viewer.closed) viewer.close()
    rebuildError.value = `Could not build that PDF: ${err.message}`
  } finally {
    rebuildProps.value = null
    busyId.value = ''
  }
}

/** Hand a rebuilt PDF to the share sheet, straight from the tap. */
async function savePdf() {
  if (!ready.value) return
  try {
    await deliverPdf(ready.value.blob, ready.value.fileName)
  } catch (err) {
    rebuildError.value = `Could not save that PDF: ${err.message}`
  }
}

/** Settle an invoice, or put it back to the 50% deposit. */
async function toggleSettled(inv, settled) {
  if (busyId.value) return
  busyId.value = inv.id
  busyLabel.value = settled ? 'Marking paid…' : 'Updating…'
  rebuildError.value = ''
  const when = inv.settledDate || todayISO()
  try {
    await setInvoiceSettled(inv.id, settled, when)
    // Patched in place rather than re-reading the whole collection: the list
    // is sorted and filtered, and a full reload would jump the row away from
    // under the finger that just tapped it.
    inv.settled = settled
    inv.settledDate = when
  } catch (err) {
    rebuildError.value = `Could not update that invoice: ${err.message}`
  } finally {
    busyId.value = ''
  }
}

/* ---------- deleting ---------- */

const deleting = ref(null)
const deleteBusy = ref(false)
const deleteError = ref('')

function askDelete(inv) {
  deleting.value = inv
  deleteError.value = ''
}

function cancelDelete() {
  deleting.value = null
  deleteError.value = ''
}

async function confirmDelete() {
  const inv = deleting.value
  if (!inv || deleteBusy.value) return
  deleteBusy.value = true
  deleteError.value = ''
  try {
    const what = await deleteInvoice(inv.id)
    invoices.value = invoices.value.filter((i) => i.id !== inv.id)
    deleting.value = null
    notice.value =
      what === 'cleared'
        ? `Invoice removed. The ${inv.clientName || 'booking'} appointment is still in the calendar.`
        : 'Invoice deleted.'
  } catch (err) {
    deleteError.value = `Could not delete that invoice: ${err.message}`
  } finally {
    deleteBusy.value = false
  }
}

const notice = ref('')

onMounted(async () => {
  try {
    invoices.value = await listInvoices()
  } catch (err) {
    error.value = `Could not load invoices: ${err.message}`
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = term
    ? invoices.value.filter((i) =>
        [i.invoiceNumber, i.clientName, i.phone, i.serviceSummary]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(term)),
      )
    : [...invoices.value]

  const by = {
    'date-desc': (a, b) => String(b.appointmentDate).localeCompare(String(a.appointmentDate)),
    'date-asc': (a, b) => String(a.appointmentDate).localeCompare(String(b.appointmentDate)),
    'total-desc': (a, b) => b.total - a.total,
    'name-asc': (a, b) => String(a.clientName ?? '').localeCompare(String(b.clientName ?? '')),
  }
  return list.sort(by[sortKey.value])
})

function formatDate(d) {
  if (!d) return '-'
  const parsed = new Date(d)
  return isNaN(parsed)
    ? d
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
/* Off to the side rather than hidden: html2canvas photographs a real box, so
   the page has to be laid out at its true 794px even though nobody sees it. */
.offscreen {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 834px;
  pointer-events: none;
}

.page {
  max-width: var(--page-w);
  margin: 0 auto;
  padding: clamp(20px, 3vw, 34px);
}

.page__head {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page__title {
  font-size: 24px;
  margin: 0 0 4px;
  font-weight: 700;
}

.page__sub {
  margin: 0;
  color: #7d786f;
  font-size: 13.5px;
}

.btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  padding: 9px 16px;
  border-radius: 8px;
  background: var(--btn-bg);
  color: var(--btn-fg);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn:hover {
  background: var(--btn-bg-hover);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.search {
  position: relative;
  flex: 1 1 280px;
  display: flex;
  align-items: center;
}

.search i {
  position: absolute;
  left: 12px;
  color: #a09a90;
  font-size: 13px;
}

.search input,
.sel {
  min-width: 210px;
}

.search input {
  padding-left: 34px;
}

.sel {
  width: auto;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  /* 940, not 860: Status is a seventh column. Below this the wrapper scrolls
     sideways rather than letting the names and services wrap to three lines. */
  min-width: 940px;
}

.tbl th {
  text-align: left;
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a857c;
  padding: 12px 14px;
  border-bottom: 1px solid #eeebe4;
  font-weight: 600;
  white-space: nowrap;
}

.tbl td {
  padding: 13px 14px;
  border-bottom: 1px solid #f2efe9;
  font-size: 13.5px;
  vertical-align: top;
}

.tbl tr:last-child td {
  border-bottom: 0;
}

.tbl tbody tr:hover {
  background: #fbfaf7;
}

.mono {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-weight: 600;
}

.name {
  display: block;
  font-weight: 500;
}

.sub {
  display: block;
  font-size: 11.5px;
  color: #a09a90;
  margin-top: 2px;
}

.services {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #5c574f;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.actions {
  white-space: nowrap;
}

/* Status pills. Deliberately quiet: the table is already a wall of text and
   two saturated badges per row would shout over the names and the money. The
   settled one is the one that reads at a glance, so it is the one with the
   fill. */
.pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.pill--paid {
  background: #e4ece4;
  border: 1px solid #c6d8c6;
  color: #36583c;
}

.pill--due {
  background: #f4f1e9;
  border: 1px solid #e3ded0;
  color: #7d786f;
}

/* ---------- a rebuilt PDF, waiting to be handed over ---------- */

.ready {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 16px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #ddd8c6;
  border-left: 4px solid #1d1d1d;
  border-radius: 12px;
}

.ready__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ready__text strong {
  font-size: 14.5px;
}

.ready__file {
  font-size: 12px;
  color: #6b665e;
  word-break: break-all;
}

.ready__btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 11px 18px;
  border: none;
  border-radius: 10px;
  background: var(--btn-bg);
  color: var(--btn-fg);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 480px) {
  .ready__btn {
    width: 100%;
  }
}

/* Replaces the Actions button while that row is working, so the row keeps its
   width and the table does not reflow under the finger that tapped it. */
.working {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  font-size: 12.5px;
  color: #8a857c;
  white-space: nowrap;
}

.banner {
  padding: 10px 13px;
  border-radius: 8px;
  font-size: 13.5px;
  margin: 0 0 16px;
}
.banner--bad {
  background: #fdf0ef;
  border: 1px solid #f0cfcb;
  color: #99312a;
}

.banner--ok {
  background: #eef3ee;
  border: 1px solid #cddccd;
  color: #36583c;
}

.sheet__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.sheet__btn {
  min-height: 42px;
  padding: 10px 18px;
  border: 1px solid var(--field-border);
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.sheet__btn:hover:not(:disabled) {
  background: #f5f3ee;
}

/* Filled, not outlined. This is the button that does the irreversible thing,
   and it should not look like the one beside it that does nothing. */
.sheet__btn--danger {
  border-color: #a3382f;
  background: #a3382f;
  color: #fff;
}

.sheet__btn--danger:hover:not(:disabled) {
  background: #8d2f27;
}

.sheet__btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.empty {
  padding: 60px 20px;
  text-align: center;
  color: #8a857c;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
}

/* ---------- link dialog ---------- */
.sheet {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(29, 29, 29, 0.45);
}

.sheet__card {
  position: relative;
  width: 100%;
  max-width: 430px;
  background: #fff;
  border: 1px solid #e6e3dc;
  border-radius: 14px;
  padding: 30px 28px 28px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
}

.sheet__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: none;
  color: #6b665e;
  font-size: 16px;
  cursor: pointer;
}

.sheet__close:hover {
  background: #f2eee8;
  color: #1d1d1d;
}

.sheet__eyebrow {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #a09a90;
}

.sheet__name {
  margin: 0 0 12px;
  font-family: 'Roxborough CF', Georgia, serif;
  font-size: 25px;
  font-weight: 400;
  padding-right: 34px;
}

.sheet__note {
  margin: 0 0 18px;
  font-size: 12.5px;
  color: #8a857c;
  line-height: 1.55;
}

.cand {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cand__btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.cand__btn:hover:not(:disabled) {
  background: var(--btn-bg);
  border-color: var(--btn-border);
}

.cand__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cand__time {
  color: #a09a90;
  font-size: 12px;
}
</style>
