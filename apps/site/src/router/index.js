import { createRouter, createWebHistory } from 'vue-router'

// Every view is lazy so the holding page ships almost nothing, and the live
// site's first paint is not carrying the other four pages.
const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  {
    path: '/portfolio',
    name: 'portfolio',
    component: () => import('../views/PortfolioView.vue'),
    meta: { title: 'Portfolio' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: { title: 'About' },
  },
  // Prices are no longer published. Kept as a redirect so old links, any
  // printed material and search results still land somewhere useful.
  { path: '/pricing', redirect: '/book' },
  {
    path: '/book',
    name: 'book',
    component: () => import('../views/BookView.vue'),
    meta: { title: 'Enquire' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notfound',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 },
})

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} | Bycarolinecls`
    : 'Bycarolinecls | Professional Hair & Makeup Artist'
})

export default router
