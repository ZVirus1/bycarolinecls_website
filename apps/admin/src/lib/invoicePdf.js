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
 * A4 at 300 dots per inch, which is the resolution a commercial printer asks
 * for and about as fine as a phone screen can resolve under a pinch-zoom.
 *
 * The page is laid out at 794 CSS pixels wide, and a CSS pixel is 1/96 inch, so
 * 300/96 is the factor the capture has to run at. The PDF this produces is
 * 2481 x 3509 pixels; the old one was 1588 x 2246, which works out at 192 dpi -
 * low enough that letterforms visibly softened on screen and printed furry.
 */
const CAPTURE_DPI = 300
const CSS_DPI = 96

/**
 * Fallback capture scales, tried in order.
 *
 * A 300 dpi A4 canvas is 8.7 megapixels. Safari on iOS refuses to allocate a
 * canvas past roughly 16.7 megapixels and, worse, hands back a blank one rather
 * than throwing, so each attempt is checked for actual content before it is
 * accepted. An older phone that cannot manage the first scale still gets an
 * invoice, just a less fine one.
 */
const CAPTURE_SCALES = [CAPTURE_DPI / CSS_DPI, 2.5, 2]

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

    const canvas = await captureAtBestScale(paperEl)

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    // Quality 0.98, not the 0.92 this used to carry. A page of hard black
    // edges on flat cream is the worst case for JPEG, and at 0.92 every letter
    // picked up a faint grey halo; 0.98 keeps 4:4:4 colour and costs about
    // 80 KB on a page this size. Measured on a real invoice: the whole PDF is
    // 340 KB at 300 dpi and 0.98.
    //
    // Not PNG, which would be lossless and is the obvious answer: jsPDF
    // re-encodes a PNG into the PDF rather than passing the original stream
    // through, and the same page came out at 25 MB.
    const imgData = canvas.toDataURL('image/jpeg', 0.98)

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
      undefined,
      // No downsampling on the way in - the whole point of the capture above.
      'NONE',
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

/**
 * Capture at the finest scale this device will actually give us.
 *
 * Steps down rather than failing: a blank or refused canvas on an older iPhone
 * should cost sharpness, never the invoice.
 */
async function captureAtBestScale(paperEl) {
  let lastError = null
  for (const scale of CAPTURE_SCALES) {
    try {
      const canvas = await html2canvas(paperEl, {
        scale,
        backgroundColor: '#f5f5ef',
        logging: false,
        useCORS: true,
      })
      if (canvas?.width > 0 && canvas.height > 0 && !isBlank(canvas)) return canvas
      lastError = new Error(`Capture at ${scale}x came back empty`)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError ?? new Error('Could not capture the invoice')
}

/**
 * True if nothing was drawn.
 *
 * The whole page squeezed into 64x64 and checked for any variation at all.
 * Sampling scanlines instead - which this used to do - needs a line that is
 * guaranteed to have ink on it, and an invoice has wide bands of empty cream
 * whose position moves the moment anything on the page is restyled.
 *
 * Reading one tiny canvas also keeps this off the hot path: a getImageData
 * over 8.7 megapixels is slow enough to notice on a phone.
 */
function isBlank(canvas) {
  try {
    const probe = document.createElement('canvas')
    probe.width = 64
    probe.height = 64
    const ctx = probe.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(canvas, 0, 0, 64, 64)
    const { data } = ctx.getImageData(0, 0, 64, 64)

    let min = 255
    let max = 0
    for (let i = 0; i < data.length; i += 4) {
      // Fully transparent counts as drawn-nothing, not as a light pixel.
      const v = data[i + 3] === 0 ? 255 : data[i]
      if (v < min) min = v
      if (v > max) max = v
    }
    // A page of flat ground has no spread; a page with ink on it has plenty.
    return max - min < 12
  } catch {
    // A tainted canvas cannot be read, but it did draw.
    return false
  }
}

/**
 * invoice_INV-2026-0007_Cindy.pdf - the name a download lands under.
 *
 * A settled invoice gets _PAID on the end, because the two versions of the
 * same invoice are otherwise the same file name, and the second one to be
 * saved would quietly overwrite the first in a downloads folder.
 */
export function invoiceFileName(invoice = {}, { paid = false } = {}) {
  const who = String(invoice.clientName || 'Client')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
  const number = invoice.invoiceNumber || invoice.appointmentDate || 'invoice'
  return `invoice_${number}${who ? '_' + who : ''}${paid ? '_PAID' : ''}.pdf`
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
    // Whether the invoice IS settled is the record's business; which version
    // to draw is the caller's, so `paid` is passed separately at the call site
    // and only the date travels with the record.
    paidDate: invoice.paidDate || invoice.invoiceDate || invoice.appointmentDate || '',
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
