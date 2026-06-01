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

        return BookingScaffold(
          title: 'Gói dịch vụ',
          body: ListView(
            padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 120.h),
            children: [
              Text(
                'Lựa chọn giải pháp\ntối ưu cho bạn',
                style: TextStyle(
                  fontSize: 26.sp,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                  color: c.onSurface,
                ),
              ),
              SizedBox(height: 8.h),
              Text(
                'Các gói linh hoạt, minh bạch — phù hợp ngân sách sinh viên.',
                style: TextStyle(fontSize: 14.sp, color: c.onSurfaceMuted, height: 1.4),
              ),
              SizedBox(height: 20.h),
              ...state.packages.map((p) => _packageCard(context, state, p, c)),
              SizedBox(height: 24.h),
              Text(
                'Tại sao nên chọn UniMove?',
                style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w700, color: c.onSurface),
              ),
              SizedBox(height: 12.h),
              _benefitRow(Icons.verified_user_outlined, 'Đảm bảo an toàn', c),
              _benefitRow(Icons.schedule, 'Đúng giờ 99%', c),
              _benefitRow(Icons.payments_outlined, 'Giá không đổi', c),
              _benefitRow(Icons.support_agent, 'Hỗ trợ 24/7', c),
              SizedBox(height: 16.h),
              CachedHeroImage(url: AppImages.moversPhoto, height: 180.h),
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ĐÃ CHỌN: ${selected?.label.toUpperCase() ?? 'STANDARD'}',
                        style: TextStyle(
                          fontSize: 11.sp,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: c.onSurfaceMuted,
                        ),
                      ),
                      Text(
                        _formatPrice(selected?.price ?? 450000),
                        style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w800, color: c.primary),
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),
                  SmoothCtaButton(
                    label: 'Tiếp tục thanh toán',
                    onPressed: () => context.push('/booking/partners'),
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
    return Padding(
      padding: EdgeInsets.only(bottom: 14.h),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.all(18.w),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(
            color: selected ? c.primary : c.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (pkg.popular)
              Container(
                margin: EdgeInsets.only(bottom: 8.h),
                padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
                decoration: BoxDecoration(
                  color: c.primary,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(8.r)),
                ),
                child: Text(
                  'PHỔ BIẾN NHẤT',
                  style: TextStyle(color: Colors.white, fontSize: 10.sp, fontWeight: FontWeight.w700),
                ),
              ),
            Row(
              children: [
                _badge(pkg.badge, pkg.tier, c),
                const Spacer(),
                Text(
                  _formatPrice(pkg.price),
                  style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w800, color: c.primary),
                ),
                Text(' /lượt', style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted)),
              ],
            ),
            SizedBox(height: 8.h),
            Text(pkg.label, style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w700, color: c.onSurface)),
            SizedBox(height: 12.h),
            ...pkg.features.map(
              (f) => Padding(
                padding: EdgeInsets.only(bottom: 6.h),
                child: Row(
                  children: [
                    Icon(
                      f.included ? Icons.check_circle : Icons.cancel_outlined,
                      size: 18.sp,
                      color: f.included ? c.success : c.onSurfaceMuted,
                    ),
                    SizedBox(width: 8.w),
                    Expanded(
                      child: Text(f.text, style: TextStyle(fontSize: 13.sp, color: c.onSurface)),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 12.h),
            SmoothCtaButton(
              label: 'Chọn gói này',
              showArrow: false,
              outlined: !selected,
              onPressed: () => context.read<BookingFlowCubit>().selectTier(pkg.tier),
            ),
          ],
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
        children: [
          Icon(icon, color: c.primary, size: 20.sp),
          SizedBox(width: 10.w),
          Text(text, style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w500, color: c.onSurface)),
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
