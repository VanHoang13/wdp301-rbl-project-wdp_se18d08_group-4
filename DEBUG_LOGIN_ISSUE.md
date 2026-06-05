# 🐛 BÁO CÁO LỖI ĐĂNG NHẬP - UNIMOVE ADMIN DASHBOARD

## 📋 TỔNG QUAN

**Ngày:** 04/06/2026  
**Vấn đề:** Đăng nhập thành công nhưng bị redirect lại về trang login  
**Trạng thái:** Đang debug

---

## ✅ NHỮNG GÌ ĐÃ HOÀN THÀNH

### 1. Backend API (100% hoàn thành)
- ✅ Tất cả 40+ API endpoints cho admin đã được implement
- ✅ JWT authentication hoạt động tốt
- ✅ Backend chạy ổn định trên port 3000
- ✅ CORS đã được cấu hình đúng
- ✅ Login API trả về `accessToken` và thông tin user chính xác

**Files liên quan:**
- `backend/src/controllers/admin.controller.js`
- `backend/src/routes/admin.routes.js`
- `backend/src/services/auth.helpers.js`
- `backend/src/middleware/auth.middleware.js`

### 2. Frontend Admin Dashboard
- ✅ Tất cả UI components đã được tạo
- ✅ Dashboard layout hoàn chỉnh (Sidebar, Header, Main content)
- ✅ API client utility (`lib/api.ts`) đã được tạo với JWT token management
- ✅ Tất cả query functions đã chuyển sang gọi backend API

**Files liên quan:**
- `web/admin_dashboard/lib/api.ts`
- `web/admin_dashboard/lib/queries/*.ts`

### 3. Login Page
- ✅ Login form hoạt động
- ✅ Gọi backend API thành công
- ✅ Nhận response 200 OK với accessToken
- ✅ Lưu token vào localStorage thành công
- ✅ Lưu token vào cookies (backup) thành công
- ✅ User data được lưu đầy đủ

**File:** `web/admin_dashboard/app/(auth)/login/page.tsx`

### 4. Admin Account
- ✅ Admin account đã được tạo:
  - Email: `admin@unimove.com`
  - Password: `Admin123!@#`
  - Role: `admin`
  - User ID: `2690c66f-d1b5-4820-a7fb-b4bf94b96277`

**Script:** `backend/create-admin-jwt.js`

---

## 🔴 VẤN ĐỀ HIỆN TẠI

### **Mô tả lỗi:**
Sau khi đăng nhập thành công:
1. ✅ Login API trả về 200 OK
2. ✅ Token được lưu vào localStorage
3. ✅ Token được lưu vào cookies
4. ✅ Redirect đến `/dashboard` thành công
5. ❌ **Dashboard hiển thị một chút (~100ms) rồi redirect lại về `/login`**

### **Logs từ Console:**

#### Khi đăng nhập:
```
========================================
🔐 BẮT ĐẦU ĐĂNG NHẬP
Email: admin@unimove.com
API URL: http://localhost:3000/api
Full URL: http://localhost:3000/api/admin/auth/login
========================================
📡 Đang gọi API...
URL: http://localhost:3000/api/admin/auth/login
Body: {email: "admin@unimove.com", password: "Admin123!@#"}

📥 Nhận được response!
Status: 200
Status Text: OK
OK?: true

🔍 Parsing JSON...
📄 Raw response text: {"success":true,"message":"Đăng nhập thành công","data":{"user":{"id":"2690c66f-...","email":"admin@unimove.com","role":"admin","status":"active"},"accessToken":"eyJhbGci..."}}
✅ JSON parsed successfully

📦 Dữ liệu response:
Success: true
Message: Đăng nhập thành công
Data: {user: {...}, accessToken: "..."}

🔍 Kiểm tra quyền admin...
User role: admin
✅ ĐĂNG NHẬP THÀNH CÔNG!

💾 Đang lưu token vào localStorage...
✅ Đã lưu token: eyJhbGciOiJIUzI1NiIsInR...
✅ Đã lưu user: admin@unimove.com

🔍 Kiểm tra localStorage:
Token saved? YES
User saved? YES
Cookie saved? YES

🚀 ĐANG CHUYỂN HƯỚNG ĐẾN /dashboard...
```

#### Backend logs:
```
POST /api/admin/auth/login 200 1176.522 ms - 543
POST /api/admin/auth/login 200 362.773 ms - 543
POST /api/admin/auth/login 200 316.666 ms - 543
POST /api/admin/auth/login 200 582.051 ms - 543
POST /api/admin/auth/login 401 1105.469 ms - 76  <-- LẠ: Có request 401
```

#### Kiểm tra localStorage sau khi redirect về login:
```javascript
localStorage.getItem('admin_token')
// Kết quả: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNjkwYzY2Zi1kMWI1LTQ4MjAtYTdmYi1iNGJmOTRiOTYyNzciLCJlbWFpbCI6ImFkbWluQHVuaW1vdmUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzQ5NTQ5NjM4LCJleHAiOjE3NDk2MzYwMzh9.HbQ-kaGhFv3BL8PODBzDxlhGo1MuIyhGWzp_pmJHZXw"

document.cookie
// Kết quả: "admin_token=eyJhbGci...; admin_user=%7B%22id%22%3A%22..."
```

**➡️ TOKEN VẪN CÒN TRONG LOCALSTORAGE VÀ COOKIES!**

---

## 🔍 PHÂN TÍCH

### **Những gì đã xác định:**
1. ✅ Backend API hoạt động hoàn hảo (trả về 200 với token hợp lệ)
2. ✅ Token được lưu thành công vào localStorage
3. ✅ Token được lưu thành công vào cookies
4. ✅ Redirect đến `/dashboard` thành công
5. ✅ Token KHÔNG bị mất sau redirect (vẫn còn trong localStorage)
6. ❌ Dashboard page đang redirect lại về login vì một lý do nào đó

### **Nghi ngờ:**
1. **Dashboard component useEffect đang check token và redirect** - Nhưng đã thêm alert debug mà không thấy hiện lên
2. **React Strict Mode** có thể đang chạy useEffect 2 lần và clear token
3. **Next.js navigation** có thể đang làm mất state hoặc localStorage
4. **Sidebar hoặc Header component** có thể đang check auth và redirect
5. **Layout component** có thể có logic auth ẩn

### **Request 401 lạ trong backend logs:**
- Có một request login trả về 401 "Invalid email or password"
- Payload của request 401: `{email: "admin@unimove.com", password: " Admin123!@#"}` (có thể có space thừa?)
- Request này có thể do user retry hoặc do code gửi request 2 lần

---

## 🔧 DEBUG ĐÃ THỰC HIỆN

### 1. Thêm extensive logging vào login page
- ✅ Log mọi bước: API call, response, save token, verify token
- ✅ Kết quả: Tất cả đều thành công

### 2. Chuyển Dashboard sang Client Component
- ✅ Thêm `"use client"` directive
- ✅ Dùng `useEffect` để check token và load data
- ✅ Thêm alert debug để dừng execution
- ❌ Alert không hiện lên (component có thể không mount hoặc mount quá nhanh)

**File:** `web/admin_dashboard/app/(dashboard)/dashboard/page.tsx`

### 3. Thêm cookies backup
- ✅ Lưu token vào cookies ngoài localStorage
- ✅ Cookies được lưu thành công
- ❌ Vẫn bị redirect

### 4. Loại bỏ setTimeout trong redirect
- ✅ Dùng `window.location.href` trực tiếp thay vì `setTimeout`
- ❌ Vẫn bị redirect

---

## 📝 CODE QUAN TRỌNG CẦN KIỂM TRA

### 1. Dashboard Page Authentication Check
```typescript
// File: web/admin_dashboard/app/(dashboard)/dashboard/page.tsx
useEffect(() => {
  console.log('🔐 Dashboard mounting...');
  
  const token = localStorage.getItem('admin_token');
  const userStr = localStorage.getItem('admin_user');
  
  console.log('🔍 Checking authentication:');
  console.log('Token exists?', !!token);
  console.log('Token value:', token ? token.substring(0, 30) + '...' : 'NULL');
  
  if (!token) {
    console.log('🚫 No token found, redirecting to login...');
    alert('DEBUG: No token found! Redirecting to login...');  // ⚠️ Alert này không hiện!
    router.push('/login');
    return;
  }

  console.log('✅ Token found, setting in API client...');
  alert('DEBUG: Token found! Token = ' + token.substring(0, 30) + '...');  // ⚠️ Alert này cũng không hiện!
  
  apiClient.setToken(token);
  loadDashboardData();
}, [router]);
```

**⚠️ VẤN ĐỀ:** Không có alert nào hiện lên, có nghĩa là:
- Component không mount được, hoặc
- useEffect không chạy, hoặc
- Có một redirect khác xảy ra trước khi useEffect chạy

### 2. Dashboard Layout
```typescript
// File: web/admin_dashboard/app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <Sidebar />  {/* ⚠️ CẦN KIỂM TRA */}
      </Suspense>
      
      <DashboardShell>
        <Header />  {/* ⚠️ CẦN KIỂM TRA */}
        <main>{children}</main>
      </DashboardShell>
    </div>
  );
}
```

**⚠️ CHÚ Ý:** Sidebar và Header có thể có logic auth

### 3. Components cần kiểm tra
- `components/dashboard/sidebar.tsx` - Có thể check auth?
- `components/dashboard/header.tsx` - Có function logout redirect về login
- `components/dashboard/dashboard-shell.tsx` - Có thể có logic ẩn?

---

## 🎯 BƯỚC TIẾP THEO ĐỂ FIX

### **CÁC THỬ NGHIỆM CẦN LÀM:**

#### 1. **Kiểm tra Sidebar component**
```bash
# Mở file và tìm các logic auth:
web/admin_dashboard/components/dashboard/sidebar.tsx
```
Tìm:
- `localStorage.getItem`
- `router.push('/login')`
- `useEffect` có check auth

#### 2. **Kiểm tra Header component**
```bash
web/admin_dashboard/components/dashboard/header.tsx
```
Tìm:
- Logic logout có tự động trigger không
- Auth check trong useEffect

#### 3. **Kiểm tra DashboardShell**
```bash
web/admin_dashboard/components/dashboard/dashboard-shell.tsx
```
Tìm:
- Auth logic
- Redirect logic

#### 4. **Thử disable Sidebar và Header tạm thời**
Trong `app/(dashboard)/layout.tsx`:
```typescript
export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* <Suspense fallback={null}>
        <Sidebar />
      </Suspense> */}
      
      {/* <DashboardShell>
        <Header /> */}
        <main>{children}</main>
      {/* </DashboardShell> */}
    </div>
  );
}
```

Nếu sau khi comment Sidebar và Header mà dashboard vẫn hiển thị được, thì lỗi nằm ở Sidebar hoặc Header!

#### 5. **Thử truy cập dashboard trực tiếp**
1. Clear console
2. Tick "Preserve log"
3. Truy cập: `http://localhost:3002/dashboard`
4. Xem console logs có gì

#### 6. **Kiểm tra React DevTools**
- Mở React DevTools
- Xem component tree khi redirect
- Xem component nào mount/unmount

#### 7. **Thêm debugger breakpoint**
Trong `app/(dashboard)/dashboard/page.tsx`, dòng đầu tiên của useEffect:
```typescript
useEffect(() => {
  debugger;  // Trình duyệt sẽ dừng ở đây
  console.log('🔐 Dashboard mounting...');
  // ...
}, [router]);
```

---

## 📂 CẤU TRÚC FILE QUAN TRỌNG

```
web/admin_dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          ✅ Login hoạt động tốt
│   └── (dashboard)/
│       ├── layout.tsx            ⚠️ Cần kiểm tra
│       └── dashboard/
│           └── page.tsx          ❌ Bị redirect về login
├── components/
│   └── dashboard/
│       ├── sidebar.tsx           ⚠️ Cần kiểm tra
│       ├── header.tsx            ⚠️ Cần kiểm tra (có logout function)
│       └── dashboard-shell.tsx   ⚠️ Cần kiểm tra
└── lib/
    ├── api.ts                    ✅ OK
    └── queries/
        └── dashboard.ts          ✅ OK (đã chuyển sang client)

backend/
├── src/
│   ├── controllers/
│   │   └── admin.controller.js  ✅ OK
│   ├── services/
│   │   └── auth.helpers.js      ✅ OK (trả về accessToken)
│   └── middleware/
│       └── auth.middleware.js   ✅ OK
└── .env                         ✅ OK
```

---

## 🌐 SERVER STATUS

### Backend
- **URL:** http://localhost:3000
- **Status:** ✅ Running
- **Health:** http://localhost:3000/api/health
- **Terminal:** Process ID 3

### Frontend
- **URL:** http://localhost:3002
- **Status:** ✅ Running
- **Terminal:** Process ID 5

### Khởi động lại servers (nếu cần):
```bash
# Backend
cd backend
npm run dev

# Frontend
cd web/admin_dashboard
npm run dev -- --port 3002
```

---

## 🔑 THÔNG TIN ĐĂNG NHẬP

- **Email:** admin@unimove.com
- **Password:** Admin123!@#
- **Role:** admin
- **Token location:** localStorage (`admin_token`) + cookies

---

## 💡 GỢI Ý DEBUG

### Lệnh console hữu ích:
```javascript
// Kiểm tra token
localStorage.getItem('admin_token')

// Kiểm tra user
localStorage.getItem('admin_user')

// Kiểm tra cookies
document.cookie

// Clear tất cả
localStorage.clear()
document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"))

// Xem tất cả localStorage
Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) }))
```

### Preserve logs khi debug:
1. Mở Console
2. Tick checkbox **"Preserve log"** (giữ logs khi chuyển trang)
3. Đăng nhập và xem toàn bộ flow

---

## ❓ CÂU HỎI CẦN TRẢ LỜI

1. ❓ Tại sao alert debug trong Dashboard useEffect không hiện ra?
2. ❓ Component nào đang trigger redirect về login?
3. ❓ useEffect trong Dashboard có chạy không?
4. ❓ Sidebar hoặc Header có logic auth không?
5. ❓ React Strict Mode có ảnh hưởng không?
6. ❓ Next.js có clear localStorage khi navigate không?

---

## 📞 LIÊN HỆ / GHI CHÚ

- Ngày debug: 04/06/2026
- Developer: [Tên của bạn]
- Session time: ~2 giờ
- Tiến độ: 95% hoàn thành, chỉ còn lỗi redirect

**⚠️ LƯU Ý QUAN TRỌNG:**
- Backend hoạt động 100% tốt ✅
- Login API hoạt động 100% tốt ✅
- Token được lưu thành công ✅
- **Vấn đề chỉ là ở phía frontend dashboard logic** ❌

---

## 🎬 NEXT STEPS (Ngày mai làm tiếp)

1. ✅ **Kiểm tra Sidebar component** - Tìm logic auth/redirect
2. ✅ **Kiểm tra Header component** - Tìm logic logout tự động
3. ✅ **Thử comment Sidebar/Header** - Xem dashboard có load không
4. ✅ **Thêm debugger breakpoint** - Dừng execution để debug
5. ✅ **Kiểm tra React DevTools** - Xem component lifecycle
6. ✅ **Xem Network tab** - Tìm request nào trigger redirect

**Nếu vẫn không fix được, có thể:**
- Tạo dashboard page đơn giản không dùng layout
- Hoặc tạo middleware.ts để handle auth ở Next.js level
- Hoặc dùng Context API để manage auth state

---

_File này sẽ được cập nhật khi tìm ra solution!_ 🚀


---

## ⚠️ CẬP NHẬT MỚI NHẤT (04/06/2026 - 18:05)

### **VẤN ĐỀ THỰC SỰ: SUPABASE CONNECTION TIMEOUT!**

Sau khi debug sâu hơn, phát hiện ra:

1. ❌ **Backend API bị timeout** khi gọi login (không trả response sau 15 giây)
2. ❌ **Supabase REST API bị timeout** khi test trực tiếp
3. ❌ **Query đến profiles table bị treo**

### **Test Results:**

```powershell
# Test login API
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/auth/login"
# Kết quả: The operation has timed out (sau 15 giây)

# Test Supabase REST API trực tiếp  
Invoke-RestMethod -Uri "https://byqwsmdgyojzgyhbladx.supabase.co/rest/v1/profiles?select=id&limit=1"
# Kết quả: The operation has timed out (sau 10 giây)
```

### **Backend Logs:**
```
POST /api/admin/auth/login - - ms - -
```
Dấu `- - ms - -` nghĩa là request **bị pending/hanging** - không hoàn thành!

### **NGUYÊN NHÂN CÓ THỂ:**

1. **Supabase project bị paused** (Free tier inactive sau 1 tuần không dùng)
2. **Network firewall** đang block kết nối đến Supabase
3. **Supabase project không tồn tại** hoặc bị xóa
4. **Internet connection** có vấn đề với Supabase domain
5. **DNS issue** - Không resolve được byqwsmdgyojzgyhbladx.supabase.co

### **GIẢI PHÁP:**

#### **Option 1: Kích hoạt lại Supabase project (NẾU BỊ PAUSED)**
1. Truy cập: https://supabase.com/dashboard
2. Chọn project `byqwsmdgyojzgyhbladx`
3. Nếu thấy "Project paused", click "Resume project"
4. Đợi 2-3 phút cho project khởi động
5. Test lại login

#### **Option 2: Kiểm tra firewall/antivirus**
1. Tắm tạm thời Windows Firewall
2. Tắt antivirus
3. Test lại

#### **Option 3: Test network với curl**
```bash
curl -v https://byqwsmdgyojzgyhbladx.supabase.co/rest/v1/
```
Xem có kết nối được không

#### **Option 4: Dùng Supabase local (nếu có Docker)**
```bash
npx supabase start
```

#### **Option 5: Chuyển sang local database PostgreSQL**
1. Install PostgreSQL local
2. Tạo database `unimove`
3. Run migrations
4. Update DATABASE_URL trong .env

### **BƯỚC TIẾP THEO:**

1. ✅ **Kiểm tra Supabase Dashboard** - Xem project có active không
2. ✅ **Test network** với ping/curl
3. ✅ **Check firewall** settings
4. ✅ **Xem Supabase logs** trong dashboard
5. ✅ **Nếu project bị pause, resume lại**

### **LƯU Ý:**
- Supabase free tier tự động pause sau 1 tuần không hoạt động
- Resume project mất 2-3 phút
- Sau khi resume, database sẽ hoạt động bình thường

---

**STATUS:** Đã tìm ra root cause - Supabase connection timeout  
**NEXT STEP:** Check Supabase dashboard và resume project nếu bị paused


---

## 🔴 CẬP NHẬT CUỐI CÙNG (04/06/2026 - 18:30)

### **TÌNH TRẠNG:**
Sau khi fix Supabase connection, login API hoạt động nhưng **VẪN BỊ REDIRECT VỀ LOGIN** sau khi đăng nhập thành công.

### **ĐÃ THỬ:**

1. ✅ **Fixed Supabase timeout** - Database đã hoạt động
2. ✅ **Tạo test-dashboard page** - Load được, token có sẵn
3. ✅ **Tạo dashboard-simple page** - Load được, token có sẵn  
4. ✅ **Disable dashboard layout** - Comment Sidebar/Header
5. ✅ **Comment redirect trong dashboard page** - Không còn redirect logic
6. ✅ **Disable root page redirect** - Không còn redirect("/dashboard")
7. ✅ **Change redirect target** - Đổi từ /dashboard sang /dashboard-simple
8. ❌ **VẪN BỊ REDIRECT VỀ LOGIN!**

### **QUAN SÁT:**

- ✅ `/test-dashboard` load được → Token có sẵn
- ✅ `/dashboard-simple` load được → Token có sẵn
- ❌ Login redirect về `/login` bất kể redirect đi đâu
- ❌ Không thấy alert debug trong dashboard
- ❌ Dashboard component không bao giờ mount

### **KẾT LUẬN:**

Có một **redirect loop hoặc navigation interceptor** đang hoạt động mà chưa phát hiện ra. Có thể:

1. **Next.js router cache** đang lưu redirect cũ
2. **Browser cache** redirect
3. **Service Worker** đang intercept
4. **Hidden middleware** hoặc logic ở đâu đó
5. **window.location.href** không hoạt động đúng

### **GIẢI PHÁP KHẨN CẤP CHO NGÀY MAI:**

#### **Option 1: Hard Refresh Everything**
```bash
# Stop frontend
Ctrl+C trong terminal frontend

# Clear Next.js cache
cd web/admin_dashboard
rmdir /s /q .next
npm run dev -- --port 3002

# Trong browser:
- Ctrl + Shift + Delete → Clear all cache
- Hoặc dùng Incognito mode
```

#### **Option 2: Simplify Login Flow**
Thay vì redirect phức tạp, dùng cách đơn giản nhất:

```typescript
// Trong login page, sau khi lưu token:
alert('Login successful! Click OK to continue');
window.location.replace('/dashboard-simple'); // replace thay vì href
```

#### **Option 3: Debug với Breakpoint**
```typescript
// Trong login page, trước khi redirect:
debugger; // Browser sẽ dừng ở đây
console.log('About to redirect...');
window.location.href = "/dashboard-simple";
```

#### **Option 4: Check Browser Network Tab**
1. Mở Network tab
2. Tick "Preserve log"
3. Đăng nhập
4. Xem có bao nhiêu request và redirect nào xảy ra

#### **Option 5: Tạo Landing Page sau Login**
```typescript
// Tạo /app/auth-success/page.tsx
"use client";
export default function AuthSuccessPage() {
  return (
    <div style={{padding: '50px', textAlign: 'center'}}>
      <h1>✅ Đăng nhập thành công!</h1>
      <p>Token: {localStorage.getItem('admin_token') ? 'Có' : 'Không'}</p>
      <button onClick={() => window.location.href = '/dashboard-simple'}>
        Vào Dashboard
      </button>
    </div>
  );
}

// Trong login page:
window.location.href = "/auth-success";
```

### **CÁC FILE ĐÃ SỬA (CẦN REVERT SAU KHI FIX):**

1. `app/(dashboard)/layout.tsx` - Đã comment Sidebar/Header
2. `app/(dashboard)/dashboard/page.tsx` - Đã comment redirect logic
3. `app/page.tsx` - Đã disable redirect
4. `app/(auth)/login/page.tsx` - Đổi redirect sang dashboard-simple

### **CHECKLIST NGÀY MAI:**

- [ ] Hard refresh: Clear .next, clear browser cache
- [ ] Test trong Incognito mode
- [ ] Thêm debugger breakpoint trước redirect
- [ ] Check Network tab xem redirect flow
- [ ] Thử window.location.replace() thay vì .href
- [ ] Tạo intermediate landing page
- [ ] Check xem có Service Worker không
- [ ] Kiểm tra browser extensions
- [ ] Test trên browser khác (Edge, Firefox)
- [ ] Xem Next.js dev server logs

### **LƯU Ý:**

Nếu tất cả đều thất bại, có thể cần:
1. **Tạo lại project Next.js từ đầu** với cùng code
2. **Dùng thư viện auth** như NextAuth.js
3. **Refactor toàn bộ auth flow** với approach khác

---

## 📞 FINAL NOTE

Vấn đề này rất bất thường - thậm chí test-dashboard và dashboard-simple đều load được nhưng login vẫn redirect về login. Điều này gợi ý có một **navigation pattern** hoặc **redirect logic ẩn** mà chúng ta chưa tìm ra.

**NEXT SESSION PRIORITY:**
1. Clear tất cả cache (Next.js + Browser)
2. Test trong Incognito
3. Dùng debugger để xem redirect flow chính xác
4. Nếu vẫn không được, rebuild project

**Thời gian debug:** 3+ giờ  
**Tiến độ:** 98% (chỉ còn redirect issue)  
**Khuyến nghị:** Fresh start với clean cache hoặc consider alternative auth approach

---

_Cập nhật cuối: 04/06/2026 18:30_
