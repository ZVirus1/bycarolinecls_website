import { whatsappNumber } from '../content/site.js'

/**
 * Builds a wa.me link with a pre-filled message.
 * wa.me works on both mobile (opens the app) and desktop (opens WhatsApp Web).
 */
export function whatsappLink(message) {
  const base = `https://wa.me/${whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export function enquiryMessage({ service, date, time } = {}) {
  const lines = ['Hi Caroline! I would like to enquire about a booking.']
  if (service) lines.push(`Service: ${service}`)
  if (date) lines.push(`Preferred date: ${formatDate(date)}`)
  if (time) lines.push(`Preferred time: ${time}`)
  lines.push('', 'Could you let me know your availability? Thank you!')
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
