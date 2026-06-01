# UniMove — Slide Thuyết Trình Dự Án
> Nền Tảng Marketplace Dịch Vụ Chuyển Trọ Dành Riêng Cho Sinh Viên

---

## SLIDE 1 — Tổng Quan Dự Án

### UniMove là gì?

UniMove là nền tảng **marketplace 2 chiều** kết nối **sinh viên cần chuyển trọ** với **đội ngũ vận chuyển uy tín**, hoạt động trên mobile (iOS/Android) và web.

**Vấn đề thực tế:**
- Sinh viên chuyển trọ 1–3 lần/năm, chi phí cao, không minh bạch
- Khó tìm đơn vị vận chuyển đáng tin cậy, giá cả bị "hét"
- Không có công cụ theo dõi, dễ xảy ra tranh chấp
- Lalamove/AhaMove không tối ưu cho nhu cầu chuyển trọ toàn bộ phòng

**Giải pháp UniMove:**
- Giá cả minh bạch, tính tự động theo khoảng cách + tầng + loại xe
- Theo dõi tài xế thời gian thực trên Google Maps
- Gợi ý **gộp đơn thông minh** → giảm chi phí lên đến **40%**
- Hệ thống đánh giá & xác minh provider đảm bảo uy tín

---

## SLIDE 2 — UniMove vs Lalamove vs AhaMove

| Tiêu chí | **UniMove** | Lalamove | AhaMove |
|---|---|---|---|
| **Đối tượng mục tiêu** | 🎯 Sinh viên chuyển trọ | Doanh nghiệp, cá nhân giao hàng | Cá nhân, SME giao hàng |
| **Loại hàng hóa** | Đồ đạc phòng trọ (tủ, giường, xe máy...) | Hàng hóa nhỏ, tài liệu, thực phẩm | Hàng hóa nhỏ đến trung bình |
| **Tính giá theo tầng** | ✅ Có (giá/tầng, ghi nhận thang máy) | ❌ Không | ❌ Không |
| **Gộp đơn thông minh** | ✅ Có (giảm 40% chi phí) | ❌ Không | ❌ Không |
| **Xác minh provider** | ✅ Admin duyệt hồ sơ, giấy tờ xe | ⚠️ Cơ bản | ⚠️ Cơ bản |
| **Chat trực tiếp** | ✅ Real-time chat trong app | ❌ Chỉ gọi điện | ⚠️ Hạn chế |
| **Theo dõi thời gian thực** | ✅ Google Maps live tracking | ✅ Có | ✅ Có |
| **Thanh toán** | ✅ PayOS (QR, chuyển khoản, tiền mặt) | ✅ Đa dạng | ✅ Đa dạng |
| **Đặt lịch trước** | ✅ Có (scheduled pickup) | ✅ Có | ⚠️ Hạn chế |
| **Bảo hiểm hàng hóa** | ✅ Tùy chọn trong đơn | ⚠️ Gói riêng | ❌ Không |
| **Dịch vụ đóng gói** | ✅ Add-on trong đơn | ❌ Không | ❌ Không |
| **Người phụ bốc vác** | ✅ Chọn số lượng helper | ❌ Không | ❌ Không |
| **Dashboard quản trị** | ✅ Web admin đầy đủ | ✅ Có | ✅ Có |
| **Hệ thống đánh giá** | ✅ Chi tiết (5 tiêu chí) | ⚠️ Đơn giản | ⚠️ Đơn giản |
| **Loyalty points** | ✅ Tích điểm đổi ưu đãi | ❌ Không | ❌ Không |
| **Mã khuyến mãi** | ✅ Hệ thống promotion | ✅ Có | ✅ Có |
| **Thị trường mục tiêu** | 🇻🇳 Sinh viên Việt Nam | 🌏 Đa quốc gia | 🇻🇳 Việt Nam |
| **Chi phí** | 💚 Tối ưu cho sinh viên | 💰 Cao hơn | 💰 Trung bình |

### Điểm khác biệt cốt lõi của UniMove:

**1. Tính giá thông minh cho chuyển trọ**
Lalamove và AhaMove tính giá theo khoảng cách đơn thuần. UniMove tính thêm:
- Phí theo số tầng (không có thang máy tốn công hơn)
- Phí helper bốc vác
- Phí đóng gói, bảo hiểm hàng dễ vỡ
→ Giá sát thực tế, không phát sinh chi phí ngoài

**2. Gộp đơn thông minh (Smart Grouping)**
Tính năng độc quyền: hệ thống gợi ý ghép đơn của nhiều sinh viên cùng khu vực, cùng ngày → chia sẻ chi phí xe tải → tiết kiệm 30–40%

**3. Tập trung vào sinh viên**
- Xác minh mã sinh viên
- Tích điểm loyalty dành riêng
- Giá ưu đãi theo trường đại học
- Giao diện đơn giản, phù hợp người dùng trẻ

---

## SLIDE 3 — Technology Stack

```
📱 Mobile:     Flutter (Customer App + Provider App)
🌐 Web:        Flutter Web (Admin Dashboard)
🗄️ Backend:    Supabase (PostgreSQL + Auth + Storage + Edge Functions)
🔄 Real-time:  Supabase Realtime Subscriptions
🗺️ Maps:       Google Maps Flutter
🔔 Push:       Firebase Cloud Messaging (FCM)
💳 Payment:    PayOS (QR Code + Webhook)
🎨 UI:         Material Design 3 + Riverpod State Management
```

### Tại sao chọn stack này?

**Flutter** — 1 codebase cho iOS, Android và Web. Hiệu năng native, hot reload nhanh, hệ sinh thái package phong phú.

**Supabase** — Thay thế hoàn toàn custom backend:
- PostgreSQL với PostGIS cho geospatial queries
- Auth tích hợp (email/password + Google OAuth)
- Real-time subscriptions built-in
- Row Level Security bảo mật cấp hàng
- Storage cho ảnh đơn hàng, giấy tờ provider
- Edge Functions cho business logic phức tạp
- Free tier đủ dùng cho MVP

**Riverpod** — State management hiện đại, tách biệt business logic, dễ test, performance tối ưu.

---

## SLIDE 4 — Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │
│  │ Customer App │ │ Provider App │ │ Admin Web   │  │
│  │  (Flutter)   │ │  (Flutter)   │ │  (Flutter)  │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬──────┘  │
│         │                │                │          │
│         └────────────────┼────────────────┘          │
│                    Riverpod Providers                 │
│                    Repository Layer                   │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────▼───────────────────────────┐
│                  SUPABASE LAYER                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │PostgreSQL│ │   Auth   │ │Real-time │ │Storage │  │
│  │+PostGIS  │ │  (JWT)   │ │  (WS)    │ │(Files) │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│  ┌──────────────────────────────────────────────┐    │
│  │           Edge Functions (Deno)              │    │
│  │  order-matching | payment-processing |       │    │
│  │  notification-sender | analytics             │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│               EXTERNAL SERVICES                      │
│   PayOS (Thanh toán)  │  Google Maps  │  FCM (Push) │
└─────────────────────────────────────────────────────┘
```

**Design Patterns áp dụng:**
- Clean Architecture (UI → Provider → Repository → Service)
- Feature-first folder structure
- Repository Pattern cho data access
- MVVM-inspired với Riverpod

---

## SLIDE 5 — Database Schema

**Tổng quan:** 6 nhóm bảng chính, ~20 bảng sau tối ưu

| Nhóm | Bảng chính | Mô tả |
|---|---|---|
| Users & Profiles | `profiles`, `provider_documents` | Thông tin người dùng (unified table) |
| Orders | `orders`, `order_status_history` | Đơn hàng + lịch sử trạng thái |
| Payments | `payments`, `provider_earnings`, `provider_withdrawals`, `promotions` | Thanh toán, doanh thu, khuyến mãi |
| Tracking | `provider_locations`, `order_tracking_events`, `routes` | Vị trí real-time, lịch sử tuyến đường |
| Chat & Notifications | `conversations`, `messages`, `notifications`, `push_tokens` | Nhắn tin, thông báo |
| Reviews | `reviews`, `disputes`, `feedback` | Đánh giá, khiếu nại |

**Tính năng database nổi bật:**
- PostGIS cho geospatial queries (tìm provider gần nhất)
- Row Level Security (RLS) bảo vệ dữ liệu từng user
- Triggers tự động: tạo mã đơn, cập nhật rating, tính hoa hồng
- JSONB cho items và images (linh hoạt, không cần bảng phụ)

---

## SLIDE 6 — Tính Năng Chính

### Customer App
| Tính năng | Chi tiết |
|---|---|
| Đăng ký / Đăng nhập | Email/password, Google OAuth, xác minh mã sinh viên |
| Tạo đơn chuyển trọ | Chọn địa điểm, loại xe, tầng, helper, bảo hiểm, đóng gói |
| Báo giá tự động | Tính theo khoảng cách + tầng + dịch vụ thêm |
| Gộp đơn thông minh | Gợi ý ghép đơn cùng khu vực, tiết kiệm 30–40% |
| Theo dõi real-time | Xem vị trí tài xế trên Google Maps, ETA cập nhật liên tục |
| Chat với provider | Nhắn tin real-time, gửi ảnh, xem trạng thái đọc |
| Thanh toán | PayOS QR code, chuyển khoản, tiền mặt |
| Đánh giá | Rating 5 tiêu chí: chất lượng, đúng giờ, chuyên nghiệp, giá trị, thái độ |
| Lịch sử đơn | Xem lại tất cả đơn, tải hóa đơn |
| Loyalty points | Tích điểm mỗi đơn, đổi ưu đãi |

### Provider App
| Tính năng | Chi tiết |
|---|---|
| Đăng ký & xác minh | Upload giấy phép, đăng ký xe, chờ admin duyệt |
| Nhận đơn | Xem đơn mới trong khu vực, chấp nhận/từ chối |
| Cập nhật trạng thái | Đang đến → Đã lấy hàng → Đang giao → Hoàn thành |
| Chia sẻ vị trí | GPS real-time gửi lên Supabase mỗi vài giây |
| Chat với khách | Nhắn tin trực tiếp trong đơn hàng |
| Doanh thu | Xem thu nhập theo ngày/tuần/tháng, lịch sử rút tiền |
| Rút tiền | Yêu cầu rút về tài khoản ngân hàng |

### Admin Dashboard (Web)
| Tính năng | Chi tiết |
|---|---|
| Tổng quan | GMV, doanh thu, số đơn, số user theo thời gian |
| Quản lý user | Xem, khóa, mở khóa tài khoản customer/provider |
| Duyệt provider | Xem hồ sơ, giấy tờ, phê duyệt hoặc từ chối |
| Theo dõi đơn hàng | Xem tất cả đơn, lọc theo trạng thái/ngày/khu vực |
| Xử lý tranh chấp | Xem dispute, liên lạc các bên, ra quyết định |
| Quản lý khuyến mãi | Tạo/sửa/xóa mã giảm giá, theo dõi sử dụng |
| Thông báo hệ thống | Gửi announcement đến tất cả hoặc nhóm user |

---

## SLIDE 7 — Real-time Flow

```
Provider bật GPS
      │
      ▼
Flutter gửi location lên Supabase (mỗi 3–5 giây)
      │
      ▼
PostgreSQL lưu vào bảng provider_locations
      │
      ▼
Supabase Realtime broadcast đến subscribers
      │
      ▼
Customer App nhận update
      │
      ▼
Google Maps cập nhật marker vị trí tài xế
      │
      ▼
ETA tính lại theo thời gian thực
```

**Các luồng real-time khác:**
- Trạng thái đơn hàng → Customer nhận push notification ngay lập tức
- Tin nhắn chat → Hiển thị tức thời, có typing indicator
- Đơn mới → Provider nhận thông báo và có thể chấp nhận ngay

---

## SLIDE 8 — Bảo Mật

**Row Level Security (RLS) — Supabase**

Mỗi bảng có policy riêng, ví dụ:
- `orders`: Customer chỉ xem đơn của mình. Provider chỉ xem đơn được assign. Admin xem tất cả.
- `messages`: Chỉ customer và provider của đơn đó mới đọc được chat.
- `provider_earnings`: Provider chỉ xem thu nhập của chính mình.

**Authentication:**
- Supabase Auth với JWT token
- Google OAuth tích hợp sẵn
- Session tự động refresh
- Mỗi request đều kèm JWT, Supabase verify trước khi truy cập DB

**Bảo mật dữ liệu:**
- Thông tin ngân hàng provider không expose qua API công khai
- Ảnh giấy tờ lưu trong Supabase Storage với signed URL
- Không lưu thông tin thẻ tín dụng (PayOS xử lý)

---

## SLIDE 9 — Cấu Trúc Dự Án & Phân Chia Team

```
unimove/
├── mobile/
│   ├── customer_app/     ← Flutter: Customer App
│   └── provider_app/     ← Flutter: Provider App
├── web/
│   └── admin_dashboard/  ← Flutter Web: Admin
├── backend/
│   └── supabase/
│       └── migrations/   ← SQL schema, RLS, seed data
├── docs/                 ← Tài liệu dự án
├── scripts/              ← Build & deploy scripts
└── .github/              ← CI/CD workflows
```

**Phân chia team (4–5 người):**

| Role | Phụ trách | Branch pattern |
|---|---|---|
| Backend Dev | Supabase schema, Edge Functions, RLS policies | `backend/feature-name` |
| Mobile Dev 1 | Customer App (Flutter) | `mobile/customer-feature` |
| Mobile Dev 2 | Provider App (Flutter) | `mobile/provider-feature` |
| Web Dev | Admin Dashboard (Flutter Web) | `web/feature-name` |
| DevOps/QA | CI/CD, testing, deployment | `devops/feature-name` |

---

## SLIDE 10 — Timeline Phát Triển

| Tuần | Mục tiêu | Deliverables |
|---|---|---|
| 1–2 | Foundation | Supabase setup, Auth flow, Navigation, DB schema |
| 3–4 | Core Features | Booking flow, Real-time tracking, Payment (PayOS) |
| 5–6 | Communication | Chat system, Push notifications (FCM), Review system |
| 7–8 | Admin & Polish | Admin dashboard, UI/UX polish, Error handling |
| 9–10 | Testing & Deploy | Unit test, Integration test, Deploy mobile + web |

**MVP Scope (Phase 1):**
- ✅ Authentication (email + Google)
- ✅ Tạo và quản lý đơn chuyển trọ
- ✅ Real-time tracking trên Google Maps
- ✅ Chat customer ↔ provider
- ✅ Thanh toán qua PayOS
- ✅ Đánh giá sau đơn hàng
- ✅ Admin dashboard cơ bản
- ✅ Provider verification flow

---

## SLIDE 11 — Kết Luận

**UniMove giải quyết đúng pain point:**
Sinh viên Việt Nam chuyển trọ thường xuyên nhưng chưa có nền tảng nào tối ưu cho nhu cầu này. Lalamove và AhaMove phục vụ giao hàng nhanh, không phải chuyển trọ toàn bộ phòng.

**Lợi thế cạnh tranh:**
- Tính giá minh bạch theo tầng, helper, dịch vụ thêm
- Gộp đơn thông minh — tính năng độc quyền
- Xác minh provider nghiêm ngặt — tạo niềm tin
- Chat real-time trong app — không cần trao đổi ngoài

**Stack công nghệ phù hợp:**
Flutter + Supabase + Riverpod là lựa chọn tối ưu cho team nhỏ:
- 1 codebase cho 3 platform (iOS, Android, Web)
- Backend-as-a-Service giảm tải backend development
- Real-time built-in, không cần setup thêm
- Chi phí thấp, scale tốt khi cần

> **UniMove — Making student moving smarter, cheaper, and stress-free** 🚚📱
