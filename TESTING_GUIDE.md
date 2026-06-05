# 🧪 Hướng Dẫn Test Admin Dashboard

## 📋 Prerequisites

- Node.js v18+ đã cài đặt
- npm hoặc yarn
- Supabase project đã setup
- Database migrations đã chạy

---

## 🚀 Bước 1: Khởi động Backend

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies (nếu chưa)
npm install

# Kiểm tra file .env
# Đảm bảo có đủ các biến:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY  
# - JWT_SECRET
# - PORT=3001

# Chạy backend
npm run dev

# ✅ Kết quả: Backend chạy tại http://localhost:3001
```

**Test Backend Health:**
```bash
# Mở terminal mới
curl http://localhost:3001/api/health
# Expect: {"status":"ok"}
```

---

## 👤 Bước 2: Tạo Admin Account

```bash
# Trong thư mục backend
node create-admin.js

# Nhập thông tin:
# Email: admin@unimove.com
# Password: Admin@123
# Full Name: Admin User
```

**Hoặc sử dụng script SQL trực tiếp trong Supabase:**

```sql
-- 1. Insert vào profiles
INSERT INTO profiles (id, email, full_name, role, status)
VALUES (
  gen_random_uuid(),
  'admin@unimove.com',
  'Admin User',
  'admin',
  'active'
)
RETURNING id;

-- 2. Copy UUID từ bước trên, thay <ADMIN_UUID>
-- 3. Hash password (bcrypt): Admin@123
INSERT INTO user_credentials (user_id, password_hash)
VALUES (
  '<ADMIN_UUID>',
  '$2a$10$xyz...' -- Use bcrypt to hash
);
```

---

## 🖥️ Bước 3: Khởi động Admin Dashboard

```bash
# Mở terminal mới
cd web/admin_dashboard

# Cài đặt dependencies (nếu chưa)
npm install

# Kiểm tra file .env.local
# Đảm bảo có:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Chạy development server
npm run dev

# ✅ Kết quả: Frontend chạy tại http://localhost:3000
```

---

## 🔐 Bước 4: Test Login

### 1. Mở Browser
```
http://localhost:3000
```

### 2. Redirect tới Login Page
```
http://localhost:3000/login
```

### 3. Login với Admin Account
```
Email: admin@unimove.com
Password: Admin@123
```

### 4. Check Network Tab (F12)
**Request:**
```json
POST http://localhost:3001/api/admin/auth/login
{
  "email": "admin@unimove.com",
  "password": "Admin@123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "...",
      "email": "admin@unimove.com",
      "full_name": "Admin User",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 5. After Login → Redirect to Dashboard
```
http://localhost:3000/dashboard
```

---

## 📊 Bước 5: Test Dashboard APIs

### Test Dashboard Stats

**Mở Browser DevTools → Network Tab**

1. **Dashboard KPIs:**
```
GET http://localhost:3001/api/admin/dashboard
Authorization: Bearer <token>

Expected: {
  success: true,
  data: {
    gmv_yesterday: 0,
    orders_yesterday: 0,
    active_users: 5,
    pending_verifications: 2,
    open_disputes: 1,
    platform_commission: 0
  }
}
```

2. **Latest Orders:**
```
GET http://localhost:3001/api/admin/dashboard/latest-orders?page=1&pageSize=5
Expected: List of recent orders
```

3. **Revenue Chart:**
```
GET http://localhost:3001/api/admin/analytics/revenue?months=12
Expected: Monthly revenue data
```

---

## 👥 Bước 6: Test Users Management

### Navigate to Users Page
```
http://localhost:3000/users
```

### Test Filters
1. **Filter by Role:**
   - Dropdown: Select "Khách hàng" (customer)
   - API Call: `GET /api/admin/users?role=customer&page=1&pageSize=20`

2. **Search Users:**
   - Nhập tên/email vào search box
   - API Call: `GET /api/admin/users?search=john&page=1`

3. **Ban User:**
   - Click "Ban" button on a user
   - API Call: `PATCH /api/admin/users/:id/status` with `{"status": "suspended"}`

---

## 🚗 Bước 7: Test Provider Verification

### Navigate to Verifications Page
```
http://localhost:3000/verifications
```

### Test Verification Flow

1. **View Pending Providers:**
```
GET http://localhost:3001/api/admin/providers/pending
```

2. **View Provider Documents:**
   - Click on a provider
   - API: `GET /api/admin/providers/:id/documents`
   - Check images: CCCD, Bằng lái, Đăng ký xe

3. **Approve Provider:**
```
PUT http://localhost:3001/api/admin/providers/:id/verify
{
  "action": "approve",
  "notes": "Hồ sơ hợp lệ"
}
```

4. **Reject Provider:**
```
PUT http://localhost:3001/api/admin/providers/:id/verify
{
  "action": "reject",
  "notes": "Giấy tờ không rõ ràng"
}
```

---

## 📦 Bước 8: Test Orders Management

### Navigate to Orders Page
```
http://localhost:3000/orders
```

### Test Features

1. **List Orders:**
```
GET /api/admin/orders?page=1&pageSize=20
```

2. **Filter by Status:**
```
GET /api/admin/orders?status=completed&page=1
```

3. **Search by Order Number:**
```
GET /api/admin/orders?search=UNI-20240101-0001
```

4. **View Order Details:**
```
GET /api/admin/orders/:id
```

5. **Force Cancel Order:**
```
PUT /api/admin/orders/:id/cancel
{
  "reason": "Khách hàng yêu cầu hủy"
}
```

---

## ⚖️ Bước 9: Test Disputes & Refunds

### Navigate to Disputes Page
```
http://localhost:3000/disputes
```

### Test Dispute Resolution

1. **List Disputes:**
```
GET /api/admin/disputes?status=open&page=1
```

2. **View Dispute Details:**
```
GET /api/admin/disputes/:id
```

3. **Resolve Dispute:**
```
PUT /api/admin/disputes/:id/resolve
{
  "resolution": "Hoàn tiền 50% cho khách hàng",
  "resolution_type": "partial_refund",
  "refund_amount": 100000,
  "internal_notes": "Khách hàng có bằng chứng"
}
```

### Test Refunds Tab

1. **List Refunds:**
```
GET /api/admin/refunds?status=pending
```

2. **Approve Refund:**
```
PUT /api/admin/refunds/:id/approve
```

---

## ⭐ Bước 10: Test Reviews Moderation

### Navigate to Reviews Page
```
http://localhost:3000/reviews
```

### Test Moderation

1. **View Flagged Reviews:**
```
GET /api/admin/reviews?flagged=true
```

2. **Hide Review:**
```
PUT /api/admin/reviews/:id/hide
{
  "reason": "Ngôn từ không phù hợp"
}
```

3. **Unhide Review:**
```
PUT /api/admin/reviews/:id/unhide
```

4. **Flag Review:**
```
PUT /api/admin/reviews/:id/flag
{
  "reason": "Spam review"
}
```

---

## 📈 Bước 11: Test Analytics

### Navigate to Analytics Page
```
http://localhost:3000/analytics
```

### Test All Analytics APIs

1. **GMV Stats:**
```
GET /api/admin/analytics/gmv
Expected: { thisGMV, lastGMV, growth }
```

2. **Order Statistics:**
```
GET /api/admin/analytics/orders?startDate=2024-01-01&endDate=2024-12-31
```

3. **Top Providers:**
```
GET /api/admin/analytics/providers?limit=10
```

4. **Platform Commission:**
```
GET /api/admin/analytics/commission?months=6
```

---

## 📢 Bước 12: Test Announcements

### Navigate to Notifications Page
```
http://localhost:3000/notifications
```

### Test Create Announcement

1. **Create New Announcement:**
```
POST /api/admin/announcements
{
  "title": "Thông báo bảo trì hệ thống",
  "body": "Hệ thống sẽ bảo trì vào 2h sáng ngày 15/6",
  "targetAudience": "all",
  "priority": "high",
  "scheduledAt": null
}
```

2. **Publish Scheduled Announcement:**
```
PUT /api/admin/announcements/:id/publish
```

---

## 📜 Bước 13: Test Activity Logs

### Navigate to Activity Logs Page
```
http://localhost:3000/activity-logs
```

### Test Tabs

1. **Order Status History:**
```
GET /api/admin/activity/orders?page=1
```

2. **Verification History:**
```
GET /api/admin/activity/verifications?page=1
```

3. **Refund History:**
```
GET /api/admin/activity/refunds?page=1
```

---

## ⚙️ Bước 14: Test Settings

### Navigate to Settings Page
```
http://localhost:3000/settings
```

### Test Platform Settings

1. **Get Settings:**
```
GET /api/admin/settings
```

2. **Update Settings:**
```
PUT /api/admin/settings
{
  "platform_name": "UniMove",
  "commission_rate": 15,
  "support_email": "support@unimove.com"
}
```

---

## 🧪 Test Cases Checklist

### Authentication ✅
- [ ] Login với admin account thành công
- [ ] Login với non-admin account thất bại
- [ ] Login với wrong password thất bại
- [ ] Token được lưu vào localStorage
- [ ] Protected routes redirect về /login khi chưa login

### Dashboard ✅
- [ ] Dashboard stats hiển thị đúng numbers
- [ ] Revenue chart có data
- [ ] Order status donut chart hiển thị
- [ ] Latest orders table có data
- [ ] Refresh data khi F5

### Users Management ✅
- [ ] List users hiển thị
- [ ] Filter by role hoạt động
- [ ] Search by name/email hoạt động
- [ ] Ban user thành công
- [ ] Pagination hoạt động

### Provider Verification ✅
- [ ] List pending providers
- [ ] View documents (images hiển thị)
- [ ] Approve provider
- [ ] Reject provider
- [ ] Notification được tạo

### Orders Management ✅
- [ ] List orders
- [ ] Filter by status
- [ ] Search by order number
- [ ] View order details
- [ ] Cancel order

### Disputes ✅
- [ ] List disputes
- [ ] View dispute details + messages
- [ ] Resolve dispute
- [ ] Create refund khi resolve

### Refunds ✅
- [ ] List refunds
- [ ] Filter by status
- [ ] Approve refund

### Reviews ✅
- [ ] List reviews
- [ ] Filter flagged/hidden
- [ ] Hide review
- [ ] Unhide review
- [ ] Flag review

### Analytics ✅
- [ ] GMV stats
- [ ] Order statistics
- [ ] Top providers list
- [ ] Commission chart
- [ ] Revenue chart

### Announcements ✅
- [ ] List announcements
- [ ] Create announcement
- [ ] Publish announcement

### Activity Logs ✅
- [ ] Order history
- [ ] Verification history
- [ ] Refund history

### Settings ✅
- [ ] View settings
- [ ] Update settings

---

## 🐛 Troubleshooting

### Backend không start được
```bash
# Check port 3001 có bị dùng không
netstat -an | findstr :3001

# Kill process nếu có
taskkill /F /PID <process_id>
```

### Frontend không kết nối được Backend
1. Check .env.local có đúng `NEXT_PUBLIC_API_URL`
2. Check CORS trong backend (app.js)
3. Check Network tab xem có request đến backend không

### Login thất bại "Role không hợp lệ"
```sql
-- Check role trong database
SELECT id, email, role FROM profiles WHERE email = 'admin@unimove.com';

-- Update role nếu sai
UPDATE profiles SET role = 'admin' WHERE email = 'admin@unimove.com';
```

### Token expired
- Token có thời hạn 7 days
- Logout và login lại để lấy token mới
- Check localStorage: `localStorage.getItem('admin_token')`

---

## 📸 Expected UI Screenshots

### 1. Login Page
- Form với Email + Password
- Submit button
- Error message nếu login fail

### 2. Dashboard
- 6 KPI cards (GMV, Orders, Users, Verifications, Disputes, Commission)
- Line chart (Revenue)
- Donut chart (Order Status)
- Table (Latest Orders)

### 3. Users Page
- Filter dropdowns (Role, Status)
- Search input
- Table with user data
- Ban/Unban buttons

### 4. Verifications Page
- List pending providers
- View documents modal
- Approve/Reject buttons

---

## ✅ Kết Luận

Sau khi test hết các bước trên, bạn đã verify:
- ✅ 100% Backend APIs hoạt động
- ✅ Frontend-Backend integration OK
- ✅ Authentication & Authorization OK
- ✅ All CRUD operations OK
- ✅ Data fetching & display OK

**Admin Dashboard đã sẵn sàng để sử dụng! 🚀**