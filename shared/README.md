# UniMove Shared Resources

## 📁 Cấu Trúc Shared

```
shared/
├── models/                    # Data models dùng chung
│   ├── user.dart
│   ├── order.dart
│   ├── payment.dart
│   ├── provider.dart
│   └── chat_message.dart
├── constants/                 # Constants dùng chung
│   ├── api_endpoints.dart
│   ├── app_colors.dart
│   ├── app_strings.dart
│   └── order_status.dart
├── utils/                     # Utility functions
│   ├── date_formatter.dart
│   ├── price_formatter.dart
│   ├── validators.dart
│   └── location_utils.dart
├── services/                  # Shared services
│   ├── supabase_service.dart
│   ├── auth_service.dart
│   ├── storage_service.dart
│   └── notification_service.dart
├── widgets/                   # Reusable widgets
│   ├── custom_button.dart
│   ├── loading_widget.dart
│   ├── error_widget.dart
│   └── empty_state_widget.dart
├── theme/                     # App theming
│   ├── app_theme.dart
│   ├── colors.dart
│   └── text_styles.dart
└── extensions/                # Dart extensions
    ├── string_extensions.dart
    ├── datetime_extensions.dart
    └── context_extensions.dart
```

## 🎯 Shared Models

### Core Models
```dart
// User model
class User {
  final String id;
  final String email;
  final UserRole role;
  final Profile? profile;
  
  // Constructor & methods...
}

// Order model  
class Order {
  final String id;
  final String customerId;
  final String? providerId;
  final OrderStatus status;
  final double amount;
  final DateTime createdAt;
  
  // Constructor & methods...
}

// Payment model
class Payment {
  final String id;
  final String orderId;
  final double amount;
  final PaymentStatus status;
  final PaymentMethod method;
  
  // Constructor & methods...
}
```

## 🔧 Shared Services

### Supabase Service
```dart
class SupabaseService {
  static final _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();
  
  final SupabaseClient client = Supabase.instance.client;
  
  // Auth methods
  Future<AuthResponse> signIn(String email, String password);
  Future<AuthResponse> signUp(String email, String password);
  Future<void> signOut();
  
  // Database methods
  Future<List<T>> getList<T>(String table);
  Future<T?> getById<T>(String table, String id);
  Future<T> create<T>(String table, Map<String, dynamic> data);
  Future<T> update<T>(String table, String id, Map<String, dynamic> data);
  Future<void> delete(String table, String id);
}
```

## 🎨 Shared Theme

### App Theme
```dart
class AppTheme {
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    ),
    // Custom theme configurations...
  );
  
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.dark,
    ),
    // Custom theme configurations...
  );
}
```

## 📋 Usage Guidelines

### Import Shared Resources
```dart
// In mobile apps
dependencies:
  shared_mobile:
    path: ../shared_mobile

// In web app  
dependencies:
  shared_web:
    path: ../shared

// Usage
import 'package:shared_mobile/models/user.dart';
import 'package:shared_mobile/services/supabase_service.dart';
```

### Version Control
- Shared code changes affect tất cả apps
- Test thoroughly trước khi merge
- Sử dụng semantic versioning
- Document breaking changes