import 'package:dio/dio.dart';

import '../../../core/auth/auth_token_storage.dart';
import '../../../core/config/api_config.dart';
import '../../../core/config/dev_config.dart';
import '../../../core/mock/mock_auth_session.dart';
import '../../../core/mock/mock_provider_data.dart';
import '../../../core/network/api_client.dart';
import '../domain/provider_order.dart';

class ProviderOrdersRepository {
  ProviderOrdersRepository(this._api);

  final ApiClient _api;

  Future<List<ProviderOrder>> fetchOrders() async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      return List<ProviderOrder>.from(MockProviderData.orders);
    }
    try {
      final envelope = await _api.guard(() => _api.get('/orders'));
      final rows = envelope['data'] as List<dynamic>? ?? [];
      return rows.map((e) => ProviderOrder.fromJson(e as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      if (e.statusCode == 401 && DevConfig.useMockAuth) {
        await MockAuthSession.signIn();
        return List<ProviderOrder>.from(MockProviderData.orders);
      }
      rethrow;
    }
  }

  Future<ProviderOrder> fetchById(String id) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 120));
      final order = MockProviderData.orderById(id);
      if (order != null) return order;
      throw ApiException('Không tìm thấy đơn');
    }
    final envelope = await _api.guard(() => _api.get('/orders/$id'));
    return ProviderOrder.fromJson(envelope['data'] as Map<String, dynamic>);
  }

  Future<void> respond({
    required String orderId,
    required String response,
    String? declineReason,
  }) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      MockProviderData.updateStatus(
        orderId,
        response == 'accepted' ? 'accepted' : 'declined',
      );
      return;
    }
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

  Future<void> accept(String orderId) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      MockProviderData.updateStatus(orderId, 'in_progress');
      return;
    }
    await _api.guard(() => _api.patch('/orders/$orderId/accept'));
  }

  Future<void> start(String orderId) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      MockProviderData.updateStatus(orderId, 'in_progress');
      return;
    }
    await _api.guard(() => _api.patch('/orders/$orderId/start'));
  }

  Future<void> decline(String orderId, {String? reason}) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      MockProviderData.updateStatus(orderId, 'declined');
      return;
    }
    await _api.guard(
      () => _api.patch('/orders/$orderId/decline',
          body: reason != null && reason.isNotEmpty ? {'reason': reason} : null),
    );
  }

  Future<void> complete(String orderId) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      MockProviderData.updateStatus(orderId, 'completed');
      return;
    }
    await _api.guard(() => _api.patch('/orders/$orderId/complete'));
  }

  Future<void> uploadDeliveryPhoto(String orderId, FormData formData) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      return;
    }
    final token = AuthTokenStorage.instance.cachedToken ?? '';
    final dio = Dio(BaseOptions(
      baseUrl: '${ApiConfig.baseUrl}${ApiConfig.apiPrefix}',
      headers: {'Authorization': 'Bearer $token'},
    ));
    final response = await dio.post<dynamic>('/orders/$orderId/delivery-photo', data: formData);
    if (response.data is Map && response.data['success'] == false) {
      throw ApiException(response.data['message'] as String? ?? 'Upload thất bại');
    }
  }

  Future<void> cancel(String orderId, {String? reason}) async {
    if (await AuthTokenStorage.instance.isMockSession()) {
      await Future<void>.delayed(const Duration(milliseconds: 200));
      MockProviderData.updateStatus(orderId, 'cancelled');
      return;
    }
    await _api.guard(
      () => _api.patch('/orders/$orderId/cancel',
          body: reason != null && reason.isNotEmpty ? {'reason': reason} : null),
    );
  }
}
