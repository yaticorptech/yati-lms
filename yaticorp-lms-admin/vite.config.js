import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// On the web the admin is its own site at the root. Inside the mobile app it
// travels in the student app's bundle under /admin/, so the `mobile` build
// sets that base and writes into the student app's dist folder.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: mode === 'mobile' ? '/admin/' : '/',
  build: mode === 'mobile' ? { outDir: '../yaticorp-lms-student/dist/admin', emptyOutDir: true } : {}
}))
