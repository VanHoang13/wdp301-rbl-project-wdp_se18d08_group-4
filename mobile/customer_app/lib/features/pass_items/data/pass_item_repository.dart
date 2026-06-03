import '../domain/pass_extras.dart';
import '../domain/pass_item.dart';
import '../domain/pass_item_provinces.dart';

class PassItemRepository {
  /// Người mua đang đăng nhập (mock).
  static const currentBuyerId = 'buyer_me';

  static final PassInterestedBuyer currentBuyer = PassInterestedBuyer(
    id: currentBuyerId,
    name: 'Nguyễn Văn An',
    contact: '0918 333 444',
    area: 'KTX Khu A, ĐHQG',
    interestedAt: DateTime(2026, 6, 3, 10, 0),
    note: 'Tôi muốn nhận món này',
  );

  static final Map<String, List<PassInterestedBuyer>> _interestedByPost = {
    'pi_006': [
      PassInterestedBuyer(
        id: 'b_khoa',
        name: 'Trần Minh Khoa',
        contact: '0903 111 222',
        area: 'KTX Khu B, Thủ Đức',
        interestedAt: DateTime(2026, 6, 3, 8, 20),
        note: 'Hỏi giá cuối',
        lastMessage: 'Giá 100k được không bạn?',
        unreadForSeller: 2,
      ),
      PassInterestedBuyer(
        id: 'b_lan',
        name: 'Phạm Thảo Lan',
        contact: '0935 888 999',
        area: 'Phường 14, Quận 5',
        interestedAt: DateTime(2026, 6, 3, 7, 45),
        lastMessage: 'Còn quạt không ạ?',
        unreadForSeller: 1,
      ),
      PassInterestedBuyer(
        id: 'b_hung',
        name: 'Hoàng Đức Hưng',
        contact: '0977 222 333',
        area: 'Chợ Lớn, Quận 6',
        interestedAt: DateTime(2026, 6, 2, 19, 10),
        lastMessage: 'Mình lấy tối nay được không?',
        unreadForSeller: 0,
      ),
    ],
  };

  static const _img = {
    'wardrobe': 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&q=80',
    'desk': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80',
    'fridge': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80',
    'books': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
    'bike': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
    'fan': 'https://images.unsplash.com/photo-1565374790502-39a21a8f3a36?w=800&q=80',
  };

  static final List<PassItemPost> _posts = [
    PassItemPost(
      id: 'pi_001',
      title: 'Tủ quần áo gỗ 2 cánh',
      description:
          'Tủ gỗ công nghiệp còn chắc chắn, không mối mọt. Có ngăn treo và ngăn kéo. Cần pass gấp do chuyển trọ.',
      category: 'Nội thất',
      condition: PassItemCondition.good,
      area: 'KTX Khu B, TP. Thủ Đức',
      provinceId: 'hcm',
      price: 280000,
      imageUrl: _img['wardrobe']!,
      usageDuration: '1 năm',
      posterName: 'Minh Anh',
      posterContact: '0987 6xx xxx',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      isNegotiable: true,
      interestedCount: 5,
    ),
    PassItemPost(
      id: 'pi_002',
      title: 'Bàn học + ghế lưới',
      description: 'Bàn gấp gọn, ghế lưới êm. Phù hợp phòng trọ nhỏ, ngồi học/làm việc thoải mái.',
      category: 'Nội thất',
      condition: PassItemCondition.likeNew,
      area: 'Linh Trung, TP. Thủ Đức',
      provinceId: 'hcm',
      price: 150000,
      imageUrl: _img['desk']!,
      usageDuration: '6 tháng',
      posterName: 'Quốc Huy',
      posterContact: '0901 1xx xxx',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(hours: 8)),
      interestedCount: 2,
    ),
    PassItemPost(
      id: 'pi_003',
      title: 'Tủ lạnh mini 90L',
      description: 'Tủ lạnh mini chạy êm, làm lạnh tốt. Phù hợp phòng trọ, để nước & đồ ăn nhẹ.',
      category: 'Điện tử',
      condition: PassItemCondition.good,
      area: 'Quận 10, TP.HCM',
      provinceId: 'hcm',
      price: 750000,
      imageUrl: _img['fridge']!,
      usageDuration: '2 năm',
      posterName: 'Thu Hà',
      posterContact: '0909 1xx xxx',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      isNegotiable: true,
      interestedCount: 9,
    ),
    PassItemPost(
      id: 'pi_004',
      title: 'Combo sách giáo trình năm 1',
      description: 'Trọn bộ giáo trình đại cương, còn mới, ít ghi chú. Tặng kèm vài cuốn tham khảo.',
      category: 'Sách & VPP',
      condition: PassItemCondition.good,
      area: 'Làng đại học, Dĩ An, Bình Dương',
      provinceId: 'bd',
      price: 0,
      imageUrl: _img['books']!,
      usageDuration: '1 học kỳ',
      posterName: 'Bảo Trân',
      posterContact: '0938 2xx xxx',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      interestedCount: 14,
    ),
    PassItemPost(
      id: 'pi_005',
      title: 'Xe đạp đi học',
      description: 'Xe đạp khung nhôm nhẹ, phanh tốt, mới thay lốp. Đi học trong làng đại học rất tiện.',
      category: 'Khác',
      condition: PassItemCondition.fair,
      area: 'KTX Khu A, ĐHQG, TP. Hồ Chí Minh',
      provinceId: 'hcm',
      price: 420000,
      imageUrl: _img['bike']!,
      usageDuration: '1.5 năm',
      posterName: 'Đức Anh',
      posterContact: '0912 2xx xxx',
      status: PassItemStatus.reserved,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      isNegotiable: true,
      interestedCount: 7,
    ),
    PassItemPost(
      id: 'pi_006',
      title: 'Quạt cây Senko',
      description: 'Quạt cây 3 mức gió, còn chạy tốt, nhựa không nứt vỡ. Pass lại vì hết nhu cầu.',
      category: 'Gia dụng',
      condition: PassItemCondition.good,
      area: 'Phường 14, Quận 5, TP. Hồ Chí Minh',
      provinceId: 'hcm',
      price: 120000,
      imageUrl: _img['fan']!,
      usageDuration: '1 năm',
      posterName: 'Lê Nhật Nam',
      posterContact: '0987 654 321',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      isMine: true,
      interestedCount: 3,
    ),
    PassItemPost(
      id: 'pi_007',
      title: 'Bàn ghế phòng trọ',
      description: 'Bàn gỗ + ghế nhựa, pass vì tốt nghiệp. Lấy tại khu KTX.',
      category: 'Nội thất',
      condition: PassItemCondition.good,
      area: 'KTX ĐH Bách Khoa, Hà Nội',
      provinceId: 'hn',
      price: 200000,
      imageUrl: _img['desk']!,
      usageDuration: '8 tháng',
      posterName: 'Văn Hùng',
      posterContact: '0912 3xx xxx',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(hours: 12)),
      interestedCount: 4,
    ),
    PassItemPost(
      id: 'pi_008',
      title: 'Loa Bluetooth mini',
      description: 'Loa nhỏ gọn, pin còn tốt, nghe nhạc trong phòng trọ.',
      category: 'Điện tử',
      condition: PassItemCondition.likeNew,
      area: 'Khuê Mỹ, Đà Nẵng',
      provinceId: 'dn',
      price: 180000,
      imageUrl: _img['fridge']!,
      usageDuration: '4 tháng',
      posterName: 'Minh Tú',
      posterContact: '0905 4xx xxx',
      status: PassItemStatus.open,
      createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 3)),
      isNegotiable: true,
      interestedCount: 2,
    ),
  ];

  Future<List<PassItemPost>> browse({
    String? keyword,
    String? category,
    String? provinceId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 180));
    Iterable<PassItemPost> list = _posts.where((e) => e.status != PassItemStatus.hidden);
    if (category != null && category.isNotEmpty && category != 'Tất cả') {
      list = list.where((e) => e.category == category);
    }
    if (provinceId != null && provinceId.isNotEmpty) {
      final province = PassItemProvince.resolve(provinceId);
      list = list.where(province.matchesPost);
    }
    if (keyword != null && keyword.trim().isNotEmpty) {
      final k = keyword.trim().toLowerCase();
      list = list.where((e) =>
          e.title.toLowerCase().contains(k) ||
          e.description.toLowerCase().contains(k) ||
          e.area.toLowerCase().contains(k));
    }
    final result = list.toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return result;
  }

  Future<List<PassItemPost>> myPosts() async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    return _posts.where((e) => e.isMine).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<PassItemPost?> byId(String id) async {
    try {
      return _posts.firstWhere((e) => e.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Tải ảnh lên server (mock: trả path local để hiển thị; API thật: POST /uploads).
  Future<String> uploadImage({required String filePath}) async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    return filePath;
  }

  Future<PassItemPost> create({
    required String title,
    required String description,
    required String category,
    required PassItemCondition condition,
    required String area,
    required String provinceId,
    required int price,
    required String usageDuration,
    required bool isNegotiable,
    required String imageUrl,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 160));
    final post = PassItemPost(
      id: 'pi_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      description: description.isEmpty ? 'Không có mô tả thêm.' : description,
      category: category,
      condition: condition,
      area: area,
      provinceId: provinceId,
      price: price,
      imageUrl: imageUrl,
      usageDuration: usageDuration.isEmpty ? 'Không rõ' : usageDuration,
      posterName: 'Lê Nhật Nam',
      posterContact: '0987 654 321',
      status: PassItemStatus.open,
      createdAt: DateTime.now(),
      isNegotiable: isNegotiable,
      isMine: true,
    );
    _posts.insert(0, post);
    return post;
  }

  Future<void> updateStatus(String id, PassItemStatus status) async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    final idx = _posts.indexWhere((e) => e.id == id);
    if (idx != -1) _posts[idx] = _posts[idx].copyWith(status: status);
  }

  /// Người bán chốt đơn — mở quyền đặt xe cho người mua.
  Future<bool> confirmDeal(String itemId, {int? agreedPrice}) async {
    await Future<void>.delayed(const Duration(milliseconds: 140));
    final idx = _posts.indexWhere((e) => e.id == itemId);
    if (idx == -1) return false;
    final post = _posts[idx];
    if (!post.isMine || post.dealConfirmed || post.buyerTransportBooked) return false;

    final price = agreedPrice ?? (post.isFree ? 0 : post.price);
    _posts[idx] = post.copyWith(
      dealConfirmed: true,
      confirmedPrice: post.isFree ? 0 : price,
      status: PassItemStatus.reserved,
    );

    final priceLine = post.isFree ? 'đồ cho tặng' : 'giá ${_formatMoney(price)}';
    _appendSystemToAllThreads(
      itemId,
      PassChatMessage(
        text: 'Đã chốt đơn ($priceLine). Bạn có thể đặt xe lấy đồ ngay.',
        fromBuyer: false,
        time: _now(),
        isDealConfirm: true,
      ),
    );
    return true;
  }

  /// Huỷ chốt đơn — chỉ khi khách chưa đặt xe.
  Future<bool> cancelDealConfirmation(String itemId) async {
    await Future<void>.delayed(const Duration(milliseconds: 140));
    final idx = _posts.indexWhere((e) => e.id == itemId);
    if (idx == -1) return false;
    final post = _posts[idx];
    if (!post.sellerCanCancelDeal) return false;

    _posts[idx] = post.copyWith(
      dealConfirmed: false,
      clearConfirmedPrice: true,
      status: PassItemStatus.open,
    );

    _appendSystemToAllThreads(
      itemId,
      PassChatMessage(
        text: 'Người bán đã huỷ chốt đơn. Thương lượng lại giá — đặt xe sẽ mở sau khi chốt đơn lần nữa.',
        fromBuyer: false,
        time: _now(),
        isDealCancel: true,
      ),
    );
    return true;
  }

  /// Gọi khi người mua tiếp tục luồng đặt xe (đã chọn địa chỉ nhận).
  Future<void> markTransportBooked(String itemId) async {
    final idx = _posts.indexWhere((e) => e.id == itemId);
    if (idx == -1) return;
    final post = _posts[idx];
    if (!post.dealConfirmed || post.buyerTransportBooked) return;
    _posts[idx] = post.copyWith(buyerTransportBooked: true);
  }

  static String _formatMoney(int amount) {
    final s = amount.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return '$bufđ';
  }

  Future<List<PassInterestedBuyer>> interestedBuyers(String itemId) async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    final list = List<PassInterestedBuyer>.from(_interestedByPost[itemId] ?? const []);
    for (final b in list) {
      _ensureThread(itemId, b.id);
    }
    list.sort((a, b) => b.interestedAt.compareTo(a.interestedAt));
    return list;
  }

  Future<void> expressInterest(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    final idx = _posts.indexWhere((e) => e.id == id);
    if (idx == -1) return;

    final buyers = _interestedByPost.putIfAbsent(id, () => []);
    if (!buyers.any((b) => b.id == currentBuyerId)) {
      buyers.insert(
        0,
        PassInterestedBuyer(
          id: currentBuyer.id,
          name: currentBuyer.name,
          contact: currentBuyer.contact,
          area: currentBuyer.area,
          interestedAt: DateTime.now(),
          note: currentBuyer.note,
          lastMessage: 'Chào bạn, mình quan tâm món này.',
        ),
      );
      _ensureThread(id, currentBuyerId, seedBuyerOpens: true);
    }
    _posts[idx] = _posts[idx].copyWith(interestedCount: buyers.length);
  }

  void markThreadRead(String itemId, String buyerId) {
    final buyers = _interestedByPost[itemId];
    if (buyers == null) return;
    final i = buyers.indexWhere((b) => b.id == buyerId);
    if (i != -1) buyers[i] = buyers[i].copyWith(unreadForSeller: 0);
  }

  // ----- Chat theo từng khách quan tâm -----
  static final Map<String, List<PassChatMessage>> _chats = {};

  static String _threadKey(String itemId, String buyerId) => '$itemId::$buyerId';

  void _ensureThread(String itemId, String buyerId, {bool seedBuyerOpens = false}) {
    final key = _threadKey(itemId, buyerId);
    if (_chats.containsKey(key)) return;
    if (seedBuyerOpens) {
      _chats[key] = [
        PassChatMessage(
          text: 'Chào bạn, mình quan tâm món này.',
          fromBuyer: true,
          time: _now(),
        ),
        const PassChatMessage(
          text: 'Chào bạn, mình vẫn còn món này nhé. Bạn quan tâm phần nào?',
          fromBuyer: false,
          time: '09:02',
        ),
      ];
    } else {
      _chats[key] = [
        const PassChatMessage(
          text: 'Chào shop, mình muốn hỏi thêm về món này.',
          fromBuyer: true,
          time: '09:01',
        ),
        const PassChatMessage(
          text: 'Chào bạn, mình vẫn còn món này nhé.',
          fromBuyer: false,
          time: '09:02',
        ),
      ];
    }
  }

  void _appendSystemToAllThreads(String itemId, PassChatMessage message) {
    final buyers = _interestedByPost[itemId] ?? const [];
    if (buyers.isEmpty) {
      final key = _threadKey(itemId, currentBuyerId);
      _chats.putIfAbsent(key, () => []);
      _chats[key]!.add(message);
      return;
    }
    for (final b in buyers) {
      final key = _threadKey(itemId, b.id);
      _chats.putIfAbsent(key, () => []);
      _chats[key]!.add(message);
    }
  }

  Future<List<PassChatMessage>> messages(
    String itemId,
    String buyerId, {
    bool markRead = false,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    _ensureThread(itemId, buyerId);
    if (markRead) markThreadRead(itemId, buyerId);
    final key = _threadKey(itemId, buyerId);
    return List<PassChatMessage>.from(_chats[key]!);
  }

  void sendMessage(
    String itemId,
    String buyerId,
    PassChatMessage message, {
    required bool sentBySeller,
  }) {
    if (message.isDealConfirm || message.isDealCancel) return;
    final key = _threadKey(itemId, buyerId);
    _chats.putIfAbsent(key, () => []);
    final stored = PassChatMessage(
      text: message.text,
      fromBuyer: !sentBySeller,
      time: message.time,
      isOffer: message.isOffer,
      offerAmount: message.offerAmount,
    );
    _chats[key]!.add(stored);
    _updateBuyerPreview(itemId, buyerId, stored.text, sentBySeller: sentBySeller);

    // Phản hồi mock phía đối tác.
    final reply = stored.isOffer
        ? PassChatMessage(
            text: sentBySeller
                ? 'Mình chấp nhận mức ${message.offerAmount}đ, bạn đặt xe nhé!'
                : 'Mình xem giá ${message.offerAmount}đ nhé, bạn qua lấy được luôn không?',
            fromBuyer: sentBySeller,
            time: _now(),
          )
        : PassChatMessage(
            text: sentBySeller ? 'Ok bạn, mình chờ bạn đặt xe nhé!' : 'Ok bạn, mình phản hồi ngay nhé!',
            fromBuyer: sentBySeller,
            time: _now(),
          );
    _chats[key]!.add(reply);
    _updateBuyerPreview(itemId, buyerId, reply.text, sentBySeller: reply.fromBuyer == false);
  }

  void _updateBuyerPreview(
    String itemId,
    String buyerId,
    String text, {
    required bool sentBySeller,
  }) {
    final buyers = _interestedByPost[itemId];
    if (buyers == null) return;
    final i = buyers.indexWhere((b) => b.id == buyerId);
    if (i == -1) return;
    buyers[i] = buyers[i].copyWith(
      lastMessage: text,
      unreadForSeller: sentBySeller ? buyers[i].unreadForSeller : buyers[i].unreadForSeller + 1,
    );
  }

  static String _now() {
    final n = DateTime.now();
    return '${n.hour.toString().padLeft(2, '0')}:${n.minute.toString().padLeft(2, '0')}';
  }

  // ----- Nhà xe báo giá vận chuyển cho món đồ -----
  Future<List<PassTransportQuote>> transportQuotes(PassItemPost post) async {
    await Future<void>.delayed(const Duration(milliseconds: 260));
    return const [
      PassTransportQuote(
        id: 'tq1',
        providerName: 'Minh Quân Express',
        vehicleLabel: 'Xe tải nhỏ 500kg',
        rating: 4.9,
        price: 90000,
        etaMinutes: 20,
        badge: 'Rẻ nhất',
      ),
      PassTransportQuote(
        id: 'tq2',
        providerName: 'FastMove SV',
        vehicleLabel: 'Xe ba gác',
        rating: 4.7,
        price: 75000,
        etaMinutes: 30,
      ),
      PassTransportQuote(
        id: 'tq3',
        providerName: 'GreenLine Moving',
        vehicleLabel: 'Xe tải 1 tấn',
        rating: 4.8,
        price: 120000,
        etaMinutes: 18,
        badge: 'Nhanh nhất',
      ),
    ];
  }
}
