/// Khớp `notification_type` trong Supabase.
enum AppNotificationType { promotion, systemAnnouncement, orderUpdate, payment }

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.isRead = false,
    this.icon,
    this.imageUrl,
    this.promoCode,
    this.promotionId,
    this.actionRoute,
    this.subtitle,
    String? ctaLabel,
  }) : _ctaLabel = ctaLabel;

  final String id;
  final AppNotificationType type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool isRead;
  final String? icon;
  final String? imageUrl;
  final String? promoCode;
  final String? promotionId;
  final String? actionRoute;
  final String? subtitle;
  final String? _ctaLabel;

  /// Luôn có giá trị — an toàn sau hot reload và dữ liệu Supabase thiếu field.
  String get ctaLabel => _ctaLabel ?? 'Xem thêm';

  String get preview => body.length > 60 ? '${body.substring(0, 60)}...' : body;

  String get categoryLabel => switch (type) {
        AppNotificationType.promotion => 'Ưu đãi',
        AppNotificationType.systemAnnouncement => 'Hệ thống',
        AppNotificationType.orderUpdate => 'Đơn hàng',
        AppNotificationType.payment => 'Thanh toán',
      };
}
