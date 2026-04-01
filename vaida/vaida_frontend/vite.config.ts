import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],

      // ── Web App Manifest ──────────────────────────────────
      manifest: {
        name: 'VAIDA — AI Rural Healthcare',
        short_name: 'VAIDA',
        description: 'AI-powered healthcare triage for rural India',
        theme_color: '#0F6E56',
        background_color: '#F8F7F2',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // ── Workbox Service Worker Config ─────────────────────
      workbox: {
        // Pre-cache the application shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],

        // Runtime caching strategies
        runtimeCaching: [
          // Google Fonts — cache-first (nearly static)
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // API GET requests — network-first with offline fallback
          {
            urlPattern: /\/api\/.*$/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-get-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // Static images — stale-while-revalidate
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },

          // Navigation fallback — if offline, serve cached index.html
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
            },
          },
        ],

        // Skip waiting to activate new SW immediately
        skipWaiting: true,
        clientsClaim: true,

        // Clean old caches
        cleanupOutdatedCaches: true,
      },

      // Dev options (enable SW in dev for testing)
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
