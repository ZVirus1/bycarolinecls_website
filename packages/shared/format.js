export const rupiah = (num) =>
  !num || isNaN(num) || Number(num) === 0 ? '-' : 'Rp ' + Number(num).toLocaleString('id-ID') + ',-'

export const dmy = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

export const longDate = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export const escapeHtml = (s) =>
  s.replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m],
  )
