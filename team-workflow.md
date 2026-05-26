# UniMove - Team Workflow & Development Guidelines

## 👥 Team Structure & Responsibilities

### Backend Team (2 developers)
**Responsibilities:**
- Supabase database schema & migrations
- Edge Functions development
- RLS policies & security
- API documentation
- Third-party integrations (PayOS, Google Maps)

**Main Directories:**
- `backend/` - Tất cả backend code
- `shared/services/` - Shared services

**Branch Naming:**
- `backend/feature-auth`
- `backend/fix-payment-webhook`
- `backend/update-order-schema`

### Mobile Team (2-3 developers)
**Responsibilities:**
- Customer app development
- Provider app development  
- Shared mobile components
- Mobile-specific features (camera, location, push notifications)
- App store deployment

**Main Directories:**
- `mobile/customer_app/`
- `mobile/provider_app/`
- `mobile/shared_mobile/`

**Branch Naming:**
- `mobile/feature-booking-flow`
- `mobile/fix-chat-ui`
- `mobile/update-tracking-screen`

### Web Team (1-2 developers)
**Responsibilities:**
- Admin dashboard development
- Web-specific responsive design
- Analytics & reporting features
- Web deployment

**Main Directories:**
- `web/admin_dashboard/`
- `shared/widgets/` (web-compatible)

**Branch Naming:**
- `web/feature-analytics-dashboard`
- `web/fix-responsive-layout`
- `web/update-user-management`

### DevOps/QA (1 developer)
**Responsibilities:**
- CI/CD pipeline setup
- Deployment automation
- Testing coordination
- Performance monitoring

**Main Directories:**
- `.github/workflows/`
- `scripts/`
- `docs/deployment/`

## 🔄 Development Workflow

### 1. Sprint Planning
**Weekly Sprint (1 tuần)**
- Monday: Sprint planning meeting
- Assign tasks theo team
- Estimate story points
- Set sprint goals

### 2. Feature Development Process

#### Step 1: Task Assignment
```
Ví dụ: Implement Booking System
├── Backend Task: API endpoints & database
├── Mobile Task: Booking UI & integration  
├── Web Task: Admin booking management
└── DevOps Task: Deployment pipeline
```

#### Step 2: Branch Creation
```bash
# Backend developer
git checkout develop
git pull origin develop
git checkout -b backend/feature-booking-api

# Mobile developer  
git checkout develop
git pull origin develop
git checkout -b mobile/feature-booking-ui

# Web developer
git checkout develop  
git pull origin develop
git checkout -b web/feature-booking-admin
```

#### Step 3: Development
- Develop theo assigned directory
- Follow coding standards
- Write tests
- Update documentation

#### Step 4: Integration Testing
- Backend team deploy API to staging
- Mobile team test với staging API
- Web team test admin features
- Fix integration issues

#### Step 5: Code Review & Merge
- Tạo Pull Request
- Code review bởi team lead
- CI/CD checks pass
- Merge vào `develop`

### 3. Daily Workflow

#### Morning Standup (15 phút)
- What did you do yesterday?
- What will you do today?  
- Any blockers?
- Integration dependencies?

#### Development Time
- **9:00-12:00**: Focused development
- **14:00-17:00**: Development & integration
- **17:00-18:00**: Testing & documentation

#### End of Day
- Push code to feature branch
- Update task status
- Document any blockers

## 🔧 Technical Coordination

### 1. API-First Development
**Backend Team:**
1. Design API endpoints trước
2. Create OpenAPI documentation
3. Deploy mock endpoints
4. Implement real endpoints

**Frontend Teams:**
1. Review API documentation
2. Develop với mock data
3. Integrate với real API
4. Handle error cases

### 2. Shared Code Management
**Shared Models:**
- Backend team define database models
- Export to `shared/models/`
- Mobile & Web teams import

**Shared Services:**
- Backend team create service interfaces
- Mobile & Web teams implement platform-specific

### 3. Real-time Features Coordination
**Backend:**
- Setup Supabase subscriptions
- Define real-time events
- Test với multiple clients

**Frontend:**
- Implement subscription listeners
- Handle connection states
- Test real-time updates

## 📋 Code Standards & Guidelines

### 1. Naming Conventions
```dart
// Files: snake_case
booking_service.dart
order_model.dart

// Classes: PascalCase  
class BookingService {}
class OrderModel {}

// Variables: camelCase
final bookingService = BookingService();
final orderList = <Order>[];

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.unimove.com';
```

### 2. Folder Structure Standards
```
features/booking/
├── data/           # Backend integration
├── domain/         # Business logic  
├── presentation/   # UI components
└── tests/          # Feature tests
```

### 3. Git Commit Standards
```bash
# Format: type(scope): description
feat(booking): add booking creation flow
fix(auth): resolve login validation issue  
docs(api): update booking endpoints documentation
test(payment): add payment integration tests
```

### 4. Code Review Checklist
- [ ] Code follows naming conventions
- [ ] Proper error handling
- [ ] Tests included
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Performance considerations
- [ ] Security best practices

## 🚀 Deployment Strategy

### 1. Environment Setup
```
Development → Staging → Production
     ↓           ↓          ↓
   Local     Supabase   Supabase
   Supabase   Staging    Production
```

### 2. Deployment Schedule
**Daily Deployments:**
- `develop` → Staging (automatic)
- Test integration daily

**Weekly Deployments:**  
- `develop` → `main` → Production (Friday)
- Full regression testing

### 3. Rollback Strategy
- Keep previous version ready
- Database migration rollback scripts
- Feature flags for quick disable

## 📊 Monitoring & Communication

### 1. Progress Tracking
**Tools:**
- GitHub Projects for task management
- Slack for daily communication
- Weekly progress reports

**Metrics:**
- Sprint velocity
- Bug count
- Code coverage
- Performance benchmarks

### 2. Communication Channels
```
#unimove-general     - General discussions
#unimove-backend     - Backend team
#unimove-mobile      - Mobile team  
#unimove-web         - Web team
#unimove-devops      - DevOps & deployment
#unimove-bugs        - Bug reports
```

### 3. Meeting Schedule
- **Daily Standup**: 9:00 AM (15 phút)
- **Sprint Planning**: Monday 2:00 PM (1 giờ)
- **Sprint Review**: Friday 4:00 PM (30 phút)
- **Retrospective**: Friday 4:30 PM (30 phút)

## 🎯 Success Metrics

### Development Metrics
- Sprint completion rate > 90%
- Bug escape rate < 5%
- Code coverage > 80%
- Build success rate > 95%

### Team Metrics  
- Daily standup attendance > 95%
- Code review turnaround < 24h
- Feature delivery on time > 90%
- Team satisfaction score > 4/5

Cấu trúc này đảm bảo team có thể làm việc parallel hiệu quả, minimize conflicts, và maintain code quality cao!