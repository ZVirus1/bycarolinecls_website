import { whatsappNumber } from '../content/site.js'

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
 */
export function enquiryMessage({ service, date, time } = {}) {
  const lines = ['Hi Caroline!', '']

  lines.push(
    date
      ? 'I would like to enquire about a booking.'
      : 'I would like to ask about your services and prices.',
  )

  if (service) lines.push(`Service: ${service}`)
  if (date) lines.push(`Preferred date: ${formatDate(date)}`)
  if (time) lines.push(`Preferred time: ${time}`)

  lines.push(
    '',
    date
      ? 'Could you let me know if you are free? Thank you!'
      : 'Could you send me your latest pricelist? Thank you!',
  )

  return lines.join('\n')
}

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00`)
  return isNaN(d)
    ? iso
    : d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}
