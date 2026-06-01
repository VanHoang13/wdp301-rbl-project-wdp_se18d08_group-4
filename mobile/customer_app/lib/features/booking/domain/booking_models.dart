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
  });

  final ServiceTier tier;
  final String label;
  final String badge;
  final int price;
  final List<PackageFeature> features;
  final bool popular;
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
