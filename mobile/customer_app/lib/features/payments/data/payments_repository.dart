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
    return MockCustomerData.walletBalance;
  }

  Future<List<CustomerPayment>> fetchRecentPayments({int limit = 10}) async {
    await Future<void>.delayed(const Duration(milliseconds: 100));
    return MockPaymentsData.payments.take(limit).toList();
  }

  Future<PaymentDetail?> fetchDetail(String paymentId) async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    try {
      return MockPaymentsData.detailFor(paymentId);
    } catch (_) {
      return null;
    }
  }
}
