# PLAN.md: สิ่งที่ทำไปแล้วและแนวทางพัฒนาต่อ

เอกสารนี้สรุปสถานะโปรเจกต์ Label Maker เพื่อใช้เป็นจุดตั้งต้นในการพัฒนาขั้นถัดไป
ดูวิธีรันและวิธีเพิ่มโมดูลแบบย่อได้ที่ [README.md](README.md)

## 1. เป้าหมาย

เว็บแอปสำหรับ PC แบ่งเป็น 2 ส่วน
1. **แถบเมนูซ้าย (Sidebar)** แสดงรายการเมนู พับเก็บได้
2. **พื้นที่โมดูล** เปลี่ยนเนื้อหาตามเมนูที่ผู้ใช้เลือก

ขั้นนี้ทำเฉพาะ **โครงเปล่า** ทุกหน้าเป็นเทมเพลตว่าง ยังไม่มีฟังก์ชันของโมดูลจริง

## 2. ข้อกำหนดที่ตกลงไว้

| หัวข้อ | ข้อกำหนด |
|---|---|
| เทคโนโลยี | React + Vite + TypeScript, `react-router-dom`, `lucide-react` (ไอคอน), CSS Modules |
| อุปกรณ์ | PC เท่านั้น หน้าต่างขั้นต่ำ 1280×720 (เล็กกว่านี้ให้มี scrollbar ไม่ปรับ layout) |
| เมนูเริ่มต้น | หน้าหลัก, โมดูลตัวอย่าง, ตั้งค่า (ตั้งค่าปักอยู่ล่างสุด) |
| Sidebar | กาง 240px / พับ 64px (เหลือแค่ไอคอน) จำสถานะไว้ใน localStorage |
| ภาษา | ไทย/อังกฤษ สลับได้ ค่าเริ่มต้นไทย จำใน localStorage |
| ธีม | มืดอย่างเดียว อิง VS Code "2026 Dark" เก็บสีเป็น CSS variables |
| ฟอนต์ | Segoe UI + Noto Sans Thai ขนาดพื้นฐาน 13px |
| Deploy | Docker แบบ multi-stage (build ด้วย Node, เสิร์ฟด้วย Nginx) ที่พอร์ต host 8080 |
| Dev | รัน `npm run dev` บนเครื่อง ไม่ผ่าน Docker |
| ล็อกอิน | มีหน้าล็อกอินและ route guard แต่ตอนนี้เป็น **mock** |
| Backend | ยังไม่มี แต่เตรียมโครงไว้ |

## 3. สิ่งที่ทำไปแล้ว

- สร้างโปรเจกต์ Vite ใน `frontend/` และลบไฟล์ตัวอย่างของเทมเพลตออก
- Sidebar + พื้นที่โมดูลด้วย CSS grid (`AppLayout`) โมดูลโหลดแบบ lazy ผ่าน `Suspense`
- Module registry: เพิ่มโมดูลใหม่ได้โดยแก้ที่เดียว (ดูหัวข้อ 6)
- ระบบ i18n แบบเขียนเอง (React Context + พจนานุกรม th/en) มี type ตรวจ key ให้ครบทั้งสองภาษา
- ธีม 2026 Dark: ค่าสีดึงมาจากไฟล์ธีมจริงของ VS Code ในเครื่อง
- ระบบล็อกอินแบบ mock: หน้าล็อกอิน, `AuthContext`, route guard, เมนูผู้ใช้/ออกจากระบบ
- Docker: `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `.env.example`
- `git init` + commit แรกเรียบร้อย
- ทดสอบแล้ว: `npm run build` ผ่าน, Docker รันได้, ทดสอบใน Edge ที่ 1280×720 ผ่าน 21 ข้อ (ล็อกอิน/redirect, สลับภาษา, พับ Sidebar, ออกจากระบบ, สีธีม, min-width, ไม่มี console error)

## 4. โครงสร้างไฟล์

```
label-maker/
  docker-compose.yml        service "frontend" (พอร์ต ${APP_PORT:-8080}:80), มีที่เว้นไว้สำหรับ backend
  .env.example              APP_PORT=8080
  README.md / PLAN.md
  frontend/
    Dockerfile              node:24-alpine (build) -> nginx:1.28-alpine (serve)
    nginx.conf              SPA fallback, แคชไฟล์ใน /assets/ 1 ปี, index.html no-cache, gzip, /api/ proxy (คอมเมนต์ไว้)
    vite.config.ts          server.proxy['/api'] (คอมเมนต์ไว้)
    index.html              โหลด Noto Sans Thai จาก Google Fonts
    src/
      main.tsx              BrowserRouter > I18nProvider > AuthProvider > App
      App.tsx               Routes: /login (public) และกลุ่ม protected ที่สร้างจาก registry
      layout/               AppLayout, Sidebar, UserMenu (+ .module.css)
      modules/
        registry.ts         รายการโมดูลทั้งหมด (จุดเดียวที่ต้องแก้เวลาเพิ่มโมดูล)
        home/ sample/ settings/   หน้าเทมเพลตเปล่า
      components/           PageTemplate, LoadingScreen, LanguageToggle
      auth/                 authService (mock), AuthContext, RequireAuth, LoginPage
      i18n/                 I18nContext, en.ts (กำหนด type ของ key), th.ts
      styles/               theme.css (tokens สี), global.css (reset, ฟอนต์, scrollbar, min-size)
```

## 5. การตัดสินใจสำคัญและเหตุผล

- **Routing แยก public/protected ตั้งแต่ต้น**: หน้าล็อกอินต้องอยู่นอก layout ที่มี Sidebar ถ้าเพิ่มทีหลังต้องรื้อ `App.tsx`, layout และ registry พร้อมกัน
- **`authService.ts` เป็นจุดเดียวที่เปลี่ยนเมื่อมี backend**: interface ตั้งให้ตรงกับ API ในอนาคตแล้ว (ดูหัวข้อ 7)
- **ใช้ httpOnly cookie ในอนาคต**: หน้าเว็บไม่เก็บ token เองเพื่อความปลอดภัย
- **เก็บ key ของข้อความ error ไม่เก็บตัวข้อความ**: ข้อความจึงเปลี่ยนภาษาตามทันทีเมื่อสลับ TH/EN
- **`?redirect=` รับเฉพาะ path ภายในแอป** (ขึ้นต้นด้วย `/` และไม่ใช่ `//`) ป้องกัน open redirect
- **Nginx ตั้ง `try_files ... /index.html`**: จำเป็นเพื่อให้รีเฟรชหน้า `/settings` แล้วไม่ขึ้น 404
- **ธีมเป็น CSS variables**: ถ้าจะเพิ่มธีมสว่างทีหลัง ให้เพิ่มชุดตัวแปรเดียวกันใต้ `:root[data-theme="light"]`

## 6. วิธีเพิ่มโมดูลใหม่

1. สร้างโฟลเดอร์ `frontend/src/modules/<ชื่อ>/` และคอมโพเนนต์หน้าแบบ `export default` (ใช้ `PageTemplate` เป็นฐานได้)
2. เพิ่ม 1 รายการใน [registry.ts](frontend/src/modules/registry.ts): `id`, `path`, `labelKey`, `icon` (จาก lucide-react), `component: lazy(() => import(...))` และ `position: 'bottom'` ถ้าต้องการปักไว้ล่าง
3. เพิ่ม key ของชื่อเมนูใน [en.ts](frontend/src/i18n/en.ts) และ [th.ts](frontend/src/i18n/th.ts) (ถ้าลืมใส่ใน th.ts, TypeScript จะแจ้ง error ตอน build)

Sidebar และ Routes สร้างจาก registry อัตโนมัติ ไม่ต้องแก้ไฟล์อื่น

## 7. ล็อกอิน: สถานะปัจจุบันและวิธีเปลี่ยนเป็นของจริง

**ตอนนี้เป็น mock** ([authService.ts](frontend/src/auth/authService.ts)): รับชื่อผู้ใช้/รหัสผ่านอะไรก็ได้ที่ไม่ว่าง ชื่อผู้ใช้ `error` จำลองล็อกอินไม่ผ่าน และเก็บ session ใน `sessionStorage` ห้ามใช้จริงใน production

**เมื่อมี backend** ให้แก้เฉพาะ `authService.ts` ให้เรียก API ต่อไปนี้ด้วย `credentials: 'include'`

| ฟังก์ชัน | API | ผลลัพธ์ |
|---|---|---|
| `login(username, password)` | `POST /api/auth/login` | backend ตรวจรหัสผ่านแล้ว set httpOnly cookie, คืน `User` |
| `logout()` | `POST /api/auth/logout` | ล้าง cookie |
| `getCurrentUser()` | `GET /api/auth/me` | `200` คืน `User` / `401` ให้คืน `null` |

สิ่งที่ต้องทำควบคู่กัน
- ไม่ให้ `getCurrentUser()` throw เมื่อได้ 401 (ให้คืน `null`) เพราะ `AuthContext` ตีความ `null` ว่ายังไม่ล็อกอิน
- เปิดคอมเมนต์ `location /api/` ใน [nginx.conf](frontend/nginx.conf) และ `server.proxy` ใน [vite.config.ts](frontend/vite.config.ts)
- เพิ่ม service `backend` ใน [docker-compose.yml](docker-compose.yml) (พอร์ตที่ nginx.conf เตรียมไว้คือ `backend:3000`)
- ถ้า backend ตอบ 401 กลางคัน (session หมดอายุ) ตอนนี้ยังไม่มีตัวดักที่พาไปหน้าล็อกอินให้อัตโนมัติ ต้องเพิ่ม

## 8. ข้อจำกัดและเรื่องที่ควรรู้

- **Google Fonts**: `index.html` โหลด Noto Sans Thai จาก Google Fonts หากเครื่องที่รัน Docker/ผู้ใช้ออกอินเทอร์เน็ตไม่ได้ จะ fallback เป็นฟอนต์ระบบ ถ้าต้องใช้ในเครือข่ายปิด ให้ self-host ฟอนต์ (เช่นแพ็กเกจ `@fontsource/noto-sans-thai`)
- **ยังไม่มีชุดทดสอบอัตโนมัติในโปรเจกต์**: การทดสอบที่ผ่านมารันด้วยสคริปต์ Playwright ชั่วคราวนอกโปรเจกต์ ยังไม่ได้เก็บเข้า repo
- **`npm run lint`** มี warning 2 ข้อ (`react(only-export-components)` ใน `AuthContext.tsx` และ `I18nContext.tsx`) เพราะไฟล์ส่งออกทั้งคอมโพเนนต์และ hook ไม่กระทบการทำงาน แก้ได้โดยแยก hook ไปไฟล์ใหม่
- **เวอร์ชัน**: React 19, Node 24 ใน Docker (Vite รุ่นนี้ต้องการ Node 20.19+ หรือ 22.12+) อิมเมจ frontend ประมาณ 93MB
- **git repo**: `git init` แล้ว (branch `main`) มี `.gitignore` ที่ root (`.env`, `node_modules`, `dist`) และ commit แรกแล้ว ยังไม่ได้ตั้ง remote
- **ไม่มี HTTPS**: Nginx เสิร์ฟ HTTP พอร์ต 80 ใน container ถ้า deploy จริงต้องมี reverse proxy/TLS ด้านหน้า โดยเฉพาะเมื่อใช้ cookie ล็อกอิน (ต้องตั้ง `Secure`)
- **ตั้งค่าจริงยังไม่มี**: หน้า "ตั้งค่า" เป็นเทมเพลตว่าง ปุ่มสลับภาษาอยู่ใน Sidebar ไม่ได้อยู่ในหน้าตั้งค่า

## 9. ขั้นตอนถัดไปที่แนะนำ

เรียงตามลำดับที่ควรทำ

1. **กำหนดโมดูลจริง**: ตัดสินใจว่าโมดูลแรกคืออะไร (ชื่อแอปคือ Label Maker) แล้วแทนที่ "โมดูลตัวอย่าง" ด้วยโมดูลนั้น ตามวิธีในหัวข้อ 6
2. **เพิ่มชุดทดสอบ**: ย้ายสคริปต์ Playwright เข้ามาเป็น e2e ใน repo และเพิ่ม unit test เล็ก ๆ (เช่น `safeRedirect`, i18n) ด้วย Vitest
3. **สร้าง backend + ฐานข้อมูล** แล้วเปลี่ยน `authService` เป็นของจริงตามหัวข้อ 7 (ตัดสินใจก่อนว่าใช้เทคโนโลยีอะไรฝั่ง server)
4. **สิทธิ์ผู้ใช้ (roles)**: ถ้าบางโมดูลจำกัดสิทธิ์ ให้เพิ่มฟิลด์ `roles` ใน `User` และ `requiredRole?` ใน `ModuleDef` แล้วกรองเมนูใน Sidebar/Routes
5. **หน้าตั้งค่าจริง**: ย้ายตัวเลือกภาษา (และธีมถ้าเพิ่มธีมสว่าง) มาไว้ในหน้านี้
6. **ตัวดัก 401 กลางคัน** และหน้า error/404 ที่เป็นทางการ (ตอนนี้ path ที่ไม่มีอยู่จะ redirect ไปหน้าหลักเฉย ๆ)
7. **เตรียม deploy จริง**: self-host ฟอนต์, ใส่ HTTPS/reverse proxy, ตั้ง security headers ใน Nginx (CSP, X-Content-Type-Options ฯลฯ)
8. **(ถ้าต้องการ) ธีมสว่าง** ตามแนวทางในหัวข้อ 5

## 10. คำสั่งที่ใช้บ่อย

```bash
# dev
cd frontend && npm install && npm run dev      # http://localhost:5173

# ตรวจโค้ด
cd frontend && npm run build                   # รวม tsc -b
cd frontend && npm run lint

# Docker (รันที่ root)
docker compose up -d --build                   # http://localhost:8080
docker compose logs -f frontend
docker compose down
```
