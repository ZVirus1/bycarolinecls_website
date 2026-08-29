import { createRouter, createWebHistory } from 'vue-router'
import InvoiceView from '../views/InvoiceView.vue'
import CalendarView from '../views/CalendarView.vue'

const routes = [
  { path: '/', name: 'Invoice', component: InvoiceView, meta: { requiresAuth: true } },
  { path: '/calendar', name: 'Calendar', component: CalendarView, meta: { requiresAuth: true } },
]

const router = createRouter({
  // BASE_URL is '/admin/' in production, so these resolve to /admin and /admin/calendar
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
