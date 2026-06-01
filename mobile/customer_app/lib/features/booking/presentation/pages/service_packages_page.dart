import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_images.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/booking_scaffold.dart';
import '../../../../core/widgets/cached_hero_image.dart';
import '../../../../core/widgets/smooth_cta_button.dart';
import '../../domain/booking_models.dart';
import '../cubit/booking_flow_cubit.dart';
import '../cubit/booking_flow_state.dart';

class ServicePackagesPage extends StatefulWidget {
  const ServicePackagesPage({super.key});

  @override
  State<ServicePackagesPage> createState() => _ServicePackagesPageState();
}

class _ServicePackagesPageState extends State<ServicePackagesPage> {
  @override
  void initState() {
    super.initState();
    context.read<BookingFlowCubit>().loadPackages();
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return BlocBuilder<BookingFlowCubit, BookingFlowState>(
      builder: (context, state) {
        final selected = state.selectedPackage;
        final estimateTotal = state.subtotal;

        return BookingScaffold(
          title: 'Combo chuyển trọ',
          body: ListView(
            padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 140.h),
            children: [
              Text(
                'Chọn combo\nxe + khuân vác',
                style: TextStyle(
                  fontSize: 26.sp,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                  color: c.onSurface,
                ),
              ),
              SizedBox(height: 8.h),
              Text(
                'Combo gộp xe và đội khuân vác. Thêm người trong combo rẻ hơn thuê khuân vác riêng.',
                style: TextStyle(fontSize: 14.sp, color: c.onSurfaceMuted, height: 1.45),
              ),
              if (state.quickCompareEntry && state.destination.trim().isNotEmpty) ...[
                SizedBox(height: 16.h),
                _QuickRouteCard(
                  pickup: state.pickup,
                  destination: state.destination,
                  colors: c,
                  onEdit: () {
                    context.read<BookingFlowCubit>().clearQuickCompareEntry();
                    context.push('/booking/location');
                  },
                ),
              ],
              SizedBox(height: 20.h),
              ...state.packages.map((p) => _packageCard(context, state, p, c)),
              SizedBox(height: 20.h),
              Text(
                'Tại sao chọn combo?',
                style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w700, color: c.onSurface),
              ),
              SizedBox(height: 12.h),
              _benefitRow(Icons.inventory_2_outlined, 'Một lần chọn — xe + người khuân vác', c),
              _benefitRow(Icons.savings_outlined, 'Thêm người giá ưu đãi so với thuê riêng', c),
              _benefitRow(Icons.storefront_outlined, 'Nhà xe đối tác đã xác minh', c),
              _benefitRow(Icons.account_balance_wallet_outlined, 'Cọc giữ an toàn qua UniMove', c),
              SizedBox(height: 16.h),
              CachedHeroImage(url: AppImages.moversPhoto, height: 160.h),
            ],
          ),
          bottom: SafeArea(
            child: Container(
              padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, 16.h),
              decoration: BoxDecoration(
                color: c.surface,
                border: Border(top: BorderSide(color: c.border)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'COMBO',
                              style: TextStyle(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: c.onSurfaceMuted,
                              ),
                            ),
                            Text(
                              selected?.label ?? 'Chưa chọn',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14.sp,
                                fontWeight: FontWeight.w600,
                                color: c.onSurface,
                              ),
                            ),
                            if (state.extraComboLaborCount > 0)
                              Text(
                                '+${state.extraComboLaborCount} người khuân vác',
                                style: TextStyle(fontSize: 11.sp, color: c.primary),
                              ),
                          ],
                        ),
                      ),
                      SizedBox(width: 8.w),
                      Text(
                        'từ ${_formatPrice(estimateTotal)}',
                        style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w800, color: c.primary),
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),
                  SmoothCtaButton(
                    label: 'Chọn nhà xe cho combo',
                    onPressed: selected == null
                        ? null
                        : () => context.push('/booking/partners'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _packageCard(BuildContext context, BookingFlowState state, ServicePackage pkg, UniMoveColors c) {
    final selected = state.selectedTier == pkg.tier;
    final extraCount = selected ? state.extraComboLaborCount : 0;

    return Padding(
      padding: EdgeInsets.only(bottom: 14.h),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.all(16.w),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(
            color: selected ? c.primary : c.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (pkg.popular)
              Padding(
                padding: EdgeInsets.only(bottom: 10.h),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                    decoration: BoxDecoration(
                      color: c.primary,
                      borderRadius: BorderRadius.circular(6.r),
                    ),
                    child: Text(
                      'PHỔ BIẾN NHẤT',
                      style: TextStyle(color: Colors.white, fontSize: 10.sp, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            Wrap(
              spacing: 8.w,
              runSpacing: 6.h,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _badge(pkg.badge, pkg.tier, c),
                if (pkg.subtitle.isNotEmpty)
                  Text(
                    pkg.subtitle,
                    style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted),
                  ),
              ],
            ),
            SizedBox(height: 8.h),
            Text(
              pkg.label,
              style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w700, color: c.onSurface),
            ),
            SizedBox(height: 6.h),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'từ ${_formatPrice(pkg.price)}',
                style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w800, color: c.primary),
              ),
            ),
            Text(
              '/chuyến · ước tính (nhà xe báo giá chốt)',
              style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted),
            ),
            SizedBox(height: 10.h),
            _laborChip(
              c,
              '${pkg.laborIncluded} người khuân vác trong combo',
            ),
            SizedBox(height: 12.h),
            ...pkg.features.map(
              (f) => Padding(
                padding: EdgeInsets.only(bottom: 6.h),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      f.included ? Icons.check_circle : Icons.cancel_outlined,
                      size: 18.sp,
                      color: f.included ? c.success : c.onSurfaceMuted,
                    ),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: Text(
                        f.text,
                        style: TextStyle(fontSize: 13.sp, color: c.onSurface, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (selected) ...[
              SizedBox(height: 12.h),
              Text(
                'Thêm người khuân vác (giá combo)',
                style: TextStyle(fontSize: 13.sp, fontWeight: FontWeight.w600, color: c.onSurface),
              ),
              SizedBox(height: 8.h),
              Row(
                children: [
                  _extraLaborButton(
                    context,
                    c,
                    label: 'Không thêm',
                    selected: extraCount == 0,
                    onTap: () => context.read<BookingFlowCubit>().setExtraComboLaborCount(0),
                  ),
                  SizedBox(width: 8.w),
                  _extraLaborButton(
                    context,
                    c,
                    label: '+1 · ${_formatPrice(pkg.extraLaborComboPrice)}',
                    selected: extraCount == 1,
                    onTap: () => context.read<BookingFlowCubit>().setExtraComboLaborCount(1),
                  ),
                  SizedBox(width: 8.w),
                  _extraLaborButton(
                    context,
                    c,
                    label: '+2 · ${_formatPrice(pkg.extraLaborComboPrice * 2)}',
                    selected: extraCount == 2,
                    onTap: () => context.read<BookingFlowCubit>().setExtraComboLaborCount(2),
                  ),
                ],
              ),
              SizedBox(height: 6.h),
              Text(
                'Thuê riêng ~${_formatPrice(pkg.extraLaborRetailPrice)}/người · Tiết kiệm ~${_formatPrice(pkg.laborSavingsPerPerson)}/người khi thêm trong combo',
                style: TextStyle(fontSize: 11.sp, color: c.success, height: 1.35),
              ),
            ],
            SizedBox(height: 14.h),
            SmoothCtaButton(
              label: selected ? 'Đã chọn combo' : 'Chọn combo này',
              showArrow: false,
              outlined: !selected,
              onPressed: () => context.read<BookingFlowCubit>().selectTier(pkg.tier),
            ),
          ],
        ),
      ),
    );
  }

  Widget _laborChip(UniMoveColors c, String text) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: c.success.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8.r),
        border: Border.all(color: c.success.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.groups_outlined, size: 16.sp, color: c.success),
          SizedBox(width: 6.w),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600, color: c.success),
            ),
          ),
        ],
      ),
    );
  }

  Widget _extraLaborButton(
    BuildContext context,
    UniMoveColors c, {
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: Material(
        color: selected ? c.primary.withValues(alpha: 0.12) : c.chipBg,
        borderRadius: BorderRadius.circular(10.r),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10.r),
          child: Container(
            padding: EdgeInsets.symmetric(vertical: 8.h, horizontal: 4.w),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10.r),
              border: Border.all(color: selected ? c.primary : c.border),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10.sp,
                fontWeight: FontWeight.w600,
                color: selected ? c.primary : c.onSurfaceMuted,
                height: 1.2,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _badge(String text, ServiceTier tier, UniMoveColors c) {
    final color = switch (tier) {
      ServiceTier.economy => c.chipBg,
      ServiceTier.standard => c.primary.withValues(alpha: 0.12),
      ServiceTier.premium => c.success.withValues(alpha: 0.15),
    };
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99.r)),
      child: Text(
        text,
        style: TextStyle(fontSize: 11.sp, fontWeight: FontWeight.w700, color: c.primary),
      ),
    );
  }

  Widget _benefitRow(IconData icon, String text, UniMoveColors c) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: c.primary, size: 20.sp),
          SizedBox(width: 10.w),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w500, color: c.onSurface),
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

class _QuickRouteCard extends StatelessWidget {
  const _QuickRouteCard({
    required this.pickup,
    required this.destination,
    required this.colors,
    required this.onEdit,
  });

  final String pickup;
  final String destination;
  final UniMoveColors colors;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Material(
      color: c.primaryContainer.withValues(alpha: 0.35),
      borderRadius: BorderRadius.circular(14.r),
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(14.r),
        child: Padding(
          padding: EdgeInsets.all(14.w),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.alt_route, color: c.primary, size: 22.sp),
              SizedBox(width: 10.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tuyến mẫu',
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontWeight: FontWeight.w700,
                        color: c.primary,
                      ),
                    ),
                    SizedBox(height: 6.h),
                    Text(
                      pickup,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13.sp, color: c.onSurface),
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      destination,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13.sp, color: c.onSurfaceMuted),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: onEdit,
                child: const Text('Sửa'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
