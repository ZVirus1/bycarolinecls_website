import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Public site: served at the domain root, built into the shared dist/.
// Built FIRST (it empties dist/), then the admin build writes into dist/admin/.
export default defineConfig({
  // The noindex/robots story now lives entirely in scripts/prerender.js, which
  // runs after this build. It was here too, which meant every page shipped two
  // <meta name="robots"> tags - and on 404.html they disagreed with each other.
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
    // Proxy /api to a local `wrangler pages dev` during development so the
    // portfolio reads the live Instagram feed instead of the bundled fallback.
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
})
