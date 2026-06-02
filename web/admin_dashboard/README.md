# UniMove Admin Dashboard (Flutter Web)

## Auth

Đăng nhập qua **Node API** (`POST /api/auth/login`), JWT lưu `shared_preferences`.

- Tài khoản cần `role = admin` trong bảng `profiles` + hàng `user_credentials` (xem `docs/AUTH_NODE_MODULE.md`).
- Backend: `npm run dev` tại `backend/` (mặc định `http://localhost:3000`).
- Dashboard gọi `GET /api/admin/*` (yêu cầu JWT admin).

## Chạy

```bash
cd web/admin_dashboard
flutter pub get
flutter run -d chrome
```
