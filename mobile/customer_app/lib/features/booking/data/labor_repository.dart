import '../domain/booking_models.dart';

class LaborRepository {
  Future<LaborServiceInfo> fetchServiceInfo() async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    return const LaborServiceInfo(
      title: 'Thuê người khuân vác',
      description:
          'UniMove là nền tảng trung gian — bạn nhận nhiều báo giá từ các đội khuân vác & có thể kết hợp với nhà xe đã chọn.',
      benefits: [
        'Đặt riêng hoặc thêm vào đơn chuyển trọ đang có',
        'So sánh báo giá nhiều đội trên marketplace',
        'Minh bạch số người · giờ · phụ phí tầng',
        'Cọc qua UniMove — giữ an toàn đến khi hoàn thành',
      ],
      minPrice: LaborPricing.perHelperPerHour,
    );
  }

  /// Báo giá từ nhiều bên — giá thay đổi theo cấu hình người dùng.
  Future<List<LaborProviderQuote>> fetchLaborQuotes({
    required int helperCount,
    required int laborHours,
    required int floorFee,
    bool forExistingOrder = false,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    final base = helperCount * laborHours * LaborPricing.perHelperPerHour + floorFee;

    return [
      LaborProviderQuote(
        id: 'labor-p1',
        name: 'SV Help Team ĐHQG',
        teamLabel: 'Sinh viên part-time · 4.9★',
        rating: 4.9,
        reviewCount: 328,
        price: base + 15000,
        etaMinutes: 25,
        badge: 'Gần bạn nhất',
        canCombineWithTransport: true,
      ),
      LaborProviderQuote(
        id: 'labor-p2',
        name: 'ProMove Khuân vác',
        teamLabel: 'Đội chuyên nghiệp · Bảo hiểm',
        rating: 4.8,
        reviewCount: 512,
        price: base + 45000,
        etaMinutes: 40,
        badge: forExistingOrder ? 'Phối hợp nhà xe' : 'Đề xuất',
        canCombineWithTransport: true,
      ),
      LaborProviderQuote(
        id: 'labor-p3',
        name: 'FastLift Express',
        teamLabel: 'Làm nhanh · Cuối tuần',
        rating: 4.6,
        reviewCount: 189,
        price: base - 10000,
        etaMinutes: 55,
        badge: 'Giá tốt nhất',
        canCombineWithTransport: false,
      ),
      LaborProviderQuote(
        id: 'labor-p4',
        name: 'GreenLine Movers',
        teamLabel: 'Cùng hệ sinh thái nhà xe',
        rating: 4.7,
        reviewCount: 276,
        price: base + 25000,
        etaMinutes: 35,
        canCombineWithTransport: true,
      ),
      LaborProviderQuote(
        id: 'labor-p5',
        name: 'Campus Carry 24/7',
        teamLabel: 'Ca đêm · KTX khu vực',
        rating: 4.5,
        reviewCount: 142,
        price: base + 5000,
        etaMinutes: 30,
        badge: 'Linh hoạt giờ',
        canCombineWithTransport: false,
      ),
      LaborProviderQuote(
        id: 'labor-p6',
        name: 'UniLift Partners',
        teamLabel: 'Đối tác nội bộ UniMove',
        rating: 4.85,
        reviewCount: 640,
        price: base + 35000,
        etaMinutes: 45,
        badge: forExistingOrder ? 'Đồng bộ nhà xe' : 'Uy tín cao',
        canCombineWithTransport: true,
      ),
    ]..sort((a, b) => a.price.compareTo(b.price));
  }
}
