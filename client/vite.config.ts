import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The client talks to the Express API through a dev proxy so the browser
// sees same-origin requests in development (no CORS preflight needed).
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.png'],
            manifest: {
                name: 'BCP Uniform Guide',
                short_name: 'Uniguide',
                description: 'Body-scan sizing for BCP uniforms — AI recommendations, live stock, transparent pricing.',
                start_url: '/',
                display: 'standalone',
                orientation: 'portrait-primary',
                background_color: '#f8fafc',
                theme_color: '#2563eb',
                scope: '/',
                icons: [
                    { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                    { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ],
                categories: ['education', 'shopping', 'utilities'],
                prefer_related_applications: false
            },
            workbox: {
                // Network-first for catalogue + order history; network-only for everything else.
                // navigateFallback denylist /api so the SPA shell never tries to serve an API route.
                navigateFallbackDenylist: [/^\/api/],
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/uniforms'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'uniforms-cache',
                            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
                            networkTimeoutSeconds: 5
                        }
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/orders'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'orders-cache',
                            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            networkTimeoutSeconds: 5
                        }
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                        handler: 'NetworkOnly'
                    }
                ],
                // Ensure the SW itself is not cached by the browser (required for updates)
                skipWaiting: true,
                clientsClaim: true
            },
            devOptions: {
                enabled: false
            }
        })
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    },
    build: {
        sourcemap: false,
        chunkSizeWarningLimit: 900
    }
});