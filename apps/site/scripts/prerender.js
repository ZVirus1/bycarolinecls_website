/**
 * Writes a real HTML file per page, per language, after the Vite build.
 *
 * WHY THIS EXISTS
 *
 * The site is a client-rendered Vue app: one index.html, and Vue swaps the
 * content. That is fine for people and survivable for Google, but the crawlers
 * behind link previews - facebookexternalhit, LinkedInBot, Twitterbot,
 * WhatsApp, Slack - do not run JavaScript at all. They read the HTML that came
 * off the wire and stop. Before this script, every URL on the site returned
 * byte-identical head tags, which meant:
 *
 *   - every page shared as the homepage's title and description, and
 *   - every page carried <link rel="canonical" href="https://bycarolinecls.com/">,
 *     which tells Google that /portfolio, /about and /book are duplicates of
 *     the homepage and should not be indexed at all.
 *
 * So this walks the routes, and for each one writes dist/<path>/index.html with
 * that page's own title, description, canonical, hreflang, Open Graph and
 * structured data baked in. Cloudflare Pages serves dist/portfolio/index.html
 * at /portfolio automatically. Vue still boots and takes over for in-app
 * navigation; it just no longer has to be running for the page to describe
 * itself correctly.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LOCALES, localePath } from '../src/i18n/paths.js'
import { ORIGIN, PAGES, SEO, alternatesFor, jsonLd, ogImage } from '../src/i18n/seo.js'
import { translate } from '../src/i18n/paths.js'
import { publicServices } from '../../../packages/shared/services.js'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../../../dist')
const COMING_SOON = process.env.VITE_SITE_MODE === 'coming-soon'

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** BCP-47 for og:locale, which wants the underscored form. */
const ogLocale = (l) => (l === 'id' ? 'id_ID' : 'en_GB')

function head({ locale, key, path, notFound }) {
  const meta = SEO[locale][key]
  const url = `${ORIGIN}${localePath(locale, path)}`
  const img = ogImage(locale)
  const alts = alternatesFor(path)

  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    '',
    // hreflang must be reciprocal and must include a self-reference, or Google
    // ignores the whole cluster.
    ...alts.map((a) => `<link rel="alternate" hreflang="${a.locale}" href="${a.href}" />`),
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${path === '/' ? '/' : path}" />`,
    '',
    `<meta property="og:site_name" content="Bycarolinecls" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${ogLocale(locale)}" />`,
    ...LOCALES.filter((l) => l !== locale).map(
      (l) => `<meta property="og:locale:alternate" content="${ogLocale(l)}" />`,
    ),
    // Dimensions let Facebook and LinkedIn lay the card out on first scrape
    // instead of showing a small thumbnail until they have fetched the file.
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:alt" content="Bycarolinecls - ${esc(
      locale === 'id' ? 'makeup artist pengantin di Medan' : 'bridal makeup artist in Medan',
    )}" />`,
    '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    '',
    `<script type="application/ld+json">${JSON.stringify(jsonLd(locale, publicServices()))}</script>`,
  ]

  if (COMING_SOON) tags.unshift('<meta name="robots" content="noindex, nofollow" />')

  return tags.map((t) => (t ? `    ${t}` : '')).join('\n')
}

function notFoundHead(locale) {
  // No canonical, no hreflang, no sitemap entry - a 404 is not a page anyone
  // should be sent to, and `noindex` keeps it out of Search Console's reports.
  return [
    '<meta name="robots" content="noindex, follow" />',
    `<title>${esc(translate(locale, 'notfound.title'))} | Bycarolinecls</title>`,
    `<meta name="description" content="${esc(translate(locale, 'notfound.body'))}" />`,
  ]
    .map((t) => `    ${t}`)
    .join('\n')
}

async function emit(template, route, outPath) {
  const html = template
    .replace(/<html lang="[^"]*"/, `<html lang="${route.locale}"`)
    .replace(
      /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/,
      route.notFound ? notFoundHead(route.locale) : head(route),
    )

  const full = join(DIST, outPath)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, html, 'utf8')
  return outPath
}

function sitemap() {
  const urls = PAGES.flatMap((page) =>
    LOCALES.map((locale) => {
      const alts = alternatesFor(page.path)
      return [
        '  <url>',
        `    <loc>${ORIGIN}${localePath(locale, page.path)}</loc>`,
        ...alts.map(
          (a) => `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${a.href}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${page.path === '/' ? '/' : page.path}"/>`,
        `    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`,
        `    <changefreq>${page.changefreq}</changefreq>`,
        `    <priority>${page.priority}</priority>`,
        '  </url>',
      ].join('\n')
    }),
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`
}

/**
 * While the holding page is up the whole site is closed to crawlers - a
 * sitemap advertising pages that all say noindex is a contradiction Search
 * Console reports as an error.
 */
const robots = () =>
  COMING_SOON
    ? `# Holding page. The site opens to crawlers when VITE_SITE_MODE=live.\nUser-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`

const template = await readFile(join(DIST, 'index.html'), 'utf8')
const written = []

/**
 * Flat files, not directories.
 *
 * Cloudflare Pages serves `portfolio.html` at /portfolio, but serves
 * `portfolio/index.html` by 308-redirecting /portfolio to /portfolio/. The
 * directory form would mean every canonical tag, sitemap entry and internal
 * link pointed at a URL that immediately redirects - harmless but wasteful,
 * and it makes /pricing -> /book -> /book/ a two-hop chain.
 */
for (const locale of LOCALES) {
  for (const page of PAGES) {
    const route = { locale, key: page.key, path: page.path }
    const p = localePath(locale, page.path)
    written.push(await emit(template, route, p === '/' ? 'index.html' : `${p}.html`))
  }
}

// Cloudflare serves 404.html with a real 404 for anything unmatched. Without
// it the SPA fallback answers every made-up URL with 200 and the homepage,
// which Google reports as a soft 404.
written.push(
  await emit(template, { locale: 'en', key: 'home', path: '/', notFound: true }, '404.html'),
)

// No sitemap while the holding page is up: every URL in it would be marked
// noindex, which Search Console reports as "Submitted URL marked noindex" for
// each one. It reappears the moment the site is built live.
if (!COMING_SOON) await writeFile(join(DIST, 'sitemap.xml'), sitemap(), 'utf8')
await writeFile(join(DIST, 'robots.txt'), robots(), 'utf8')

console.log(
  `prerendered ${written.length} pages (${COMING_SOON ? 'coming-soon: noindex' : 'live: indexable'})`,
)
for (const w of written) console.log('  ', w)
