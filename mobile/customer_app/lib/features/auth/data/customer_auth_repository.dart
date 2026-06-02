import '../../../core/auth/auth_token_storage.dart';
import '../../../core/config/dev_config.dart';
import '../../../core/mock/mock_auth_session.dart';
import '../../../core/network/api_client.dart';

/// Auth customer — Node.js API (`/api/auth/*`, `/api/customers/me`).
class CustomerAuthRepository {
  CustomerAuthRepository({ApiClient? api}) : _api = api ?? ApiClient.instance;

  final ApiClient _api;
  final _storage = AuthTokenStorage.instance;

  Future<bool> get isSignedIn async {
    if (DevConfig.useMockAuth && await MockAuthSession.isSignedIn()) return true;
    return _storage.hasSession();
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

    final envelope = await _api.guard(
      () => _api.post('/auth/login', body: {
        'email': email.trim().toLowerCase(),
        'password': password,
      }),
    );

    await _persistAuth(envelope);
    await _validateCustomerRole();
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    required String phone,
  }) async {
    if (password.length < 8) {
      throw const AuthException('Mật khẩu cần ít nhất 8 ký tự.');
    }

    final envelope = await _api.guard(
      () => _api.post('/auth/register', body: {
        'email': email.trim().toLowerCase(),
        'password': password,
        'full_name': fullName.trim(),
        'phone': phone.trim(),
        'role': 'customer',
      }),
    );

    await _persistAuth(envelope);
  }

  Future<void> signOut() async {
    await MockAuthSession.signOut();
    await _storage.clear();
    _api.setAccessToken(null);
  }

  Future<CustomerProfile> updateProfile({
    String? fullName,
    String? phone,
    String? studentId,
    String? university,
  }) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['full_name'] = fullName;
    if (phone != null) body['phone'] = phone;
    if (studentId != null) body['student_id'] = studentId;
    if (university != null) body['university'] = university;
    if (body.isEmpty) throw const AuthException('Không có thông tin cập nhật.');

    final envelope = await _api.guard(() => _api.patch('/customers/me', body: body));
    final data = Map<String, dynamic>.from(envelope['data'] as Map);
    return CustomerProfile.fromJson(data);
  }

  Future<CustomerProfile> fetchMe() async {
    if (await MockAuthSession.isSignedIn()) {
      return CustomerProfile(
        id: 'mock',
        email: DevConfig.demoEmail,
        fullName: 'Demo User',
        phone: '+84901234567',
      );
    }

    try {
      final envelope = await _api.guard(() => _api.get('/customers/me'));
      final user = Map<String, dynamic>.from(envelope['data'] as Map);
      return CustomerProfile.fromJson(user);
    } catch (_) {
      final envelope = await _api.guard(() => _api.get('/auth/me'));
      final user = Map<String, dynamic>.from(envelope['data'] as Map);
      return CustomerProfile.fromJson(user);
    }
  }

  Future<void> forgotPassword({required String email}) async {
    await _api.guard(
      () => _api.post('/auth/forgot-password', body: {
        'email': email.trim().toLowerCase(),
      }),
    );
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    if (newPassword.length < 8) {
      throw const AuthException('Mật khẩu mới cần ít nhất 8 ký tự.');
    }

    await _api.guard(
      () => _api.post('/auth/change-password', body: {
        'old_password': currentPassword,
        'new_password': newPassword,
      }),
    );
  }

  Future<void> _persistAuth(Map<String, dynamic> envelope) async {
    final data = Map<String, dynamic>.from(envelope['data'] as Map);
    final token = data['accessToken'] as String?;
    final user = data['user'] as Map?;
    if (token == null || user == null) {
      throw const AuthException('Phản hồi đăng nhập không hợp lệ.');
    }
    final userMap = Map<String, dynamic>.from(user);
    await _storage.save(accessToken: token, user: userMap);
    _api.setAccessToken(token);
  }

  Future<void> _validateCustomerRole() async {
    final user = await _storage.loadUser();
    final role = user?['role'] as String?;
    if (role != null && role != 'customer') {
      await signOut();
      throw const AuthException('Tài khoản này không phải sinh viên (customer).');
    }
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
