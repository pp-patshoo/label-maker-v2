# Label Maker

เว็บแอปสำหรับ PC: frontend (React + Vite + TS) + backend (Fastify + Drizzle) + PostgreSQL ใน Docker ธีมอิง VS Code 2026 Dark
สถานะและแผนต่อไป: @PLAN.md

## คำสั่ง
- DB สำหรับ dev: `docker compose -f docker-compose.yml -f compose.dev.yml up -d db` (เปิด 127.0.0.1:5432)
- backend dev: `cd backend && npm run dev` (พอร์ต 3000, อ่าน backend/.env)
- frontend dev: `cd frontend && npm run dev` (พอร์ต 5173, proxy /api ไป 3000)
- ตรวจ frontend: `cd frontend && npm run build && npm run lint`
- ตรวจ backend: `cd backend && npx tsc --noEmit && npm test` (ต้องเปิด DB ของ dev ไว้; เทสต์ใช้ DB `labelmaker_test`)
  - บน Windows ให้รัน `npm test` จาก PowerShell ถ้ารันจาก Git Bash จะเจอ "Vitest failed to find the runner"
- Docker ทั้งระบบ: `docker compose up -d --build` (พอร์ต 8080)
- แก้ schema แล้ว: `cd backend && npm run db:generate` (ได้ไฟล์ใน backend/drizzle/ ต้อง commit) โดย migration จะรันเองตอน backend เริ่ม

## ข้อตกลง
- เพิ่มโมดูลที่ frontend/src/modules/registry.ts เท่านั้น (+ คำแปลใน i18n/en.ts และ th.ts) ถ้าจำกัดสิทธิ์ให้ใส่ `requiredRole`
- ข้อความทุกอย่างต้องผ่าน i18n (th/en) ห้าม hard-code และ error จาก API ใช้ `{ error: code }` ส่วนหน้าเว็บแปลผ่าน `error.<code>`
- สีใช้ CSS variables จาก styles/theme.css ห้ามใส่ค่าสีตรง ๆ
- เรียก API ผ่าน `apiFetch` (frontend/src/api/client.ts) เท่านั้น เพราะส่ง JSON + cookie และจัดการ session หมดอายุให้
- API ที่แก้ข้อมูลต้องรับ JSON เท่านั้น (backend ตรวจ Content-Type + Origin เพื่อกัน CSRF)
- route ใหม่ใน backend ต้องใส่ `requireAuth()` หรือ `requireAdmin()` (backend/src/auth/guards.ts) ยกเว้นตั้งใจให้เป็น public
- ห้าม log หรือส่งกลับ `password_hash` และห้ามเก็บรหัสผ่าน/token แบบไม่ hash
- ค่าลับอยู่ใน `.env` (root) และ `backend/.env` ซึ่งไม่ commit ส่วนตัวอย่างอยู่ใน `.env.example`
- รองรับ PC เท่านั้น (ขั้นต่ำ 1280×720)

## ก่อนจบงานทุกครั้ง
- อัปเดตหัวข้อ "สถานะ" และ "ขั้นตอนถัดไป" ใน PLAN.md ให้ตรงกับสิ่งที่ทำ
