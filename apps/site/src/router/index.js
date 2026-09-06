import { createRouter, createWebHistory } from 'vue-router'
import { DEFAULT_LOCALE, LOCALES, localePath, translate } from '../i18n/paths.js'
import { PAGES, SEO } from '../i18n/seo.js'

// Every view is lazy so the holding page ships almost nothing, and the live
// site's first paint is not carrying the other four pages.
const VIEWS = {
  home: () => import('../views/HomeView.vue'),
  portfolio: () => import('../views/PortfolioView.vue'),
  about: () => import('../views/AboutView.vue'),
  book: () => import('../views/BookView.vue'),
}

/**
 * The same four pages, once per language.
 *
 * English keeps the bare paths it already had; Indonesian sits under /id.
 * `meta.path` is the English path the route corresponds to, which is how the
 * header toggle finds the same page in the other language.
 */
const localised = LOCALES.flatMap((locale) =>
  PAGES.map(({ key, path }) => ({
    path: localePath(locale, path),
    name: `${key}-${locale}`,
    component: VIEWS[key],
    meta: { locale, key, path },
  })),
)

const routes = [
  ...localised,

  // Prices are no longer published. Kept so old links, printed material and
  // search results still land somewhere useful. The real 301 is in _redirects
  // - this only catches in-app navigation.
  { path: '/pricing', redirect: '/book' },
  { path: '/id/pricing', redirect: '/id/book' },

  {
    path: '/id/:pathMatch(.*)*',
    name: 'notfound-id',
    component: () => import('../views/NotFoundView.vue'),
    meta: { locale: 'id', key: 'notfound', path: '/' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { locale: DEFAULT_LOCALE, key: 'notfound', path: '/' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 },
})

/**
 * Keeps the document head in step with client-side navigation.
 *
 * The prerendered HTML is already correct for the first page a visitor lands
 * on - and it is the only thing crawlers ever read. This is purely for the
 * browser tab and for anyone sharing a URL they navigated to in-app.
 */
router.afterEach((to) => {
  const locale = to.meta?.locale ?? DEFAULT_LOCALE
  const meta = SEO[locale]?.[to.meta?.key]

  document.documentElement.lang = locale === 'id' ? 'id' : 'en'
  document.title = meta ? meta.title : `${translate(locale, 'notfound.title')} | Bycarolinecls`

  const desc = document.querySelector('meta[name="description"]')
  if (desc && meta) desc.setAttribute('content', meta.description)

  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', `https://bycarolinecls.com${to.path}`)
})

export default router
