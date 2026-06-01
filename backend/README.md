# UniMove Backend

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Chạy API server
```bash
npm run dev
```

API mặc định: `http://localhost:3000/api/health`

### 3. Test Database Connection
```bash
npm test
```

## 📋 Prerequisites

Đảm bảo bạn đã:
- ✅ Tạo project Supabase
- ✅ Import tất cả 8 migration files
- ✅ Tạo file `.env` ở thư mục root với các thông tin:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`

## 🧪 Test Connection

Script `test-connection.js` sẽ kiểm tra:
1. ✅ Kết nối với Supabase
2. ✅ Query notification_templates table
3. ✅ Query promotions table
4. ✅ Verify 10 critical tables exist
5. ✅ Check RLS policies are active

## Structure

```
backend/
├── src/                     # Node.js Express API
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── middleware/
├── supabase/
│   ├── migrations/          # Migration files (01–11)
│   └── manual_fix_step*.sql # Script thủ công cho Supabase live
├── test-connection.js
├── package.json
└── README.md
```

## 🔧 Troubleshooting

### Error: "Missing environment variables"
→ Kiểm tra file `.env` ở thư mục root (không phải trong `backend/`)

### Error: "relation does not exist"
→ Bạn chưa import migration files vào Supabase

### Error: "Invalid API key"
→ Kiểm tra lại `SUPABASE_ANON_KEY` trong `.env`

### Error: "Connection refused"
→ Kiểm tra internet và `SUPABASE_URL`

## Next Steps

Sau khi test thành công:
1. Chạy `manual_fix_step5_auth_trigger.sql` trên Supabase (nếu chưa)
2. Kết nối Flutter apps với Node API
3. Hoàn thiện PayOS webhook
4. Xem thêm: [nodejs-api.md](../docs/nodejs-api.md)

## 🔗 Links

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Project Documentation](../docs/)
