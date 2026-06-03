/// Một tin nhắn trong hội thoại.
class ChatMessage {
  ChatMessage({required this.text, required this.fromProvider, required this.time});

  final String text;
  final bool fromProvider; // true = tài xế gửi, false = khách gửi
  final String time;
}

/// Một hội thoại với khách hàng.
class ChatThread {
  ChatThread({
    required this.id,
    required this.name,
    required this.customerId,
    required this.time,
    required this.unread,
    required this.messages,
  });

  final String id;
  final String name;

  /// `null` cho kênh hệ thống (vd: hỗ trợ UniMove).
  final String? customerId;
  final String time;
  final bool unread;

  /// Danh sách tin nhắn — growable để demo gửi thêm.
  final List<ChatMessage> messages;

  String get preview => messages.isEmpty ? '' : messages.last.text;
}
