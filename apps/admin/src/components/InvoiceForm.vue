<template>
  <div class="card">
    <h1>Invoice Generator</h1>

    <label>Customer name</label>
    <input v-model="localFormData.name" type="text" placeholder="Client name" />

    <div class="grid-2">
      <div>
        <label>Phone</label>
        <input v-model="localFormData.phone" type="text" placeholder="+62 812 3456 7890" />
      </div>
      <div>
        <label>Invoice Date</label>
        <input v-model="localFormData.invoiceDate" type="date" />
      </div>
    </div>

    <label>Address</label>
    <input
      v-model="localFormData.address"
      type="text"
      placeholder="Street, area, city"
    />

    <div class="grid-2">
      <div>
        <label>Appointment Date</label>
        <input v-model="localFormData.appointmentDate" type="date" />
      </div>
      <div>
        <label>Appointment Time</label>
        <input v-model="localFormData.appointmentTime" type="time" />
      </div>
    </div>

    <label>Invoice items</label>
    <div class="items">
      <div v-for="(item, index) in localItems" :key="index" class="item-row">
        <select
          v-model="item.description"
          class="d-select"
          :style="{ display: item.isPredefined ? 'none' : '' }"
          @change="onServiceChange(item, $event)"
        >
          <option value="">-- Choose Service --</option>
          <option
            v-for="service in PREDEFINED_SERVICES"
            :key="service.description"
            :value="service.description"
            :data-price="service.price"
          >
            {{ service.description }}
          </option>
          <option value="custom">-- Custom Item --</option>
        </select>
        <input
          v-model="item.description"
          class="d-text"
          type="text"
          placeholder="Description"
          :style="{ display: !item.isPredefined ? 'none' : '' }"
        />
        <input v-model.number="item.quantity" class="q" type="number" min="1" />
        <input
          v-model="item.total"
          class="t"
          type="text"
          placeholder="Total (e.g. 8000000)"
          @input="formatTotal(item)"
        />
        <button class="remove" type="button" aria-label="Remove item" @click="removeItem(index)">
          <i class="fas fa-trash-can"></i>
        </button>
      </div>
    </div>
    <button class="btn secondary" type="button" @click="$emit('add-item')">
      <i class="fas fa-plus"></i> Add item
    </button>
    <label style="margin-top: 18px">Link to Calendar Event</label>
    <select v-model="localLinkedId">
      <option value=""></option>
      <option v-for="ev in calendarEvents" :key="ev.id" :value="ev.id">
        {{ ev.clientName || 'Unnamed' }}
      </option>
    </select>
    <div class="hint">
      {{
        calendarEvents.length
          ? 'Bookings on this appointment date that have no invoice yet.'
          : 'Nothing on this appointment date. Change the Appointment Date above, or check the Calendar tab for which dates have bookings.'
      }}
    </div>

    <button class="btn" type="button" :disabled="busy" @click="$emit('generate')">
      <i class="fas fa-file-pdf"></i> {{ busy ? 'Generating…' : 'Generate Invoice' }}
    </button>
    <div v-if="statusMessage" class="status-message" :class="statusClass">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script>
import { services, loadPricing } from '../stores/pricing.js'

export default {
  name: 'InvoiceForm',
  props: {
    formData: Object,
    items: Array,
    statusMessage: String,
    isStatusSuccess: Boolean,
    calendarEvents: { type: Array, default: () => [] },
    linkedEventId: { type: String, default: '' },
    busy: Boolean,
  },
  data() {
    return {
      localFormData: { ...this.formData },
      localItems: [...this.items],
      localLinkedId: this.linkedEventId,
    }
  },
  computed: {
    // Live list managed under Pricing, so the dropdown and the public pricing
    // page can never disagree.
    PREDEFINED_SERVICES() {
      return services.value
    },
    statusClass() {
      return this.isStatusSuccess ? 'status-success' : 'status-error'
    },
  },
  created() {
    loadPricing()
  },
  watch: {
    formData: {
      handler(newVal) {
        this.localFormData = { ...newVal }
      },
      deep: true,
    },
    items: {
      handler(newVal) {
        this.localItems = [...newVal]
      },
      deep: true,
    },
    localFormData: {
      handler(newVal) {
        this.$emit('update:form-data', newVal)
      },
      deep: true,
    },
    localItems: {
      handler(newVal) {
        this.$emit('update:items', newVal)
      },
      deep: true,
    },
    linkedEventId(newVal) {
      this.localLinkedId = newVal
    },
    localLinkedId(newVal) {
      this.$emit('update:linked-event-id', newVal)
    },
  },
  methods: {
    onServiceChange(item, event) {
      const selectedValue = event.target.value

      if (selectedValue === 'custom') {
        item.isPredefined = true
        item.description = ''
        item.total = ''
      } else if (selectedValue) {
        const selectedOption = event.target.options[event.target.selectedIndex]
        const price = selectedOption.getAttribute('data-price')
        item.total = price ? Number(price).toLocaleString('id-ID') : ''
        item.description = selectedValue
        item.isPredefined = false
      }
    },
    formatTotal(item) {
      // Remove non-numeric characters except decimal
      let value = item.total.replace(/[^\d]/g, '')
      if (value) {
        item.total = Number(value).toLocaleString('id-ID')
      }
    },
    removeItem(index) {
      this.localItems.splice(index, 1)
    },
  },
}
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}
.card h1 {
  font-size: 22px;
  margin: 2px 0 14px;
  letter-spacing: 0.2px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-right: 8px; /* Added - matches left margin */
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr 1fr; /* Keep 2 columns on mobile */
    gap: 12px; /* Keep the same gap as desktop */
    margin-right: 8px; /* Keep the same margin as desktop */
  }
  .card {
    margin-bottom: 0; /* Remove bottom margin since preview follows immediately */
  }
}
label {
  display: block;
  font-size: 12px;
  letter-spacing: 0.2px;
  color: #333;
  margin: 12px 0 6px;
  font-weight: 600;
}
input[type='text'],
input[type='date'],
input[type='time'],
input[type='number'],
select {
  /* Base look comes from the global form-control rules in App.vue. */
  font-size: 15px;
  padding: 11px 12px;
}

select {
  padding-right: 36px;
}

select option {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--ink);
  background: #fff;
}

select option[value='custom'] {
  font-weight: 600;
  border-top: 1px solid #eeebe4;
}

.item-row select.d-select {
  font-size: 14px;
}

.item-row input.d-text {
  border: 1px solid var(--field-border);
  font-weight: 500;
}

.item-row input.d-text:focus {
  border-color: var(--ink);
}
.items {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px; /* Changed from 8px to 12px */
}

.item-row {
  display: grid;
  grid-template-columns: 1fr 80px 1fr auto;
  gap: 8px;
  /* stretch, not center: otherwise the bin button is shorter than the fields */
  align-items: stretch;
  margin-bottom: 8px; /* Added space after Remove button */
}

/* Update mobile responsive */
@media (max-width: 768px) {
  .items {
    gap: 10px; /* Slightly smaller gap on mobile */
  }

  .item-row {
    grid-template-columns: 1fr;
    gap: 6px;
    margin-bottom: 6px; /* Smaller margin on mobile */
  }
}

.item-row .remove {
  display: grid;
  place-items: center;
  border: 1px solid #e6e3dc;
  background: #fff;
  color: #8a857c;
  padding: 0 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.item-row .remove:hover {
  border-color: #e8c4c4;
  background: #fdf5f5;
  color: #b61c1c;
}
.hint {
  font-size: 12px;
  color: #8a857c;
  margin-top: 6px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  background: var(--btn-bg);
  color: var(--btn-fg);
  border-radius: 10px;
  padding: 14px 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 14px;
  width: 100%;
  transition: background-color 0.2s;
  font-size: 16px;
}
.btn:hover:not(:disabled) {
  background: var(--btn-bg-hover);
}
.btn.secondary {
  background: #f2eee8;
}
.btn.success {
  background: var(--btn-bg);
}
.muted {
  color: #666;
  font-size: 12px;
}

.status-message {
  padding: 12px;
  border-radius: 8px;
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
}

.status-success {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #d4d4d4;
}

.status-error {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #d4d4d4;
}

/* Enhanced Responsive Design */
@media (max-width: 768px) {
  .card {
    padding: 16px;
  }

  .card h1 {
    font-size: 20px;
  }

  .grid-2 {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  input[type='text'],
  input[type='date'],
  input[type='time'],
  input[type='number'],
  select {
    padding: 14px;
    font-size: 16px; /* Prevents zoom on iOS */
  }

  .item-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .item-row .remove {
    padding: 8px 12px;
    font-size: 13px;
  }

  .btn {
    padding: 16px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .card {
    padding: 12px;
  }

  .card h1 {
    font-size: 18px;
  }

  input[type='text'],
  input[type='date'],
  input[type='time'],
  input[type='number'],
  select {
    padding: 12px;
    font-size: 14px;
  }

  .items {
    gap: 6px;
  }
}

/* Very small screens */
@media (max-width: 360px) {
  .card {
    padding: 10px;
  }

  .card h1 {
    font-size: 16px;
  }

  label {
    font-size: 11px;
  }

  input[type='text'],
  input[type='date'],
  input[type='time'],
  input[type='number'],
  select {
    padding: 10px;
    font-size: 13px;
  }
}
</style>
