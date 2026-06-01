import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/mock/mock_orders_data.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/booking_scaffold.dart';
import '../../../../core/widgets/smooth_cta_button.dart';
import '../../domain/booking_models.dart';
import '../cubit/booking_flow_cubit.dart';
import '../cubit/booking_flow_state.dart';

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key});

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  final _discountCtrl = TextEditingController();

  @override
  void dispose() {
    _discountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return BlocBuilder<BookingFlowCubit, BookingFlowState>(
      builder: (context, state) {
        final partner = state.selectedPartner;
        final labor = state.selectedLaborProvider;
        final deposit = _depositAmount(state.total);

        return BookingScaffold(
          title: 'Thanh toán',
          body: ListView(
            padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 24.h),
            children: [
              if (state.isLaborAddon)
                Padding(
                  padding: EdgeInsets.only(bottom: 12.h),
                  child: Container(
                    padding: EdgeInsets.all(12.w),
                    decoration: BoxDecoration(
                      color: c.chipBg,
                      borderRadius: BorderRadius.circular(10.r),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.link_rounded, color: c.primary, size: 20.sp),
                        SizedBox(width: 8.w),
                        Expanded(
                          child: Text(
                            'Dịch vụ bổ sung cho đơn #${state.linkedOrderNumber}',
                            style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w600, color: c.onSurface),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              _sectionCard(
                c,
                title: state.isLaborService ? 'Chi tiết dịch vụ' : 'Chi tiết chuyến đi',
                child: Column(
                  children: [
                    _tripRow(Icons.trip_origin, c.primary, state.pickup, c),
                    SizedBox(height: 12.h),
                    _tripRow(
                      Icons.location_on,
                      Colors.red,
                      state.destination.isEmpty ? 'Căn hộ Landmark 81' : state.destination,
                      c,
                    ),
                    SizedBox(height: 12.h),
                    Wrap(
                      spacing: 8.w,
                      runSpacing: 8.h,
                      children: [
                        if (!state.isLaborService)
                          _chip(
                            'Quy mô: ${state.selectedPackage?.label ?? 'Phòng trọ tiêu chuẩn'}',
                            Icons.inventory_2_outlined,
                            c,
                          ),
                        if (state.isLaborService)
                          _chip(
                            '${state.helperCount} người · ${state.laborHours}h',
                            Icons.groups_outlined,
                            c,
                          ),
                        if (state.isLaborService && labor != null)
                          _chip(labor.name, Icons.handyman_outlined, c)
                        else if (!state.isLaborService && partner != null)
                          _chip('Nhà xe: ${partner.name}', Icons.local_shipping_outlined, c)
                        else if (!state.isLaborService)
                          _chip('Chưa chọn nhà xe', Icons.local_shipping_outlined, c),
                        if (state.isLaborAddon &&
                            (state.linkedProviderName != null || partner != null))
                          _chip(
                            'Nhà xe: ${state.linkedProviderName ?? partner!.name}',
                            Icons.local_shipping_outlined,
                            c,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (!state.isLaborService && partner != null) ...[
                SizedBox(height: 12.h),
                _marketplaceNote(c, partnerName: partner.name),
              ],
              if (!state.isLaborService) ...[
                SizedBox(height: 12.h),
                _laborUpsellCard(context, c),
              ],
              SizedBox(height: 16.h),
              _escrowTrustCard(c, deposit: deposit),
              SizedBox(height: 16.h),
              Text(
                'Phương thức thanh toán',
                style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w700, color: c.onSurface),
              ),
              SizedBox(height: 10.h),
              _payMethod(
                context,
                state,
                PaymentMethod.payos,
                'PayOS - Chuyển khoản qua QR',
                'Thanh toán nhanh, an toàn',
                c,
                selected: state.paymentMethod == PaymentMethod.payos,
              ),
              _payMethod(context, state, PaymentMethod.momo, 'Ví MoMo', null, c,
                  selected: state.paymentMethod == PaymentMethod.momo),
              _payMethod(context, state, PaymentMethod.otherWallet, 'Ví điện tử khác', null, c,
                  selected: state.paymentMethod == PaymentMethod.otherWallet),
              SizedBox(height: 16.h),
              Text(
                'MÃ GIẢM GIÁ',
                style: TextStyle(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: c.onSurfaceMuted,
                ),
              ),
              SizedBox(height: 8.h),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _discountCtrl,
                      decoration: InputDecoration(
                        hintText: 'Nhập mã ưu đãi',
                        prefixIcon: const Icon(Icons.confirmation_number_outlined),
                        filled: true,
                        fillColor: c.surface,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12.r)),
                      ),
                      onChanged: (v) => context.read<BookingFlowCubit>().setDiscountCode(v),
                    ),
                  ),
                  SizedBox(width: 8.w),
                  ElevatedButton(
                    onPressed: () => context.read<BookingFlowCubit>().applyDiscount(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: c.onSurface,
                      foregroundColor: c.surface,
                      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                    ),
                    child: const Text('Áp dụng'),
                  ),
                ],
              ),
              SizedBox(height: 16.h),
              _sectionCard(
                c,
                title: 'Chi tiết thanh toán',
                child: Column(
                  children: [
                    if (!state.isLaborService)
                      _priceRow(
                        'Báo giá nhà xe (${partner?.name ?? 'đối tác'})',
                        _formatPrice(state.movePackagePrice),
                        c,
                      ),
                    if (state.isLaborService) ...[
                      _priceRow(
                        labor != null
                            ? '${labor.name} (${state.helperCount}×${state.laborHours}h)'
                            : 'Khuân vác (${state.helperCount}×${state.laborHours}h)',
                        _formatPrice(state.laborQuotedPrice),
                        c,
                      ),
                      if (state.floorFee > 0 && labor == null)
                        _priceRow('Phụ phí tầng', _formatPrice(state.floorFee), c),
                    ],
                    if (state.discountApplied)
                      _priceRow('Khuyến mãi', '-${_formatPrice(state.discount)}', c, highlight: true),
                    _priceRow('Phí dịch vụ', _formatPrice(state.serviceFee), c),
                    Divider(height: 24.h, color: c.border),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Tổng chuyến',
                          style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w700, color: c.onSurface),
                        ),
                        Text(
                          _formatPrice(state.total),
                          style: TextStyle(fontSize: 24.sp, fontWeight: FontWeight.w800, color: c.primary),
                        ),
                      ],
                    ),
                    SizedBox(height: 8.h),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Đặt cọc hôm nay (30%)',
                          style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w600, color: c.onSurface),
                        ),
                        Text(
                          _formatPrice(deposit),
                          style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w800, color: c.success),
                        ),
                      ],
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      'Phần còn lại thanh toán khi bạn xác nhận hoàn thành chuyến.',
                      style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted, height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
          bottom: SafeArea(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 16.h),
              child: SmoothCtaButton(
                label: state.isLaborService
                    ? (state.isLaborAddon
                        ? 'Đặt cọc thêm khuân vác · ${_formatPrice(deposit)}'
                        : 'Đặt cọc khuân vác · ${_formatPrice(deposit)}')
                    : 'Đặt cọc · ${_formatPrice(deposit)}',
                onPressed: () {
                  final helpers = state.helperCount;
                  final team = labor?.name ?? 'đối tác';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        state.isLaborAddon
                            ? 'Đã thêm $helpers người ($team) vào đơn #${state.linkedOrderNumber}'
                            : state.isLaborOnly
                                ? 'Đã đặt $helpers người ($team) — UniMove ghi nhận hỗ trợ bốc xếp'
                                : 'Đặt cọc thành công — UniMove giữ tiền hộ (mock)!',
                      ),
                    ),
                  );
                  final orderId = state.linkedOrderId ?? MockOrdersData.activeOrderId;
                  context.go('/orders/$orderId/tracking');
                },
              ),
            ),
          ),
        );
      },
    );
  }

  int _depositAmount(int total) => (total * 0.3).round();

  Widget _marketplaceNote(UniMoveColors c, {required String partnerName}) {
    return Container(
      padding: EdgeInsets.all(12.w),
      decoration: BoxDecoration(
        color: c.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: c.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.storefront_outlined, color: c.primary, size: 20.sp),
          SizedBox(width: 10.w),
          Expanded(
            child: Text(
              'Bạn thanh toán qua UniMove. Nhà xe $partnerName thực hiện chuyến — UniMove không trực tiếp vận chuyển.',
              style: TextStyle(fontSize: 12.sp, height: 1.4, color: c.onSurface),
            ),
          ),
        ],
      ),
    );
  }

  Widget _laborUpsellCard(BuildContext context, UniMoveColors c) {
    return Material(
      color: c.surface,
      borderRadius: BorderRadius.circular(14.r),
      child: InkWell(
        borderRadius: BorderRadius.circular(14.r),
        onTap: () => context.push('/booking/labor'),
        child: Container(
          padding: EdgeInsets.all(14.w),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14.r),
            border: Border.all(color: c.border),
          ),
          child: Row(
            children: [
              Container(
                width: 40.w,
                height: 40.w,
                decoration: BoxDecoration(
                  color: c.accentGreen.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.groups_outlined, color: c.success, size: 22.sp),
              ),
              SizedBox(width: 12.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Thêm báo giá khuân vác?',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.sp, color: c.onSurface),
                    ),
                    SizedBox(height: 2.h),
                    Text(
                      'So sánh đội đối tác · gắn vào chuyến hoặc đặt riêng',
                      style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted, height: 1.3),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: c.onSurfaceMuted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _escrowTrustCard(UniMoveColors c, {required int deposit}) {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: c.chipBg,
        borderRadius: BorderRadius.circular(14.r),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.account_balance_wallet_outlined, color: c.primary, size: 22.sp),
              SizedBox(width: 8.w),
              Text(
                'Cam kết UniMove (trung gian)',
                style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w800, color: c.onSurface),
              ),
            ],
          ),
          SizedBox(height: 10.h),
          _trustLine(Icons.lock_outline, 'Cọc ${_formatPrice(deposit)} giữ an toàn — chuyển cho nhà xe khi bạn xác nhận xong', c),
          SizedBox(height: 6.h),
          _trustLine(Icons.replay_outlined, 'Hủy trước khi nhà xe nhận: hoàn 100% cọc', c),
          SizedBox(height: 6.h),
          _trustLine(Icons.info_outline, 'Hủy sau khi nhà xe nhận: hoàn 50% cọc (theo chính sách)', c),
        ],
      ),
    );
  }

  Widget _trustLine(IconData icon, String text, UniMoveColors c) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16.sp, color: c.primary),
        SizedBox(width: 8.w),
        Expanded(
          child: Text(text, style: TextStyle(fontSize: 12.sp, height: 1.35, color: c.onSurfaceMuted)),
        ),
      ],
    );
  }

  Widget _sectionCard(UniMoveColors c, {required String title, required Widget child}) {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.w700, color: c.onSurface)),
          SizedBox(height: 12.h),
          child,
        ],
      ),
    );
  }

  Widget _tripRow(IconData icon, Color color, String text, UniMoveColors c) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 20.sp),
        SizedBox(width: 10.w),
        Expanded(
          child: Text(text, style: TextStyle(fontSize: 14.sp, height: 1.35, color: c.onSurface)),
        ),
      ],
    );
  }

  Widget _chip(String text, IconData icon, UniMoveColors c) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: c.surfaceTint,
        borderRadius: BorderRadius.circular(8.r),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14.sp, color: c.primary),
          SizedBox(width: 6.w),
          Text(text, style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600, color: c.onSurface)),
        ],
      ),
    );
  }

  Widget _payMethod(
    BuildContext context,
    BookingFlowState state,
    PaymentMethod method,
    String title,
    String? subtitle,
    UniMoveColors c, {
    required bool selected,
  }) {
    return Padding(
      padding: EdgeInsets.only(bottom: 10.h),
      child: Material(
        color: selected ? c.chipBg : c.surface,
        borderRadius: BorderRadius.circular(14.r),
        child: InkWell(
          borderRadius: BorderRadius.circular(14.r),
          onTap: () => context.read<BookingFlowCubit>().selectPayment(method),
          child: Container(
            padding: EdgeInsets.all(14.w),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14.r),
              border: Border.all(color: selected ? c.primary : c.border, width: selected ? 2 : 1),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14.sp, color: c.onSurface),
                      ),
                      if (subtitle != null)
                        Text(subtitle, style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted)),
                    ],
                  ),
                ),
                Icon(
                  selected ? Icons.radio_button_checked : Icons.radio_button_off,
                  color: c.primary,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _priceRow(String label, String value, UniMoveColors c, {bool highlight = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8.h),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14.sp, color: c.onSurfaceMuted)),
          Text(
            value,
            style: TextStyle(
              fontSize: 14.sp,
              fontWeight: FontWeight.w600,
              color: highlight ? c.success : c.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  String _formatPrice(int v) {
    final s = v.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return '${buf}đ';
  }
}
