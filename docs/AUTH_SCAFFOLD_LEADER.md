# Auth scaffold — phạm vi Leader (push cho team)

## Leader đã làm (push lên là đủ)

| Hạng mục | Vị trí |
|----------|--------|
| Cấu trúc routes → controllers → services | `backend/src/routes/auth.routes.js`, `customers.routes.js`, … |
| Controller mỏng (chỉ gọi service) | `auth.controller.js`, `customers.controller.js` |
| Service **stub 501** (chưa có nghiệp vụ) | `auth.service.js`, `customers.service.js` |
| Helper dùng khi code | `auth.helpers.js`, `utils/jwt.js`, `utils/password.js` |
| Middleware | `requireAuth` (Supabase JWT), `requireNodeAuth` (Node JWT) |
| SQL tham chiếu DB | `docs/supabase/20240113000000_node_auth.sql` — **team/leader chạy tay trên Supabase** |
| Tài liệu phân task | `docs/BE_TASK_DIVISION.csv`, `docs/AUTH_NODE_MODULE.md` |

**Leader không implement:** đăng ký, đăng nhập, quên MK, đổi MK, Google OAuth, profile PATCH, avatar upload.

---

## Team implement (assignee trong CSV)

| Task | File chính |
|------|------------|
| BE-001 Đăng ký | `auth.service.js` → `register()` |
| BE-002 Mã hóa MK | `utils/password.js` + doc; không plain text trong DB |
| BE-003 Đăng nhập + `/me` | `login()`, `getMe()` |
| BE-004 Google | route mới hoặc mở rộng `auth.routes.js` |
| BE-005 Đăng xuất | tùy chọn `POST /logout` |
| BE-006 Đổi MK | `changePassword()` |
| BE-007 Quên MK | `forgotPassword()`, `resetPassword()` |
| BE-008–010 Profile | `customers.service.js` |

Flutter customer: hiện **Supabase Auth** trong `customer_auth_repository.dart`. Khi BE-003 xong, mobile team nối `ApiClient` + Bearer token Node.

---

## Kiểm tra sau khi pull

```bash
cd backend && npm install && npm run dev
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"x"}'
# Kỳ vọng: 501 + message "BE-003: implement login()..."
```

---

## Commit gợi ý (Leader)

```
chore(backend): scaffold auth module (routes, stubs, helpers) for BE-001–010
```
