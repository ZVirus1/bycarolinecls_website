/**
 * All editable site content lives here.
 * Change copy, prices, links and portfolio entries in this one file -
 * you should never need to touch a component to update the site.
 */

/**
 * Hero image for the landing page. Portrait, 4:5 - the hero is a two-column
 * editorial layout, not a full-bleed banner, so the photo keeps the shape it
 * was shot in and is never letterboxed or dimmed behind a scrim. Leave null to
 * show a placeholder instead of a broken image.
 */
export const heroImage = '/hero.webp'

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

// `cta: true` marks the item that gets button styling in the header and the
// mobile menu, so the call to action lives in one list rather than being
// hardcoded into the header twice.
export const nav = [
  { label: 'Home', to: '/' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'About', to: '/about' },
  { label: 'Enquire', to: '/book', cta: true },
]

/**
 * Portfolio entries.
 * Images live in apps/site/public/portfolio/ as 900x1125 WebP (4:5, the shape
 * they were shot in - nothing is cropped to a landscape it was never framed
 * for). To add one, drop the file in and add a line here.
 *
 * `alt` describes the LOOK, never the client: no names, no handles, no
 * credits anywhere on this site. It is what a screen reader announces and
 * what Google Images indexes, so keep it specific about the makeup.
 */
export const portfolio = [
  { src: '/portfolio/bridal-hijab-headpiece.webp', alt: 'Bridal makeup with hijab and a floral pearl headpiece', category: 'Bridal' },
  { src: '/portfolio/traditional-indian.webp', alt: 'Indian bridal makeup with kundan jewellery and a braided finish', category: 'Traditional' },
  { src: '/portfolio/evening-gold.webp', alt: 'Evening makeup in gold with a veiled fascinator', category: 'Evening' },
  { src: '/portfolio/editorial-monochrome.webp', alt: 'Monochrome editorial makeup with sculpted brows and glossed lips', category: 'Editorial' },
  { src: '/portfolio/bridal-ball-gown.webp', alt: 'Soft bridal makeup with a beaded ball gown and loose waves', category: 'Bridal' },
  { src: '/portfolio/traditional-chindian.webp', alt: 'Traditional bridal makeup with maang tikka and statement eyes', category: 'Traditional' },
  { src: '/portfolio/evening-teal.webp', alt: 'Party makeup with ombre curls and a soft warm eye', category: 'Evening' },
  { src: '/portfolio/editorial-beret.webp', alt: 'Polished daytime makeup with a soft flush and a pink beret', category: 'Editorial' },
  { src: '/portfolio/bridal-feather.webp', alt: 'Luminous bridal makeup with a feathered bodice and soft updo', category: 'Bridal' },
  { src: '/portfolio/traditional-gold.webp', alt: 'Traditional makeup with a gold headpiece and warm gilded tones', category: 'Traditional' },
  { src: '/portfolio/evening-glow.webp', alt: 'Glowing evening makeup with a sculpted eye and gold jewellery', category: 'Evening' },
  { src: '/portfolio/editorial-waves.webp', alt: 'Warm honeyed makeup with blonde waves and a feathered neckline', category: 'Editorial' },
  { src: '/portfolio/bridal-beaded-cape.webp', alt: 'Evening bridal makeup with a beaded gown and velvet cape', category: 'Bridal' },
  { src: '/portfolio/traditional-sangjit.webp', alt: 'Sangjit ceremony makeup with gold hairpins and a floral bodice', category: 'Traditional' },
  { src: '/portfolio/evening-silver.webp', alt: 'Evening makeup with a high ponytail and smoked liner', category: 'Evening' },
  { src: '/portfolio/editorial-tailored.webp', alt: 'Clean tailored makeup with a satin skin finish', category: 'Editorial' },
  { src: '/portfolio/bridal-lace-pearls.webp', alt: 'Bridal makeup with lace bodice, pearls and brushed-out waves', category: 'Bridal' },
  { src: '/portfolio/traditional-kebaya.webp', alt: 'Kebaya makeup in soft daylight with a sleek low chignon', category: 'Traditional' },
  { src: '/portfolio/evening-velvet.webp', alt: 'Sleek evening makeup with graphic liner and a high chignon', category: 'Evening' },
  { src: '/portfolio/evening-lace.webp', alt: 'Evening makeup with black lace and a warm bronzed eye', category: 'Evening' },
]

export const portfolioCategories = ['All', 'Bridal', 'Traditional', 'Evening', 'Editorial']

export const about = {
  heading: 'About',
  body: [
    'Replace this with your story: how you started, what you specialise in, and what a client can expect when they book with you.',
    'A second paragraph works well for training, certifications, or the products you use.',
  ],
}

// Sits above BOTH routes on /book - the pricelist request and the date
// enquiry - so it must not assume the reader already has a date in mind.
export const bookingNote =
  'Prices, availability, or a date you already have in mind - it all comes to me on WhatsApp, and I reply within 24 hours.'

// Shown above the "Get our latest pricelist" button. Prices are not published
// on the site - every look is quoted on the day, the location and the party
// size, so the pricelist goes out over WhatsApp instead.
export const pricelistNote =
  'Every look is quoted to the date, the location and the size of your party, so I send the current pricelist over WhatsApp. Ask and it comes straight back to you.'
