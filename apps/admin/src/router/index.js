import { createRouter, createWebHistory } from 'vue-router'
import InvoiceView from '../views/InvoiceView.vue'

const routes = [
  { path: '/', name: 'Invoice', component: InvoiceView },
  {
    path: '/invoices',
    name: 'Invoices',
    component: () => import('../views/InvoicesView.vue'),
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/CalendarView.vue'),
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/PricingView.vue'),
  },
  // Unknown admin paths fall back to the invoice generator.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  // BASE_URL is '/admin/' in production, so these resolve to /admin, /admin/invoices, etc.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
