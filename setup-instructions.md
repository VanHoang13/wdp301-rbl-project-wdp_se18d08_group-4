# UniMove - Setup Instructions

## 🚀 Quick Start Guide

### Prerequisites
```bash
# Required tools
- Flutter SDK (3.16+)
- Dart SDK (3.2+)  
- Node.js (18+)
- Git
- VS Code / Android Studio
- Supabase CLI
```

## 📱 Complete Project Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/unimove.git
cd unimove
```

### 2. Backend Setup (Supabase)
```bash
# Install Supabase CLI
npm install -g supabase

# Navigate to backend
cd backend

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Deploy Edge Functions
supabase functions deploy order-matching
supabase functions deploy payment-processing
supabase functions deploy notification-sender
```

### 3. Mobile Apps Setup
```bash
# Customer App
cd mobile/customer_app
flutter pub get
flutter run

# Provider App (new terminal)
cd mobile/provider_app  
flutter pub get
flutter run

# Shared Mobile Package
cd mobile/shared_mobile
flutter pub get
```

### 4. Web Admin Setup
```bash
# Admin Dashboard
cd web/admin_dashboard
flutter pub get
flutter run -d chrome

# Build for production
flutter build web --release
```

### 5. Environment Configuration

#### Backend Environment
```bash
# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

#### Mobile Environment
```dart
// mobile/customer_app/lib/core/constants/app_config.dart
class AppConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
  static const String googleMapsApiKey = 'YOUR_GOOGLE_MAPS_KEY';
}
```

#### Web Environment
```dart
// web/admin_dashboard/lib/core/constants/app_config.dart
class WebConfig {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
}
```

## 🔧 Development Tools Setup

### VS Code Extensions
```json
{
  "recommendations": [
    "dart-code.dart-code",
    "dart-code.flutter", 
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase"
  ]
}
```

### VS Code Settings
```json
{
  "dart.flutterSdkPath": "/path/to/flutter",
  "dart.lineLength": 80,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

## 📋 Team Member Setup

### New Backend Developer
```bash
# 1. Clone repo
git clone https://github.com/your-org/unimove.git
cd unimove

# 2. Setup Supabase
cd backend
npm install -g supabase
supabase start

# 3. Create feature branch
git checkout -b backend/feature-your-name

# 4. Start development
code .
```

### New Mobile Developer  
```bash
# 1. Clone repo
git clone https://github.com/your-org/unimove.git
cd unimove

# 2. Setup Flutter
flutter doctor
flutter pub get

# 3. Setup mobile apps
cd mobile/customer_app && flutter pub get
cd ../provider_app && flutter pub get
cd ../shared_mobile && flutter pub get

# 4. Create feature branch
git checkout -b mobile/feature-your-name

# 5. Start development
flutter run
```

### New Web Developer
```bash
# 1. Clone repo  
git clone https://github.com/your-org/unimove.git
cd unimove

# 2. Setup Flutter Web
flutter config --enable-web
flutter doctor

# 3. Setup web app
cd web/admin_dashboard
flutter pub get

# 4. Create feature branch
git checkout -b web/feature-your-name

# 5. Start development
flutter run -d chrome
```

## 🧪 Testing Setup

### Unit Tests
```bash
# Run all tests
flutter test

# Run specific test
flutter test test/features/booking/booking_test.dart

# Run with coverage
flutter test --coverage
```

### Integration Tests
```bash
# Mobile integration tests
cd mobile/customer_app
flutter test integration_test/

# Web integration tests  
cd web/admin_dashboard
flutter test integration_test/
```

## 🚀 Deployment Setup

### Mobile Deployment
```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

### Web Deployment
```bash
# Build web
flutter build web --release

# Deploy to Vercel
vercel --prod

# Deploy to Firebase Hosting
firebase deploy
```

### Backend Deployment
```bash
# Deploy to Supabase
supabase functions deploy
supabase db push
```

## 🔍 Troubleshooting

### Common Issues

#### Flutter Doctor Issues
```bash
# Fix Android license
flutter doctor --android-licenses

# Fix iOS setup
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

#### Supabase Connection Issues
```bash
# Reset Supabase
supabase stop
supabase start

# Check status
supabase status
```

#### Build Issues
```bash
# Clean build
flutter clean
flutter pub get
flutter build

# Reset dependencies
rm pubspec.lock
flutter pub get
```

### Getting Help
- Check `docs/` folder for detailed documentation
- Ask in team Slack channels
- Create GitHub issue for bugs
- Schedule pair programming session

## ✅ Verification Checklist

### Backend Developer Checklist
- [ ] Supabase CLI installed and working
- [ ] Local Supabase instance running
- [ ] Can run migrations successfully
- [ ] Edge Functions deploy without errors
- [ ] Environment variables configured

### Mobile Developer Checklist  
- [ ] Flutter doctor shows no issues
- [ ] Can run customer app on device/emulator
- [ ] Can run provider app on device/emulator
- [ ] Hot reload working properly
- [ ] Can build release APK

### Web Developer Checklist
- [ ] Flutter web enabled
- [ ] Can run admin dashboard in Chrome
- [ ] Responsive design working
- [ ] Can build web release
- [ ] Deployment pipeline working

### All Developers Checklist
- [ ] Git configured with correct credentials
- [ ] Can create and push feature branches
- [ ] VS Code extensions installed
- [ ] Team communication channels joined
- [ ] Project documentation reviewed

Ready to start coding! 🎉