class ProviderOrder {
  const ProviderOrder({
    required this.id,
    required this.status,
    required this.pickupAddress,
    required this.deliveryAddress,
    required this.totalPrice,
    this.orderNumber,
    this.serviceType,
    this.vehicleSize,
    this.customerId,
    this.createdAt,
  });

  factory ProviderOrder.fromJson(Map<String, dynamic> json) {
    return ProviderOrder(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'pending',
      pickupAddress: json['pickup_address'] as String? ?? '',
      deliveryAddress: json['delivery_address'] as String? ?? '',
      totalPrice: ((json['total_price'] as num?) ?? 0).round(),
      orderNumber: json['order_number'] as String?,
      serviceType: json['service_type'] as String?,
      vehicleSize: json['vehicle_size'] as String?,
      customerId: json['customer_id'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  final String id;
  final String status;
  final String pickupAddress;
  final String deliveryAddress;
  final int totalPrice;
  final String? orderNumber;
  final String? serviceType;
  final String? vehicleSize;
  final String? customerId;
  final DateTime? createdAt;

  bool get isPending => status == 'pending' || status == 'matched';

  String get statusLabel => switch (status) {
        'pending' => 'Chờ nhận',
        'matched' => 'Được gán',
        'accepted' => 'Đã nhận',
        'declined' => 'Đã từ chối',
        'picking_up' => 'Đang lấy hàng',
        'in_progress' => 'Đang chuyển',
        'completed' => 'Hoàn thành',
        'cancelled' => 'Đã hủy',
        _ => status,
      };
}
