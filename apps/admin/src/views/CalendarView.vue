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
      <span class="legend__key"><span class="legend__dot legend__dot--invoiced"></span>Invoiced</span>
      <span class="legend__key"><span class="legend__dot legend__dot--pending"></span>Not invoiced</span>
    </div>

    <!-- Calendar Grid View -->
    <div v-if="!showListView || !isMobile">
      <CalendarGrid
        :current-date="currentDate"
        :appointments="appointments"
        @appointment-click="handleAppointmentClick"
      />
    </div>

    <!-- Mobile List View -->
    <div v-if="showListView && isMobile" class="mobile-list-view">
      <div class="list-header">
        <h3>Appointments for {{ currentMonthDisplay }}</h3>
      </div>
      <div class="appointments-list">
        <div
          v-for="appointment in currentMonthAppointments"
          :key="appointment.id"
          class="appointment-item"
          :class="getAppointmentType(appointment)"
          @click="handleAppointmentClick(appointment)"
        >
          <div class="appointment-main">
            <div class="appointment-date">
              <strong>{{ formatAppointmentDate(appointment.appointmentDate) }}</strong>
              <span class="appointment-time">{{ appointment.appointmentTime }}</span>
            </div>
            <div class="appointment-details">
              <div class="client-name">{{ appointment.clientName }}</div>
              <div class="service-type">{{ getServiceType(appointment) }}</div>
            </div>
          </div>
        </div>
        <div v-if="currentMonthAppointments.length === 0" class="no-appointments">
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
            <dd>{{ selected.appointmentTime }}</dd>
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
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    onKey(e) {
      if (e.key === 'Escape') this.selected = null
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
  max-width: 1250px;
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
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
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

.appointment-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.appointment-item:hover {
  background: #faf8f5;
}

.appointment-item:last-child {
  border-bottom: none;
}

.appointment-main {
  flex: 1;
}

.appointment-date {
  margin-bottom: 8px;
}

.appointment-date strong {
  display: block;
  color: #5a4b3a;
  font-size: 16px;
}

.appointment-time {
  color: #666;
  font-size: 14px;
}

.appointment-details {
  color: #5a4b3a;
}

.client-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.service-type {
  font-size: 14px;
  color: #666;
}


.no-appointments {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}

/* Invoiced or not is the only distinction that matters here. */
.appointment-item.invoiced {
  border-left: 4px solid #1d1d1d;
}

.appointment-item.pending {
  border-left: 4px solid #a09a90;
}

.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background-color: #fefefe;
  margin: 2% auto;
  padding: 20px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover {
  color: #000;
}





/* Enhanced Responsive Design */
@media (max-width: 1024px) {
  .calendar-day {
    min-height: 80px; /* Reduced from 90px */
    padding: 4px; /* Reduced from 6px */
  }

  .weekday {
    padding: 8px 2px; /* Reduced padding */
    font-size: 12px; /* Smaller font */
  }

  .appointment {
    font-size: 9px; /* Smaller font */
    padding: 2px 3px;
  }

  .day-number {
    font-size: 12px;
    margin-bottom: 2px;
  }
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 60px; /* Reduced from 70px */
    padding: 2px 1px; /* Reduced padding */
  }

  .weekday {
    padding: 6px 1px; /* Reduced padding */
    font-size: 11px; /* Smaller font */
    word-break: break-word; /* Allow word breaking */
    line-height: 1.2;
  }

  .day-number {
    font-size: 11px;
    margin-bottom: 1px;
  }

  .appointment {
    font-size: 8px;
    padding: 1px 2px;
    border-left-width: 2px;
    line-height: 1.1;
  }

  .appointments {
    gap: 1px; /* Reduced gap */
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 50px; /* Reduced from 60px */
  }

  .weekday {
    padding: 4px 1px;
    font-size: 10px; /* Even smaller font */
  }

  .day-number {
    font-size: 10px;
  }

  .appointment {
    font-size: 7px;
    padding: 1px;
  }

  /* Reduce font size for weekday abbreviations */
  .calendar-weekdays .weekday {
    font-size: 9px;
  }
}

/* Very small screens - horizontal scroll solution */
@media (max-width: 360px) {
  .calendar {
    overflow-x: auto; /* Allow horizontal scrolling */
  }

  .calendar-weekdays,
  .calendar-days {
    min-width: 500px; /* Minimum width to prevent excessive cramping */
  }

  .calendar-day {
    min-height: 45px;
  }

  .appointment {
    font-size: 6px;
    padding: 0;
  }

  .appointment-delete {
    width: 10px;
    height: 10px;
    font-size: 7px;
  }
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

.sheet__go {
  margin-top: 22px;
  width: 100%;
  justify-content: center;
  text-decoration: none;
}
</style>
