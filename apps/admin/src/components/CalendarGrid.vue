<template>
  <div class="calendar">
    <div class="calendar-weekdays">
      <div v-for="d in weekdays" :key="d.short" class="weekday">
        <span class="weekday__long">{{ d.long }}</span>
        <span class="weekday__short">{{ d.short }}</span>
      </div>
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
            v-for="appointment in visibleFor(day.date)"
            :key="appointment.id"
            class="appointment"
            :class="getAppointmentType(appointment)"
            :title="getAppointmentDisplayText(appointment)"
            @click="$emit('appointment-click', appointment)"
          >
            <span v-if="appointment.appointmentTime" class="appointment__time">
              {{ shortTime(appointment.appointmentTime) }}
            </span>
            <span class="appointment__name">{{ firstName(appointment) }}</span>
          </div>
          <div v-if="hiddenCountFor(day.date)" class="appointment appointment--more">
            +{{ hiddenCountFor(day.date) }}
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
    /** Cap per cell so a phone-sized square is not silently truncated. 0 = no cap. */
    maxPerDay: { type: Number, default: 0 },
  },
  computed: {
    weekdays() {
      return [
        { long: 'Sunday', short: 'Sun' },
        { long: 'Monday', short: 'Mon' },
        { long: 'Tuesday', short: 'Tue' },
        { long: 'Wednesday', short: 'Wed' },
        { long: 'Thursday', short: 'Thu' },
        { long: 'Friday', short: 'Fri' },
        { long: 'Saturday', short: 'Sat' },
      ]
    },
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
    visibleFor(date) {
      const all = this.getAppointmentsForDate(date)
      if (!this.maxPerDay || all.length <= this.maxPerDay) return all
      // Leave room for the "+N" chip, which occupies one of the slots.
      return all.slice(0, this.maxPerDay - 1)
    },
    hiddenCountFor(date) {
      const all = this.getAppointmentsForDate(date)
      if (!this.maxPerDay || all.length <= this.maxPerDay) return 0
      return all.length - (this.maxPerDay - 1)
    },
    /** "06:00" reads as "6:00": one character back, which matters at phone width. */
    shortTime(time) {
      return String(time).replace(/^0/, '')
    },
    firstName(appointment) {
      return (appointment.clientName || 'Unnamed').split(' ')[0]
    },
    getAppointmentType(appointment) {
      // Colour carries this now, so the label stays out of the way.
      return appointment.hasInvoice ? 'invoiced' : 'pending'
    },
    getAppointmentDisplayText(appointment) {
      // clientName can be blank now that invoices no longer default it.
      const firstName = (appointment.clientName || 'Unnamed').split(' ')[0]
      return `${appointment.appointmentTime} - ${firstName}`
    },
  },
  emits: ['appointment-click'],
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

.weekday__short {
  display: none;
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
  display: flex;
  align-items: baseline;
  gap: 4px;
  background: #f2eee8;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  color: #5a4b3a;
  line-height: 1.2;
}

/* One line per booking: the name gives way, the time never wraps. */
.appointment__time {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.appointment__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment--more {
  justify-content: center;
  background: none;
  color: #a09a90;
  font-weight: 600;
  cursor: default;
}

.appointment--more:hover {
  transform: none;
  box-shadow: none;
}

.appointment:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(29, 29, 29, 0.16);
}

/* Invoiced carries a left rule; not-invoiced is one flat colour. */
.appointment.invoiced {
  background: #f2eee8;
  border-left: 3px solid #1d1d1d;
  color: #1d1d1d;
  font-weight: 600;
}

.appointment.pending {
  background: #f2eee8;
  color: #6b665e;
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
  .weekday__long {
    display: none;
  }

  .weekday__short {
    display: inline;
  }

  /* A square cell is only ~52px tall on a phone, which fits one booking.
     Drop the ratio and give the row the height four single-line rows need. */
  .calendar-day {
    aspect-ratio: auto;
    min-height: 92px;
    padding: 4px 3px;
  }

  .weekday {
    padding: 8px 2px;
    font-size: 12px;
  }

  .day-number {
    font-size: 12px;
    margin-bottom: 3px;
  }

  .appointment {
    font-size: 9.5px;
    padding: 2px 3px;
    gap: 3px;
    border-radius: 4px;
  }

  .appointment.invoiced {
    border-left-width: 2px;
  }

  .appointments {
    gap: 2px;
  }
}

@media (max-width: 480px) {
  .calendar-day {
    min-height: 90px;
    padding: 4px 2px;
  }

  .weekday {
    padding: 6px 1px;
    font-size: 11px;
  }

  .day-number {
    font-size: 11px;
  }

  .appointment {
    font-size: 9px;
    padding: 2px;
  }

  .calendar-weekdays,
  .calendar-days {
    grid-template-columns: repeat(7, 1fr);
  }
}

/* Very small screens: the time is what has to give, not the name. */
@media (max-width: 360px) {
  .calendar-day {
    min-height: 84px;
  }

  .appointment {
    font-size: 8.5px;
    padding: 1px 2px;
  }
}
</style>
