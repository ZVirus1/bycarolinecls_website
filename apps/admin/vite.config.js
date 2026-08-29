import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Admin app: served at /admin/, built into the shared dist/ as dist/admin/.
// Assets land under /admin/assets/ so a single path rule covers the whole app.
export default defineConfig({
  plugins: [vue()],
  base: '/admin/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: '../../dist/admin',
    emptyOutDir: true,
  },
})
