/**
 * Per-page, per-language search metadata, plus the structured data.
 *
 * Imported by BOTH the browser bundle and the Node prerender script, so it
 * stays dependency-free ESM. The prerenderer is what actually matters: social
 * crawlers (facebookexternalhit, LinkedInBot, Twitterbot, WhatsApp) never run
 * JavaScript, so anything set from Vue at runtime is invisible to them.
 */
import { DEFAULT_LOCALE, LOCALES, localePath } from './paths.js'

export const ORIGIN = 'https://bycarolinecls.com'

/** The routes worth indexing. `key` ties a route to its metadata below. */
export const PAGES = [
  { key: 'home', path: '/', priority: '1.0', changefreq: 'weekly' },
  { key: 'portfolio', path: '/portfolio', priority: '0.9', changefreq: 'daily' },
  { key: 'about', path: '/about', priority: '0.7', changefreq: 'monthly' },
  { key: 'book', path: '/book', priority: '0.9', changefreq: 'monthly' },
]

/**
 * Titles stay under ~60 characters and descriptions under ~155 so Google
 * shows them whole rather than truncating mid-sentence.
 *
 * The Indonesian set is not a translation of the English - it targets what
 * brides in Medan actually type: "MUA Medan", "makeup pengantin Medan",
 * "makeup artist pengantin". Translating the English titles literally would
 * have produced pages that rank for nothing.
 *
 * The one exception is the Indonesian home title, which carries "Bridal Makeup
 * Artist" rather than "Makeup Artist Pengantin" so that it matches the heading
 * on the page. "MUA Medan" - by far the higher-volume of the two terms - is
 * still first in the title, and "makeup pengantin" is still in the description,
 * the body copy and the other three Indonesian titles.
 */
export const SEO = {
  en: {
    home: {
      title: 'Bridal Makeup Artist in Medan | Bycarolinecls',
      description:
        'Bridal makeup by Caroline in Medan, Indonesia - weddings, engagements and prewedding. See the latest work and enquire on WhatsApp.',
    },
    portfolio: {
      title: 'Bridal Makeup Portfolio, Medan | Bycarolinecls',
      description:
        'Recent bridal, wedding and prewedding makeup by Caroline in Medan, straight from Instagram. Tap any look to open the post.',
    },
    about: {
      title: 'About Caroline, Bridal Makeup Artist in Medan',
      description:
        'Meet Caroline, a bridal makeup artist based in Medan, Indonesia - how she works, what she specialises in, and how to book a date.',
    },
    book: {
      title: 'Contact and Bookings | Bycarolinecls, Medan',
      description:
        'Ask about prices, availability or a date you already have in mind. Send your details to Caroline on WhatsApp and get a reply within 24 hours.',
    },
  },
  id: {
    home: {
      title: 'MUA Medan | Bridal Makeup Artist - Bycarolinecls',
      description:
        'Jasa makeup pengantin oleh Caroline di Medan - wedding, engagement, dan prewedding. Lihat karya terbaru dan tanyakan harga lewat WhatsApp.',
    },
    portfolio: {
      title: 'Portofolio Makeup Pengantin Medan | Bycarolinecls',
      description:
        'Karya makeup pengantin, wedding, dan prewedding terbaru oleh Caroline di Medan, langsung dari Instagram. Ketuk foto untuk membuka postingannya.',
    },
    about: {
      title: 'Tentang Caroline, MUA Pengantin di Medan',
      description:
        'Kenali Caroline, makeup artist pengantin di Medan, Indonesia - cara kerjanya, keahliannya, dan cara memesan tanggal Anda.',
    },
    book: {
      title: 'Hubungi dan Pesan Jadwal | MUA Medan - Bycarolinecls',
      description:
        'Tanyakan harga, ketersediaan tanggal, atau rencana hari Anda. Kirim detail langsung ke Caroline lewat WhatsApp dan dibalas dalam 24 jam.',
    },
  },
}

/**
 * The social card image.
 *
 * One image for both languages. It was two, until the strapline on the page
 * itself became English in both - a card reading "MAKEUP ARTIST PENGANTIN"
 * over a page headed "Bridal Makeup Artist" is a mismatch a visitor sees.
 * Callers still pass a locale; it is ignored here so a second card can come
 * back later without touching every call site.
 */
export const ogImage = () => `${ORIGIN}/og-image.png`

export const canonicalFor = (locale, path) => `${ORIGIN}${localePath(locale, path)}`

/**
 * LocalBusiness structured data.
 *
 * City-level address only, by choice: Caroline travels to clients and there is
 * no public studio street address to publish. `areaServed` carries the local
 * signal instead, which is what a service-area business is supposed to use.
 * No `priceRange` - prices are quoted per date and never published, and
 * inventing a band would be a claim the site does not stand behind.
 */
export function jsonLd(locale, services) {
  const isID = locale === 'id'
  return {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    '@id': `${ORIGIN}/#business`,
    name: 'Bycarolinecls',
    alternateName: isID ? 'Bycarolinecls - MUA Pengantin Medan' : 'Bycarolinecls Bridal Makeup',
    description: SEO[locale].home.description,
    url: canonicalFor(locale, '/'),
    image: ogImage(locale),
    logo: `${ORIGIN}/icon-512.png`,
    telephone: '+62-895-3213-53193',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Medan',
      addressRegion: isID ? 'Sumatera Utara' : 'North Sumatra',
      addressCountry: 'ID',
    },
    areaServed: [
      { '@type': 'City', name: 'Medan' },
      { '@type': 'AdministrativeArea', name: isID ? 'Sumatera Utara' : 'North Sumatra' },
    ],
    knowsLanguage: ['id-ID', 'en'],
    // Spelled out rather than imported from content/site.js: this file is also
    // run by scripts/prerender.js in Node, and it stays free of the site's
    // content module on purpose. Keep in step with `socials` there.
    sameAs: ['https://www.instagram.com/bycarolinecls/', 'https://www.tiktok.com/@bycarolinecls'],
    founder: {
      '@type': 'Person',
      name: 'Caroline',
      jobTitle: 'Bridal Makeup Artist',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isID ? 'Layanan' : 'Services',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.description, serviceType: s.category },
      })),
    },
  }
}

/** Every language version of one page, for hreflang and the sitemap. */
export const alternatesFor = (path) =>
  LOCALES.map((l) => ({ locale: l, href: `${ORIGIN}${localePath(l, path)}` }))

export { DEFAULT_LOCALE, LOCALES }
