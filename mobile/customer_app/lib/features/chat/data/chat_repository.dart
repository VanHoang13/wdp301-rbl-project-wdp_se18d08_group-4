import '../../../core/mock/mock_orders_data.dart';
import '../../orders/data/customer_orders_repository.dart';
import '../../orders/domain/order_models.dart';
import '../domain/active_chat_context.dart';
import '../domain/chat_models.dart';

class ChatRepository {
  final _ordersRepo = CustomerOrdersRepository();

  /// Inbox Tin nhắn — tất cả cuộc trò chuyện theo đơn (Grab-style).
  Future<List<ChatInboxEntry>> fetchInbox() async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    final orders = await _ordersRepo.fetchOrders();
    final entries = <ChatInboxEntry>[];

    for (final conv in MockOrdersData.conversations) {
      CustomerOrder? order;
      try {
        order = orders.firstWhere((o) => o.id == conv.orderId);
      } catch (_) {
        continue;
      }
      entries.add(
        ChatInboxEntry(
          conversation: conv,
          order: order,
          isActive: ActiveChatContext.orderAllowsChat(order),
        ),
      );
    }

    entries.sort((a, b) => b.conversation.lastMessageAt.compareTo(a.conversation.lastMessageAt));
    return entries;
  }

  Future<int> totalUnreadCount() async {
    final inbox = await fetchInbox();
    var total = 0;
    for (final e in inbox) {
      total += e.conversation.unreadCount;
    }
    return total;
  }

  /// Grab-style: chỉ trả về chat khi có đơn active + tài xế.
  Future<ActiveChatContext?> fetchActiveChat() async {
    final activeOrders = await _ordersRepo.fetchOrders(activeOnly: true);
    for (final order in activeOrders) {
      if (!ActiveChatContext.orderAllowsChat(order)) continue;
      final conv = _conversationForOrder(order);
      if (conv != null) {
        return ActiveChatContext(order: order, conversation: conv);
      }
    }
    return null;
  }

  Future<ActiveChatContext?> fetchThreadContext(String conversationId) async {
    final orders = await _ordersRepo.fetchOrders();
    ChatConversation? conv;
    try {
      conv = MockOrdersData.conversations.firstWhere((c) => c.id == conversationId);
    } catch (_) {
      return null;
    }
    CustomerOrder? order;
    try {
      order = orders.firstWhere((o) => o.id == conv!.orderId);
    } catch (_) {
      return null;
    }
    return ActiveChatContext(order: order, conversation: conv);
  }

  ChatConversation? _conversationForOrder(CustomerOrder order) {
    if (order.conversationId != null) {
      try {
        return MockOrdersData.conversations.firstWhere((c) => c.id == order.conversationId);
      } catch (_) {}
    }
    try {
      return MockOrdersData.conversations.firstWhere((c) => c.orderId == order.id);
    } catch (_) {
      return null;
    }
  }

  Future<List<ChatMessage>> fetchMessages(String conversationId) async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    return MockOrdersData.messages
        .where((m) => m.conversationId == conversationId)
        .toList();
  }

  Future<ChatMessage> sendMessage({
    required String conversationId,
    required String senderId,
    required String content,
  }) async {
    final msg = ChatMessage(
      id: 'local-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      senderId: senderId,
      senderRole: MessageSenderRole.customer,
      content: content,
      createdAt: DateTime.now(),
      isRead: false,
    );
    MockOrdersData.messages.add(msg);
    return msg;
  }
}
