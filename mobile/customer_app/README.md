# UniMove Customer App

Splash → Onboarding → Login (theo design HTML).

## Chạy trên emulator Android Studio

```powershell
flutter pub get
flutter run
```

Cấu hình Impeller/software rendering đã nằm trong `AndroidManifest.xml` — không cần thêm flag khi chạy.

**Onboarding khi dev:** `flutter run` (debug) luôn hiện Onboarding mỗi lần mở app. Bản release (`flutter build apk --release`) mới nhớ đã xem và nhảy thẳng Login.

Nếu **vẫn màn đen** trên emulator:

```powershell
.\scripts\emulator-fix.ps1   # khởi động AVD với GPU software
flutter run
```

Hoặc chạy trên Windows desktop:

```powershell
flutter run -d windows
```

## Luồng màn hình

1. **Splash** — dark gradient, logo UniMove, 3s
2. **Onboarding** — 3 slide (đặt xe, gộp đơn, tracking)
3. **Login** — email sinh viên + mật khẩu (`role: customer`). SĐT dùng khi đặt đơn/hồ sơ. Nhà cung cấp: `mobile/provider_app`
4. **Home** — sau đăng nhập thành công
