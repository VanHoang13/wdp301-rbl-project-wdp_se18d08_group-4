import 'package:flutter/material.dart';

import '../../../core/constants/app_images.dart';
import '../domain/booking_models.dart';

class BookingMockRepository {
  Future<List<RecentPlace>> fetchRecentPlaces() async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    return const [
      RecentPlace(
        id: '1',
        title: 'Ký túc xá Khu B',
        subtitle: 'Đường Mạc Đĩnh Chi, Dĩ An, Bình Dương',
        icon: Icons.history,
      ),
      RecentPlace(
        id: '2',
        title: '152 Nguyễn Văn Cừ',
        subtitle: 'Phường Nguyễn Cư Trinh, Quận 1, TP.HCM',
        icon: Icons.work_outline,
      ),
      RecentPlace(
        id: '3',
        title: 'Chung cư Vinhomes Central Park',
        subtitle: '208 Nguyễn Hữu Cảnh, Bình Thạnh',
        icon: Icons.home_outlined,
      ),
    ];
  }

  /// Combo chuyển trọ: xe + khuân vác gộp; thêm người rẻ hơn thuê riêng.
  Future<List<ServicePackage>> fetchPackages() async {
    await Future<void>.delayed(const Duration(milliseconds: 180));
    return const [
      ServicePackage(
        tier: ServiceTier.economy,
        label: 'Combo nhẹ',
        subtitle: 'Ít đồ · 1 người khuân vác',
        badge: 'TIẾT KIỆM',
        price: 199000,
        popular: false,
        laborIncluded: 1,
        extraLaborComboPrice: 65000,
        extraLaborRetailPrice: 120000,
        features: [
          PackageFeature(text: 'Vali, bàn, vài thùng — chuyến ngắn', included: true),
          PackageFeature(text: 'Xe tải ~500kg (nhà xe đối tác báo giá)', included: true),
          PackageFeature(text: '1 người khuân vác trong combo', included: true),
          PackageFeature(text: 'Bảo hiểm hàng hóa', included: false),
        ],
      ),
      ServicePackage(
        tier: ServiceTier.standard,
        label: 'Combo phòng trọ',
        subtitle: 'Đồ vừa · 2 người khuân vác',
        badge: 'PHỔ BIẾN',
        price: 450000,
        popular: true,
        laborIncluded: 2,
        extraLaborComboPrice: 75000,
        extraLaborRetailPrice: 120000,
        features: [
          PackageFeature(text: 'Giường, tủ, bếp — đa số sinh viên', included: true),
          PackageFeature(text: 'Xe tải ~1 tấn (nhà xe đối tác báo giá)', included: true),
          PackageFeature(text: '2 người khuân vác trong combo', included: true),
          PackageFeature(text: 'Bảo hiểm cơ bản', included: true),
        ],
      ),
      ServicePackage(
        tier: ServiceTier.premium,
        label: 'Combo trọn gói',
        subtitle: 'Nhiều đồ · 3 người + bọc đồ',
        badge: 'TRỌN CHUYẾN',
        price: 890000,
        popular: false,
        laborIncluded: 3,
        extraLaborComboPrice: 70000,
        extraLaborRetailPrice: 120000,
        features: [
          PackageFeature(text: 'Nhiều đồ lớn, cần đóng gói', included: true),
          PackageFeature(text: 'Xe tải ~1.5 tấn (nhà xe đối tác báo giá)', included: true),
          PackageFeature(text: '3 người khuân vác + hỗ trợ bọc đồ', included: true),
          PackageFeature(text: 'Bảo hiểm toàn diện', included: true),
        ],
      ),
    ];
  }

  Future<List<PartnerOffer>> fetchPartners() async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return [
      PartnerOffer(
        id: 'p1',
        name: 'Minh Quân Logistics',
        distanceKm: 1.2,
        rating: 4.9,
        price: 250000,
        imageUrl: AppImages.partnerTruck1,
        vehicleLabel: 'Xe tải 1 tấn',
      ),
      PartnerOffer(
        id: 'p2',
        name: 'FastMove SV',
        distanceKm: 2.4,
        rating: 4.7,
        price: 235000,
        imageUrl: AppImages.partnerTruck2,
        vehicleLabel: 'Xe tải 500kg',
      ),
      PartnerOffer(
        id: 'p3',
        name: 'GreenLine Moving',
        distanceKm: 3.1,
        rating: 4.8,
        price: 268000,
        imageUrl: AppImages.partnerTruck1,
        vehicleLabel: 'Xe tải 1.5 tấn',
      ),
    ];
  }
}
