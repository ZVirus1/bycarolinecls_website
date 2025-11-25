<template>
  <div class="card paper-wrap">
    <div class="preview-controls" v-if="isMobile">
      <button class="zoom-btn" @click="zoomOut">🔍 -</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-btn" @click="zoomIn">🔍 +</button>
      <button class="reset-btn" @click="resetZoom">Reset</button>
    </div>

    <div
      id="paper"
      class="paper"
      :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }"
    >
      <div class="page-pad" id="invoicePage">
        <!-- ... keep existing template content exactly the same ... -->
        <div class="inv-title">INVOICE</div>

        <div class="top-meta">
          <div class="meta-box">
            <h3>BILLED TO:</h3>
            <p id="vName">{{ displayName }}</p>
            <p id="vPhone">{{ displayPhone }}</p>
            <p id="vAddress" v-html="displayAddress"></p>
          </div>

          <div class="meta-box">
            <div class="meta-line">
              <span class="k">Invoice Date :</span
              ><span id="vInvDate">{{ displayInvoiceDate }}</span>
            </div>
            <div class="meta-line">
              <span class="k">Appointment Date :</span
              ><span id="vAppDate">{{ displayAppointmentDate }}</span>
            </div>
            <div class="meta-line">
              <span class="k">Appointment Time :</span
              ><span id="vAppTime">{{ displayAppointmentTime }}</span>
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="qty">Quantity</th>
              <th class="total">Total</th>
            </tr>
          </thead>
          <tbody id="itemsBody">
            <tr v-for="(item, index) in displayItems" :key="index">
              <td>{{ item.description }}</td>
              <td class="qty">{{ item.quantity }}</td>
              <td class="total">{{ item.displayTotal }}</td>
            </tr>
          </tbody>
        </table>

        <table class="totals" id="totalsTable">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td class="total" id="vSubtotal">{{ displaySubtotal }}</td>
            </tr>
            <tr>
              <td>
                <div class="two-lines">
                  <span>Paid 50%</span>
                  <span class="sub" id="vPaidDate">{{ displayPaidDate }}</span>
                </div>
              </td>
              <td class="total" id="vPaid">{{ displayPaid }}</td>
            </tr>
            <tr>
              <td id="large-balance">
                <div class="two-lines">
                  <span>Balance Due</span>
                  <span class="sub">&nbsp;</span>
                </div>
              </td>
              <td class="total" id="vBalance">{{ displayBalance }}</td>
            </tr>
          </tbody>
        </table>

        <div class="bottom-row">
          <div class="payment">
            <h4>PAYMENT INFORMATION</h4>
            <div id="vBank">{{ displayBank }}</div>
            <div>
              Account Name : <span id="vAccName">{{ displayAccountName }}</span>
            </div>
            <div>
              Account No. : <span id="vAccNo">{{ displayAccountNo }}</span>
            </div>
          </div>
          <div class="brand-logo">
            <img id="footerLogo" :src="footerLogo" alt="CarolineCLS Logo" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { rupiah, dmy, longDate, escapeHtml } from '../stores/firebase.js'
import footerLogo from '../assets/bycarolinecls.png'

export default {
  name: 'InvoicePreview',
  props: {
    formData: Object,
    items: Array,
  },
  data() {
    return {
      zoom: 1,
      isMobile: false,
      footerLogo,
    }
  },
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)

    // Set appropriate initial zoom for mobile
    if (this.isMobile) {
      this.zoom = 0.5
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth < 768
    },
    zoomIn() {
      if (this.zoom < 2) {
        this.zoom += 0.1
      }
    },
    zoomOut() {
      if (this.zoom > 0.3) {
        this.zoom -= 0.1
      }
    },
    resetZoom() {
      this.zoom = this.isMobile ? 0.5 : 1
    },
    calculateSubtotal() {
      let subtotal = 0
      this.items.forEach((item) => {
        if (item.description && item.description.trim()) {
          const unit = Number(String(item.total).replace(/[^\d]/g, '')) || 0
          const lineTotal = unit * item.quantity
          subtotal += lineTotal
        }
      })
      return subtotal
    },
  },
  computed: {
    // ... keep all existing computed properties exactly the same ...
    displayName() {
      return this.formData.name || 'REDACTED-NAME'
    },
    displayPhone() {
      return this.formData.phone || 'REDACTED-PHONE'
    },
    displayAddress() {
      const address =
        this.formData.address || 'REDACTED-ADDRESS'
      return escapeHtml(address).replace(/, /g, ',<br/>')
    },
    displayInvoiceDate() {
      const date = this.formData.invoiceDate ? new Date(this.formData.invoiceDate) : new Date()
      return longDate(date)
    },
    displayAppointmentDate() {
      const date = this.formData.appointmentDate
        ? new Date(this.formData.appointmentDate)
        : new Date()
      return dmy(date)
    },
    displayAppointmentTime() {
      const timeVal = this.formData.appointmentTime || '02:00'
      const [hh, mm] = timeVal.split(':').map(Number)
      const ampm = hh >= 12 ? 'PM' : 'AM'
      const hh12 = hh % 12 || 12
      return `${String(hh12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`
    },
    displayItems() {
      return this.items
        .filter((item) => item.description && item.description.trim())
        .map((item) => {
          const unit = Number(String(item.total).replace(/[^\d]/g, '')) || 0
          const lineTotal = unit * item.quantity
          return {
            description: escapeHtml(item.description),
            quantity: item.quantity,
            displayTotal: unit ? rupiah(lineTotal) : '-',
          }
        })
    },
    displaySubtotal() {
      const subtotal = this.calculateSubtotal()
      return rupiah(subtotal)
    },
    displayPaid() {
      const subtotal = this.calculateSubtotal()
      return rupiah(subtotal / 2)
    },
    displayBalance() {
      const subtotal = this.calculateSubtotal()
      return rupiah(subtotal / 2)
    },
    displayPaidDate() {
      const date = this.formData.invoiceDate ? new Date(this.formData.invoiceDate) : new Date()
      return dmy(date)
    },
    displayBank() {
      return this.formData.bank || 'BCA'
    },
    displayAccountName() {
      return this.formData.accountName || 'Caroline'
    },
    displayAccountNo() {
      return this.formData.accountNo || 'REDACTED-ACCOUNT-NO'
    },
  },
}
</script>

<style scoped>
.paper-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex-direction: column;
}
.paper {
  width: 794px; /* Fixed A4 width */
  height: 1123px; /* Fixed A4 height */
  background: #f5f5ef; /* cream page */
  border: 1px solid #ececec;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
  max-width: 100%; /* Added */
  margin: 0 auto; /* Added */
}

/* Enhanced Mobile Experience */
@media (max-width: 768px) {
  .preview-controls {
    display: flex;
  }

  .paper {
    transform-origin: top center;
    margin: 0 auto;
    width: 100%;
    height: auto;
    aspect-ratio: 794 / 1123;
    transform: scale(1) !important; /* Remove scaling on mobile */
    max-width: 100%;
  }

  .page-pad {
    padding: 40px 48px;
  }

  /* Ensure the preview is properly visible */
  .paper-wrap {
    width: 100%;
    overflow-x: auto;
  }

  /* Adjust font sizes for better mobile readability */
  .inv-title {
    font-size: 40px;
    margin-bottom: 40px;
  }

  .top-meta {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .meta-box h3 {
    font-size: 14px;
  }

  .meta-box p {
    font-size: 12px;
  }

  .meta-line .k {
    font-size: 14px;
  }

  .items-table thead th,
  .items-table tbody td {
    font-size: 13px;
    padding: 8px 0;
  }

  .totals {
    width: 100%;
    max-width: 300px;
  }

  .payment {
    font-size: 16px;
  }

  .payment h4 {
    font-size: 16px;
  }

  .brand-logo img {
    height: 80px;
  }
}

/* Hide preview controls on desktop */
@media (min-width: 769px) {
  .preview-controls {
    display: none;
  }

  .preview-title {
    display: none !important;
  }
}

.page-pad {
  padding: 56px 68px 64px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-controls {
  display: none;
  width: 100%;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 16px;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.zoom-btn,
.reset-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.zoom-level {
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.inv-title {
  font-family: 'Roxborough CF', serif;
  font-size: 50px;
  font-weight: 500;
  letter-spacing: 3px;
  text-align: right;
  margin-top: 6px;
  margin-bottom: 60px;
  color: #000;
}

.top-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 18px;
}
.meta-box h3 {
  font-size: 16px;
  letter-spacing: 0.25px;
  font-weight: 700;
  margin-bottom: 6px;
}
.meta-box p {
  font-size: 13.5px;
  color: #222;
  margin: 2px 0;
  line-height: 1.4;
}
.meta-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.meta-line .k {
  font-weight: 700;
  font-size: 16px;
}

.rule {
  width: 50%;
  height: 1px;
  background: #c6c6c6;
  margin: 14px 0;
}

/* ===== ITEMS TABLE ===== */
.items-table {
  margin-top: 20px;
  width: 100%;
  border-collapse: collapse;
  border-top: 2px solid #aaaaaa;
  border-bottom: 2px solid #aaaaaa;
}
.items-table thead th {
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.25px;
  color: #111;
  padding: 12px 0;
  vertical-align: middle;
  border-bottom: 2px solid #aaaaaa;
}
.items-table tbody td {
  padding: 12px 0;
  font-size: 15px;
  color: #222;
  vertical-align: top;
  border-bottom: 2px solid #aaaaaa;
}
.items-table thead th:first-child,
.items-table tbody td:first-child {
  padding-left: 18px;
  text-align: left;
}
.qty {
  width: 280px;
  text-align: center;
}
.items-table thead th.total,
.items-table tbody td.total {
  width: 150px;
  text-align: center;
  position: relative;
  left: -8px;
  white-space: nowrap;
}

/* ===== TOTALS ===== */
.totals {
  margin-top: 10px;
  margin-left: auto;
  width: 360px;
  border: none;
  border-collapse: separate;
}
.totals tr td {
  text-align: right;
  padding: 18px 0;
  font-size: 15px;
  border: none;
}
.totals tr td:first-child {
  font-weight: 700;
}
.totals .total {
  text-align: right;
}
.two-lines .sub {
  display: block;
  font-weight: 500;
  font-size: 12px;
  color: #666;
  line-height: 1.2;
  margin-top: 4px;
}
#large-balance {
  font-size: 20px;
}

/* Bottom row */
.bottom-row {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.payment {
  font-size: 18px;
}
.payment h4 {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.6px;
  margin: 0 0 6px;
}
.brand-logo {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  min-width: 220px;
}
.brand-logo img {
  height: 100px;
  object-fit: contain;
}

/* Enhanced Mobile Experience */
@media (max-width: 768px) {
  .preview-controls {
    display: flex;
  }

  .paper {
    transform-origin: top center;
    margin: 0 auto;
  }
}

/* Hide preview controls on desktop */
@media (min-width: 769px) {
  .preview-controls {
    display: none;
  }
}
</style>
