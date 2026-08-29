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
        <button class="remove" type="button" @click="removeItem(index)">Remove</button>
      </div>
    </div>
    <button class="btn secondary" type="button" @click="$emit('add-item')">
      <i class="fas fa-plus"></i> Add item
    </button>
    <div class="muted">
      Only rows with a Description will be shown. A divider appears under each shown row.
    </div>

    <label style="margin-top: 16px">Bank</label>
    <input v-model="localFormData.bank" type="text" />

    <div class="grid-2">
      <div>
        <label>Account Name</label>
        <input v-model="localFormData.accountName" type="text" />
      </div>
      <div>
        <label>Account No.</label>
        <input v-model="localFormData.accountNo" type="text" />
      </div>
    </div>

    <button class="btn" type="button" @click="$emit('download-pdf')">
      <i class="fas fa-file-pdf"></i> Generate PDF
    </button>
    <button class="btn success" type="button" @click="$emit('save-to-cloud')">
      <i class="fas fa-cloud-upload-alt"></i> Generate PDF & Save to Calendar
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
  },
  data() {
    return {
      localFormData: { ...this.formData },
      localItems: [...this.items],
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
  width: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px; /* Better for mobile touch */
  outline: none;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    sans-serif;
  box-sizing: border-box;
}

/* ===== MONOCHROMATIC DROPDOWN STYLING ===== */
select {
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  border: 1px solid #d4d4d4;
  font-weight: 500;
  color: #333;
}

select:hover {
  border-color: #8a8a8a;
  background-color: #fafafa;
}

select:focus {
  border-color: #333;
  background-color: white;
  outline: none;
}

/* Dropdown options styling */
select option {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  background: white;
}

/* Group headers for better organization */
select option[value=''] {
  font-weight: 600;
  color: #666;
  background: #f5f5f5;
  font-style: italic;
}

select option[value='custom'] {
  font-weight: 600;
  color: #333;
  background: #f8f8f8;
  border-top: 1px solid #e5e5e5;
}

/* Selected option state */
select option:checked {
  background: #f5f5f5;
  color: #333;
  font-weight: 600;
}

/* Custom scrollbar for dropdown */
select::-webkit-scrollbar {
  width: 6px;
}

select::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

select::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

select::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Special styling for the service dropdown in item rows */
.item-row select.d-select {
  border-radius: 8px;
  font-size: 14px;
}

.item-row select.d-select:focus {
  border-color: #333;
}

/* Make the custom input match the dropdown styling */
.item-row input.d-text {
  transition: border-color 0.2s;
  border: 1px solid #d4d4d4;
  font-weight: 500;
}

.item-row input.d-text:focus {
  border-color: #333;
  outline: none;
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
  align-items: center;
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
  border: 1px solid #ffd7d7;
  background: #fff0f0;
  color: #b61c1c;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
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
