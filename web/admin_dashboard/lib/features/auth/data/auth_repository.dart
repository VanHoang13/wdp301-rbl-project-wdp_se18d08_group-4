import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_token_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_session_notifier.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;
  final _storage = AuthTokenStorage.instance;

  bool get isSignedIn => _storage.cachedToken?.isNotEmpty == true;

  Future<void> signIn({required String email, required String password}) async {
    final envelope = await _api.guard(
      () => _api.post('/auth/login', body: {
        'email': email.trim().toLowerCase(),
        'password': password,
      }),
    );

    final data = Map<String, dynamic>.from(envelope['data'] as Map);
    final token = data['accessToken'] as String?;
    final user = data['user'] as Map?;
    if (token == null || user == null) {
      throw const AuthException('Phản hồi auth không hợp lệ.');
    }

    if (user['role'] != 'admin') {
      await signOut();
      throw const AuthException('Chỉ tài khoản admin mới được truy cập.');
    }

    await _storage.save(accessToken: token, user: Map<String, dynamic>.from(user));
    _api.setAccessToken(token);
    authSessionNotifier.notifyAuthChanged();
  }

  Future<void> signOut() async {
    await _storage.clear();
    _api.setAccessToken(null);
    authSessionNotifier.notifyAuthChanged();
  }
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;

  @override
  String toString() => message;
}
