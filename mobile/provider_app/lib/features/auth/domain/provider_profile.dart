class ProviderProfile {
  const ProviderProfile({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.businessName,
    this.isVerified = false,
    this.rating = 0,
  });

  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? businessName;
  final bool isVerified;
  final double rating;

  factory ProviderProfile.fromJson(Map<String, dynamic> json) {
    return ProviderProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['full_name'] as String? ?? '',
      role: json['role'] as String? ?? 'provider',
      businessName: json['business_name'] as String?,
      isVerified: json['is_verified'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
    );
  }
}
