<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <h1 class="calendar-title">Appointment Calendar</h1>
      <div class="calendar-controls">
        <div class="month-navigation">
          <button class="calendar-btn nav-btn" @click="prevMonth">←</button>
          <div class="current-month">{{ currentMonthDisplay }}</div>
          <button class="calendar-btn nav-btn" @click="nextMonth">→</button>
        </div>
        <div class="action-buttons">
          <button class="calendar-btn primary" @click="goToToday">Today</button>
          <button class="calendar-btn success" @click="showAddEventModal">+ Add Event</button>
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
        {{ showListView ? '📅 Calendar View' : '📋 List View' }}
      </button>
    </div>

    <!-- Calendar Grid View -->
    <div v-if="!showListView || !isMobile">
      <CalendarGrid
        :current-date="currentDate"
        :appointments="appointments"
        @appointment-click="handleAppointmentClick"
        @appointment-delete="showDeleteConfirmation"
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
          <button
            class="delete-btn"
            @click.stop="showDeleteConfirmation(appointment)"
            title="Delete event"
          >
            ×
          </button>
        </div>
        <div v-if="currentMonthAppointments.length === 0" class="no-appointments">
          No appointments for {{ currentMonthDisplay }}
        </div>
      </div>
    </div>

    <!-- Add Event Modal -->
    <AppointmentModal :show="showModal" @close="closeModal" @save="addNewEvent" />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" id="deleteModal" class="modal">
      <div class="modal-content delete-confirm-modal">
        <h3>Delete Event</h3>
        <p>Are you sure you want to delete this event? This action cannot be undone.</p>
        <div class="modal-buttons">
          <button @click="confirmDelete" class="btn-danger">Delete</button>
          <button @click="cancelDelete" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CalendarGrid from '../components/CalendarGrid.vue'
import AppointmentModal from '../components/AppointmentModal.vue'
import {
  db,
  storage,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  ref,
  deleteObject,
} from '../stores/firebase.js'

export default {
  name: 'CalendarView',
  components: {
    CalendarGrid,
    AppointmentModal,
  },
  data() {
    return {
      currentDate: new Date(),
      appointments: [],
      showModal: false,
      showDeleteModal: false,
      appointmentToDelete: null,
      showListView: false,
      isMobile: false,
    }
  },
  computed: {
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
    await this.loadAppointmentsFromFirebase()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
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
      if (!appointment.hasInvoice) return 'No Invoice'
      const services = appointment.services || []
      if (services.some((s) => s.description.toLowerCase().includes('trial'))) {
        return 'Trial'
      }
      return 'Makeup'
    },
    getAppointmentType(appointment) {
      if (!appointment.hasInvoice) {
        return 'no-invoice'
      }
      const services = appointment.services || []
      if (services.some((s) => s.description.toLowerCase().includes('trial'))) {
        return 'trial'
      }
      return 'makeup'
    },
    async loadAppointmentsFromFirebase() {
      try {
        const q = query(collection(db, 'appointments'), orderBy('appointmentDate'))
        const snapshot = await getDocs(q)

        this.appointments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        console.log('Loaded appointments:', this.appointments)
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
    showAddEventModal() {
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
    },
    async addNewEvent(eventData) {
      try {
        const appointmentData = {
          clientName: eventData.clientName,
          appointmentDate: eventData.date,
          appointmentTime: eventData.time,
          services: eventData.service
            ? [{ description: eventData.service, quantity: 1, total: '' }]
            : [],
          hasInvoice: false,
          createdAt: new Date(),
        }

        await addDoc(collection(db, 'appointments'), appointmentData)

        await this.loadAppointmentsFromFirebase()
        this.closeModal()

        return true
      } catch (error) {
        console.error('Error adding event:', error)
        return false
      }
    },
    handleAppointmentClick(appointment) {
      if (appointment.hasInvoice && appointment.pdfUrl) {
        window.open(appointment.pdfUrl, '_blank')
      } else {
        alert(
          `Event: ${appointment.clientName}\nDate: ${appointment.appointmentDate}\nTime: ${
            appointment.appointmentTime
          }\nService: ${
            appointment.services?.[0]?.description || 'No service specified'
          }\n\nNo invoice attached to this event.`,
        )
      }
    },
    showDeleteConfirmation(appointment) {
      this.appointmentToDelete = appointment
      this.showDeleteModal = true
    },
    async confirmDelete() {
      if (this.appointmentToDelete) {
        const success = await this.deleteAppointment(
          this.appointmentToDelete.id,
          this.appointmentToDelete.hasInvoice,
        )
        this.showDeleteModal = false

        if (success) {
          alert('Event deleted successfully!')
        } else {
          alert('Error deleting event. Please try again.')
        }

        this.appointmentToDelete = null
      }
    },
    cancelDelete() {
      this.showDeleteModal = false
      this.appointmentToDelete = null
    },
    async deleteAppointment(appointmentId, hasInvoice) {
      try {
        await deleteDoc(doc(db, 'appointments', appointmentId))

        if (hasInvoice) {
          const storageRef = ref(storage, `invoices/${appointmentId}.pdf`)
          await deleteObject(storageRef).catch((error) => {
            console.log('PDF not found or already deleted:', error)
          })
        }

        await this.loadAppointmentsFromFirebase()

        return true
      } catch (error) {
        console.error('Error deleting appointment:', error)
        return false
      }
    },
  },
}
</script>

<style scoped>
.calendar-container {
  max-width: 1250px;
  margin: 24px auto;
  padding: 0 16px;
}

.calendar-header {
  margin-bottom: 24px;
}

.calendar-title {
  font-size: 28px;
  font-weight: 700;
  color: #111;
  margin-bottom: 16px;
}

.calendar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
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

.calendar-btn:hover {
  background: #f5f5f5;
}

.calendar-btn.primary {
  background: #111;
  color: white;
  border-color: #111;
}

.calendar-btn.primary:hover {
  background: #333;
}

.calendar-btn.success {
  background: #10b981;
  color: white;
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
  background: #111;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-btn.active {
  background: #333;
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

.delete-btn {
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 12px;
}

.no-appointments {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}

/* Appointment type colors for list view */
.appointment-item.makeup {
  border-left: 4px solid #d4b8a8;
}

.appointment-item.trial {
  border-left: 4px solid #a8a8a8;
}

.appointment-item.no-invoice {
  border-left: 4px solid #e8b4a9;
}

/* Modal Styles */
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

.delete-confirm-modal {
  text-align: center;
}

.delete-confirm-modal .modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.delete-confirm-modal .btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.delete-confirm-modal .btn-secondary {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
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
</style>
