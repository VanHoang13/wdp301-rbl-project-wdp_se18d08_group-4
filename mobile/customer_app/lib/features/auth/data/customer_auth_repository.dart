import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/dev_config.dart';
import '../../../core/mock/mock_auth_session.dart';

/// Auth customer — Supabase Auth (UI / session).
/// SCAFFOLD: Leader không implement đăng ký/đăng nhập Node API.
/// Team BE: `backend/src/services/auth.service.js` (BE-001→007); mobile nối ApiClient sau.
class CustomerAuthRepository {
  CustomerAuthRepository({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  User? get currentUser => _client.auth.currentUser;

  Session? get currentSession => _client.auth.currentSession;

  Future<bool> get isSignedIn async {
    if (await MockAuthSession.isSignedIn()) return true;
    return _client.auth.currentSession != null;
  }

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
    if (DevConfig.useMockAuth &&
        MockAuthSession.isDemoCredential(email: email, password: password)) {
      await MockAuthSession.signIn();
      return;
    }

    await _client.auth.signInWithPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );
    await _validateCustomerRole();
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
        'phone': normalizedPhone,
        'role': 'customer',
      },
    );

    if (response.user == null) {
      throw const AuthException('Không thể tạo tài khoản. Kiểm tra email hoặc thử lại.');
    }

    await _ensureCustomerProfile(
      fullName: fullName,
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
    );
  }

  Future<void> signOut() async {
    await MockAuthSession.signOut();
    await _client.auth.signOut();
  }

  Future<CustomerProfile> fetchMe() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AuthException('Chưa đăng nhập.');
    }

    final row = await _client
        .from('profiles')
        .select(
          'id, email, phone, full_name, avatar_url, role, student_id, university, loyalty_points',
        )
        .eq('id', user.id)
        .maybeSingle();

    if (row == null) {
      throw const AuthException('Không tìm thấy hồ sơ.');
    }

    return CustomerProfile.fromJson(Map<String, dynamic>.from(row));
  }

  Future<void> forgotPassword({required String email}) async {
    await _client.auth.resetPasswordForEmail(email.trim().toLowerCase());
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = _client.auth.currentUser;
    final email = user?.email;
    if (email == null) {
      throw const AuthException('Chưa đăng nhập.');
    }

    await _client.auth.signInWithPassword(email: email, password: currentPassword);
    await _client.auth.updateUser(UserAttributes(password: newPassword));
  }

  Future<void> _validateCustomerRole() async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    final data = await _client.from('profiles').select('role').eq('id', user.id).maybeSingle();
    final role = data?['role'] as String?;
    if (role != null && role != 'customer') {
      await signOut();
      throw const AuthException('Tài khoản này không phải sinh viên (customer).');
    }
  }

  Future<void> _ensureCustomerProfile({
    required String fullName,
    required String email,
    required String phone,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    await _client.from('profiles').upsert({
      'id': user.id,
      'email': email,
      'full_name': fullName.trim(),
      'phone': phone,
      'role': 'customer',
    });
  }
}

class CustomerProfile {
  const CustomerProfile({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    this.avatarUrl,
    this.studentId,
    this.university,
    this.loyaltyPoints,
  });

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      studentId: json['student_id'] as String?,
      university: json['university'] as String?,
      loyaltyPoints: (json['loyalty_points'] as num?)?.toInt(),
    );
  }

  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final String? avatarUrl;
  final String? studentId;
  final String? university;
  final int? loyaltyPoints;
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  @override
  String toString() => message;
}
