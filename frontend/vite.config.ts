import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: forward /api to the backend running on the host (cd backend && npm run dev),
    // so the code calls /api/... the same way in dev and in production (nginx).
    // API_PROXY_TARGET lets the E2E tests point at their own backend (see e2e/playwright.config.ts).
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: false },
    },
  },
})
