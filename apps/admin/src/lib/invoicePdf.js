import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Turning the on-screen invoice into a PDF.
 *
 * Lives here rather than in InvoiceView because two screens need it: the
 * generator, and the invoice list rebuilding a PDF for a record whose stored
 * copy never made it to Storage.
 */

/**
 * Screenshot the A4 page and wrap it in a PDF.
 *
 * `paperEl` is the 794x1123 `.paper` element inside an InvoicePreview.
 */
export async function buildInvoicePdfBlob(paperEl) {
  if (!paperEl) throw new Error('Invoice preview not found')

  // The preview scales itself to fit its column, and on a phone it is capped
  // at 60%. Captured as-is, that scale went straight into the PDF and the
  // invoice came out soft. The transform is neutralised for the capture and
  // put back afterwards; Vue owns the style binding, so it restores this
  // itself on the next render even if something here throws.
  const original = {
    transform: paperEl.style.transform,
    boxShadow: paperEl.style.boxShadow,
    border: paperEl.style.border,
  }
  paperEl.style.transform = 'none'
  // Shadow and border would otherwise print as a grey halo down two edges,
  // which is most obvious on iOS.
  paperEl.style.boxShadow = 'none'
  paperEl.style.border = 'none'

  try {
    // Webfonts first: html2canvas paints whatever is laid out at the moment it
    // runs, and a fallback face changes every line break on the page.
    if (document.fonts?.ready) await document.fonts.ready
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)))

    const canvas = await html2canvas(paperEl, {
      scale: 2,
      backgroundColor: '#f5f5ef',
      logging: false,
      useCORS: true,
    })

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    // JPEG, not PNG. A PNG of a full-page screenshot is lossless and enormous:
    // the first invoice this app ever produced is 14 MB in Storage. At 0.92 the
    // difference is invisible on a page of flat colour and black text, and the
    // file comes out around fifty times smaller.
    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    const imgH = (canvas.height * pageW) / canvas.width
    const scale = Math.min(1, pageH / imgH)
    const finalWidth = pageW * scale
    const finalHeight = imgH * scale

    pdf.addImage(
      imgData,
      'JPEG',
      (pageW - finalWidth) / 2,
      (pageH - finalHeight) / 2,
      finalWidth,
      finalHeight,
    )

    const blob = pdf.output('blob')
    if (!blob || blob.size === 0) throw new Error('Generated PDF is empty')
    return blob
  } finally {
    paperEl.style.transform = original.transform
    paperEl.style.boxShadow = original.boxShadow
    paperEl.style.border = original.border
  }
}

/** invoice_INV-2026-0007_Cindy.pdf - the name a download lands under. */
export function invoiceFileName(invoice = {}) {
  const who = String(invoice.clientName || 'Client')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
  const number = invoice.invoiceNumber || invoice.appointmentDate || 'invoice'
  return `invoice_${number}${who ? '_' + who : ''}.pdf`
}

/**
 * Turn a saved appointment back into the shape InvoicePreview takes, so a PDF
 * can be rebuilt from the record long after the browser that made it is gone.
 */
export function invoiceToPreviewProps(invoice = {}) {
  return {
    formData: {
      name: invoice.clientName || '',
      phone: invoice.phone || '',
      address: invoice.address || '',
      invoiceDate: invoice.invoiceDate || invoice.appointmentDate || '',
      appointmentDate: invoice.appointmentDate || '',
      appointmentTime: invoice.appointmentTime || '',
      bank: invoice.bank || '',
      accountName: invoice.accountName || '',
      accountNo: invoice.accountNo || '',
    },
    items: (invoice.services ?? []).map((s) => ({
      description: s.description || '',
      quantity: Number(s.quantity) || 1,
      // The preview strips non-digits itself, so either shape survives.
      total: s.total ?? s.numericTotal ?? '',
      isPredefined: false,
    })),
  }
}

/**
 * Show a PDF the browser already holds.
 *
 * `viewer` is a tab opened synchronously on the click - iOS Safari refuses
 * window.open once anything has been awaited, so the caller opens it first and
 * passes it in, even though the PDF does not exist yet at that point.
 *
 * The tab gets a small page of our own around the PDF rather than the raw blob
 * URL. Three reasons: a browser set to download PDFs instead of displaying
 * them leaves a raw blob tab blank; a blob URL saves under a random id, while
 * the link here saves under the invoice's name; and the tab's title reads as
 * the invoice rather than as a UUID.
 *
 * The object URL is deliberately never revoked - the tab we just handed it to
 * would go blank. It is released when this page unloads.
 */
export function showPdfBlob(viewer, blob, fileName = 'invoice.pdf') {
  const url = URL.createObjectURL(blob)
  // Handy when something goes wrong: the last PDF is reachable from the
  // console without regenerating it.
  window.__lastPdfUrl = url

  if (!viewer || viewer.closed) {
    // Popup blocked, or the tab was closed while the PDF was building.
    window.open(url, '_blank', 'noopener')
    return url
  }

  try {
    const d = viewer.document
    d.title = fileName.replace(/\.pdf$/, '')

    // Built as nodes, not as a string of HTML: the file name carries a client's
    // name, and that should never be parsed as markup.
    const style = d.createElement('style')
    style.textContent =
      'html,body{margin:0;height:100%;background:#f3f1ea;' +
      'font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d1d1d}' +
      'header{display:flex;align-items:center;justify-content:space-between;gap:16px;' +
      'padding:10px 14px;border-bottom:1px solid #ddd8c6;background:#fff}' +
      'strong{font-weight:600}' +
      'a{display:inline-block;padding:9px 16px;border-radius:8px;background:#1d1d1d;' +
      'color:#fff;text-decoration:none;font-weight:600}' +
      'iframe{display:block;width:100%;height:calc(100% - 45px);border:0}'
    d.head.appendChild(style)

    const header = d.createElement('header')
    const name = d.createElement('strong')
    name.textContent = fileName
    const save = d.createElement('a')
    save.href = url
    save.download = fileName
    save.textContent = 'Download'
    header.append(name, save)

    const frame = d.createElement('iframe')
    frame.src = url
    frame.title = fileName

    d.body.append(header, frame)
  } catch {
    // Cross-origin or a tab we cannot write to: the plain URL still works.
    viewer.location.href = url
  }
  return url
}
