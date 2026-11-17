# PLAN.md: สิ่งที่ทำไปแล้วและแนวทางพัฒนาต่อ

เอกสารนี้สรุปสถานะโปรเจกต์ Label Maker เพื่อใช้เป็นจุดตั้งต้นในการพัฒนาขั้นถัดไป
วิธีติดตั้ง/รันอยู่ที่ [README.md](README.md) ส่วนกฎการทำงานของ Claude อยู่ที่ [Claude.md](Claude.md)

## 1. เป้าหมาย

เว็บแอปสำหรับ PC แบ่งเป็น 2 ส่วน
1. **แถบเมนูซ้าย (Sidebar)** แสดงรายการเมนู พับเก็บได้
2. **พื้นที่โมดูล** เปลี่ยนเนื้อหาตามเมนูที่ผู้ใช้เลือก

พร้อมระบบล็อกอินจริงที่เก็บบัญชีผู้ใช้ใน PostgreSQL ส่วนโมดูลงานจริง (Label Maker) ยังไม่ได้เริ่ม

## 2. ข้อกำหนดที่ตกลงไว้

| หัวข้อ | ข้อกำหนด |
|---|---|
| Frontend | React 19 + Vite + TypeScript, `react-router-dom`, `lucide-react`, CSS Modules |
| Backend | Node.js + TypeScript, Fastify 5, Drizzle ORM, `@node-rs/argon2`, zod |
| ฐานข้อมูล | PostgreSQL 18 ใน Docker (volume `pgdata`) |
| อุปกรณ์ | PC เท่านั้น หน้าต่างขั้นต่ำ 1280×720 |
| Sidebar | กาง 240px / พับ 64px จำสถานะใน localStorage |
| ภาษา | ไทย/อังกฤษ สลับได้ ค่าเริ่มต้นไทย |
| ธีม | มืดอย่างเดียว อิง VS Code "2026 Dark" สีทั้งหมดเป็น CSS variables |
| Deploy | Docker Compose: `frontend` (nginx, :8080) → `backend` (:3000, ภายใน) → `db` (:5432, ภายใน) |
| Dev | DB ใน Docker (`compose.dev.yml` เปิด 127.0.0.1:5432) ส่วน backend/frontend รันบนเครื่อง |
| บัญชีผู้ใช้ | ไม่มีสมัครเอง admin สร้างให้ admin คนแรกมาจาก `.env` |
| สิทธิ์ | 2 ระดับ: `admin` / `user` |
| รหัสผ่าน | Argon2id, 10–128 ตัว, ห้ามเหมือนชื่อผู้ใช้ (แนว NIST ไม่บังคับผสมตัวอักษร) |
| รหัสชั่วคราว | admin สร้างหรือรีเซ็ตแล้ว ผู้ใช้ต้องเปลี่ยนก่อนใช้งานเมนูอื่น |
| Session | เก็บใน DB + httpOnly cookie, หมดอายุเมื่อ idle 8 ชม. หรือครบ 7 วัน |
| กันเดารหัส | ผิด 5 ครั้งติดกัน ล็อก 15 นาที + จำกัด 20 ครั้ง/15 นาที/IP |
| Audit | บันทึกประวัติการล็อกอินทุกครั้ง (สำเร็จ/ไม่สำเร็จ, IP, อุปกรณ์) |

## 3. สถานะ: สิ่งที่ทำไปแล้ว

**รอบ 1: โครงหน้าเว็บ** (commit `8e4ae72`)
- Sidebar + พื้นที่โมดูล, module registry, i18n th/en, ธีม 2026 Dark, ล็อกอินแบบ mock, Docker (nginx)

**รอบ 2: ระบบล็อกอินจริง** (merge เข้า `main` แบบ fast-forward แล้ว ที่ `fddf4ae` ไม่ได้ทำ PR เพราะเครื่องไม่มี `gh`)
- Backend ใหม่ใน `backend/`: auth, จัดการผู้ใช้, ประวัติการล็อกอิน, migration อัตโนมัติ, สร้าง admin คนแรก
- PostgreSQL + `compose.dev.yml` และ nginx proxy `/api/` (resolve ชื่อ backend ใหม่ทุก 10 วิ จึงไม่ค้าง IP เก่าเวลา recreate backend)
- Frontend
  - `api/client.ts` (apiFetch และจัดการ session หมดอายุ)
  - authService เรียก API จริง (**ลบ mock แล้ว**)
  - หน้าบังคับเปลี่ยนรหัส
  - โมดูล **จัดการผู้ใช้** (admin) มีแท็บผู้ใช้และแท็บประวัติการล็อกอิน
  - ส่วนเปลี่ยนรหัสในหน้าตั้งค่า
  - กรองเมนูตาม role
- ย้ายสีที่เคยใส่ตรง ๆ (badge, เงา, backdrop) ไปเป็น token ใน `theme.css`
- **ผลทดสอบ**
  - backend 30 เทสต์ผ่าน (vitest + DB จริง)
  - E2E ด้วย Playwright + Edge ผ่าน 27 ข้อ
  - `tsc` และ build ผ่านทั้งสองฝั่ง
  - ตรวจแล้วว่า hash ใน DB เป็น `$argon2id$`, ข้อมูลยังอยู่หลัง down/up และพอร์ต 3000/5432 เข้าจาก host ไม่ได้

**ตรวจการ deploy ใน LAN ผ่าน Static IP** (ไม่ใช้ DNS/Let's Encrypt)
- ใช้ได้โดยไม่แก้โค้ด: ตั้ง `APP_ORIGIN=http://<ip>:<port>` และ `COOKIE_SECURE=false` (วิธีตั้งอยู่ใน README หัวข้อ "Deploy บน Linux ใน LAN")
- เพิ่มตัวแปร `APP_BIND` ใน docker-compose (ค่าเริ่มต้น `0.0.0.0`) เพื่อเปิดพอร์ตเฉพาะ IP ของ LAN

**รอบ 3: UI ใช้ร่วมกัน** (merge เข้า `main` แล้ว ที่ `f51d2c5`)
- แยกจากโมดูลจัดการผู้ใช้มาไว้ใน `components/`: `Tabs`, `DataTable` (+ `Table.module.css` มีคลาส `muted`/`ellipsis`/`actions` สำหรับ cell), `Badge`/`BadgeList` (tone: neutral/ok/warn/error/accent), `IconButton`, `Toolbar` (มีช่องแสดง error), `Pager` (limit/offset)
- เพิ่ม `hooks/useApiData` (โหลดข้อมูล + `reload()` + error key, loader ต้องห่อ `useCallback`) และย้าย `useDateFormat` ไปที่ `hooks/`
- โมดูลผู้ใช้เปลี่ยนมาใช้ของกลางทั้งหมด หน้าตาเหมือนเดิม และ warning `set-state-in-effect` หายไป
- **ผลทดสอบ**: build ผ่าน, lint เหลือ warning 2 ข้อ, ตรวจด้วย Playwright + Edge (dev server + DB `labelmaker_test`) ว่าแท็บ, ตาราง, badge, refresh, pager และปุ่มปลดล็อกยังทำงาน

## 4. โครงสร้างไฟล์

```
label-maker/
  docker-compose.yml        db + backend + frontend, volume pgdata
  compose.dev.yml           เปิด db ที่ 127.0.0.1:5432 สำหรับ dev
  .env.example              ค่าตั้งต้นของ compose (รหัส DB, admin คนแรก, APP_ORIGIN, COOKIE_SECURE)
  README.md / PLAN.md / Claude.md
  backend/
    Dockerfile              node:24-alpine multi-stage, รันด้วย user node, มี HEALTHCHECK
    .env.example            ค่าสำหรับ dev บนเครื่อง
    drizzle/                SQL migrations (commit)
    src/
      server.ts             migrate → bootstrap admin → listen, ลบ session หมดอายุทุก 1 ชม.
      app.ts                buildApp(): plugins, error handler, routes ภายใต้ /api
      config.ts             ตรวจ env ด้วย zod
      errors.ts             HttpError + parse()
      db/                   client.ts (pool, migrate), schema.ts (users, sessions, login_events)
      auth/                 password.ts, sessions.ts, guards.ts (CSRF + requireAuth/requireAdmin), routes.ts, serialize.ts
      users/routes.ts       API จัดการผู้ใช้ + login-events
      audit/loginEvents.ts  บันทึก/ค้นประวัติ
      bootstrap.ts          สร้าง admin คนแรก
    test/                   vitest: auth.test.ts, users.test.ts (ใช้ DB labelmaker_test)
  frontend/
    nginx.conf              SPA fallback, cache, gzip, proxy /api/
    vite.config.ts          proxy /api → localhost:3000
    src/
      api/client.ts         apiFetch, ApiError, errorKey/errorVars
      auth/                 authService, AuthContext, RequireAuth, LoginPage, ChangePasswordPage/Form, passwordPolicy
      layout/               AppLayout, Sidebar (กรองตาม role), UserMenu
      modules/
        registry.ts         รายการโมดูล + requiredRole
        home/ sample/       หน้าเทมเพลตเปล่า
        users/              UsersPage, UsersTab, LoginHistoryTab, UserDialogs, usersApi
        settings/           ข้อมูลบัญชี + เปลี่ยนรหัสผ่าน
      components/           PageTemplate, LoadingScreen, LanguageToggle, Dialog, Form.module.css,
                            Tabs, DataTable (+Table.module.css), Badge, IconButton, Toolbar, Pager
      hooks/                useApiData, useDateFormat
      i18n/                 I18nContext (t รองรับ {ตัวแปร}), en.ts, th.ts
      styles/               theme.css (tokens), global.css
```

## 5. API

| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| POST | `/api/auth/login` | public | 200 User + cookie / 401 `invalid_credentials` / 429 `too_many_attempts` (+`retryAfter` วินาที) |
| POST | `/api/auth/logout` | - | ลบ session + cookie (204) |
| GET | `/api/auth/me` | login | User / 401 |
| POST | `/api/auth/change-password` | login | ยกเลิก session อื่นของผู้ใช้ |
| GET/POST | `/api/users` | admin | รายชื่อ / สร้าง (รหัสชั่วคราว) |
| PATCH | `/api/users/:id` | admin | displayName, role, isActive |
| POST | `/api/users/:id/reset-password` | admin | ตั้งรหัสชั่วคราว + ยกเลิก session |
| POST | `/api/users/:id/unlock` | admin | ปลดล็อกบัญชี |
| GET | `/api/login-events?limit&offset&userId` | admin | ประวัติการล็อกอิน |
| GET | `/api/health` | public | healthcheck |

- error ทุกตัวอยู่ในรูป `{ "error": "<code>" }` ส่วนหน้าเว็บแปลผ่าน key `error.<code>` ใน i18n
- ถ้ายังมีรหัสชั่วคราว endpoint อื่นนอกจาก me/logout/change-password จะตอบ 403 `password_change_required`

## 6. การตัดสินใจสำคัญและเหตุผล

- **Session ใน DB แทน JWT**: ยกเลิกได้ทันทีเมื่อออกจากระบบ เปลี่ยนรหัส หรือปิดบัญชี และ DB เก็บแค่ SHA-256 ของ token ถ้า DB รั่วก็ยังใช้ session ไม่ได้
- **Argon2id (m=19MiB, t=2, p=1)** ตามค่าที่ OWASP แนะนำ ส่วนชื่อผู้ใช้ที่ไม่มีอยู่ก็ยังรัน verify กับ hash หลอก เพื่อให้เวลาตอบใกล้เคียงกันจนเดาชื่อผู้ใช้จากเวลาไม่ได้
- **ข้อความ error ตอนล็อกอินเหมือนกันหมด** (รหัสผิด, ไม่มีชื่อนี้, บัญชีถูกปิด) ป้องกันการเดาว่าชื่อไหนมีอยู่
- **CSRF**: SameSite=Lax + บังคับ Content-Type JSON + ตรวจ Origin กับ `APP_ORIGIN` (frontend จึงส่ง body `{}` เสมอแม้ไม่มีข้อมูล)
- **nginx เขียนทับ X-Forwarded-For** ด้วย IP จริง เพื่อไม่ให้ client ปลอม IP ในประวัติการล็อกอินได้ ส่วน backend ตั้ง `trustProxy` เพราะเข้าถึงได้ผ่าน nginx เท่านั้น
- **ไม่มีการลบผู้ใช้**: ใช้ปิดบัญชีแทน เพื่อให้ประวัติสมบูรณ์ และ admin ปิดหรือลดสิทธิ์ตัวเองไม่ได้ ระบบจึงไม่มีทางเหลือ admin เป็นศูนย์
- **Routing แยก public / change-password / protected** โดยมี `RequireAuth` ตัวเดียวคุมทั้งการล็อกอิน รหัสชั่วคราว และ role
- **ธีมเป็น CSS variables ทั้งหมด**: ถ้าจะเพิ่มธีมสว่างให้เพิ่มชุดตัวแปรใต้ `:root[data-theme="light"]`

## 7. วิธีเพิ่มโมดูลใหม่

1. สร้างโฟลเดอร์ `frontend/src/modules/<ชื่อ>/` และคอมโพเนนต์หน้าแบบ `export default` (ใช้ `PageTemplate` เป็นฐาน ส่วนหน้ารายการให้ใช้ `Toolbar` + `DataTable` + `Pager` และโหลดข้อมูลด้วย `useApiData`)
2. เพิ่ม 1 รายการใน [registry.ts](frontend/src/modules/registry.ts) และใส่ `requiredRole: 'admin'` ถ้าจำกัดสิทธิ์
3. เพิ่มคำแปลใน [en.ts](frontend/src/i18n/en.ts) และ [th.ts](frontend/src/i18n/th.ts) (ถ้าลืม th, TypeScript จะแจ้ง error)
4. ถ้าต้องมี API: เพิ่ม route ใน `backend/src/<module>/routes.ts` พร้อม `requireAuth()`/`requireAdmin()` แล้ว register ใน `app.ts` ฝั่งหน้าเว็บเรียกผ่าน `apiFetch`

## 8. ข้อจำกัดและเรื่องที่ควรรู้

- **รหัส admin ใน `.env`** ใช้แค่ตอนที่ยังไม่มีผู้ใช้เลย ถ้าลืมรหัส admin ทุกคน ต้องแก้ใน DB เอง เพราะยังไม่มีคำสั่งกู้คืน (ดูขั้นตอนถัดไปข้อ 3)
- **IP ในประวัติตอนรันบน Docker Desktop (Windows)** จะเป็น IP ของ gateway (เช่น `172.19.0.1`) ไม่ใช่ IP จริง เพราะ Docker Desktop ทำ NAT แต่บนเซิร์ฟเวอร์ Linux จะเห็น IP จริง ถ้ามี reverse proxy อีกชั้นด้านหน้าต้องปรับ nginx ให้ส่งต่อ IP
- **Rate limit ต่อ IP เก็บใน memory** ของ backend จึงรีเซ็ตเมื่อ restart และถ้า scale backend หลายตัวต้องย้ายไปใช้ store กลาง (เช่น Redis)
- **ไม่มี HTTPS** ใน container ถ้า deploy จริงต้องมี TLS ด้านหน้า แล้วตั้ง `COOKIE_SECURE=true` และ `APP_ORIGIN` ให้ตรง
- **ใช้ใน LAN ผ่าน IP แบบ HTTP ได้** แต่รหัสผ่าน/cookie ไม่ได้เข้ารหัสระหว่างทาง ถ้า `APP_ORIGIN` ไม่ตรงกับ URL ในเบราว์เซอร์จะได้ 403 `bad_origin` และ Docker เปิดพอร์ตโดยข้ามกฎ ufw จึงควรตั้ง `APP_BIND`
- **ทดสอบ backend บน Windows** ให้รันจาก PowerShell เพราะ Git Bash ทำให้ vitest error "failed to find the runner" (ตัวอักษรไดรฟ์ไม่ตรงกัน)
- **lint ของ frontend** มี warning 2 ข้อ: `only-export-components` (ไฟล์ context ส่งออกทั้ง Provider และ hook) ไม่กระทบการทำงาน
- **E2E test** ยังเป็นสคริปต์ชั่วคราวนอก repo ยังไม่ได้ย้ายเข้าโปรเจกต์
- **Google Fonts**: ถ้าใช้ในเครือข่ายปิด ต้อง self-host ฟอนต์ Noto Sans Thai
- **npm install-scripts**: npm รุ่นนี้บล็อก postinstall ของ esbuild ใน backend ซึ่งไม่กระทบ (tsx/drizzle-kit ใช้งานได้)

## 9. ขั้นตอนถัดไปที่แนะนำ

1. **(ตามความต้องการของโมดูล) ขยาย API/Routing**: เพิ่ม DELETE/PUT และดาวน์โหลดไฟล์ใน `apiFetch`, รับอัปโหลดไฟล์ใน backend (ตอนนี้ JSON ≤ 64KB), หน้าย่อยในโมดูล (`path/*`) ทำเมื่อโมดูลจริงต้องใช้
2. **ย้าย E2E test เข้า repo** (Playwright) และเพิ่ม unit test ฝั่ง frontend ด้วย Vitest (เช่น `safeRedirect`, `checkPassword`, `errorKey`)
3. **คำสั่งกู้คืน admin** เช่น `docker compose exec backend node dist/cli/reset-admin.js <username>` สำหรับกรณีลืมรหัส admin ทุกคน
4. **กำหนดโมดูลจริง**: แทนที่ "โมดูลตัวอย่าง" ด้วยโมดูล Label Maker ตามหัวข้อ 7
5. **เตรียม deploy จริง** (ถ้าใช้แค่ใน LAN ดู README หัวข้อ "Deploy บน Linux ใน LAN"; ถ้าต้องการ HTTPS โดยไม่ใช้ DNS ให้ใช้ cert จาก internal CA ที่ใส่ IP ใน SAN): HTTPS/reverse proxy, `COOKIE_SECURE=true`, security headers ใน nginx (CSP, X-Content-Type-Options, Referrer-Policy), self-host ฟอนต์, กำหนดการ backup DB อัตโนมัติ
6. **ตั้ง retention ของ login_events** (เช่น ลบที่เก่ากว่า 1 ปี) ก่อนตารางโตมาก
7. **(ถ้าต้องการ) ฟีเจอร์ล็อกอินเพิ่ม**: Remember me, แสดง/ยกเลิก session ที่เปิดอยู่ของตัวเอง, MFA
8. **(ถ้าต้องการ) ธีมสว่าง** ตามแนวทางในหัวข้อ 6

## 10. คำสั่งที่ใช้บ่อย

```bash
# dev
docker compose -f docker-compose.yml -f compose.dev.yml up -d db
cd backend && npm run dev          # :3000
cd frontend && npm run dev         # :5173

# ตรวจโค้ด
cd backend && npx tsc --noEmit && npm test     # (Windows: รันจาก PowerShell)
cd frontend && npm run build && npm run lint

# Docker ทั้งระบบ
docker compose up -d --build       # http://localhost:8080
docker compose logs -f backend
docker compose down                # ข้อมูลยังอยู่
docker compose down -v             # ลบข้อมูลทั้งหมด ⚠️

# DB
docker compose exec db psql -U labelmaker labelmaker
cd backend && npm run db:generate  # หลังแก้ schema.ts
```
