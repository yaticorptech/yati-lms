import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// On the web the admin is its own site at the root. Inside the mobile app it
// travels in the student app's bundle under /admin/, so the `mobile` build
// sets that base and writes into the student app's dist folder.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // PWA is web-only: the mobile build lives inside the Capacitor WebView
    // (under the student app), where a service worker would only fight it.
    ...(mode === 'mobile'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['assets/favicon.ico', 'assets/apple-touch-icon.png', 'assets/YATICORP.png'],
            manifest: {
              name: 'YATI LMS Admin',
              short_name: 'YATI Admin',
              description: 'YATICORP Learning Management System — Admin',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              theme_color: '#0f172a',
              background_color: '#0f172a',
              icons: [
                { src: '/assets/pwa-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/assets/pwa-512.png', sizes: '512x512', type: 'image/png' },
                { src: '/assets/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,woff2}'],
              maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
              // No runtime route touches the API: its requests always pass
              // straight through to the network, never a stale cache.
              runtimeCaching: [
                {
                  urlPattern: ({ sameOrigin, request }) => sameOrigin && request.destination === 'image',
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'static-images',
                    expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  base: mode === 'mobile' ? '/admin/' : '/',
  build: mode === 'mobile' ? { outDir: '../yaticorp-lms-student/dist/admin', emptyOutDir: true } : {}
}))
