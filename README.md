# UniMove - Student Moving Service Platform

> Nền tảng kết nối sinh viên với dịch vụ chuyển trọ chuyên nghiệp

## 🚀 Quick Start

### Customer App (Flutter) — người mới pull code

**[docs/HUONG_DAN_CHAY_CUSTOMER_APP.md](docs/HUONG_DAN_CHAY_CUSTOMER_APP.md)** — cài Flutter, chạy mock hoặc kèm backend, emulator/USB/Windows.

```powershell
cd mobile/customer_app
flutter pub get
flutter run
# Login demo (debug): demo@unimove.local / demo1234
```

Hoặc backend + app: `npm run dev:customer` (từ root, sau `npm install`).

### Prerequisites
- Node.js 18+
- Flutter 3.0+
- Supabase Account (khi chạy backend thật)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run create-admin
npm run dev
```

### Test API
```bash
npm run test:connection
```

## 📋 Project Structure

```
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── controllers/   # Admin, Orders, Payments
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, Error handling
│   │   └── services/      # Supabase integration
│   └── supabase/         # Database migrations
├── mobile/           # Flutter mobile apps
│   ├── customer_app/     # Customer mobile app
│   └── provider_app/     # Provider mobile app
├── web/              # Flutter web admin
└── docs/             # Documentation & API specs
```

## 🎯 Features

### ✅ Completed
- **Admin API System** - Complete dashboard with KPIs
- **Authentication** - JWT-based admin auth
- **Database Schema** - 37 tables with relationships
- **API Documentation** - Postman collection included

### 🚧 In Development
- Flutter Customer App
- Flutter Provider App
- Flutter Web Admin Dashboard
- PayOS Payment Integration
- Real-time Tracking

## 🔧 API Endpoints

### Admin APIs
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/dashboard` - KPI dashboard
- `GET /api/admin/providers/pending` - Pending verifications
- `PUT /api/admin/providers/:id/verify` - Approve/reject providers
- `GET /api/admin/disputes` - Dispute management

### Core APIs (Coming Soon)
- Customer registration & booking
- Provider management
- Order tracking
- Payment processing

## 📊 Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Mobile | Flutter |
| Web Admin | Flutter Web |
| Auth | Supabase Auth + JWT |
| Payments | PayOS |
| Maps | Google Maps API |
| Push | Firebase Cloud Messaging |

## 🧪 Testing

### API Testing
```bash
# Test database connection
npm run test:connection

# Create admin user
npm run create-admin
```

### Postman Collection
Import `docs/UniMove_Admin_API.postman_collection.json` for complete API testing.

## 📚 Documentation

- [Admin API Documentation](docs/ADMIN_API.md)
- [Dashboard KPI Guide](docs/ADMIN_DASHBOARD_API.md)
- [Database Schema](docs/database-schema.md)
- [Backend Task Division](docs/BE_TASK_DIVISION.md)

## 🔐 Environment Setup

Copy `.env.example` to `.env` and configure:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
```

## 👥 Team

**WDP301 - Group 4**
- Backend API Development
- Flutter Mobile Apps
- Admin Dashboard
- Database Design

## 📄 License

MIT License - See LICENSE file for details

---

*UniMove - Making student moving simple and affordable* 🚚📦