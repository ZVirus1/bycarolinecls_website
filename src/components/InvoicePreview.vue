<template>
  <div class="card paper-wrap">
    <div id="paper" class="paper">
      <div class="page-pad" id="invoicePage">
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
            <img id="footerLogo" src="/bycarolinecls.png" alt="CarolineCLS Logo" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { rupiah, dmy, longDate, escapeHtml } from '../stores/firebase.js'

export default {
  name: 'InvoicePreview',
  props: {
    formData: Object,
    items: Array,
  },
  computed: {
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
  methods: {
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
}
</script>

<style scoped>
.paper-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}
.paper {
  width: 100%;
  max-width: var(--paper-w);
  height: auto;
  aspect-ratio: 794 / 1123; /* Maintain A4 ratio */
  background: #f5f5ef; /* cream page */
  border: 1px solid #ececec;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  position: relative;
  overflow: hidden;
}
.page-pad {
  padding: 5%; /* Use percentage for responsive padding */
  height: 100%;
  display: flex;
  flex-direction: column;
}

.inv-title {
  font-family: 'Roxborough CF', serif;
  font-size: clamp(30px, 5vw, 50px); /* Responsive font size */
  font-weight: 500;
  letter-spacing: 2px;
  text-align: right;
  margin-top: 4px;
  margin-bottom: 40px;
  color: #000;
}

.top-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 16px;
}
.meta-box h3 {
  font-size: 14px;
  letter-spacing: 0.2px;
  font-weight: 700;
  margin-bottom: 4px;
}
.meta-box p {
  font-size: 12px;
  color: #222;
  margin: 2px 0;
  line-height: 1.3;
}
.meta-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.meta-line .k {
  font-weight: 700;
  font-size: 14px;
}

/* ===== ITEMS TABLE ===== */
.items-table {
  margin-top: 16px;
  width: 100%;
  border-collapse: collapse;
  border-top: 2px solid var(--rule-strong);
  border-bottom: 2px solid var(--rule-strong);
  font-size: 13px;
}
.items-table thead th {
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.2px;
  color: #111;
  padding: 10px 0;
  vertical-align: middle;
  border-bottom: 2px solid var(--rule-strong);
}
.items-table tbody td {
  padding: 10px 0;
  font-size: 13px;
  color: #222;
  vertical-align: top;
  border-bottom: 2px solid var(--rule-strong);
}
.items-table thead th:first-child,
.items-table tbody td:first-child {
  padding-left: 12px;
  text-align: left;
}
.qty {
  width: 80px;
  text-align: center;
}
.items-table thead th.total,
.items-table tbody td.total {
  width: 100px;
  text-align: center;
  white-space: nowrap;
}

/* ===== TOTALS ===== */
.totals {
  margin-top: 10px;
  margin-left: auto;
  width: 100%;
  max-width: 300px;
  border: none;
  border-collapse: separate;
  font-size: 13px;
}
.totals tr td {
  text-align: right;
  padding: 14px 0;
  font-size: 13px;
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
  font-size: 10px;
  color: #666;
  line-height: 1.2;
  margin-top: 2px;
}
#large-balance {
  font-size: 16px;
}

/* Bottom row */
.bottom-row {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.payment {
  font-size: 14px;
  flex: 1;
  min-width: 200px;
}
.payment h4 {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.4px;
  margin: 0 0 4px;
}
.brand-logo {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  min-width: 120px;
}
.brand-logo img {
  height: 60px;
  object-fit: contain;
}

/* Responsive Design */
@media (max-width: 768px) {
  .paper {
    max-width: 100%;
  }

  .page-pad {
    padding: 4%;
  }

  .top-meta {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .inv-title {
    margin-bottom: 20px;
    font-size: 36px;
  }

  .items-table {
    font-size: 12px;
  }

  .items-table thead th,
  .items-table tbody td {
    font-size: 12px;
    padding: 8px 0;
  }

  .bottom-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .brand-logo {
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .page-pad {
    padding: 3%;
  }

  .inv-title {
    font-size: 28px;
    margin-bottom: 16px;
  }

  .meta-box h3 {
    font-size: 12px;
  }

  .meta-box p {
    font-size: 11px;
  }

  .items-table {
    font-size: 11px;
  }

  .items-table thead th,
  .items-table tbody td {
    font-size: 11px;
    padding: 6px 0;
  }

  .totals {
    font-size: 12px;
  }

  .payment {
    font-size: 12px;
  }

  .brand-logo img {
    height: 50px;
  }
}
</style>
