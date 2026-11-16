import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // เปิดเมื่อมี backend เพื่อให้โค้ดเรียก /api/... ได้เหมือนกันทั้ง dev และ prod
    // proxy: {
    //   '/api': { target: 'http://localhost:3000', changeOrigin: true },
    // },
  },
})
