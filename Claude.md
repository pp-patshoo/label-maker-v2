# Label Maker

เว็บแอปสำหรับ PC (React + Vite + TS) แถบเมนูซ้าย + พื้นที่โมดูล ธีมอิง VS Code 2026 Dark
สถานะและแผนต่อไป: @PLAN.md

## คำสั่ง
- dev: `cd frontend && npm run dev` (พอร์ต 5173)
- ตรวจ: `cd frontend && npm run build && npm run lint`
- Docker: `docker compose up -d --build` (พอร์ต 8080)

## ข้อตกลง
- เพิ่มโมดูลที่ frontend/src/modules/registry.ts เท่านั้น (+ คำแปลใน i18n/en.ts และ th.ts)
- ข้อความทุกอย่างต้องผ่าน i18n (th/en) ห้าม hard-code
- สีใช้ CSS variables จาก styles/theme.css ห้ามใส่ค่าสีตรง ๆ
- ล็อกอินเป็น mock แก้เฉพาะ auth/authService.ts เมื่อมี backend
- รองรับ PC เท่านั้น (ขั้นต่ำ 1280×720)

## ก่อนจบงานทุกครั้ง
- อัปเดตหัวข้อ "สถานะ" และ "ขั้นตอนถัดไป" ใน PLAN.md ให้ตรงกับสิ่งที่ทำ
