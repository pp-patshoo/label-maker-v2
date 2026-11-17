# Label Maker

เว็บแอปสำหรับ PC: แถบเมนูซ้าย + พื้นที่โมดูล พร้อมระบบล็อกอินจริง

- **frontend**: React + Vite + TypeScript (ธีมอิง VS Code "2026 Dark", ไทย/อังกฤษ) เสิร์ฟด้วย Nginx
- **backend**: Node.js + Fastify + Drizzle ORM
- **db**: PostgreSQL 18

```
Browser ─> frontend (nginx :8080) ─┬─ /      หน้าเว็บ
                                   └─ /api/ ─> backend (:3000) ─> db (:5432)
```
มีเพียงพอร์ต 8080 ที่เปิดออกนอกเครื่อง ส่วน backend และ db อยู่ในเครือข่ายภายในของ Docker

## เริ่มใช้งานครั้งแรก (Docker)
1. คัดลอก `.env.example` เป็น `.env` แล้ว **เปลี่ยนรหัสผ่านทุกตัว** (`POSTGRES_PASSWORD`, `ADMIN_PASSWORD`)
2. รัน
   ```bash
   docker compose up -d --build     # http://localhost:8080
   ```
3. เข้าสู่ระบบด้วย `ADMIN_USERNAME` / `ADMIN_PASSWORD` จาก `.env` ระบบจะบังคับให้ตั้งรหัสผ่านใหม่ทันที
   - admin คนแรกถูกสร้างเฉพาะตอนที่ยังไม่มีผู้ใช้ในระบบเลย หลังจากนั้นค่าใน `.env` จะไม่ถูกใช้อีก
4. เพิ่มผู้ใช้อื่นที่เมนู **จัดการผู้ใช้** ระบบจะสุ่มรหัสชั่วคราวให้ ผู้ใช้ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก

```bash
docker compose logs -f backend   # ดู log
docker compose down              # ปิด (ข้อมูลยังอยู่ใน volume pgdata)
docker compose down -v           # ปิดและลบข้อมูลทั้งหมด ⚠️
```

## Deploy บน Linux ใน LAN ผ่าน Static IP (ไม่ใช้ DNS / HTTPS)
ใช้ได้โดยไม่ต้องแก้โค้ด แค่ตั้ง `.env` บนเซิร์ฟเวอร์ (ตัวอย่าง IP `192.168.1.50`)
```
APP_PORT=8080
APP_BIND=192.168.1.50                 # เปิดพอร์ตเฉพาะ interface ของ LAN (ค่าเริ่มต้น 0.0.0.0 = ทุก interface)
APP_ORIGIN=http://192.168.1.50:8080   # ต้องตรงกับ URL ที่พิมพ์ในเบราว์เซอร์ทุกตัวอักษร
COOKIE_SECURE=false
```
- `APP_ORIGIN` ใช้ตรวจ Origin กัน CSRF ถ้าไม่ตรงจะล็อกอินไม่ได้ (403 `bad_origin`)
  - ถ้าใช้พอร์ต 80 ให้ตั้ง `APP_ORIGIN=http://192.168.1.50` โดย**ไม่ใส่** `:80`
  - ถ้ามีคนเข้าด้วยชื่อเครื่องหรือ IP อื่น ให้ใส่หลายค่าคั่นด้วย comma
- **HTTP ไม่เข้ารหัส** เครื่องอื่นใน LAN ดักอ่านรหัสผ่าน/cookie ได้ ถ้าต้องการเข้ารหัสโดยไม่ใช้ DNS ให้ใช้ cert จาก internal CA (เช่น mkcert) ที่ใส่ IP ใน SAN แล้วติดตั้ง CA ลงเครื่อง client
- **Firewall**: Docker เปิดพอร์ตโดยข้ามกฎ ufw จึงควรตั้ง `APP_BIND` เป็น IP ของ LAN หรือกำหนดกฎใน chain `DOCKER-USER`
- ถ้า LAN ออกอินเทอร์เน็ตไม่ได้ ฟอนต์ Noto Sans Thai (Google Fonts) จะไม่โหลด และระบบจะใช้ฟอนต์สำรองแทน

## พัฒนา (บนเครื่อง)
```bash
# 1) PostgreSQL ใน Docker (เปิดพอร์ต 5432 เฉพาะ localhost)
docker compose -f docker-compose.yml -f compose.dev.yml up -d db

# 2) backend (คัดลอก backend/.env.example เป็น backend/.env ก่อน ใช้รหัส DB ตัวเดียวกับ .env ที่ root)
cd backend && npm install && npm run dev        # http://localhost:3000

# 3) frontend
cd frontend && npm install && npm run dev       # http://localhost:5173 (proxy /api ไป 3000)
```

### ทดสอบ backend
```bash
cd backend && npm test     # สร้าง DB labelmaker_test ใหม่ทุกครั้ง (ต้องเปิด DB จากขั้นที่ 1)
```
> Windows: ให้รันจาก PowerShell หรือ cmd ถ้ารันจาก Git Bash อาจเจอ "Vitest failed to find the runner" (ตัวอักษรไดรฟ์ `c:`/`C:` ไม่ตรงกัน)

### ทดสอบหน้าเว็บ (E2E)
```bash
cd e2e && npm install      # ครั้งแรก
npm test                   # รันทั้งหมด (~1 นาที)
npm run test:ui            # โหมดดูทีละขั้น
npm run report             # เปิดรายงานล่าสุด (มี screenshot/trace ของข้อที่ fail)
```
- ใช้ Playwright กับ Microsoft Edge ที่ติดตั้งอยู่ในเครื่อง ไม่ต้องดาวน์โหลดเบราว์เซอร์
- เทสต์จะเปิด backend (พอร์ต 3901) และ Vite (พอร์ต 5174) ของตัวเอง ใช้ DB `labelmaker_e2e` ที่สร้างใหม่ทุกครั้ง และสร้างบัญชีทดสอบเอง จึงไม่แตะข้อมูลจริงและรันพร้อม dev server ปกติได้
- ต้องเปิด DB จากขั้นที่ 1 และมี `backend/.env` (หรือตั้ง `E2E_DATABASE_URL`)
- ถ้าเจอ `listen EACCES` แปลว่า Windows จองพอร์ตไว้ (ดูด้วย `netsh int ipv4 show excludedportrange protocol=tcp`) ให้ตั้ง `E2E_BACKEND_PORT` / `E2E_FRONTEND_PORT` เป็นพอร์ตอื่น
- ข้อความในเทสต์อ่านจาก `frontend/src/i18n/en.ts` ถ้าแก้คำแปลไม่ต้องแก้เทสต์ แต่ถ้าเปลี่ยนหน้าตาหรือขั้นตอนต้องแก้ใน `e2e/tests/`

### แก้ไขโครงสร้างฐานข้อมูล
แก้ `backend/src/db/schema.ts` แล้วรัน `cd backend && npm run db:generate` จากนั้น commit ไฟล์ใหม่ใน `backend/drizzle/` โดย migration จะรันอัตโนมัติตอน backend เริ่ม

## เพิ่มโมดูลใหม่
1. สร้างหน้าใน `frontend/src/modules/<ชื่อโมดูล>/`
2. เพิ่ม 1 รายการใน `frontend/src/modules/registry.ts` (ใส่ `requiredRole: 'admin'` ถ้าให้เฉพาะ admin)
3. เพิ่มคำแปลชื่อเมนูใน `frontend/src/i18n/en.ts` และ `th.ts`

## ความปลอดภัยโดยสรุป
- รหัสผ่านเก็บเป็น Argon2id hash เท่านั้น (ยาว 10–128 ตัว, ห้ามเหมือนชื่อผู้ใช้)
- Session เก็บใน DB ส่วนเบราว์เซอร์ได้ cookie `sid` แบบ HttpOnly + SameSite=Lax (DB เก็บแค่ SHA-256 ของ token)
  - หมดอายุเมื่อไม่ใช้งาน 8 ชม. หรือครบ 7 วัน
- ล็อกอินผิด 5 ครั้งติดกัน บัญชีถูกล็อก 15 นาที (admin ปลดล็อกได้) และจำกัด 20 ครั้งต่อ 15 นาทีต่อ IP
- เปลี่ยนรหัสหรือถูกรีเซ็ตรหัส session อื่นจะถูกยกเลิก ปิดบัญชีแล้วถูกออกจากระบบทันที
- บันทึกประวัติการล็อกอินทุกครั้ง (ดูได้ที่เมนูจัดการผู้ใช้)
- **ถ้าเปิดใช้ผ่าน HTTPS** ให้ตั้ง `COOKIE_SECURE=true` และแก้ `APP_ORIGIN` ให้ตรงกับ URL จริง

## ลืมรหัส admin
รหัสใน `.env` ใช้แค่ตอนสร้าง admin คนแรก ถ้าลืมรหัส admin ทุกคน ให้รันบนเซิร์ฟเวอร์:
```bash
docker compose exec backend node dist/cli/reset-admin.js              # ดูรายชื่อ admin ที่ใช้งานอยู่
docker compose exec backend node dist/cli/reset-admin.js <username>   # รีเซ็ต
cd backend && npm run reset-admin -- <username>                      # ตอน dev
```
- คำสั่งจะสุ่มรหัสชั่วคราวและแสดงให้เห็นครั้งเดียว ล็อกอินแล้วต้องตั้งรหัสใหม่
- ปลดล็อกบัญชีและยกเลิก session เดิมทั้งหมด
- บันทึกไว้ในประวัติการล็อกอินว่า "รีเซ็ตรหัสจากเซิร์ฟเวอร์"
- ใช้ได้เฉพาะ admin ที่ยังเปิดใช้งานอยู่

## สำรองข้อมูล
```bash
docker compose exec -T db pg_dump -U labelmaker labelmaker > backup.sql
docker compose exec -T db psql -U labelmaker labelmaker < backup.sql   # กู้คืน
```
