# UniMove — Flutter Apps Setup

Sau khi database test PASS, làm theo thứ tự sau.

## 1. Auth trigger trên Supabase (bắt buộc)

Chạy **1 lần** trong SQL Editor:

`backend/supabase/manual_fix_step5_auth_trigger.sql`

## 1b. Email OTP (xác nhận qua mail — không SMS)

Trên **Supabase Dashboard → Authentication → Providers → Email**:

- Bật **Email** provider
- Bật **Confirm email** hoặc dùng template **Magic Link / OTP** (mã 6 số)
- **Authentication → Email Templates**: chỉnh template OTP nếu cần

Luồng app:

- **Đăng ký**: Họ tên + Email + SĐT → gửi OTP email → màn `/verify-otp`
- **Đăng nhập**: Email → gửi OTP email → nhập mã → vào app

SĐT lưu trong `profiles.phone` (liên hệ đơn hàng), không dùng SMS.

## 2. Customer App

Project Flutter mặc định (demo counter). Chưa có UI UniMove / Supabase.

```powershell
cd mobile/customer_app
flutter pub get
flutter run
```

## 3. Provider App

```powershell
cd mobile/provider_app
flutter create . --org com.unimove --project-name unimove_provider
flutter pub get
flutter run
```

## 4. Admin Web

```powershell
cd web/admin_dashboard
flutter create . --org com.unimove --project-name unimove_admin --platforms=web
flutter pub get
flutter run -d chrome
```

Tạo admin user và gán role:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@unimove.com';
```

## Cấu trúc đã scaffold

| App | Auth | Home | Supabase |
|-----|------|------|----------|
| Customer | Login, Register (customer) | Home placeholder | ✅ |
| Provider | Login, Register (provider) | Home + verify badge | ✅ |
| Admin Web | Login (admin only) | Dashboard stats | ✅ |

## Bước tiếp theo sau Auth

1. Customer: Booking flow (`orders`, `order_items`)
2. Provider: Upload KYC (`provider_documents`)
3. Payment: PayOS integration
4. Tracking: `provider_locations` realtime
