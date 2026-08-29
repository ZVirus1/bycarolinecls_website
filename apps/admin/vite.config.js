import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/bycarolinecls-invoice/',
  build: {
    outDir: 'docs', // GitHub Pages will serve from /docs
  },
})
