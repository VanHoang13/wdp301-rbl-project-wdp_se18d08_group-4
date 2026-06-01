import '../../../core/mock/mock_orders_data.dart';
import '../domain/order_models.dart';

class CustomerOrdersRepository {
  Future<List<CustomerOrder>> fetchOrders({bool activeOnly = false, bool completedOnly = false}) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    return _mockFilter(activeOnly: activeOnly, completedOnly: completedOnly);
  }

  Future<CustomerOrder?> fetchById(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 40));
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
}
