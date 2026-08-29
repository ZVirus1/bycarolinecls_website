/**
 * All editable site content lives here.
 * Change copy, prices, links and portfolio entries in this one file -
 * you should never need to touch a component to update the site.
 */

/**
 * Hero image for the landing page.
 * Drop the file into apps/site/public/ and set the path here, e.g. '/hero.jpg'.
 * Leave null to show a placeholder instead of a broken image.
 * Use a wide, high-resolution shot - it renders full-bleed.
 */
export const heroImage = null

export const business = {
  name: 'Bycarolinecls',
  tagline: 'Professional Hair and Makeup Artist',
  artist: 'Caroline',
  // Shown under the hero headline
  intro:
    'Hello, I am Caroline, a professional hair and makeup artist. My passion is not only the art of makeup, but making every person feel completely themselves on the days that matter most.',
  location: 'Medan, Indonesia',
  email: 'hello@bycarolinecls.com',
  domain: 'bycarolinecls.com',
}

// International format, digits only, no + or spaces.
// Source: +62 895 3213 53193
export const whatsappNumber = '62895321353193'

export const socials = [
  { label: 'Instagram', href: 'https://instagram.com/bycarolinecls', icon: 'instagram' },
  { label: 'WhatsApp', href: `https://wa.me/${whatsappNumber}`, icon: 'whatsapp' },
]

export const nav = [
  { label: 'Home', to: '/' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
]

/**
 * Portfolio entries.
 * Drop images into apps/site/public/portfolio/ and reference them as
 * '/portfolio/filename.jpg'. Keep `alt` descriptive - it matters for
 * accessibility and for Google Images traffic.
 */
export const portfolio = [
  // { src: '/portfolio/wedding-01.jpg', alt: 'Bridal makeup, soft glam', category: 'Wedding' },
]

export const portfolioCategories = ['All', 'Wedding', 'Party', 'Prewedding', 'Graduation']

export const about = {
  heading: 'About',
  body: [
    'Replace this with your story: how you started, what you specialise in, and what a client can expect when they book with you.',
    'A second paragraph works well for training, certifications, or the products you use.',
  ],
}

export const bookingNote =
  'Tell me the date and service you have in mind and send it over on WhatsApp. I will check my diary and confirm within 24 hours.'
