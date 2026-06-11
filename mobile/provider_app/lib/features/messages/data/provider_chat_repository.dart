import '../../orders/domain/provider_order.dart';
import '../domain/chat_models.dart';

/// Chat đơn hàng — backend chưa có API.
class ProviderChatRepository {
  List<ProviderChatThread> buildThreads(List<ProviderOrder> orders) => [];

  Future<List<ProviderChatMessage>> fetchMessages(String threadId) async => [];

  Future<ProviderChatMessage> sendMessage({
    required String threadId,
    required String content,
    required bool canSend,
  }) async {
    throw UnsupportedError('Chat đơn hàng chưa được backend hỗ trợ');
  }
}
