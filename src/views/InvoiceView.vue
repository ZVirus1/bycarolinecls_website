<template>
  <div class="app">
    <!-- Mobile Preview Toggle -->
    <div class="mobile-preview-toggle" v-if="isMobile">
      <button
        class="toggle-btn"
        :class="{ active: showPreview }"
        @click="showPreview = !showPreview"
      >
        {{ showPreview ? '📝 Edit Form' : '👁️ Preview' }}
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
} from '../stores/firebase.js'
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
        bank: 'BCA',
        accountName: 'Caroline',
        accountNo: 'REDACTED-ACCOUNT-NO',
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
    async downloadPDF() {
      try {
        const paperEl = document.getElementById('paper')

        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready
        }

        const canvas = await html2canvas(paperEl, {
          scale: 2,
          backgroundColor: null,
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const imgW = pageW
        const imgH = canvas.height * (imgW / canvas.width)
        const offsetY = (pageH - imgH) / 2 > 0 ? (pageH - imgH) / 2 : 0

        pdf.addImage(imgData, 'PNG', 0, offsetY, imgW, imgH)
        pdf.save('invoice.pdf')
      } catch (error) {
        console.error('Error generating PDF:', error)
        this.showStatus('Error generating PDF: ' + error.message, false)
      }
    },
    async saveToCloud() {
      try {
        this.showStatus('Generating PDF and saving to cloud...', true)

        const pdfBlob = await this.generatePDFBlob()

        if (!pdfBlob) {
          throw new Error('Failed to generate PDF')
        }

        const appointmentData = {
          clientName: this.formData.name || 'REDACTED-NAME',
          phone: this.formData.phone || 'REDACTED-PHONE',
          address:
            this.formData.address || 'REDACTED-ADDRESS',
          appointmentDate: this.formData.appointmentDate,
          appointmentTime: this.formData.appointmentTime,
          invoiceDate: this.formData.invoiceDate,
          services: this.getServicesData(),
          subtotal: this.calculateSubtotal(),
          paid: this.calculateSubtotal() / 2,
          balance: this.calculateSubtotal() / 2,
          bank: this.formData.bank || 'BCA',
          accountName: this.formData.accountName || 'Caroline',
          accountNo: this.formData.accountNo || 'REDACTED-ACCOUNT-NO',
          hasInvoice: true,
          createdAt: new Date(),
        }

        const docRef = await addDoc(collection(db, 'appointments'), appointmentData)
        const appointmentId = docRef.id

        console.log('Appointment saved with ID:', appointmentId)

        try {
          const storageRef = ref(storage, `invoices/${appointmentId}.pdf`)
          console.log('Uploading PDF to storage...')

          await uploadBytes(storageRef, pdfBlob, {
            contentType: 'application/pdf',
          })

          console.log('PDF upload completed')

          const pdfUrl = await getDownloadURL(storageRef)
          console.log('PDF URL obtained:', pdfUrl)

          await updateDoc(doc(db, 'appointments', appointmentId), {
            pdfUrl: pdfUrl,
            pdfFileName: `invoice_${appointmentId}.pdf`,
            updatedAt: new Date(),
          })

          console.log('Firestore updated with PDF URL')

          this.showStatus('Successfully saved invoice to cloud and calendar!', true)

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
      return new Promise((resolve, reject) => {
        const paperEl = document.getElementById('paper')

        // Wait for fonts and images to load
        setTimeout(() => {
          html2canvas(paperEl, {
            scale: 2,
            backgroundColor: '#f5f5ef', // Explicit background color
            useCORS: true,
            logging: false,
            allowTaint: false,
            removeContainer: true,
            imageTimeout: 15000, // Increase timeout for iOS
            onclone: function (clonedDoc) {
              // Ensure all images have CORS attributes
              const images = clonedDoc.querySelectorAll('img')
              images.forEach((img) => {
                img.setAttribute('crossOrigin', 'anonymous')
              })
            },
          })
            .then((canvas) => {
              try {
                // Convert canvas to data URL with proper format
                const imgData = canvas.toDataURL('image/jpeg', 0.95) // Use JPEG for better iOS compatibility

                const pdf = new jsPDF({
                  unit: 'pt',
                  format: 'a4',
                  compress: true,
                })

                const pageW = pdf.internal.pageSize.getWidth()
                const pageH = pdf.internal.pageSize.getHeight()
                const imgW = pageW
                const imgH = (canvas.height * imgW) / canvas.width

                // Ensure image fits on page
                const scale = Math.min(1, pageH / imgH)
                const finalHeight = imgH * scale
                const finalWidth = imgW * scale
                const offsetY = (pageH - finalHeight) / 2

                pdf.addImage(imgData, 'JPEG', 0, offsetY, finalWidth, finalHeight)
                const pdfBlob = pdf.output('blob')

                if (!pdfBlob || pdfBlob.size === 0) {
                  reject(new Error('Generated PDF is empty'))
                } else {
                  resolve(pdfBlob)
                }
              } catch (error) {
                reject(new Error('PDF generation failed: ' + error.message))
              }
            })
            .catch((error) => {
              reject(new Error('Canvas generation failed: ' + error.message))
            })
        }, 1000) // Increased delay for iOS
      })
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
  margin-bottom: 16px;
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

@media (max-width: 900px) {
  .app {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Mobile-first approach for smaller screens */
@media (max-width: 768px) {
  .app {
    margin: 12px auto;
    padding: 0 8px;
    gap: 16px;
    grid-template-columns: 1fr;
  }

  .mobile-preview-toggle {
    display: block;
    margin-bottom: 12px;
  }

  .form-section,
  .preview-section {
    display: block;
  }

  .hidden-on-mobile {
    display: none;
  }

  .toggle-btn {
    padding: 10px 14px; /* Slightly smaller padding */
    font-size: 14px; /* Smaller font */
  }
}

@media (max-width: 480px) {
  .app {
    margin: 12px auto;
    padding: 0 8px;
    gap: 12px;
  }
}

@media (max-width: 360px) {
  .app {
    margin: 8px auto;
    padding: 0 6px;
    gap: 10px;
  }
}
</style>
