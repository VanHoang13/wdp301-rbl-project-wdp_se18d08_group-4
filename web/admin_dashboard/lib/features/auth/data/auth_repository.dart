import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/supabase_providers.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});

class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  Session? get currentSession => _client.auth.currentSession;

  Future<void> signIn({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email.trim(), password: password);

    final user = _client.auth.currentUser;
    if (user == null) throw const AuthException('Đăng nhập thất bại');

    final profile = await _client.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile == null || profile['role'] != 'admin') {
      await _client.auth.signOut();
      throw const AuthException('Chỉ tài khoản admin mới được truy cập.');
    }
  }

  Future<void> signOut() => _client.auth.signOut();
}
