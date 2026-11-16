import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: forward /api to the backend running on the host (cd backend && npm run dev),
    // so the code calls /api/... the same way in dev and in production (nginx).
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
})
