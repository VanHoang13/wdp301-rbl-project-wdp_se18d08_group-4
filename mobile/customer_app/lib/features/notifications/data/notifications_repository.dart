import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/mock/mock_auth_session.dart';
import '../../../core/mock/mock_notifications_data.dart';
import '../domain/notification_models.dart';

class NotificationsRepository {
  Future<List<AppNotification>> fetchInbox() async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    if (await MockAuthSession.isSignedIn()) {
      return MockNotificationsData.inboxWithReadState();
    }
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final rows = await Supabase.instance.client
            .from('notifications')
            .select()
            .eq('user_id', user.id)
            .or('notification_type.eq.promotion,notification_type.eq.system_announcement')
            .order('created_at', ascending: false);
        if (rows.isNotEmpty) {
          return rows.map(_mapRow).toList();
        }
      }
    } catch (_) {}
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
    final mock = MockNotificationsData.byId(id);
    if (mock != null) return mock;

    if (await MockAuthSession.isSignedIn()) return null;

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return null;
      final row = await Supabase.instance.client
          .from('notifications')
          .select()
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();
      if (row != null) return _mapRow(row);
    } catch (_) {}
    return null;
  }

  Future<void> markAsRead(String id) async {
    MockNotificationsData.readIds.add(id);
    if (await MockAuthSession.isSignedIn()) return;
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      await Supabase.instance.client
          .from('notifications')
          .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()})
          .eq('id', id)
          .eq('user_id', user.id);
    } catch (_) {}
  }

  AppNotification _mapRow(Map<String, dynamic> row) {
    final typeStr = row['notification_type'] as String? ?? 'system_announcement';
    final actionData = _parseActionData(row['action_data']);
    return AppNotification(
      id: row['id'] as String,
      type: switch (typeStr) {
        'promotion' => AppNotificationType.promotion,
        'system_announcement' => AppNotificationType.systemAnnouncement,
        'payment_received' || 'payment_failed' => AppNotificationType.payment,
        _ => AppNotificationType.systemAnnouncement,
      },
      title: row['title'] as String? ?? '',
      body: row['body'] as String? ?? '',
      createdAt: DateTime.parse(row['created_at'] as String),
      isRead: row['is_read'] as bool? ?? false,
      icon: row['icon'] as String?,
      imageUrl: row['image_url'] as String?,
      promoCode: actionData?['code'] as String?,
      promotionId: actionData?['promotion_id'] as String?,
      actionRoute: row['action_url'] as String?,
      subtitle: actionData?['subtitle'] as String?,
      ctaLabel: actionData?['cta_label'] as String? ?? 'Xem thêm',
    );
  }

  Map<String, dynamic>? _parseActionData(dynamic raw) {
    if (raw == null) return null;
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return null;
  }
}
