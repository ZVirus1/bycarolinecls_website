import { createRouter, createWebHistory } from 'vue-router'
import InvoiceView from '../views/InvoiceView.vue'
import CalendarView from '../views/CalendarView.vue'

const routes = [
  {
    path: '/',
    name: 'Invoice',
    component: InvoiceView,
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: CalendarView,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
