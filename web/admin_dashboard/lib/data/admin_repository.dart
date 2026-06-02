import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/network/api_client.dart';

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  return AdminRepository(ref.watch(apiClientProvider));
});

class AdminRepository {
  AdminRepository(this._api);

  final ApiClient _api;

  Future<int> getTableCount(String table) async {
    final envelope = await _api.guard(
      () => _api.get('/admin/stats/count', query: {'table': table}),
    );
    final data = Map<String, dynamic>.from(envelope['data'] as Map);
    return data['count'] as int? ?? 0;
  }

  Future<List<Map<String, dynamic>>> getOpenDisputes() async {
    final envelope = await _api.guard(() => _api.get('/admin/disputes/open'));
    final list = envelope['data'];
    if (list is! List) return [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> getPendingProviders() async {
    final envelope = await _api.guard(() => _api.get('/admin/providers/pending'));
    final list = envelope['data'];
    if (list is! List) return [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}
