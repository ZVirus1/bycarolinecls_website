import { whatsappNumber } from '../content/site.js'
import { DEFAULT_LOCALE, translate } from '../i18n/index.js'

/**
 * Builds a wa.me link with a pre-filled message.
 * wa.me works on both mobile (opens the app) and desktop (opens WhatsApp Web).
 */
export function whatsappLink(message) {
  const base = `https://wa.me/${whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/**
 * The one message the site sends. There is no separate pricelist route any
 * more: someone who has not picked a date is asking what things cost, so the
 * message asks for the pricelist; someone who has is asking about that date.
 * Either way it is the same form and the same button.
 *
 * The message follows the language of the page it was sent from - a bride
 * reading the Indonesian site should not open a chat that greets her in
 * English. The service name stays as-is: it is the same string Caroline reads
 * off the pricelist and puts on the invoice.
 */
export function enquiryMessage({ service, date, time, locale = DEFAULT_LOCALE } = {}) {
  const t = (key) => translate(locale, key)
  const lines = ['Hi Caroline!', '']

  lines.push(date ? t('wa.enquiry') : t('wa.prices'))

  if (service) lines.push(`${t('wa.service')}: ${service}`)
  if (date) lines.push(`${t('wa.date')}: ${formatDate(date, locale)}`)
  if (time) lines.push(`${t('wa.time')}: ${time}`)

  lines.push('', date ? t('wa.closeDate') : t('wa.closePrices'))

  return lines.join('\n')
}

function formatDate(iso, locale) {
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d)
    ? iso
    : d.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}
