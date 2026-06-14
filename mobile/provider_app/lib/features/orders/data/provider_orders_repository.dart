import '../../../core/auth/auth_token_storage.dart';
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

  Future<List<Map<String, dynamic>>> fetchQuotes(String orderId) async {
    final envelope = await _api.guard(() => _api.get('/orders/$orderId/quotes'));
    final raw = envelope['data'];
    if (raw is! List) return [];
    return raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> submitQuote({
    required String orderId,
    required int basePrice,
    required List<Map<String, dynamic>> surcharges,
    required String scheduleFit,
    DateTime? proposedPickupAt,
    String? note,
  }) async {
    final envelope = await _api.guard(
      () => _api.post(
        '/orders/$orderId/quotes',
        body: {
          'base_price': basePrice,
          'surcharges': surcharges,
          'schedule_fit': scheduleFit,
          if (proposedPickupAt != null)
            'proposed_pickup_at': proposedPickupAt.toUtc().toIso8601String(),
          if (note != null && note.isNotEmpty) 'note': note,
        },
      ),
    );
    return Map<String, dynamic>.from(envelope['data'] as Map);
  }
}
