# UniMove Admin Dashboard (Flutter Web)

## Setup

```bash
cd web/admin_dashboard
flutter create . --org com.unimove --project-name unimove_admin --platforms=web
flutter pub get
flutter run -d chrome
```

## Admin account

Tạo user trên Supabase Auth, sau đó:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@unimove.com';
```

Chạy `backend/supabase/manual_fix_step5_auth_trigger.sql` nếu chưa có profile tự động.
