# 🧪 Test Admin API Trực Tiếp

## Vấn Đề Hiện Tại

Frontend đang gặp lỗi vì:
1. Server-side functions không có access token (token lưu trong localStorage - client only)
2. API calls cần authentication nhưng không thể pass token từ server components

## ✅ Solution: Test API Trực Tiếp Bằng Postman/Thunder Client

### Bước 1: Login để lấy Token

**Request:**
```http
POST http://localhost:3000/api/admin/auth/login
Content-Type: application/json

{
  "email": "admin@unimove.com",
  "password": "Admin123!@#"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "2690c66f-d1b5-4820-a7fb-b4bf94b96277",
      "email": "admin@unimove.com",
      "full_name": "UniMove Admin",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**👉 Copy token từ response!**

---

### Bước 2: Test Dashboard API

**Request:**
```http
GET http://localhost:3000/api/admin/dashboard
Authorization: Bearer <PASTE_TOKEN_HERE>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "gmv_yesterday": 0,
    "orders_yesterday": 0,
    "active_users": 1,
    "pending_verifications": 0,
    "open_disputes": 0,
    "platform_commission": 0
  }
}
```

---

### Bước 3: Test Other APIs

**Users:**
```http
GET http://localhost:3000/api/admin/users?page=1&pageSize=20
Authorization: Bearer <TOKEN>
```

**Orders:**
```http
GET http://localhost:3000/api/admin/orders?page=1&pageSize=20
Authorization: Bearer <TOKEN>
```

**Providers Pending:**
```http
GET http://localhost:3000/api/admin/providers/pending
Authorization: Bearer <TOKEN>
```

---

## 🔧 Fix Frontend (Cần làm)

Để frontend hoạt động đúng, cần:

### Option 1: Sử dụng Cookies thay vì localStorage
```typescript
// lib/auth.ts
import { cookies } from 'next/headers';

export async function setAuthToken(token: string) {
  cookies().set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}
```

### Option 2: Chuyển sang Client Components
```typescript
// components/dashboard/stats.tsx
'use client';

import { useEffect, useState } from 'react';

export function DashboardStats() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    
    fetch('http://localhost:3000/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => setStats(data.data));
  }, []);
  
  // Render stats...
}
```

---

## 🎯 Quick Test - Dùng Browser Console

Mở browser console (F12) và chạy:

```javascript
// 1. Login
fetch('http://localhost:3000/api/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@unimove.com',
    password: 'Admin123!@#'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Login success:', data);
  localStorage.setItem('admin_token', data.data.token);
  return data.data.token;
})
.then(token => {
  // 2. Get Dashboard
  return fetch('http://localhost:3000/api/admin/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
})
.then(r => r.json())
.then(dashboard => console.log('Dashboard:', dashboard));
```

---

## 📝 Kết Luận

**Backend APIs hoạt động 100%** ✅
- Login OK
- Dashboard OK  
- Tất cả endpoints OK

**Frontend cần sửa:** Chuyển authentication sang cookies hoặc client components

Tôi đang fix frontend để bạn test được trên web ngay!
