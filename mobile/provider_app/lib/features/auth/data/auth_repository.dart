import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/supabase_providers.dart';
import '../domain/provider_profile.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(supabaseClientProvider));
});

final providerProfileProvider = FutureProvider<ProviderProfile?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  return ref.watch(authRepositoryProvider).fetchProfile(user.id);
});

class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  Session? get currentSession => _client.auth.currentSession;

  Future<ProviderProfile?> fetchProfile(String userId) async {
    final profileData = await _client
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .maybeSingle();

    if (profileData == null) return null;

    final ppData = await _client
        .from('provider_profiles')
        .select('business_name, is_verified, rating')
        .eq('id', userId)
        .maybeSingle();

    final map = Map<String, dynamic>.from(profileData);
    if (ppData != null) {
      map.addAll(Map<String, dynamic>.from(ppData));
    }
    return ProviderProfile.fromJson(map);
  }

  Future<void> signIn({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email.trim(), password: password);
    await _validateProviderRole();
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String fullName,
    required String businessName,
  }) async {
    final response = await _client.auth.signUp(
      email: email.trim(),
      password: password,
      data: {
        'full_name': fullName.trim(),
        'role': 'provider',
        'business_name': businessName.trim(),
      },
    );

    if (response.user == null) {
      throw const AuthException('Không thể tạo tài khoản provider.');
    }

    await _ensureProviderProfile(fullName: fullName, businessName: businessName);
  }

  Future<void> signOut() => _client.auth.signOut();

  Future<void> _validateProviderRole() async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    final data = await _client.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (data == null || data['role'] != 'provider') {
      await signOut();
      throw const AuthException('Tài khoản này không phải provider.');
    }
  }

  Future<void> _ensureProviderProfile({
    required String fullName,
    required String businessName,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    await _client.from('profiles').upsert({
      'id': user.id,
      'email': user.email,
      'full_name': fullName.trim(),
      'role': 'provider',
    });

    await _client.from('provider_profiles').upsert({
      'id': user.id,
      'business_name': businessName.trim(),
      'vehicle_type': 'small_truck',
      'base_price': 100000,
      'price_per_km': 10000,
      'price_per_floor': 15000,
    });
  }
}
