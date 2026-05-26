# UniMove Web Admin - Flutter Web

## 📁 Cấu Trúc Web

```
web/
├── admin_dashboard/
│   ├── lib/
│   │   ├── main.dart
│   │   ├── core/
│   │   │   ├── constants/
│   │   │   ├── theme/
│   │   │   ├── utils/
│   │   │   └── services/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── data/
│   │   │   │   ├── domain/
│   │   │   │   └── presentation/
│   │   │   ├── dashboard/
│   │   │   │   ├── widgets/
│   │   │   │   │   ├── analytics_card.dart
│   │   │   │   │   ├── revenue_chart.dart
│   │   │   │   │   └── orders_table.dart
│   │   │   │   └── pages/
│   │   │   │       └── dashboard_page.dart
│   │   │   ├── users/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── users_page.dart
│   │   │   │   │   └── user_detail_page.dart
│   │   │   │   └── widgets/
│   │   │   │       └── user_table.dart
│   │   │   ├── orders/
│   │   │   │   ├── pages/
│   │   │   │   └── widgets/
│   │   │   ├── providers/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── providers_page.dart
│   │   │   │   │   └── provider_verification_page.dart
│   │   │   │   └── widgets/
│   │   │   ├── analytics/
│   │   │   │   ├── pages/
│   │   │   │   └── widgets/
│   │   │   └── settings/
│   │   └── shared/
│   │       ├── widgets/
│   │       │   ├── sidebar.dart
│   │       │   ├── topbar.dart
│   │       │   └── data_table.dart
│   │       ├── models/
│   │       └── providers/
│   ├── web/
│   ├── assets/
│   └── pubspec.yaml
└── landing_page/              # Marketing website (Optional)
    ├── lib/
    ├── web/
    └── pubspec.yaml
```

## 🎨 Web-Specific Features

### Responsive Design
```dart
// Responsive breakpoints
class Breakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;
}

// Responsive widgets
class ResponsiveWidget extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget desktop;
  
  // Implementation...
}
```

### Dashboard Layout
```dart
// Main layout structure
Scaffold(
  body: Row(
    children: [
      // Sidebar navigation
      SidebarWidget(),
      
      // Main content area
      Expanded(
        child: Column(
          children: [
            TopbarWidget(),
            Expanded(child: content),
          ],
        ),
      ),
    ],
  ),
)
```

## 🚀 Setup Web

```bash
# Admin Dashboard
cd web/admin_dashboard
flutter pub get
flutter run -d chrome

# Build for production
flutter build web --release
```

## 📊 Admin Features

### Dashboard Analytics
- Revenue charts
- Order statistics  
- User growth metrics
- Provider performance

### User Management
- Customer list & details
- Provider verification
- Account status management
- Support tickets

### Order Management
- Real-time order monitoring
- Dispute resolution
- Payment tracking
- Refund processing

## 📋 Team Workflow

### Web Development
1. Tạo nhánh `web/feature-analytics`
2. Develop responsive components
3. Test trên multiple screen sizes
4. Deploy to staging
5. Production deployment