<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <h1 class="calendar-title">Appointment Calendar</h1>
      <div class="calendar-controls">
        <button class="calendar-btn" @click="prevMonth">← Previous</button>
        <div class="current-month">{{ currentMonthDisplay }}</div>
        <button class="calendar-btn" @click="nextMonth">Next →</button>
        <button class="calendar-btn primary" @click="goToToday">Today</button>
        <button class="calendar-btn success" @click="showAddEventModal">+ Add Event</button>
      </div>
    </div>

    <CalendarGrid
      :current-date="currentDate"
      :appointments="appointments"
      @appointment-click="handleAppointmentClick"
      @appointment-delete="showDeleteConfirmation"
    />

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
    }
  },
  computed: {
    currentMonthDisplay() {
      return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },
  },
  async mounted() {
    await this.loadAppointmentsFromFirebase()
  },
  methods: {
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
      // Create a new Date object to trigger reactivity
      const newDate = new Date(this.currentDate)
      newDate.setMonth(newDate.getMonth() - 1)
      this.currentDate = newDate
    },
    nextMonth() {
      // Create a new Date object to trigger reactivity
      const newDate = new Date(this.currentDate)
      newDate.setMonth(newDate.getMonth() + 1)
      this.currentDate = newDate
    },
    goToToday() {
      this.currentDate = new Date()
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

        // Reload appointments and refresh calendar
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
        // Open PDF in new window
        window.open(appointment.pdfUrl, '_blank')
      } else {
        // Show basic event details for appointments without invoices
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
        // Delete from Firestore
        await deleteDoc(doc(db, 'appointments', appointmentId))

        // Delete PDF from Storage if it exists
        if (hasInvoice) {
          const storageRef = ref(storage, `invoices/${appointmentId}.pdf`)
          await deleteObject(storageRef).catch((error) => {
            console.log('PDF not found or already deleted:', error)
          })
        }

        // Reload appointments and refresh calendar
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.calendar-title {
  font-size: 28px;
  font-weight: 700;
  color: #111;
}

.calendar-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.calendar-btn {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
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

.current-month {
  font-size: 18px;
  font-weight: 600;
  min-width: 200px;
  text-align: center;
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

/* Responsive */
@media (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .calendar-controls {
    justify-content: center;
  }
}
</style>
