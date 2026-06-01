import '../../../core/network/api_client.dart';
import '../domain/provider_order.dart';

class ProviderOrdersRepository {
  ProviderOrdersRepository(this._api);

  final ApiClient _api;

  Future<List<ProviderOrder>> fetchOrders() async {
    final envelope = await _api.guard(() => _api.get('/orders'));
    final rows = envelope['data'] as List<dynamic>? ?? [];
    return rows.map((e) => ProviderOrder.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ProviderOrder> fetchById(String id) async {
    final envelope = await _api.guard(() => _api.get('/orders/$id'));
    return ProviderOrder.fromJson(envelope['data'] as Map<String, dynamic>);
  }

  Future<void> respond({
    required String orderId,
    required String response,
    String? declineReason,
  }) async {
    await _api.guard(
      () => _api.post(
        '/orders/$orderId/respond',
        body: {
          'response': response,
          if (declineReason != null && declineReason.isNotEmpty)
            'decline_reason': declineReason,
        },
      ),
    );
  }
}
