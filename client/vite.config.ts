import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client talks to the Express API through a dev proxy so the browser
// sees same-origin requests in development (no CORS preflight needed).
export default defineConfig({
    plugins: [react()],
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
