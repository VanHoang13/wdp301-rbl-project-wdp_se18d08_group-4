import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/mock/mock_auth_session.dart';
import '../../../core/mock/mock_customer_data.dart';
import '../../../core/mock/mock_payments_data.dart';
import '../../../core/mock/mock_payment_methods_data.dart';
import '../domain/payment_method_models.dart';
import '../domain/payment_models.dart';

class PaymentsRepository {
  Future<List<SavedPaymentMethod>> fetchSavedPaymentMethods() async {
    await Future<void>.delayed(const Duration(milliseconds: 60));
    return MockPaymentMethodsData.methods;
  }

  Future<List<AddPaymentMethodOption>> fetchAddPaymentOptions() async {
    await Future<void>.delayed(const Duration(milliseconds: 40));
    return MockPaymentMethodsData.addOptions;
  }
  Future<int> fetchWalletBalance() async {
    if (await MockAuthSession.isSignedIn()) {
      return MockCustomerData.walletBalance;
    }
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return MockCustomerData.walletBalance;
      final row = await Supabase.instance.client
          .from('profiles')
          .select('loyalty_points')
          .eq('id', user.id)
          .maybeSingle();
      return (row?['loyalty_points'] as num?)?.toInt() ?? MockCustomerData.walletBalance;
    } catch (_) {
      return MockCustomerData.walletBalance;
    }
  }

  Future<List<CustomerPayment>> fetchRecentPayments({int limit = 10}) async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null && !await MockAuthSession.isSignedIn()) {
        final rows = await Supabase.instance.client
            .from('payments')
            .select('*, orders(order_number)')
            .eq('customer_id', user.id)
            .order('created_at', ascending: false)
            .limit(limit);
        if (rows.isNotEmpty) {
          return rows.map(_mapPayment).toList();
        }
      }
    } catch (_) {}
    return MockPaymentsData.payments.take(limit).toList();
  }

  Future<PaymentDetail?> fetchDetail(String paymentId) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null && !await MockAuthSession.isSignedIn()) {
        final row = await Supabase.instance.client
            .from('payments')
            .select('*, orders(order_number, service_type), reviews(rating, comment)')
            .eq('id', paymentId)
            .eq('customer_id', user.id)
            .maybeSingle();
        if (row != null) return _mapDetail(row);
      }
    } catch (_) {}
    try {
      return MockPaymentsData.detailFor(paymentId);
    } catch (_) {
      return null;
    }
  }

  CustomerPayment _mapPayment(Map<String, dynamic> row) {
    final order = row['orders'] as Map<String, dynamic>?;
    return CustomerPayment(
      id: row['id'] as String,
      orderId: row['order_id'] as String,
      orderNumber: order?['order_number'] as String? ?? '',
      amount: (row['amount'] as num).toInt(),
      type: PaymentType.deposit,
      status: PaymentStatus.completed,
      method: row['payment_method'] as String? ?? 'PayOS',
      createdAt: DateTime.parse(row['created_at'] as String),
    );
  }

  PaymentDetail _mapDetail(Map<String, dynamic> row) {
    final order = row['orders'] as Map<String, dynamic>?;
    final reviews = row['reviews'] as List?;
    final review = reviews?.isNotEmpty == true ? reviews!.first as Map<String, dynamic> : null;
    final payment = _mapPayment(row);
    return PaymentDetail(
      payment: payment,
      paymentCode: row['payment_code'] as String? ?? payment.id,
      transactionId: row['payos_transaction_id'] as String? ?? payment.id,
      serviceLabel: 'Chuyển trọ · ${order?['service_type'] ?? 'standard'}',
      serviceCategory: 'Chuyển trọ',
      paidAt: row['paid_at'] != null ? DateTime.parse(row['paid_at'] as String) : payment.createdAt,
      escrowStatus: row['escrow_status'] as String?,
      maskedAccount: payment.method,
      reviewRating: review?['rating'] as int?,
      reviewComment: review?['comment'] as String?,
    );
  }
}
