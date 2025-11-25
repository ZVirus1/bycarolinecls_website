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
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f8f8f8;
  border-bottom: 1px solid #e5e5e5;
}

.weekday {
  padding: 16px;
  text-align: center;
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 120px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  position: relative;
  transition: background 0.2s;
}

.calendar-day:hover {
  background: #fafafa;
}

.calendar-day.other-month {
  background: #fafafa;
  color: #ccc;
}

.calendar-day.today {
  background: #fff8e1;
}

.day-number {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.appointments {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.appointment {
  background: #e3f2fd;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  border-left: 3px solid #2196f3;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.appointment:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.appointment.makeup {
  background: #f3e5f5;
  border-left-color: #9c27b0;
}

.appointment.trial {
  background: #e8f5e8;
  border-left-color: #4caf50;
}

.appointment.no-invoice {
  background: #fff3cd;
  border-left-color: #ffc107;
}

.appointment-delete {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 10px;
  cursor: pointer;
  display: none;
}

.appointment:hover .appointment-delete {
  display: block;
}

/* Responsive */
@media (max-width: 768px) {
  .calendar-day {
    min-height: 80px;
    padding: 8px 4px;
  }

  .appointment {
    font-size: 10px;
    padding: 2px 4px;
  }
}
</style>
