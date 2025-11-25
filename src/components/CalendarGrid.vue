<template>
  <div class="calendar">
    <div class="calendar-weekdays">
      <div class="weekday">Sunday</div>
      <div class="weekday">Monday</div>
      <div class="weekday">Tuesday</div>
      <div class="weekday">Wednesday</div>
      <div class="weekday">Thursday</div>
      <div class="weekday">Friday</div>
      <div class="weekday">Saturday</div>
    </div>
    <div class="calendar-days">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="calendar-day"
        :class="{
          'other-month': day.isOtherMonth,
          today: day.isToday,
        }"
      >
        <div class="day-number">{{ day.date.getDate() }}</div>
        <div class="appointments">
          <div
            v-for="appointment in getAppointmentsForDate(day.date)"
            :key="appointment.id"
            class="appointment"
            :class="getAppointmentType(appointment)"
            @click="$emit('appointment-click', appointment)"
          >
            {{ getAppointmentDisplayText(appointment) }}
            <button
              class="appointment-delete"
              @click.stop="$emit('appointment-delete', appointment)"
              title="Delete event"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CalendarGrid',
  props: {
    currentDate: Date,
    appointments: Array,
  },
  computed: {
    calendarDays() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()

      // Get first day of month and total days
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const totalDays = lastDay.getDate()
      const startingDay = firstDay.getDay()

      const days = []

      // Add empty cells for days before the first day of month
      for (let i = 0; i < startingDay; i++) {
        const prevMonthDay = new Date(year, month, -i)
        days.push({
          date: prevMonthDay,
          isOtherMonth: true,
          isToday: false,
        })
      }

      // Add days of current month
      const today = new Date()
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day)
        const isToday = date.toDateString() === today.toDateString()
        days.push({
          date: date,
          isOtherMonth: false,
          isToday: isToday,
        })
      }

      // Calculate remaining cells to complete the grid
      const totalCells = 42
      const existingCells = startingDay + totalDays
      const remainingCells = totalCells - existingCells

      // Add empty cells for next month
      for (let i = 1; i <= remainingCells; i++) {
        const nextMonthDay = new Date(year, month + 1, i)
        days.push({
          date: nextMonthDay,
          isOtherMonth: true,
          isToday: false,
        })
      }

      return days
    },
  },
  methods: {
    getAppointmentsForDate(date) {
      // Convert date to YYYY-MM-DD format in local timezone (not UTC)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      return this.appointments.filter((apt) => apt.appointmentDate === dateString)
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
    getAppointmentDisplayText(appointment) {
      const firstName = appointment.clientName.split(' ')[0]
      return appointment.hasInvoice
        ? `${appointment.appointmentTime} - ${firstName}`
        : `${appointment.appointmentTime} - ${firstName} (No Invoice)`
    },
  },
  emits: ['appointment-click', 'appointment-delete'],
}
</script>

<style scoped>
.calendar {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  width: 100%;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f8f4f0; /* Peach background */
  border-bottom: 1px solid #e8e0d8;
}

.weekday {
  padding: 12px 8px;
  text-align: center;
  font-weight: 600;
  color: #5a4b3a; /* Warm brown text */
  font-size: 14px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 100px;
  padding: 8px;
  border: 1px solid #f0ece6;
  position: relative;
  transition: all 0.2s ease;
  aspect-ratio: 1;
}

.calendar-day:hover {
  background: #faf8f5;
}

.calendar-day.other-month {
  background: #faf8f5;
  color: #c4b8aa;
}

.calendar-day.today {
  background: #fff5f0; /* Light peach for today */
  border: 2px solid #e8b4a9;
}

.day-number {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 14px;
  color: #5a4b3a;
}

.appointments {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.appointment {
  background: #f8f4f0; /* Peach background */
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 11px;
  border-left: 3px solid #e8b4a9; /* Peach border */
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: #5a4b3a;
  line-height: 1.2;
}

.appointment:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(232, 180, 169, 0.3);
  background: #f5ede6;
}

/* Updated color scheme to match theme */
.appointment.makeup {
  background: #f5ede6; /* Nude background */
  border-left-color: #d4b8a8; /* Nude border */
  color: #5a4b3a;
}

.appointment.trial {
  background: #f0f0f0; /* Light gray background */
  border-left-color: #a8a8a8; /* Gray border */
  color: #5a4b3a;
}

.appointment.no-invoice {
  background: #fff8f0; /* Light peach background */
  border-left-color: #e8b4a9; /* Peach border */
  color: #5a4b3a;
}

.appointment-delete {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  font-size: 9px;
  cursor: pointer;
  display: none;
  line-height: 1;
}

.appointment:hover .appointment-delete {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Enhanced Responsive Design */
@media (max-width: 1024px) {
  .calendar-day {
    min-height: 90px;
    padding: 6px;
  }

  .weekday {
    padding: 10px 4px;
    font-size: 13px;
  }

  .appointment {
    font-size: 10px;
    padding: 3px 4px;
  }
}

@media (max-width: 768px) {
  .calendar-day {
    min-height: 70px;
    padding: 4px 2px;
  }

  .weekday {
    padding: 8px 2px;
    font-size: 12px;
  }

  .day-number {
    font-size: 12px;
    margin-bottom: 2px;
  }

  .appointment {
    font-size: 9px;
    padding: 2px 3px;
    border-left-width: 2px;
  }

  .appointments {
    gap: 2px;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 60px;
  }

  .weekday {
    padding: 6px 1px;
    font-size: 11px;
  }

  .day-number {
    font-size: 11px;
  }

  .appointment {
    font-size: 8px;
    padding: 1px 2px;
  }

  .calendar-weekdays,
  .calendar-days {
    grid-template-columns: repeat(7, 1fr);
  }
}

/* Very small screens */
@media (max-width: 360px) {
  .calendar-day {
    min-height: 50px;
  }

  .appointment {
    font-size: 7px;
    padding: 1px;
  }

  .appointment-delete {
    width: 12px;
    height: 12px;
    font-size: 8px;
  }
}
</style>
