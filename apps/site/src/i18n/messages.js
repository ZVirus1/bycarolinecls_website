/**
 * The two message catalogues.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *
 * - Service names ("Makeup Wedding Full Day"). They are the trade vocabulary
 *   Indonesian makeup artists already use in English, they are what Caroline
 *   writes on a pricelist, and they are shared with the admin, where the same
 *   strings become invoice line items. Translating them here would make an
 *   Indonesian invoice disagree with an English one for the same booking.
 * - "Instagram", "WhatsApp", "@bycarolinecls", "Bycarolinecls". Brand nouns.
 * - "Medan, Indonesia". Identical in both languages.
 * - `hero.tagline` and `footer.rights`. Both keys still exist in the Indonesian
 *   catalogue, but both hold the English string. "Bridal Makeup Artist" is how
 *   Caroline bills herself and sits under her name as a title rather than as a
 *   sentence, and the copyright line is a legal formula that reads as boilerplate
 *   in either language. Keeping the keys (rather than deleting them and letting
 *   the fallback handle it) makes the choice visible here instead of looking
 *   like a missing translation.
 *
 * Keys are flat and dotted. A missing key falls back to English rather than
 * rendering the key itself - a visitor should never see `nav.about` on a page.
 */
export const MESSAGES = {
  en: {
    'locale.label': 'EN',
    'locale.other': 'ID',
    'locale.switch': 'Baca dalam Bahasa Indonesia',

    'nav.home': 'Home',
    'nav.portfolio': 'Portfolio',
    'nav.about': 'About',
    'nav.contact': 'Contact me',

    'header.home': 'Bycarolinecls home',
    'header.openMenu': 'Open menu',
    'header.closeMenu': 'Close menu',

    'hero.tagline': 'Bridal Makeup Artist',

    'soon.body':
      'A new site is on its way. In the meantime, message me directly for bookings and enquiries. I reply within 24 hours.',
    'soon.whatsapp': 'Message on WhatsApp',

    'home.introHeading': 'Hello, I am {artist}',
    'home.intro':
      'Hello, I am Caroline, a bridal makeup artist. My passion is not only the art of makeup, but making every bride feel completely herself on the day that matters most.',
    'home.aboutCta': 'More about me',
    'home.portfolio': 'Portfolio',
    'home.portfolioLoading': 'Loading the latest work…',
    'home.viewAll': 'View full portfolio',
    'home.follow': 'Follow me on Instagram',
    'home.services': 'Services',
    'home.pricelist': 'Get our latest pricelist',
    'home.ctaTitle': 'Ready to book?',

    'portfolio.title': 'Portfolio',
    'portfolio.emptyBefore': 'Nothing to show yet. New work goes up on',
    'portfolio.emptyAfter': ' first.',
    'portfolio.loading': 'Loading more…',
    'portfolio.caughtUp': 'You are all caught up.',

    'about.eyebrow': 'About',
    'about.title': 'Hello, I am {artist}',
    // DRAFT - written to replace the "Replace this with your story" placeholder
    // that was about to go live. Deliberately claims no years of experience, no
    // certifications and no client numbers, because none of that is verified.
    // Caroline should rewrite these in her own words.
    'about.p1':
      'Bridal makeup, to me, is less about a particular look than about a feeling. The brief is never really "natural" or "bold" - it is how you want to feel when you turn around and the people who love you see you for the first time.',
    'about.p2':
      'I work with brides in Medan and the surrounding region: the wedding day itself, and the engagement, prewedding and family portraits around it. Every booking starts with a conversation about your dress, your venue and your light, so that nothing on the day is a surprise.',
    'about.basedIn': 'Based in',
    'about.enquiries': 'Enquiries',
    'about.book': 'Book Now',

    'book.title': 'Contact me',
    'book.note':
      'Prices, availability, or a date you already have in mind - it all comes to me on WhatsApp, and I reply within 24 hours.',
    'book.service': 'Service',
    'book.servicePlaceholder': 'Not sure yet',
    'book.date': 'Preferred date',
    'book.time': 'Preferred time',
    'book.submit': 'Continue on WhatsApp',
    'book.footnote':
      'Fill in what you know and leave the rest — WhatsApp opens with your details ready to send. Nothing is booked until we have talked it through, and I always reply within 24 hours.',

    'footer.rights': 'Copyright © {year} {name}, all rights reserved',

    'notfound.eyebrow': '404',
    'notfound.title': "This page doesn't exist",
    'notfound.body': 'The link may be out of date. Try the portfolio or get in touch.',
    'notfound.home': 'Back home',

    'wa.enquiry': 'I would like to enquire about a booking.',
    'wa.prices': 'I would like to ask about your services and prices.',
    'wa.service': 'Service',
    'wa.date': 'Date',
    'wa.time': 'Time',
    'wa.closeDate': 'Could you let me know if you are free? Thank you!',
    'wa.closePrices': 'Could you send me your latest pricelist? Thank you!',
  },

  id: {
    'locale.label': 'ID',
    'locale.other': 'EN',
    'locale.switch': 'Read in English',

    'nav.home': 'Beranda',
    'nav.portfolio': 'Portofolio',
    'nav.about': 'Tentang',
    'nav.contact': 'Hubungi Saya',

    'header.home': 'Beranda Bycarolinecls',
    'header.openMenu': 'Buka menu',
    'header.closeMenu': 'Tutup menu',

    // Left in English on purpose - see the note at the top of this file.
    'hero.tagline': 'Bridal Makeup Artist',

    'soon.body':
      'Situs baru sedang dalam perjalanan. Sementara itu, hubungi saya langsung untuk pemesanan dan pertanyaan. Saya membalas dalam 24 jam.',
    'soon.whatsapp': 'Kirim pesan di WhatsApp',

    'home.introHeading': 'Halo, saya {artist}',
    'home.intro':
      'Halo, saya Caroline, seorang makeup artist pengantin. Yang saya cintai bukan hanya seni merias, tetapi membuat setiap pengantin merasa menjadi dirinya sendiri seutuhnya di hari yang paling berarti.',
    'home.aboutCta': 'Selengkapnya tentang saya',
    'home.portfolio': 'Portofolio',
    'home.portfolioLoading': 'Memuat karya terbaru…',
    'home.viewAll': 'Lihat portofolio lengkap',
    'home.follow': 'Ikuti saya di Instagram',
    'home.services': 'Layanan',
    'home.pricelist': 'Lihat daftar harga terbaru',
    'home.ctaTitle': 'Siap memesan tanggal Anda?',

    'portfolio.title': 'Portofolio',
    'portfolio.emptyBefore':
      'Belum ada yang ditampilkan. Karya terbaru selalu tayang lebih dulu di',
    'portfolio.emptyAfter': '.',
    'portfolio.loading': 'Memuat lagi…',
    'portfolio.caughtUp': 'Semua karya sudah ditampilkan.',

    'about.eyebrow': 'Tentang',
    'about.title': 'Halo, saya {artist}',
    'about.p1':
      'Bagi saya, makeup pengantin bukan soal satu tampilan tertentu, melainkan soal perasaan. Permintaannya tidak pernah benar-benar "natural" atau "bold" - melainkan bagaimana Anda ingin merasa saat berbalik dan orang-orang terdekat melihat Anda untuk pertama kalinya.',
    'about.p2':
      'Saya melayani pengantin di Medan dan sekitarnya: untuk hari pernikahan itu sendiri, juga untuk engagement, prewedding, dan foto keluarga di sekitarnya. Setiap pemesanan dimulai dengan obrolan tentang gaun, lokasi, dan pencahayaan Anda, agar tidak ada kejutan di hari H.',
    'about.basedIn': 'Berlokasi di',
    'about.enquiries': 'Pertanyaan',
    'about.book': 'Pesan Sekarang',

    'book.title': 'Hubungi Saya',
    'book.note':
      'Harga, ketersediaan tanggal, atau tanggal yang sudah Anda rencanakan - semuanya bisa langsung ditanyakan lewat WhatsApp, dan saya membalas dalam 24 jam.',
    'book.service': 'Layanan',
    'book.servicePlaceholder': 'Belum yakin',
    'book.date': 'Tanggal yang diinginkan',
    'book.time': 'Jam yang diinginkan',
    'book.submit': 'Lanjutkan di WhatsApp',
    'book.footnote':
      'Isi yang sudah Anda ketahui, sisanya boleh dikosongkan — WhatsApp akan terbuka dengan detail Anda siap dikirim. Belum ada yang dipesan sebelum kita membicarakannya, dan saya selalu membalas dalam 24 jam.',

    // Left in English on purpose - see the note at the top of this file.
    'footer.rights': 'Copyright © {year} {name}, all rights reserved',

    'notfound.eyebrow': '404',
    'notfound.title': 'Halaman ini tidak ditemukan',
    'notfound.body':
      'Tautannya mungkin sudah tidak berlaku. Coba lihat portofolio atau hubungi saya.',
    'notfound.home': 'Kembali ke beranda',

    'wa.enquiry': 'Saya ingin menanyakan tentang pemesanan.',
    'wa.prices': 'Saya ingin menanyakan layanan dan harganya.',
    'wa.service': 'Layanan',
    'wa.date': 'Tanggal',
    'wa.time': 'Jam',
    'wa.closeDate': 'Boleh saya tahu apakah tanggal ini tersedia? Terima kasih!',
    'wa.closePrices': 'Boleh dikirimkan daftar harga terbarunya? Terima kasih!',
  },
}

export const LOCALES = ['en', 'id']
export const DEFAULT_LOCALE = 'en'
