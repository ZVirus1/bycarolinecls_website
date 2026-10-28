<template>
  <div class="card paper-wrap" ref="paperWrapper">
    <div class="preview-controls" v-if="isMobile">
      <!-- One segmented control rather than three loose buttons: out, the
           reading, and in are one thing you operate, and the reading sits
           between the two keys that change it. -->
      <div class="zoom">
        <button
          type="button"
          class="zoom__btn"
          aria-label="Zoom out"
          :disabled="zoom <= 0.3"
          @click="zoomOut"
        >
          <i class="fas fa-magnifying-glass-minus" aria-hidden="true"></i>
        </button>
        <span class="zoom__level" aria-live="polite">{{ Math.round(zoom * 100) }}%</span>
        <button
          type="button"
          class="zoom__btn"
          aria-label="Zoom in"
          :disabled="zoom >= 2"
          @click="zoomIn"
        >
          <i class="fas fa-magnifying-glass-plus" aria-hidden="true"></i>
        </button>
      </div>
      <button type="button" class="zoom__reset" @click="resetZoom">
        <i class="fas fa-rotate-left" aria-hidden="true"></i>
        <span>Reset</span>
      </button>
    </div>

    <!-- A transform does not change layout size, so the box is sized to the
         SCALED page - width as well as height. Width used to be left out, which
         only looked right while the column happened to be exactly 794px wide;
         in any narrower column the page scaled about its own centre and its
         left-hand edge was clipped away. -->
    <div
      class="paper-box"
      :style="{
        width: `${Math.round(794 * zoom) + 2}px`,
        height: `${Math.round(1123 * zoom) + 2}px`,
      }"
    >
      <div
        id="paper"
        class="paper"
        :style="{ transform: `scale(${zoom})`, transformOrigin: 'left top' }"
      >
        <div class="page-pad" id="invoicePage">
          <div class="inv-head">
            <!-- Only on a settled invoice. Solid ink rather than a green tick:
                 the page is monochrome throughout, and a stamp in a colour that
                 appears nowhere else reads as clip art. -->
            <div v-if="paid" class="paid-mark">
              <span class="paid-mark__word">PAID</span>
              <span class="paid-mark__date">{{ displaySettledDate }}</span>
            </div>
            <div class="inv-title">INVOICE</div>
          </div>

          <div class="top-meta">
            <div class="meta-box">
              <h3>BILLED TO:</h3>
              <p id="vName">{{ displayName }}</p>
              <p id="vPhone">{{ displayPhone }}</p>
              <p id="vAddress" v-html="displayAddress"></p>
            </div>

            <div class="meta-box">
              <div class="meta-line">
                <span class="k">Invoice Date :</span>
                <span id="vInvDate">{{ displayInvoiceDate }}</span>
              </div>
              <div class="meta-line">
                <span class="k">Appointment Date :</span>
                <span id="vAppDate">{{ displayAppointmentDate }}</span>
              </div>
              <div class="meta-line">
                <span class="k">Appointment Time :</span>
                <span id="vAppTime">{{ displayAppointmentTime }}</span>
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
              <!-- Same three rows either way. A settled invoice reads as the
                   same document with the numbers moved on, not as a different
                   layout, so nothing here shifts when `paid` flips. -->
              <tr>
                <td>
                  <div class="two-lines">
                    <span>{{ paid ? 'Paid in Full' : 'Paid 50%' }}</span>
                    <span class="sub" id="vPaidDate">{{
                      paid ? displaySettledDate : displayPaidDate
                    }}</span>
                  </div>
                </td>
                <td class="total" id="vPaid">{{ displayPaid }}</td>
              </tr>
              <tr>
                <td id="large-balance">Balance Due</td>
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
  </div>
</template>

<script>
import { rupiah, dmy, longDate, escapeHtml } from '@bycarolinecls/shared'
import footerLogo from '../assets/bycarolinecls.svg'

export default {
  name: 'InvoicePreview',
  props: {
    formData: Object,
    items: Array,
    /** Draw the settled version: paid in full, nothing outstanding. */
    paid: Boolean,
    /** When the balance was settled. Defaults to today. YYYY-MM-DD or Date. */
    paidDate: [String, Date],
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
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth < 768
      this.setInitialZoom()
    },
    setInitialZoom() {
      this.$nextTick(() => {
        const wrapper = this.$refs.paperWrapper
        if (!wrapper) return

        // Fit the A4 page to its column. Desktop used to sit at 1.0 regardless,
        // which pushed the page wider than the viewport and forced a sideways
        // scroll to see the right-hand edge of the invoice.
        const available = (wrapper.clientWidth || window.innerWidth) - 40
        const cap = this.isMobile ? 0.6 : 1
        this.zoom = Math.max(Math.min(available / 794, cap), 0.35)
      })
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
      if (this.isMobile) {
        this.setInitialZoom()
      } else {
        this.zoom = 1
      }
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
    displayName() {
      return this.formData.name || ''
    },
    displayPhone() {
      return this.formData.phone || ''
    },
    displayAddress() {
      const address = this.formData.address || ''
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
      return rupiah(this.paid ? subtotal : subtotal / 2)
    },
    displayBalance() {
      const subtotal = this.calculateSubtotal()
      // Written out rather than rupiah(0), which renders a dash for zero. On a
      // settled invoice the whole point of the line is that the figure is nil,
      // and a dash there reads as "not filled in".
      return this.paid ? 'Rp 0,-' : rupiah(subtotal / 2)
    },
    /** The day the balance was settled - the deposit date is displayPaidDate. */
    displaySettledDate() {
      return dmy(this.paidDate ? new Date(this.paidDate) : new Date())
    },
    displayPaidDate() {
      const date = this.formData.invoiceDate ? new Date(this.formData.invoiceDate) : new Date()
      return dmy(date)
    },
    // Caroline's own details, and they do not change. They sit here as real
    // defaults - the bank and the account name always have - because the
    // environment variables that can override them are set per deployment, and
    // a build that happens to be missing one must not print an invoice with a
    // blank where the account number goes.
    displayBank() {
      return this.formData.bank || 'BCA'
    },
    displayAccountName() {
      return this.formData.accountName || 'Caroline'
    },
    displayAccountNo() {
      return this.formData.accountNo || '7865440651'
    },
  },
}
</script>

<style scoped>
.paper-wrap {
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-direction: column;
  width: 100%;
  overflow-x: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}

.paper-box {
  margin: 0 auto;
  min-width: 0;
  overflow: hidden;
}

.paper {
  width: 794px; /* Fixed A4 width */
  height: 1123px; /* Fixed A4 height */
  background: #f5f5ef; /* cream page */
  border: 1px solid #ececec;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
  margin: 0 auto;
}

/* Mobile: center the whole thing and avoid weird cutoff on the right */
@media (max-width: 768px) {
  .paper-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow-x: hidden;
    padding: 0;
    height: fit-content;
  }
  .paper {
    margin: 0;
    transform-origin: left top;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
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
  padding: 10px 12px;
  background: #f7f6f1;
  border: 1px solid #ebe7dc;
  border-radius: 10px;
  margin-bottom: 16px;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

/* The three keys share one outline, divided rather than separated, so the
   group reads as a single control the way a zoom control normally does. */
.zoom {
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1px solid var(--field-border);
  border-radius: 9px;
  overflow: hidden;
}

.zoom__btn {
  display: grid;
  place-items: center;
  /* 40px square: the smallest target worth putting under a thumb. */
  width: 42px;
  min-height: 40px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.zoom__btn:hover:not(:disabled) {
  background: #f4f2ec;
}

.zoom__btn:active:not(:disabled) {
  background: #ece8db;
}

.zoom__btn:disabled {
  color: #c2bcb1;
  cursor: default;
}

.zoom__level {
  display: grid;
  place-items: center;
  min-width: 62px;
  padding: 0 4px;
  border-left: 1px solid #ebe7dc;
  border-right: 1px solid #ebe7dc;
  font-size: 13px;
  font-weight: 600;
  /* So the page does not jog sideways between 60% and 100%. */
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.zoom__reset {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--field-border);
  border-radius: 9px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.zoom__reset:hover {
  background: #f4f2ec;
}

.zoom__reset i {
  font-size: 12px;
  color: var(--ink-soft, #6b665e);
}

/* The title keeps its own right-hand alignment; the PAID block is pushed to
   the far left by its own auto margin, so an unpaid invoice renders exactly as
   it did before this row existed.
   The 60px of air under the title moved from the title onto this row. Left on
   the title it counted towards the flex line's height, which put the bottom of
   the PAID block 10px above BILLED TO instead of 70. */
.inv-head {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 24px;
  margin-bottom: 60px;
}

.paid-mark {
  margin-right: auto;
}

.paid-mark__word {
  display: block;
  background: #111;
  color: #f5f5ef;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 6px;
  /* The tracking adds a trailing gap after the D; the padding compensates so
     the word looks centred in its block. */
  padding: 9px 12px 9px 18px;
}

.paid-mark__date {
  display: block;
  margin-top: 7px;
  font-size: 12px;
  letter-spacing: 1.4px;
  color: #6b665e;
  text-align: center;
}

.inv-title {
  font-family: 'Roxborough CF', serif;
  font-size: 50px;
  font-weight: 500;
  letter-spacing: 3px;
  text-align: right;
  margin-top: 6px;
  /* The space below belongs to .inv-head now - see the note there. */
  margin-bottom: 0;
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
  /* Without this the UA's default h3 margin drops BILLED TO below Invoice Date. */
  margin-top: 0;
  margin-bottom: 6px;
}
/* 15px, which is what the items table and the totals are set in. This block
   used to be 13.5px while the dates in the column beside it inherited the
   16px body size, so the client's own name was the smallest type on the page
   and sat next to the largest. One size for every value, one for every label. */
.meta-box p {
  font-size: 15px;
  color: #222;
  margin: 2px 0;
  line-height: 1.4;
}
.meta-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 15px;
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
  /* removed border-bottom to avoid double line in PDF */
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
  vertical-align: middle;
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

/* Mobile: show controls, keep layout but scaled */
/* Mobile: show controls */
@media (max-width: 768px) {
  .preview-controls {
    display: flex;
  }
}

/* Hide preview controls on desktop */
@media (min-width: 769px) {
  .preview-controls {
    display: none;
  }
}
</style>
