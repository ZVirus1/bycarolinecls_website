import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Public site: served at the domain root, built into the shared dist/.
// Built FIRST (it empties dist/), then the admin build writes into dist/admin/.
export default defineConfig({
  plugins: [vue()],
  base: '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    // Proxy the availability function to a local `wrangler pages dev` during
    // development so the booking calendar works with `npm run dev`.
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
})
