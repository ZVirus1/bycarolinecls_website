<template>
  <div class="page">
    <header class="page__head">
      <div>
        <h1 class="page__title"><i class="fas fa-folder-open"></i> Invoices</h1>
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

      <select v-model="sortKey" aria-label="Sort by" class="sel">
        <option value="date-desc">Newest booking first</option>
        <option value="date-asc">Oldest booking first</option>
        <option value="total-desc">Highest value</option>
        <option value="name-asc">Name A–Z</option>
      </select>
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
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in filtered" :key="inv.id">
            <td class="mono">{{ inv.invoiceNumber || '—' }}</td>
            <td>
              <span class="name">{{ inv.clientName || '—' }}</span>
              <span v-if="inv.phone" class="sub">{{ inv.phone }}</span>
            </td>
            <td>
              {{ formatDate(inv.appointmentDate) }}
              <span v-if="inv.appointmentTime" class="sub">{{ inv.appointmentTime }}</span>
            </td>
            <td class="services" :title="inv.serviceSummary">{{ inv.serviceSummary || '—' }}</td>
            <td class="num">{{ rupiah(inv.total) }}</td>
            <td class="actions">
              <a
                v-if="inv.pdfUrl"
                :href="inv.pdfUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="link-btn"
                >View</a
              >
              <a
                v-if="inv.pdfUrl"
                :href="inv.pdfUrl"
                :download="fileName(inv)"
                class="link-btn"
                >Download</a
              >
              <span v-if="!inv.pdfUrl" class="sub">No PDF</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { listInvoices } from '../stores/invoices.js'
import { rupiah } from '@bycarolinecls/shared/format'

const invoices = ref([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const sortKey = ref('date-desc')

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
  if (!d) return '—'
  const parsed = new Date(d)
  return isNaN(parsed)
    ? d
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fileName(inv) {
  const who = (inv.clientName || 'Client').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  return `Bycarolinecls-${inv.invoiceNumber || 'Invoice'}-${who}.pdf`
}
</script>

<style scoped>
.page {
  max-width: 1180px;
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
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  padding: 9px 16px;
  border-radius: 8px;
  background: #1d1d1d;
  color: #fff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
  font: inherit;
  font-size: 13.5px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0dcd4;
  border-radius: 8px;
  background: #fff;
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
  min-width: 860px;
}

.tbl th {
  text-align: left;
  font-size: 10.5px;
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

.link-btn {
  font-size: 12.5px;
  color: #1d1d1d;
  text-decoration: none;
  border: 1px solid #e0dcd4;
  border-radius: 6px;
  padding: 5px 10px;
  margin-right: 6px;
  display: inline-block;
}

.link-btn:hover {
  background: #f5f3ee;
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

.empty {
  padding: 60px 20px;
  text-align: center;
  color: #8a857c;
  border: 1px solid #e6e3dc;
  border-radius: 10px;
  background: #fff;
}
</style>
