<template>
  <div class="app">
    <!-- Mobile Preview Toggle -->
    <div class="mobile-preview-toggle" v-if="isMobile">
      <button
        class="toggle-btn"
        :class="{ active: showPreview }"
        @click="showPreview = !showPreview"
      >
        <i class="fas" :class="showPreview ? 'fa-edit' : 'fa-eye'"></i>
        {{ showPreview ? ' Edit Form' : ' Preview' }}
      </button>
    </div>

    <!-- ============ LEFT: FORM ============ -->
    <div class="form-section" :class="{ 'hidden-on-mobile': isMobile && showPreview }">
      <InvoiceForm
        :form-data="formData"
        :items="items"
        :status-message="statusMessage"
        :is-status-success="isStatusSuccess"
        @update:form-data="updateFormData"
        @update:items="updateItems"
        @add-item="addItem"
        @download-pdf="downloadPDF"
        @save-to-cloud="saveToCloud"
      />
    </div>

    <!-- ============ RIGHT: PREVIEW PAPER ============ -->
    <div class="preview-section" :class="{ 'hidden-on-mobile': isMobile && !showPreview }">
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
} from '../stores/firebase.js'
import { nextInvoiceNumber } from '../stores/invoices.js'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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
      items: [
        { description: 'Makeup Bride Full Day', quantity: 1, total: '8000000', isPredefined: true },
        { description: '', quantity: 1, total: '', isPredefined: false },
      ],
      statusMessage: '',
      isStatusSuccess: true,
      showPreview: false,
      isMobile: false,
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

    getInvoiceFileName() {
      // Use customer name from form, fallback to 'Client'
      const rawName = (this.formData.name || 'Client').trim()

      // Turn spaces into dashes and strip weird characters
      const safeName =
        rawName
          .replace(/\s+/g, '-') // spaces -> dashes
          .replace(/[^a-zA-Z0-9\-]/g, '') || // only keep letters, numbers, dashes
        'Client'

      return `Bycarolinecls-Invoice-${safeName}.pdf`
    },

    async capturePdfCanvas() {
      const paperEl = document.getElementById('paper')
      if (!paperEl) {
        throw new Error('Invoice preview not found')
      }

      // Temporarily remove shadow/border to avoid dark halo/shade in the PDF (especially on iOS)
      const originalBoxShadow = paperEl.style.boxShadow
      const originalBorder = paperEl.style.border
      paperEl.style.boxShadow = 'none'
      paperEl.style.border = 'none'

      try {
        // Give layout/fonts a moment to settle
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready
        }

        const canvas = await html2canvas(paperEl, {
          scale: 2,
          backgroundColor: '#f5f5ef',
          logging: false,
          useCORS: true,
        })

        return canvas
      } finally {
        // Restore original visuals for the live preview
        paperEl.style.boxShadow = originalBoxShadow
        paperEl.style.border = originalBorder
      }
    },

    async downloadPDF() {
      try {
        // Reuse the same PDF generation logic as "saveToCloud"
        const pdfBlob = await this.generatePDFBlob()
        const fileName = this.getInvoiceFileName()

        // 1) Always trigger classic download (desktop + mobile)
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // 2) Optional: on mobile, ALSO open the native share sheet with the PDF file only
        const hasNavigator = typeof navigator !== 'undefined'
        const canShareFiles =
          this.isMobile && // only attempt on mobile, not desktop
          hasNavigator &&
          'share' in navigator &&
          'canShare' in navigator

        if (canShareFiles) {
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

          // We ONLY share the file – no URL passed here
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Invoice',
                text: 'Invoice from Bycarolinecls',
              })
            } catch (shareError) {
              // User cancelled or share failed; we already downloaded, so just log it
              console.warn('Share cancelled or failed:', shareError)
            }
          }
        }

        this.showStatus('PDF generated successfully!', true)
      } catch (error) {
        console.error('Error generating PDF:', error)
        this.showStatus('Error generating PDF. Please try again.', false)
      }
    },

    async saveToCloud() {
      try {
        this.showStatus('Generating PDF and saving to cloud...', true)

        const pdfBlob = await this.generatePDFBlob()

        if (!pdfBlob) {
          throw new Error('Failed to generate PDF')
        }

        // Reserved before the write so the number is unique even if two tabs
        // save at once.
        const invoiceNumber = await nextInvoiceNumber()

        const appointmentData = {
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
          createdAt: new Date(),
        }

        const docRef = await addDoc(collection(db, 'appointments'), appointmentData)
        const appointmentId = docRef.id

        try {
          const storageRef = ref(storage, `invoices/${appointmentId}.pdf`)
          await uploadBytes(storageRef, pdfBlob, {
            contentType: 'application/pdf',
          })

          const pdfUrl = await getDownloadURL(storageRef)
          await updateDoc(doc(db, 'appointments', appointmentId), {
            pdfUrl: pdfUrl,
            pdfFileName: `invoice_${appointmentId}.pdf`,
            updatedAt: new Date(),
          })

          this.showStatus(`Saved invoice ${invoiceNumber} to cloud and calendar!`, true)

          setTimeout(() => {
            this.$router.push('/calendar')
          }, 2000)
        } catch (storageError) {
          console.error('Storage error:', storageError)
          await deleteDoc(doc(db, 'appointments', appointmentId))
          throw new Error('Failed to upload PDF to storage: ' + storageError.message)
        }
      } catch (error) {
        console.error('Error saving to cloud:', error)
        this.showStatus('Error saving to cloud: ' + error.message, false)
      }
    },

    async generatePDFBlob() {
      const previousShowPreview = this.showPreview

      try {
        if (this.isMobile) {
          this.showPreview = true
          await this.$nextTick()
        }

        const canvas = await this.capturePdfCanvas()
        const imgData = canvas.toDataURL('image/png')

        const pdf = new jsPDF({
          unit: 'pt',
          format: 'a4',
          compress: true,
        })

        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const imgW = pageW
        const imgH = (canvas.height * imgW) / canvas.width

        const scale = Math.min(1, pageH / imgH)
        const finalHeight = imgH * scale
        const finalWidth = imgW * scale
        const offsetY = (pageH - finalHeight) / 2

        pdf.addImage(imgData, 'PNG', 0, offsetY, finalWidth, finalHeight)

        const pdfBlob = pdf.output('blob')

        if (!pdfBlob || pdfBlob.size === 0) {
          throw new Error('Generated PDF is empty')
        }

        return pdfBlob
      } finally {
        if (this.isMobile) {
          this.showPreview = previousShowPreview
        }
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
.app {
  max-width: 1250px;
  margin: 24px auto;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 460px 1fr;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

.mobile-preview-toggle {
  display: none;
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

.toggle-btn {
  width: 100%;
  padding: 12px 16px;
  background: #111;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.toggle-btn.active {
  background: #333;
}

.hidden-on-mobile {
  display: none;
}

/* Enhanced Responsive Design */
@media (max-width: 1200px) {
  .app {
    grid-template-columns: 400px 1fr;
    gap: 20px;
  }
}

@media (max-width: 1024px) {
  .app {
    grid-template-columns: 350px 1fr;
    gap: 16px;
  }
}

/* Mobile-first approach for smaller screens */
@media (max-width: 768px) {
  .app {
    margin: 16px auto;
    padding: 0 12px;
    gap: 20px;
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
  }

  .mobile-preview-toggle {
    display: block;
    margin-bottom: 0;
  }

  .preview-title {
    display: flex;
  }

  .form-section,
  .preview-section {
    display: block;
    width: 100%;
  }

  .hidden-on-mobile {
    display: none;
  }

  .toggle-btn {
    padding: 12px 16px;
    font-size: 16px;
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
