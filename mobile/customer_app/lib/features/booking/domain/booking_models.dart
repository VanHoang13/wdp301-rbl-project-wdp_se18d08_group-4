import 'package:flutter/material.dart';

class RecentPlace {
  const RecentPlace({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
}

enum ServiceTier { economy, standard, premium }

class ServicePackage {
  const ServicePackage({
    required this.tier,
    required this.label,
    required this.badge,
    required this.price,
    required this.features,
    required this.popular,
    required this.laborIncluded,
    required this.extraLaborComboPrice,
    required this.extraLaborRetailPrice,
    this.subtitle = '',
  });

  final ServiceTier tier;
  final String label;
  final String badge;
  final int price;
  final List<PackageFeature> features;
  final bool popular;

  /// Số người khuân vác đã gộp trong combo.
  final int laborIncluded;

  /// Giá thêm 1 người khi đã chọn combo (ưu đãi).
  final int extraLaborComboPrice;

  /// Giá tham chiếu nếu thuê khuân vác riêng (để so sánh).
  final int extraLaborRetailPrice;

  final String subtitle;

  int get laborSavingsPerPerson => extraLaborRetailPrice - extraLaborComboPrice;
}

class PackageFeature {
  const PackageFeature({required this.text, required this.included});

  final String text;
  final bool included;
}

class PartnerOffer {
  const PartnerOffer({
    required this.id,
    required this.name,
    required this.distanceKm,
    required this.rating,
    required this.price,
    required this.imageUrl,
    required this.vehicleLabel,
  });

  final String id;
  final String name;
  final double distanceKm;
  final double rating;
  final int price;
  final String imageUrl;
  final String vehicleLabel;
}

enum PaymentMethod { payos, momo, otherWallet }

/// Loại đặt dịch vụ — khớp `orders.requires_helpers` / `number_of_helpers`.
enum BookingServiceType { fullMove, laborOnly, laborAddon }

/// Báo giá đội khuân vác từ đối tác marketplace (UniMove trung gian).
class LaborProviderQuote {
  const LaborProviderQuote({
    required this.id,
    required this.name,
    required this.teamLabel,
    required this.rating,
    required this.reviewCount,
    required this.price,
    required this.etaMinutes,
    this.badge,
    this.canCombineWithTransport = true,
  });

  final String id;
  final String name;
  final String teamLabel;
  final double rating;
  final int reviewCount;
  final int price;
  final int etaMinutes;
  final String? badge;
  /// Có thể phối hợp cùng nhà xe / đơn chuyển trọ hiện có.
  final bool canCombineWithTransport;
}

/// Cấu hình giá khuân vác (tham chiếu seed: 50.000–100.000đ/người).
abstract final class LaborPricing {
  static const int perHelperPerHour = 75000;
  static const int perFloorNoElevator = 15000;
  static const List<int> hourOptions = [2, 4, 8];
}

class LaborServiceInfo {
  const LaborServiceInfo({
    required this.title,
    required this.description,
    required this.benefits,
    required this.minPrice,
  });

  final String title;
  final String description;
  final List<String> benefits;
  final int minPrice;
}

/// Gói bảo hiểm đồ đạc — khớp `orders.has_insurance`, `orders.insurance_value`.
class CargoInsurancePlan {
  const CargoInsurancePlan({
    required this.id,
    required this.name,
    required this.tagline,
    required this.coverageAmount,
    required this.price,
    required this.benefits,
    this.recommended = false,
    this.isNoCoverage = false,
  });

  final String id;
  final String name;
  final String tagline;

  /// Mức bồi thường tối đa (VND).
  final int coverageAmount;
  final int price;
  final List<String> benefits;
  final bool recommended;
  final bool isNoCoverage;
}
