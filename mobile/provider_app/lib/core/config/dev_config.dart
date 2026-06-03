/// Cấu hình demo cho provider app.
///
/// Khi [useMockAuth] = true, có thể đăng nhập bằng tài khoản demo
/// ([demoEmail] / [demoPassword]) mà không cần backend — app sẽ dùng
/// dữ liệu mẫu trong `MockProviderData`.
abstract final class DevConfig {
  static const bool useMockAuth = true;

  static const String demoEmail = 'partner@unimove.vn';
  static const String demoPassword = 'partner123';

  /// Token giả đánh dấu phiên demo (không phải JWT thật).
  static const String mockToken = 'mock-provider-session-token';

  static bool isDemoCredential({required String email, required String password}) {
    return email.trim().toLowerCase() == demoEmail && password == demoPassword;
  }
}
