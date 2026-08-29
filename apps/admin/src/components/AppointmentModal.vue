<template>
  <div v-if="show" class="modal">
    <div class="modal-content">
      <span class="close" @click="$emit('close')">&times;</span>
      <h2>Add New Event</h2>
      <form @submit.prevent="saveEvent">
        <div class="form-group">
          <label for="eventClientName">Client Name</label>
          <input type="text" id="eventClientName" v-model="form.clientName" required />
        </div>
        <div class="form-group">
          <label for="eventDate">Date</label>
          <input type="date" id="eventDate" v-model="form.date" required />
        </div>
        <div class="form-group">
          <label for="eventTime">Time</label>
          <input type="time" id="eventTime" v-model="form.time" required />
        </div>
        <div class="form-group">
          <label for="eventService">Service</label>
          <input
            type="text"
            id="eventService"
            v-model="form.service"
            placeholder="e.g., Makeup Trial"
          />
        </div>
        <button type="submit" class="calendar-btn primary" style="width: 100%; margin-top: 10px">
          Save Event
        </button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppointmentModal',
  props: {
    show: Boolean,
  },
  data() {
    const today = new Date().toISOString().split('T')[0]
    return {
      form: {
        clientName: '',
        date: today,
        time: '',
        service: '',
      },
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Reset form when modal opens
        this.form = {
          clientName: '',
          date: new Date().toISOString().split('T')[0],
          time: '',
          service: '',
        }
      }
    },
  },
  methods: {
    saveEvent() {
      this.$emit('save', { ...this.form })
    },
  },
  emits: ['close', 'save'],
}
</script>

<style scoped>
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

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.calendar-btn.primary {
  background: #111;
  color: white;
  border-color: #111;
}

.calendar-btn.primary:hover {
  background: #333;
}
</style>
