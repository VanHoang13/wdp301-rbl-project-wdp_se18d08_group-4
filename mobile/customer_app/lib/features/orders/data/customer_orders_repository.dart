import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/mock/mock_auth_session.dart';
import '../../../core/mock/mock_orders_data.dart';
import '../domain/order_models.dart';

class CustomerOrdersRepository {
  Future<List<CustomerOrder>> fetchOrders({bool activeOnly = false, bool completedOnly = false}) async {
    final remote = await _fetchFromSupabase(activeOnly: activeOnly, completedOnly: completedOnly);
    if (remote != null) return remote;
    return _mockFilter(activeOnly: activeOnly, completedOnly: completedOnly);
  }

  Future<CustomerOrder?> fetchById(String id) async {
    try {
      if (!await MockAuthSession.isSignedIn()) {
        final user = Supabase.instance.client.auth.currentUser;
        if (user == null) {
          try {
            return MockOrdersData.orders.firstWhere((o) => o.id == id);
          } catch (_) {
            return null;
          }
        }
      }
      final row = await Supabase.instance.client
          .from('orders')
          .select('*, provider:profiles!orders_provider_id_fkey(full_name, avatar_url, rating, vehicle_plate)')
          .eq('id', id)
          .maybeSingle();
      if (row != null) return _mapOrder(row);
    } catch (_) {}
    try {
      return MockOrdersData.orders.firstWhere((o) => o.id == id);
    } catch (_) {
      return null;
    }
  }

  Future<TrackingSnapshot> fetchTracking(String orderId) async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return MockOrdersData.trackingFor(orderId);
  }

  List<CustomerOrder> _mockFilter({required bool activeOnly, required bool completedOnly}) {
    var list = MockOrdersData.orders;
    if (activeOnly) {
      list = list.where((o) => o.status.isActive).toList();
    }
    if (completedOnly) {
      list = list
          .where((o) => o.status == OrderStatus.completed || o.status == OrderStatus.cancelled)
          .toList();
    }
    return list;
  }

  Future<List<CustomerOrder>?> _fetchFromSupabase({
    required bool activeOnly,
    required bool completedOnly,
  }) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null && await MockAuthSession.isSignedIn()) {
        return null;
      }
      if (user == null) return null;

      var query = Supabase.instance.client
          .from('orders')
          .select('*, provider:profiles!orders_provider_id_fkey(full_name, avatar_url, rating)')
          .eq('customer_id', user.id)
          .order('created_at', ascending: false);

      final rows = await query;
      var mapped = (rows as List).map((e) => _mapOrder(e as Map<String, dynamic>)).toList();
      if (activeOnly) {
        mapped = mapped.where((o) => o.status.isActive).toList();
      } else if (completedOnly) {
        mapped = mapped
            .where((o) => o.status == OrderStatus.completed || o.status == OrderStatus.cancelled)
            .toList();
      }
      return mapped;
    } catch (_) {
      return null;
    }
  }

  CustomerOrder _mapOrder(Map<String, dynamic> row) {
    final provider = row['provider'] as Map<String, dynamic>?;
    final package = (row['service_type'] as String?) ?? 'standard';
    return CustomerOrder(
      id: row['id'] as String,
      orderNumber: row['order_number'] as String,
      customerId: row['customer_id'] as String,
      providerId: row['provider_id'] as String?,
      status: OrderStatus.fromDb(row['status'] as String),
      packageLabel: switch (package) {
        'express' => ServicePackageLabel.premium,
        'premium' => ServicePackageLabel.premium,
        _ => ServicePackageLabel.standard,
      },
      vehicleLabel: _vehicleLabel(row['vehicle_size'] as String?),
      pickupAddress: row['pickup_address'] as String,
      deliveryAddress: row['delivery_address'] as String,
      totalPrice: ((row['total_price'] as num?) ?? 0).round(),
      createdAt: DateTime.parse(row['created_at'] as String),
      completedAt: row['completed_at'] != null ? DateTime.parse(row['completed_at'] as String) : null,
      cancelledAt: row['cancelled_at'] != null ? DateTime.parse(row['cancelled_at'] as String) : null,
      cancellationNote: row['cancellation_reason'] as String?,
      etaMinutes: (row['eta_minutes'] as num?)?.toInt(),
      estimatedDistanceKm: (row['estimated_distance'] as num?)?.toDouble(),
      providerName: provider?['full_name'] as String?,
      providerAvatarUrl: provider?['avatar_url'] as String?,
      providerRating: (provider?['rating'] as num?)?.toDouble(),
      providerPlate: provider?['vehicle_plate'] as String?,
    );
  }

  String _vehicleLabel(String? size) => switch (size) {
        'motorbike' => 'Xe máy',
        'small_truck' => 'Xe tải 500kg',
        'medium_truck' => 'Xe tải 1 tấn',
        'large_truck' => 'Xe tải lớn',
        _ => 'Xe tải',
      };
}
