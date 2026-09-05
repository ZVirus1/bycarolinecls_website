import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Public site: served at the domain root, built into the shared dist/.
// Built FIRST (it empties dist/), then the admin build writes into dist/admin/.
/**
 * Keeps the holding page out of search results.
 *
 * index.html has long claimed this happened at build time; nothing actually
 * did it, so "A new site is on its way" was indexable as the site's front
 * door. Only applies while VITE_SITE_MODE=coming-soon - the live site is
 * indexed normally.
 */
function noindexWhileComingSoon(mode) {
  return {
    name: 'noindex-while-coming-soon',
    transformIndexHtml: (html) =>
      mode === 'coming-soon'
        ? html.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />')
        : html,
  }
}

export default defineConfig({
  plugins: [vue(), noindexWhileComingSoon(process.env.VITE_SITE_MODE)],
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
