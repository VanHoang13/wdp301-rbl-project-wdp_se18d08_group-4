import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/mock/mock_auth_session.dart';

/// Đăng ký / đăng nhập sinh viên — khớp `profiles` + trigger `handle_new_user`.
class CustomerAuthRepository {
  CustomerAuthRepository(this._client);

  final SupabaseClient _client;

  Session? get currentSession => _client.auth.currentSession;

  Future<bool> get isMockSignedIn => MockAuthSession.isSignedIn();

  /// Chuẩn hóa SĐT VN → `profiles.phone` (ví dụ +84901234567).
  static String normalizePhone(String input) {
    var digits = input.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('84')) digits = digits.substring(2);
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.length < 9 || digits.length > 10) {
      throw const AuthException('Số điện thoại không hợp lệ.');
    }
    return '+84$digits';
  }

  Future<void> signIn({required String email, required String password}) async {
    if (MockAuthSession.isEnabled &&
        MockAuthSession.isDemoCredential(email: email, password: password)) {
      await MockAuthSession.signIn();
      return;
    }

    await _client.auth.signInWithPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );
    await _ensureRole('customer');
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    required String phone,
  }) async {
    final normalizedPhone = normalizePhone(phone);

    final response = await _client.auth.signUp(
      email: email.trim().toLowerCase(),
      password: password,
      data: {
        'full_name': fullName.trim(),
        'role': 'customer',
        'phone': normalizedPhone,
      },
    );
    if (response.user == null) {
      throw const AuthException('Không thể tạo tài khoản. Kiểm tra email hoặc thử lại.');
    }
  }

  Future<void> signOut() async {
    await MockAuthSession.signOut();
    await _client.auth.signOut();
  }

  Future<void> _ensureRole(String expected) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    final row = await _client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    final role = row?['role'] as String?;
    if (role != expected) {
      await signOut();
      throw const AuthException(
        'Tài khoản không phải sinh viên. Nhà cung cấp dùng app UniMove Provider.',
      );
    }
  }
}
