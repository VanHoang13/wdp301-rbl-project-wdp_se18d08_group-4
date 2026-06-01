import '../../../core/mock/mock_notifications_data.dart';
import '../domain/notification_models.dart';

class NotificationsRepository {
  Future<List<AppNotification>> fetchInbox() async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    return MockNotificationsData.inboxWithReadState();
  }

  Future<List<AppNotification>> fetchPromotions() async {
    final inbox = await fetchInbox();
    return inbox.where((n) => n.type == AppNotificationType.promotion).toList();
  }

  Future<int> unreadCount() async {
    final inbox = await fetchInbox();
    return inbox.where((n) => !n.isRead).length;
  }

  Future<AppNotification?> fetchById(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 40));
    return MockNotificationsData.byId(id);
  }

  Future<void> markAsRead(String id) async {
    MockNotificationsData.readIds.add(id);
  }
}
