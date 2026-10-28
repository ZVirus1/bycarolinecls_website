<template>
  <div class="app">
    <!-- ============ LEFT: FORM ============ -->
    <div class="form-section">
      <InvoiceForm
        :form-data="formData"
        :items="items"
        :status-message="statusMessage"
        :is-status-success="isStatusSuccess"
        @update:form-data="updateFormData"
        @update:items="updateItems"
        @add-item="addItem"
        :calendar-events="calendarEvents"
        :linked-event-id="linkedEventId"
        :busy="busy"
        @update:linked-event-id="linkedEventId = $event"
        @generate="generateInvoice"
      />

      <!-- The finished PDF, waiting for a tap.
           It waits on purpose: a phone only opens its share sheet while the tap
           that asked for it is still fresh, and building the invoice takes
           longer than that. So the PDF is made first and handed over from a
           button, which is also the one place on a phone that leads to Files
           and to WhatsApp. -->
      <div v-if="ready" class="ready">
        <div class="ready__text">
          <strong>{{ ready.invoiceNumber }} is ready</strong>
          <span class="ready__file">{{ ready.fileName }}</span>
        </div>
        <button class="ready__btn" type="button" @click="savePdf">
          <i class="fas" :class="canShare ? 'fa-share-from-square' : 'fa-download'"></i>
          {{ canShare ? 'Save or share' : 'Download' }}
        </button>
      </div>
    </div>

    <!-- ============ RIGHT: PREVIEW PAPER ============ -->
    <div class="preview-section">
      <div class="preview-title"><i class="fas fa-eye"></i> Preview</div>
      <InvoicePreview :form-data="formData" :items="items" />
    </div>
  </div>
</template>

<script>
import InvoiceForm from '../components/InvoiceForm.vue'
import InvoicePreview from '../components/InvoicePreview.vue'
import {
  db,
  storage,
  collection,
  addDoc,
  updateDoc,
  doc,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteDoc,
  getDocs,
  query,
  where,
} from '../stores/firebase.js'
import { nextInvoiceNumber } from '../stores/invoices.js'
import {
  buildInvoicePdfBlob,
  canSharePdf,
  deliverPdf,
  invoiceFileName,
  showPdfBlob,
} from '../lib/invoicePdf.js'

export default {
  name: 'InvoiceView',
  components: {
    InvoiceForm,
    InvoicePreview,
  },
  data() {
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    return {
      formData: {
        name: '',
        phone: '',
        address: '',
        invoiceDate: today.toISOString().split('T')[0],
        appointmentDate: tomorrow.toISOString().split('T')[0],
        appointmentTime: '02:00',
        // Payment details come from env config, never hardcoded - this repo
        // is public. See .env.example.
        bank: import.meta.env.VITE_BANK_NAME || '',
        accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || '',
        accountNo: import.meta.env.VITE_BANK_ACCOUNT_NO || '',
      },
      items: [{ description: '', quantity: 1, total: '', isPredefined: false }],
      calendarEvents: [],
      linkedEventId: '',
      busy: false,
      statusMessage: '',
      isStatusSuccess: true,
      /** The finished PDF: { blob, fileName, invoiceNumber }. */
      ready: null,
      canShare: canSharePdf(),
    }
  },
  mounted() {
    this.loadCalendarEvents()
  },
  watch: {
    'formData.appointmentDate'() {
      this.linkedEventId = ''
      this.loadCalendarEvents()
    },
  },
  methods: {
    /** Bookings already on the chosen appointment date, so an invoice can
     *  attach to one instead of creating a second copy of the same booking. */
    async loadCalendarEvents() {
      const date = this.formData.appointmentDate
      if (!date) {
        this.calendarEvents = []
        return
      }
      try {
        const snap = await getDocs(
          query(collection(db, 'appointments'), where('appointmentDate', '==', date)),
        )
        this.calendarEvents = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => !a.hasInvoice)
      } catch (err) {
        console.error('Could not load calendar events:', err)
        this.calendarEvents = []
      }
    },

    updateFormData(newData) {
      if (JSON.stringify(this.formData) !== JSON.stringify({ ...this.formData, ...newData })) {
        this.formData = { ...this.formData, ...newData }
      }
    },
    updateItems(newItems) {
      if (JSON.stringify(this.items) !== JSON.stringify(newItems)) {
        this.items = [...newItems]
      }
    },
    addItem() {
      this.items.push({ description: '', quantity: 1, total: '', isPredefined: false })
    },
    showStatus(message, isSuccess = true) {
      this.statusMessage = message
      this.isStatusSuccess = isSuccess

      setTimeout(() => {
        this.statusMessage = ''
      }, 5000)
    },

    /**
     * One action: build the PDF, attach it to a booking (linking to an existing
     * one where chosen, so a synced TimeTree event never gets duplicated), then
     * show it.
     *
     * The PDF is shown from the copy in memory, not from Storage. It used to be
     * shown from its download URL, which made the upload a step everything else
     * waited on - and when Storage started refusing writes (see the note on
     * uploadPdf below) the invoice could not be produced at all, even though
     * the browser was holding a finished PDF the whole time.
     */
    async generateInvoice() {
      if (this.busy) return
      this.busy = true

      // Opened synchronously: iOS Safari blocks window.open once we have
      // awaited. Not opened at all where the share sheet is the better answer,
      // which is every phone - a blob URL in a new tab is the thing that made
      // saving an invoice on a phone so awkward in the first place.
      const viewer = this.canShare ? null : window.open('', '_blank')
      let createdId = null

      try {
        this.showStatus('Generating invoice...', true)

        const pdfBlob = await this.generatePDFBlob()
        if (!pdfBlob) throw new Error('Failed to generate PDF')

        // Reserved before the write so the number is unique even if two tabs save at once.
        const invoiceNumber = await nextInvoiceNumber()

        const fileName = invoiceFileName({
          invoiceNumber,
          clientName: this.formData.name,
          invoiceDate: this.formData.invoiceDate,
        })

        // Handed over before the record is written. Whatever happens next,
        // Caroline has the invoice she asked for.
        this.ready = { blob: pdfBlob, fileName, invoiceNumber }
        if (viewer) showPdfBlob(viewer, pdfBlob, fileName)

        const invoiceData = {
          invoiceNumber,
          clientName: this.formData.name.trim(),
          phone: this.formData.phone.trim(),
          address: this.formData.address.trim(),
          appointmentDate: this.formData.appointmentDate,
          appointmentTime: this.formData.appointmentTime,
          invoiceDate: this.formData.invoiceDate,
          services: this.getServicesData(),
          subtotal: this.calculateSubtotal(),
          paid: this.calculateSubtotal() / 2,
          balance: this.calculateSubtotal() / 2,
          bank: this.formData.bank,
          accountName: this.formData.accountName,
          accountNo: this.formData.accountNo,
          hasInvoice: true,
          updatedAt: new Date(),
        }

        let appointmentId = this.linkedEventId
        if (appointmentId) {
          await updateDoc(doc(db, 'appointments', appointmentId), invoiceData)
        } else {
          const docRef = await addDoc(collection(db, 'appointments'), {
            ...invoiceData,
            createdAt: new Date(),
          })
          appointmentId = docRef.id
          createdId = appointmentId
        }

        // Past the point of no return: the booking is now marked invoiced, so
        // nothing below may throw its way into the rollback.
        const stored = await this.uploadPdf(appointmentId, pdfBlob)

        this.showStatus(
          stored
            ? `Invoice ${invoiceNumber} generated.`
            : `Invoice ${invoiceNumber} generated. The booking is saved, but the archive copy ` +
                `could not be stored - Firebase Storage is turning writes away. Save the PDF ` +
                `below to keep it.`,
          true,
        )
        this.linkedEventId = ''
        await this.loadCalendarEvents()
      } catch (error) {
        console.error('Error generating invoice:', error)
        // Only ever undo a booking we created; never delete one we linked to.
        if (createdId) {
          await deleteDoc(doc(db, 'appointments', createdId)).catch(() => {})
        }
        this.showStatus('Error generating invoice: ' + error.message, false)
      } finally {
        this.busy = false
      }
    },

    /**
     * Keep a permanent copy in Storage, and carry on if that is not possible.
     *
     * Cloud Storage for Firebase needs an open billing account for any bucket
     * made after October 2024, and this one was made in November 2025. When the
     * project's billing account closed, every upload started coming back 402,
     * which the SDK reports as `storage/quota-exceeded` - a misleading message,
     * since the bucket holds 14 MB of a 5 GB allowance.
     *
     * So the upload is best-effort: it records pdfUrl when it works, and the
     * invoice list rebuilds the PDF from the saved record when it does not.
     * Nothing here needs changing when billing is restored - it simply starts
     * succeeding again.
     */
    async uploadPdf(appointmentId, pdfBlob) {
      try {
        const storageRef = ref(storage, `invoices/${appointmentId}.pdf`)
        await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' })
        const pdfUrl = await getDownloadURL(storageRef)

        await updateDoc(doc(db, 'appointments', appointmentId), {
          pdfUrl,
          pdfFileName: `invoice_${appointmentId}.pdf`,
          updatedAt: new Date(),
        })
        return pdfUrl
      } catch (error) {
        console.warn('Invoice saved, but the PDF could not be stored:', error)
        return null
      }
    },

    /** The preview is the source of the PDF, and it is always on the page. */
    async generatePDFBlob() {
      return buildInvoicePdfBlob(document.getElementById('paper'))
    },

    /**
     * Hand the finished PDF to the phone's share sheet, or save it.
     *
     * Called straight from the tap, with nothing awaited in front of it, which
     * is the condition iOS puts on opening the sheet at all.
     */
    async savePdf() {
      if (!this.ready) return
      try {
        await deliverPdf(this.ready.blob, this.ready.fileName)
      } catch (err) {
        this.showStatus('Could not save that PDF: ' + err.message, false)
      }
    },

    getServicesData() {
      const services = []
      this.items.forEach((item) => {
        if (item.description) {
          services.push({
            description: item.description,
            quantity: item.quantity,
            total: item.total,
            numericTotal: Number(String(item.total).replace(/[^\d]/g, '')) || 0,
          })
        }
      })
      return services
    },
    calculateSubtotal() {
      let subtotal = 0
      this.items.forEach((item) => {
        if (item.description) {
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
/* minmax(0, 1fr) rather than 1fr: a grid track's default min-width is `auto`,
   which refuses to shrink below its content. The preview holds a fixed 794px
   A4 page, so the track never dropped below 794px and the whole page panned
   sideways on anything narrower than about 1400px - including a laptop. */
.app {
  max-width: var(--page-w);
  margin: 24px auto;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 560px minmax(0, 1fr);
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

/* Same reason: these sit between the track and the paper, and each one would
   otherwise re-assert the paper's intrinsic width on the way back up. */
.preview-section,
.form-section {
  min-width: 0;
}

.preview-title {
  display: none;
  font-size: 20px;
  font-weight: 600;
  color: #111;
  margin-bottom: 16px;
  align-items: center;
  gap: 8px;
}

.preview-title i {
  color: #666;
}

/* ---------- the finished PDF ---------- */

.ready {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #ddd8c6;
  border-left: 4px solid #1d1d1d;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.ready__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ready__text strong {
  font-size: 15px;
}

/* The name the file will be saved under, shown because it is the thing you
   will be looking for in Files or in a chat thread an hour later. It wraps
   rather than truncates - a name you cannot read in full is no use. */
.ready__file {
  font-size: 12px;
  color: #6b665e;
  word-break: break-all;
}

.ready__btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 18px;
  border: none;
  border-radius: 10px;
  background: var(--btn-bg);
  color: var(--btn-fg);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.ready__btn:hover {
  background: var(--btn-bg-hover);
}

@media (max-width: 1200px) {
  .app {
    grid-template-columns: 480px minmax(0, 1fr);
    gap: 20px;
  }
}

/* One column from here down - which is a half-screen window as much as it is a
   phone. Two columns below about 1000px gives the form a track too narrow for
   a row of invoice-item fields and the preview a page it has to shrink to 45%
   to show, so neither half is usable. Stacked, the form gets the full width
   and the preview sits under it at a readable size. */
@media (max-width: 1024px) {
  .app {
    margin: 16px auto;
    padding: 0 12px;
    gap: 20px;
    display: flex;
    flex-direction: column;
  }

  .preview-title {
    display: flex;
  }

  .form-section,
  .preview-section {
    display: block;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .app {
    margin: 12px auto;
    padding: 0 8px;
    gap: 16px;
  }

  .preview-title {
    font-size: 18px;
  }

  .ready {
    padding: 14px;
  }

  .ready__btn {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .app {
    margin: 8px auto;
    padding: 0 6px;
    gap: 12px;
  }

  .preview-title {
    font-size: 16px;
  }
}
</style>
