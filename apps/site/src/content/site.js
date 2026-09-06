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
/**
 * The homepage banner: three portraits side by side, with the mark and
 * headline over the middle one. Three rather than one because the work spans
 * quite different traditions and a single photo can only argue for one of
 * them. Order is left, centre, right - the centre panel is the one carrying
 * the text, so it wants a composition that survives a scrim.
 *
 * On phones only the centre panel shows: three slivers on a 375px screen
 * would be three unreadable stripes.
 */
export const heroImages = [
  {
    src: '/portfolio/bridal-hijab-headpiece.webp',
    alt: 'Bridal makeup with hijab and a floral pearl headpiece',
  },
  // Centre deliberately: it is the darkest of the three, and it is the panel
  // carrying white type. A bright photo here needs a scrim heavy enough to
  // flatten the makeup before the mark becomes legible.
  {
    src: '/portfolio/bridal-beaded-cape.webp',
    alt: 'Evening bridal makeup with a velvet cape and a beaded gown',
  },
  {
    src: '/portfolio/bridal-feather.webp',
    alt: 'Luminous bridal makeup with a feathered bodice and a soft rose lip',
  },
]

export const business = {
  name: 'Bycarolinecls',
  tagline: 'Bridal Makeup Artist',
  artist: 'Caroline',
  // Shown under the hero headline
  intro:
    'Hello, I am Caroline, a bridal makeup artist. My passion is not only the art of makeup, but making every bride feel completely herself on the day that matters most.',
  location: 'Medan, Indonesia',
  email: 'hello@bycarolinecls.com',
  domain: 'bycarolinecls.com',
}

// International format, digits only, no + or spaces.
// Source: +62 895 3213 53193
export const whatsappNumber = '62895321353193'

export const instagramHandle = 'bycarolinecls'
export const instagramUrl = `https://www.instagram.com/${instagramHandle}/`

export const socials = [
  { label: 'Instagram', href: instagramUrl, icon: 'instagram' },
  { label: 'WhatsApp', href: `https://wa.me/${whatsappNumber}`, icon: 'whatsapp' },
]

// `cta: true` marks the item that gets button styling in the header and the
// mobile menu, so the call to action lives in one list rather than being
// hardcoded into the header twice.
export const nav = [
  { label: 'Home', to: '/' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'About', to: '/about' },
  { label: 'Contact me', to: '/book', cta: true },
]

/**
 * Portfolio FALLBACK.
 *
 * The portfolio is normally the live Instagram feed (see /api/instagram). This
 * bundled set is what shows when the feed is not configured yet or Instagram
 * is unreachable, so the page is never empty - it is not the primary source
 * and does not need to stay in step with the account.
 *
 * Images live in apps/site/public/portfolio/ as 900x1125 WebP (4:5, the shape
 * they were shot in - nothing is cropped to a landscape it was never framed
 * for). To add one, drop the file in and add a line here.
 *
 * `alt` describes the LOOK, never the client: no names, no handles, no
 * credits anywhere on this site. It is what a screen reader announces and
 * what Google Images indexes, so keep it specific about the makeup.
 */
export const portfolio = [
  {
    src: '/portfolio/bridal-hijab-headpiece.webp',
    alt: 'Bridal makeup with hijab and a floral pearl headpiece',
  },
  {
    src: '/portfolio/traditional-indian.webp',
    alt: 'Indian bridal makeup with kundan jewellery and a soft matte base',
  },
  { src: '/portfolio/evening-gold.webp', alt: 'Evening makeup in gold with a veiled fascinator' },
  {
    src: '/portfolio/editorial-monochrome.webp',
    alt: 'Monochrome editorial makeup with sculpted brows and glossed lips',
  },
  {
    src: '/portfolio/bridal-ball-gown.webp',
    alt: 'Soft bridal makeup with a beaded ball gown and a dewy skin finish',
  },
  {
    src: '/portfolio/traditional-chindian.webp',
    alt: 'Traditional bridal makeup with maang tikka and statement eyes',
  },
  { src: '/portfolio/evening-teal.webp', alt: 'Party makeup with a soft warm eye and a peach lip' },
  {
    src: '/portfolio/editorial-beret.webp',
    alt: 'Polished daytime makeup with a soft flush and a pink beret',
  },
  {
    src: '/portfolio/bridal-feather.webp',
    alt: 'Luminous bridal makeup with a feathered bodice and a soft rose lip',
  },
  {
    src: '/portfolio/traditional-gold.webp',
    alt: 'Traditional makeup with a gold headpiece and warm gilded tones',
  },
  {
    src: '/portfolio/evening-glow.webp',
    alt: 'Glowing evening makeup with a sculpted eye and gold jewellery',
  },
  {
    src: '/portfolio/editorial-waves.webp',
    alt: 'Warm honeyed makeup with a bronzed eye and a feathered neckline',
  },
  {
    src: '/portfolio/bridal-ball-gown.webp',
    alt: 'Soft bridal makeup with a beaded ball gown and a dewy skin finish',
  },
  {
    src: '/portfolio/traditional-sangjit.webp',
    alt: 'Sangjit ceremony makeup with warm gold tones and a floral bodice',
  },
  { src: '/portfolio/evening-silver.webp', alt: 'Evening makeup with smoked liner and a nude lip' },
  {
    src: '/portfolio/editorial-tailored.webp',
    alt: 'Clean tailored makeup with a satin skin finish',
  },
  {
    src: '/portfolio/bridal-lace-pearls.webp',
    alt: 'Bridal makeup with a lace bodice, pearls and a luminous base',
  },
  {
    src: '/portfolio/traditional-kebaya.webp',
    alt: 'Kebaya makeup in soft daylight with a satin skin finish',
  },
  {
    src: '/portfolio/evening-velvet.webp',
    alt: 'Sleek evening makeup with graphic liner and a berry lip',
  },
  {
    src: '/portfolio/evening-lace.webp',
    alt: 'Evening makeup with black lace and a warm bronzed eye',
  },
]

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
