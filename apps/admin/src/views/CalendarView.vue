<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <div class="calendar-heading">
        <h1 class="calendar-title">Appointment Calendar</h1>
        <div class="sync">
          <button class="calendar-btn" :disabled="syncing" @click="runSync">
            <i class="fas fa-rotate" :class="{ 'fa-spin': syncing }"></i>
            {{ syncing ? 'Syncing…' : 'Sync now' }}
          </button>
          <p class="sync__when">
            <template v-if="syncMessage">{{ syncMessage }}</template>
            <template v-else>Last synced: {{ lastSynced }}</template>
          </p>
        </div>
      </div>
      <div class="calendar-controls">
        <div class="month-navigation">
          <button class="calendar-btn nav-btn" @click="prevMonth">
            <i class="fas fa-chevron-left"></i>
          </button>
          <div class="current-month">{{ currentMonthDisplay }}</div>
          <button class="calendar-btn nav-btn" @click="nextMonth">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div class="action-buttons">
          <button class="calendar-btn primary" @click="goToToday">
            <i class="fas fa-calendar-day"></i> Today
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile View Toggle -->
    <div class="view-toggle" v-if="isMobile">
      <button
        class="toggle-btn"
        :class="{ active: showListView }"
        @click="showListView = !showListView"
      >
        <i class="fas" :class="showListView ? 'fa-calendar' : 'fa-list'"></i>
        {{ showListView ? ' Calendar View' : ' List View' }}
      </button>
    </div>

    <div class="legend" v-if="!showListView || !isMobile">
      <span class="legend__key"
        ><span class="legend__dot legend__dot--invoiced"></span>Invoiced</span
      >
      <span class="legend__key"
        ><span class="legend__dot legend__dot--pending"></span>Not invoiced</span
      >
    </div>

    <!-- Calendar Grid View -->
    <div v-if="!showListView || !isMobile">
      <CalendarGrid
        :current-date="currentDate"
        :appointments="appointments"
        :max-per-day="isMobile ? 4 : 0"
        @appointment-click="handleAppointmentClick"
      />
    </div>

    <!-- Mobile List View -->
    <div v-if="showListView && isMobile" class="mobile-list-view">
      <div class="list-header">
        <h3>Appointments for {{ currentMonthDisplay }}</h3>
      </div>
      <div class="appointments-list">
        <section v-for="group in appointmentsByDay" :key="group.date" class="day-group">
          <header class="day-group__head">
            <span class="day-group__weekday">{{ group.weekday }}</span>
            <span class="day-group__day">{{ group.dayNumber }}</span>
            <span class="day-group__month">{{ group.month }}</span>
            <span class="day-group__count">
              {{ group.items.length }} booking{{ group.items.length === 1 ? '' : 's' }}
            </span>
          </header>
          <div
            v-for="appointment in group.items"
            :key="appointment.id"
            class="appointment-item"
            :class="getAppointmentType(appointment)"
            @click="handleAppointmentClick(appointment)"
          >
            <div class="appointment-time">{{ timeRange(appointment) || 'All day' }}</div>
            <div class="appointment-details">
              <div class="client-name">{{ appointment.clientName || 'Unnamed' }}</div>
              <div class="service-type">{{ getServiceType(appointment) }}</div>
            </div>
          </div>
        </section>
        <div v-if="appointmentsByDay.length === 0" class="no-appointments">
          No appointments for {{ currentMonthDisplay }}
        </div>
      </div>
    </div>

    <!-- Event detail -->
    <div v-if="selected" class="sheet" @click.self="selected = null">
      <div class="sheet__card" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <button class="sheet__close" aria-label="Close" @click="selected = null">
          <i class="fas fa-xmark"></i>
        </button>

        <p class="sheet__eyebrow">{{ selected.hasInvoice ? 'Invoiced' : 'Not invoiced' }}</p>
        <h2 id="sheet-title" class="sheet__name">{{ selected.clientName || 'Unnamed' }}</h2>

        <dl class="sheet__rows">
          <div class="sheet__row">
            <dt>Date</dt>
            <dd>{{ formatAppointmentDate(selected.appointmentDate) }}</dd>
          </div>
          <div class="sheet__row" v-if="selected.appointmentTime">
            <dt>Time</dt>
            <dd>{{ timeRange(selected) }}</dd>
          </div>
          <div class="sheet__row" v-if="selected.address">
            <dt>Location</dt>
            <dd>{{ selected.address }}</dd>
          </div>
          <div class="sheet__row" v-if="selectedServices">
            <dt>Services</dt>
            <dd>{{ selectedServices }}</dd>
          </div>
          <div class="sheet__row" v-if="selected.invoiceNumber">
            <dt>Invoice</dt>
            <dd class="mono">{{ selected.invoiceNumber }}</dd>
          </div>
          <div class="sheet__row" v-if="selected.phone">
            <dt>Phone</dt>
            <dd>{{ selected.phone }}</dd>
          </div>
        </dl>

        <div v-if="selected.note" class="sheet__note">
          <p class="sheet__label">Note</p>
          <p class="sheet__text">{{ selected.note }}</p>
        </div>

        <div v-if="selected.messages && selected.messages.length" class="sheet__messages">
          <p class="sheet__label">Messages</p>
          <article v-for="m in selected.messages" :key="m.id" class="msg">
            <header class="msg__head" v-if="m.author || m.at">
              <span class="msg__author">{{ m.author }}</span>
              <span class="msg__at" v-if="m.at">{{ formatMessageAt(m.at) }}</span>
            </header>
            <p class="msg__text">{{ m.text }}</p>
          </article>
        </div>

        <a
          v-if="selected.pdfUrl"
          :href="selected.pdfUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="calendar-btn primary sheet__go"
        >
          View invoice
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import CalendarGrid from '../components/CalendarGrid.vue'
import { db, collection, getDocs, orderBy, query } from '../stores/firebase.js'
import { loadSyncStatus, requestSync, formatSyncedAt } from '../stores/sync.js'

export default {
  name: 'CalendarView',
  components: {
    CalendarGrid,
  },
  data() {
    return {
      currentDate: new Date(),
      appointments: [],
      selected: null,
      showListView: false,
      isMobile: false,
      syncedAt: null,
      syncing: false,
      syncMessage: '',
    }
  },
  computed: {
    selectedServices() {
      return (this.selected?.services || [])
        .map((s) => s.description)
        .filter(Boolean)
        .join(', ')
    },
    lastSynced() {
      return formatSyncedAt(this.syncedAt)
    },
    currentMonthDisplay() {
      return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },
    /**
     * The phone list reads as a day-by-day agenda, so bookings that share a
     * date sit under one heading instead of floating as unrelated cards.
     */
    appointmentsByDay() {
      const groups = []
      const byDate = new Map()
      for (const a of this.currentMonthAppointments) {
        let group = byDate.get(a.appointmentDate)
        if (!group) {
          const d = new Date(`${a.appointmentDate}T00:00:00`)
          group = {
            date: a.appointmentDate,
            weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNumber: d.getDate(),
            month: d.toLocaleDateString('en-US', { month: 'short' }),
            items: [],
          }
          byDate.set(a.appointmentDate, group)
          groups.push(group)
        }
        group.items.push(a)
      }
      return groups
    },
    currentMonthAppointments() {
      const currentMonth = this.currentDate.getMonth()
      const currentYear = this.currentDate.getFullYear()

      return this.appointments
        .filter((appointment) => {
          const appointmentDate = new Date(appointment.appointmentDate)
          return (
            appointmentDate.getMonth() === currentMonth &&
            appointmentDate.getFullYear() === currentYear
          )
        })
        .sort((a, b) => {
          // Sort by date then time
          const dateCompare = new Date(a.appointmentDate) - new Date(b.appointmentDate)
          if (dateCompare !== 0) return dateCompare
          return a.appointmentTime.localeCompare(b.appointmentTime)
        })
    },
  },
  async mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    window.addEventListener('keydown', this.onKey)
    await this.loadAppointmentsFromFirebase()
    await this.refreshSyncStatus()
    await this.autoSyncIfStale()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.selected = null
    },
    /**
     * GitHub drops most of our 5-minute schedule under load, so opening the
     * calendar nudges a sync when the data is stale. Quietly does nothing when
     * the manual trigger is not configured.
     */
    async autoSyncIfStale() {
      const STALE_MS = 10 * 60 * 1000
      const COOLDOWN_MS = 5 * 60 * 1000
      const last = this.syncedAt ? new Date(this.syncedAt).getTime() : 0
      if (Date.now() - last < STALE_MS) return

      // A dispatched run takes ~30s to land, during which syncedAt is still
      // old. Without this, every revisit fires another run.
      let attempted = 0
      try {
        attempted = Number(localStorage.getItem('lastAutoSyncAt')) || 0
      } catch {
        attempted = 0
      }
      if (Date.now() - attempted < COOLDOWN_MS) return
      try {
        localStorage.setItem('lastAutoSyncAt', String(Date.now()))
      } catch {
        /* private mode: fall through, the staleness check still applies */
      }

      const res = await requestSync().catch(() => ({ ok: false }))
      if (res.ok) {
        this.syncMessage = 'Syncing in the background…'
        setTimeout(async () => {
          await this.loadAppointmentsFromFirebase()
          await this.refreshSyncStatus()
          this.syncMessage = ''
        }, 60000)
      }
    },

    async refreshSyncStatus() {
      try {
        this.syncedAt = (await loadSyncStatus())?.lastSyncAt ?? null
      } catch {
        this.syncedAt = null
      }
    },

    /**
     * The sync runs in GitHub Actions, so this only asks it to start. New
     * events land in Firestore a minute or so later, hence the delayed reload.
     */
    async runSync() {
      this.syncing = true
      this.syncMessage = ''
      try {
        const res = await requestSync()
        if (res.ok) {
          this.syncMessage = 'Sync requested. Events appear in a minute or so.'
          setTimeout(async () => {
            await this.loadAppointmentsFromFirebase()
            await this.refreshSyncStatus()
          }, 60000)
        } else if (res.reason === 'not_configured') {
          this.syncMessage = 'Manual sync is not set up yet. The 5-minute schedule still runs.'
        } else {
          this.syncMessage = 'Could not start a sync. Try again shortly.'
        }
      } finally {
        this.syncing = false
        setTimeout(() => (this.syncMessage = ''), 8000)
      }
    },

    checkMobile() {
      this.isMobile = window.innerWidth < 768
    },
    /** "6:00 - 8:00" when TimeTree gave us an end, otherwise just the start. */
    timeRange(a) {
      if (!a?.appointmentTime) return ''
      return a.appointmentEndTime && a.appointmentEndTime !== a.appointmentTime
        ? `${a.appointmentTime} - ${a.appointmentEndTime}`
        : a.appointmentTime
    },
    formatMessageAt(iso) {
      const d = new Date(iso)
      if (isNaN(d)) return ''
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      })
    },
    formatAppointmentDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    },
    getServiceType(appointment) {
      return appointment.hasInvoice ? 'Invoiced' : 'Not invoiced'
    },
    getAppointmentType(appointment) {
      return appointment.hasInvoice ? 'invoiced' : 'pending'
    },
    async loadAppointmentsFromFirebase() {
      try {
        const q = query(collection(db, 'appointments'), orderBy('appointmentDate'))
        const snapshot = await getDocs(q)

        this.appointments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      } catch (error) {
        console.error('Error loading appointments:', error)
        this.appointments = []
      }
    },
    prevMonth() {
      const newDate = new Date(this.currentDate)
      newDate.setMonth(newDate.getMonth() - 1)
      this.currentDate = newDate
    },
    nextMonth() {
      const newDate = new Date(this.currentDate)
      newDate.setMonth(newDate.getMonth() + 1)
      this.currentDate = newDate
    },
    goToToday() {
      this.currentDate = new Date()
      this.showListView = false
    },
    handleAppointmentClick(appointment) {
      this.selected = appointment
    },
  },
}
</script>

<style scoped>
.calendar-container {
  max-width: var(--page-w);
  margin: 24px auto;
  padding: 0 16px;
  width: 100%;
  box-sizing: border-box;
}

.calendar-header {
  margin-bottom: 24px;
  width: 100%;
}

.calendar-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  margin-bottom: 18px;
}

.legend {
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  margin-bottom: 10px;
  font-size: 11.5px;
  color: #6b665e;
}

.legend__key {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend__dot {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.legend__dot--invoiced {
  background: #1d1d1d;
}

.legend__dot--pending {
  background: #f2eee8;
  border: 1px solid #a09a90;
}

.calendar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: 100%;
}

/* Mobile responsive for calendar header */
@media (max-width: 768px) {
  .calendar-container {
    margin: 16px auto;
    padding: 0 12px;
  }

  .calendar-header {
    margin-bottom: 16px;
  }

  .calendar-controls {
    flex-direction: column;
    gap: 12px;
  }

  .month-navigation {
    justify-content: center;
    width: 100%;
  }

  .action-buttons {
    justify-content: center;
    width: 100%;
  }

  .calendar-btn {
    flex: 1;
    text-align: center;
    min-width: 0; /* Allow buttons to shrink */
  }

  .current-month {
    min-width: 140px;
    font-size: 16px;
  }
}

/* Very small screens */
@media (max-width: 480px) {
  .calendar-container {
    margin: 12px auto;
    padding: 0 8px;
  }

  .calendar-title {
    font-size: 20px;
    text-align: center;
  }

  .calendar-btn {
    font-size: 14px;
    padding: 6px 8px;
  }

  .calendar-btn i {
    margin-right: 4px;
  }
}

.month-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.calendar-btn {
  background: #fff;
  border: 1px solid var(--btn-border);
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  /* Explicit, because iOS paints button text in the system blue otherwise. */
  color: var(--btn-fg);
  -webkit-appearance: none;
  appearance: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.calendar-btn:hover:not(:disabled) {
  background: var(--btn-bg);
  border-color: var(--btn-border);
}

.calendar-btn.primary {
  background: var(--btn-bg);
  color: var(--btn-fg);
  border-color: var(--btn-border);
}

.calendar-btn.primary:hover {
  background: var(--btn-bg-hover);
}

.calendar-btn.success {
  background: var(--btn-bg);
  color: var(--btn-fg);
  border-color: #10b981;
}

.nav-btn {
  padding: 8px 12px;
  font-weight: bold;
}

.current-month {
  font-size: 18px;
  font-weight: 600;
  min-width: 160px;
  text-align: center;
}

.view-toggle {
  margin-bottom: 16px;
}

.toggle-btn {
  width: 100%;
  padding: 12px 16px;
  background: var(--btn-bg);
  color: var(--btn-fg);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-btn.active {
  background: var(--btn-bg-hover);
}

/* Mobile List View */
.mobile-list-view {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.list-header {
  padding: 16px;
  background: #f8f4f0;
  border-bottom: 1px solid #e8e0d8;
}

.list-header h3 {
  margin: 0;
  color: #5a4b3a;
  font-size: 18px;
}

.appointments-list {
  max-height: 60vh;
  overflow-y: auto;
}

/* One heading per day, its bookings tucked underneath, so same-day work reads
   as one block instead of a run of unrelated cards. */
.day-group + .day-group {
  border-top: 1px solid #eeebe4;
}

.day-group__head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 16px;
  background: #f8f4f0;
  border-bottom: 1px solid #eeebe4;
}

.day-group__weekday {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a09a90;
}

.day-group__day {
  font-size: 17px;
  font-weight: 700;
  color: #1d1d1d;
  font-variant-numeric: tabular-nums;
}

.day-group__month {
  font-size: 13px;
  color: #6b665e;
}

.day-group__count {
  margin-left: auto;
  font-size: 11.5px;
  color: #a09a90;
}

.appointment-item {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 13px 16px;
  border-bottom: 1px solid #f4f1ec;
  cursor: pointer;
  transition: background-color 0.2s;
}

.appointment-item:hover {
  background: #faf8f5;
}

.day-group .appointment-item:last-child {
  border-bottom: none;
}

.appointment-time {
  flex: 0 0 auto;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #6b665e;
  min-width: 84px;
}

.appointment-details {
  flex: 1;
  min-width: 0;
}

.client-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
}

.service-type {
  font-size: 12.5px;
  color: #8a857c;
}

.no-appointments {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}

/* Invoiced or not is the only distinction that matters here. */
.appointment-item.invoiced {
  box-shadow: inset 3px 0 0 #1d1d1d;
}

.appointment-item.pending {
  box-shadow: inset 3px 0 0 #ddd8c6;
}

.sync {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.sync__when {
  margin: 0;
  font-size: 11.5px;
  color: #8a857c;
}

/* ---------- event detail card ---------- */
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
  max-width: 420px;
  background: #fff;
  border: 1px solid #e6e3dc;
  border-radius: 14px;
  padding: 30px 28px 28px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
  /* Message threads can be long, so the card scrolls rather than overflowing. */
  max-height: calc(100vh - 40px);
  overflow-y: auto;
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
  margin: 0 0 20px;
  font-family: 'Roxborough CF', Georgia, serif;
  font-size: 25px;
  font-weight: 400;
  padding-right: 34px;
}

.sheet__rows {
  margin: 0;
  border-top: 1px solid #eeebe4;
}

.sheet__row {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid #eeebe4;
}

.sheet__row dt {
  font-size: 12px;
  color: #a09a90;
  flex: 0 0 auto;
}

.sheet__row dd {
  margin: 0;
  font-size: 13.5px;
  text-align: right;
  color: #1d1d1d;
}

.sheet__row .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
}

.sheet__label {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #a09a90;
}

.sheet__note,
.sheet__messages {
  margin-top: 20px;
}

.sheet__text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.msg {
  background: #f8f6f1;
  border-radius: 10px;
  padding: 11px 13px;
}

.msg + .msg {
  margin-top: 8px;
}

.msg__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.msg__author {
  font-size: 12px;
  font-weight: 600;
  color: #6b665e;
}

.msg__at {
  font-size: 11px;
  color: #a09a90;
}

.msg__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  /* TimeTree messages are typed as multi-line forms; keep the line breaks. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.sheet__go {
  margin-top: 22px;
  width: 100%;
  justify-content: center;
  text-decoration: none;
}
</style>
