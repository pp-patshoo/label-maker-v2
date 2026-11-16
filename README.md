# Label Maker

โครงเว็บแอปแบบ 2 ส่วน: แถบเมนูซ้าย + พื้นที่โมดูล (React + Vite + TypeScript, ธีมอิง VS Code "2026 Dark", สลับภาษาไทย/อังกฤษได้)

> ⚠️ **ระบบล็อกอินตอนนี้เป็น mock**: กรอกชื่อผู้ใช้/รหัสผ่านอะไรก็ได้ (ชื่อผู้ใช้ `error` = จำลองล็อกอินไม่ผ่าน)
> เมื่อมี backend ให้แก้เฉพาะ `frontend/src/auth/authService.ts`

## พัฒนา (บนเครื่อง)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## รันด้วย Docker (production)
```bash
docker compose up -d --build   # http://localhost:8080
docker compose down
```
เปลี่ยนพอร์ตได้โดยคัดลอก `.env.example` เป็น `.env` แล้วแก้ `APP_PORT`

## เพิ่มโมดูลใหม่
1. สร้างหน้าใน `frontend/src/modules/<ชื่อโมดูล>/`
2. เพิ่ม 1 รายการใน `frontend/src/modules/registry.ts`
3. เพิ่มคำแปลชื่อเมนูใน `frontend/src/i18n/en.ts` และ `th.ts`

## เตรียมไว้สำหรับ backend
- `frontend/nginx.conf` มี `location /api/` (คอมเมนต์ไว้) proxy ไป `backend:3000`
- `frontend/vite.config.ts` มี `server.proxy['/api']` (คอมเมนต์ไว้) สำหรับตอน dev
- `docker-compose.yml` มีตำแหน่งเพิ่ม service `backend`
