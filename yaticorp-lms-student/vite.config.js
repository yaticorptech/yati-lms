import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // The 'mobile' build runs inside the Capacitor WebView, which has its own
    // install/update story — a service worker there would only fight it, so
    // the PWA is web-only.
    ...(mode === 'mobile'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['assets/favicon.ico', 'assets/apple-touch-icon.png', 'assets/YATICORP.png'],
            manifest: {
              name: 'YATI LMS',
              short_name: 'YATI LMS',
              description: 'YATICORP Learning Management System',
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
              // three.min.js and the walker are only needed on the screens that
              // show the 3D mascot; fetched (and cached) on first use instead.
              globIgnores: ['loop-walker/**'],
              maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
              // No runtime route touches the API (api.learn.yaticorp.in) or the
              // Bunny video CDN: those requests pass straight through to the
              // network, so nothing dynamic or range-requested is ever served
              // stale from a cache.
              runtimeCaching: [
                {
                  urlPattern: ({ sameOrigin, request }) => sameOrigin && request.destination === 'image',
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'static-images',
                    expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
                  },
                },
                {
                  urlPattern: ({ sameOrigin, url }) =>
                    sameOrigin && (url.pathname.startsWith('/loop-walker/') || url.pathname.endsWith('.glb')),
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'loop-walker',
                    expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
                  },
                },
                {
                  urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/i18n/'),
                  handler: 'StaleWhileRevalidate',
                  options: { cacheName: 'i18n' },
                },
                {
                  urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
                  handler: 'StaleWhileRevalidate',
                  options: { cacheName: 'google-fonts-css' },
                },
                {
                  urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-files',
                    expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
                  },
                },
              ],
            },
          }),
        ]),
  ],
}))
