import { createRouter, createWebHistory } from 'vue-router'
import InvoiceView from '../views/InvoiceView.vue'

const routes = [
  { path: '/', name: 'Invoice', component: InvoiceView, meta: { title: 'New Invoice' } },
  {
    path: '/invoices',
    name: 'Invoices',
    component: () => import('../views/InvoicesView.vue'),
    meta: { title: 'Invoices' },
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/CalendarView.vue'),
    meta: { title: 'Calendar' },
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../views/ImportView.vue'),
    meta: { title: 'Import' },
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/PricingView.vue'),
    meta: { title: 'Pricing' },
  },
  // Unknown admin paths fall back to the invoice generator.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  // BASE_URL is '/admin/' in production, so these resolve to /admin, /admin/invoices, etc.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const BASE = 'Bycarolinecls Admin Portal'

router.afterEach((to) => {
  document.title = to.meta?.title ? `${BASE} | ${to.meta.title}` : BASE
})

export default router
