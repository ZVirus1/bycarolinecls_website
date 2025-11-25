<template>
  <div class="invoice-container">
    <div class="form-section">
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

    <div class="preview-section">
      <h3 class="preview-title"><i class="fas fa-eye"></i> Preview</h3>
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
    }
  },
  methods: {
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

        // Wait for all resources to load
        await new Promise((resolve) => setTimeout(resolve, 1000))

        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready
        }

        const canvas = await html2canvas(paperEl, {
          scale: 2,
          backgroundColor: '#f5f5ef',
          useCORS: true,
          logging: false,
          allowTaint: true,
          imageTimeout: 30000,
          onclone: function (clonedDoc) {
            const images = clonedDoc.querySelectorAll('img')
            images.forEach((img) => {
              if (!img.hasAttribute('crossOrigin')) {
                img.setAttribute('crossOrigin', 'anonymous')
              }
            })
          },
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)

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

        pdf.addImage(imgData, 'JPEG', 0, offsetY, finalWidth, finalHeight)
        pdf.save('invoice.pdf')

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
        setTimeout(() => {
          html2canvas(paperEl, {
            scale: 2,
            backgroundColor: '#f5f5ef',
            useCORS: true,
            logging: false,
            allowTaint: true,
            imageTimeout: 30000,
            onclone: function (clonedDoc) {
              const images = clonedDoc.querySelectorAll('img')
              images.forEach((img) => {
                if (!img.hasAttribute('crossOrigin')) {
                  img.setAttribute('crossOrigin', 'anonymous')
                }
              })
            },
          })
            .then((canvas) => {
              try {
                const imgData = canvas.toDataURL('image/jpeg', 0.95)
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
        }, 1000)
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
.invoice-container {
  max-width: 1250px;
  margin: 24px auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

.preview-title {
  font-size: 20px;
  font-weight: 600;
  color: #111;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-title i {
  color: #666;
}

/* Responsive design */
@media (max-width: 768px) {
  .invoice-container {
    margin: 16px auto;
    padding: 0 12px;
    gap: 20px;
  }

  .preview-title {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .invoice-container {
    margin: 12px auto;
    padding: 0 8px;
    gap: 16px;
  }

  .preview-title {
    font-size: 16px;
  }
}
</style>
