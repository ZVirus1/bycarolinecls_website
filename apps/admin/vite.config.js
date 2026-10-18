import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Admin app: served at /admin/, built into the shared dist/ as dist/admin/.
// Assets land under /admin/assets/ so a single path rule covers the whole app.
export default defineConfig({
  plugins: [vue()],
  base: '/admin/',
  // The Firebase config lives in .env.local at the REPO root, not in this app
  // folder, and Vite looks next to the config file unless told otherwise. Left
  // at the default, a local build inlined nothing, firebase.js threw on import
  // for want of an apiKey, and /admin rendered a white page. Cloudflare's own
  // environment variables still win over the file: Vite applies process.env
  // last.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: '../../dist/admin',
    emptyOutDir: true,
  },
})
