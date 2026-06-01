import '../../orders/domain/order_models.dart';
import 'chat_models.dart';

/// Chat chỉ khả dụng khi có đơn đang chạy + đã có tài xế (giống Grab).
class ActiveChatContext {
  const ActiveChatContext({
    required this.order,
    required this.conversation,
  });

  final CustomerOrder order;
  final ChatConversation conversation;

  /// Đã gán tài xế và đơn chưa kết thúc — mới được nhắn tin.
  static bool orderAllowsChat(CustomerOrder order) {
    if (order.providerId == null) return false;
    return order.status == OrderStatus.accepted ||
        order.status == OrderStatus.pickingUp ||
        order.status == OrderStatus.inProgress;
  }

  String get statusLabel => switch (order.status) {
        OrderStatus.accepted => 'Tài xế đã nhận đơn',
        OrderStatus.pickingUp => 'Tài xế đang đến',
        OrderStatus.inProgress => 'Đang vận chuyển',
        _ => 'Đang xử lý',
      };
}
