# Module Auth Node.js — chỉ khung codebase (team implement)

> **Leader:** chỉ push scaffold — xem [AUTH_SCAFFOLD_LEADER.md](./AUTH_SCAFFOLD_LEADER.md).  
> **Team:** implement toàn bộ `auth.service.js` / `customers.service.js` (BE-001 → BE-010).

**Flutter customer + provider** dùng **Node JWT** (`AuthTokenStorage` + `ApiClient` Bearer).  
**Supabase Auth** không còn dùng trên mobile; DB vẫn qua Postgres (service role trên backend).

---

## 1. Cấu trúc backend

```
backend/src/
├── routes/
│   ├── auth.routes.js           POST register, login, forgot/reset; GET me (JWT Node)
│   └── customers.routes.js      GET/PATCH /me (JWT Supabase — tới khi đồng bộ)
├── controllers/
│   ├── auth.controller.js
│   └── customers.controller.js
├── services/
│   ├── auth.service.js          ← stub 501 — team implement BE-001…007
│   ├── auth.helpers.js          ← helper sẵn (httpError, buildAuthResponse, …)
│   └── customers.service.js     ← stub 501 — BE-008…010
├── middleware/auth.middleware.js
│   ├── requireAuth              Supabase access token (orders, payments, customers)
│   └── requireNodeAuth          JWT do Node ký (/api/auth/me, change-password)
└── utils/
    ├── jwt.js
    └── password.js
```

Đăng ký router: `backend/src/routes/index.js` → `router.use('/auth', …)` và `router.use('/customers', …)`.

---

## 2. Database — chỉnh thủ công trên Supabase

**Không** chạy tự động từ CI nếu team chưa review. Copy SQL vào **Supabase Dashboard → SQL Editor**:

- File gốc: `backend/supabase/migrations/20240113000000_node_auth.sql`
- Bản tham chiếu (cùng nội dung): `docs/supabase/20240113000000_node_auth.sql`

Tạo:

| Bảng | Mục đích |
|------|----------|
| `user_credentials` | `password_hash` bcrypt |
| `password_reset_tokens` | OTP quên MK (Node gửi mail sau) |

Và `ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey` (profiles không bắt buộc `auth.users` khi dùng Node JWT).

---

## 3. Biến môi trường (`.env` ở repo root)

```env
JWT_SECRET=<chuỗi-dài-ngẫu-nhiên>
JWT_EXPIRES_IN=7d
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
cd backend && npm install && npm run dev
```

---

## 4. API (contract — implement trong `auth.service.js`)

| Task | Method | Path | Ghi chú |
|------|--------|------|---------|
| BE-001 | POST | `/api/auth/register` | **Cách A** — body bắt buộc: `email`, `password` (≥8), `full_name`, `phone` (chuẩn `+84`). Không nhận `student_id`/`university` (bổ sung ở BE-009 PATCH profile). `role` luôn `customer`. |
| BE-003 | POST | `/api/auth/login` | trả `{ user, accessToken }` |
| — | GET | `/api/auth/me` | `requireNodeAuth` |
| BE-006 | POST | `/api/auth/change-password` | `requireNodeAuth` |
| BE-007 | POST | `/api/auth/forgot-password` | OTP, không Supabase email |
| BE-007 | POST | `/api/auth/reset-password` | email, token, new_password |
| BE-008 | GET | `/api/customers/me` | stub |
| BE-009 | PATCH | `/api/customers/me` | stub |

Helper sẵn trong `auth.service.js` → `_utils`: `hashPassword`, `verifyPassword`, `buildAuthResponse`, …

---

## 5. Test nhanh

**Đăng ký (BE-001 — Cách A, khớp UI customer):**

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@student.edu",
  "password": "Password123!",
  "full_name": "Nguyen Van A",
  "phone": "0123456789"
}
```

`phone` lưu dạng `+84901234567`. Không gửi `student_id` / `university` ở bước đăng ký.

**Đăng nhập (BE-003):**

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{ "email": "...", "password": "..." }
```

Header các route Node: `Authorization: Bearer <accessToken>`.

---

## 6. Phân công

Chi tiết: [BE_TASK_DIVISION_AUTH.md](./BE_TASK_DIVISION_AUTH.md), [AUTH_PROFILE_WHERE_TO_CODE.md](./AUTH_PROFILE_WHERE_TO_CODE.md).
