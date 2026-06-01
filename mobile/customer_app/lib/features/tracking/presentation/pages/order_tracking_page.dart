import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/constants/app_images.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../../../core/widgets/uni_surface_card.dart';
import '../../../chat/domain/active_chat_context.dart';
import '../../../orders/data/customer_orders_repository.dart';
import '../../../orders/domain/order_models.dart';

class OrderTrackingPage extends StatefulWidget {
  const OrderTrackingPage({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderTrackingPage> createState() => _OrderTrackingPageState();
}

class _OrderTrackingPageState extends State<OrderTrackingPage> {
  final _repo = CustomerOrdersRepository();
  TrackingSnapshot? _tracking;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final t = await _repo.fetchTracking(widget.orderId);
    if (mounted) setState(() {
      _tracking = t;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    if (_loading) {
      return Scaffold(
        backgroundColor: c.background,
        body: Center(child: CircularProgressIndicator(color: c.primary)),
      );
    }

    final t = _tracking!;
    final order = t.order;

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: c.onSurface, size: 20.sp),
          onPressed: () => context.pop(),
        ),
        title: Text('UniMove', style: TextStyle(color: c.primary, fontWeight: FontWeight.w800, fontSize: 20.sp)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: c.primary),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 45,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CachedNetworkImage(
                  imageUrl: AppImages.mapPreview,
                  fit: BoxFit.cover,
                  memCacheWidth: 900,
                ),
                Positioned(
                  top: 16.h,
                  left: 16.w,
                  right: 16.w,
                  child: UniSurfaceCard(
                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                    child: Row(
                      children: [
                        Icon(Icons.schedule, color: c.primary, size: 20.sp),
                        SizedBox(width: 10.w),
                        Expanded(
                          child: RichText(
                            text: TextSpan(
                              style: TextStyle(fontSize: 13.sp, color: c.onSurface),
                              children: [
                                const TextSpan(text: 'Dự kiến đến trong '),
                                TextSpan(
                                  text: '${t.etaMinutes} phút',
                                  style: TextStyle(fontWeight: FontWeight.w800, color: c.primary),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Text(
                          'Khoảng cách ${t.distanceKm} km',
                          style: TextStyle(fontSize: 11.sp, color: c.onSurfaceMuted),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(duration: 300.ms),
                ),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.local_shipping_rounded, color: c.primary, size: 36.sp),
                      SizedBox(height: 6.h),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                        decoration: BoxDecoration(
                          color: c.surface,
                          borderRadius: BorderRadius.circular(8.r),
                          boxShadow: [
                            BoxShadow(color: c.navBarShadow, blurRadius: 8, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: Text(
                          '${order.providerName ?? 'Tài xế'} is here',
                          style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 55,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24.r)),
                boxShadow: [
                  BoxShadow(color: c.navBarShadow, blurRadius: 16, offset: const Offset(0, -4)),
                ],
              ),
              child: ListView(
                padding: EdgeInsets.fromLTRB(20.w, 20.h, 20.w, 24.h),
                children: [
                  Row(
                    children: [
                      Text(
                        'Tài xế đang đến',
                        style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w800, color: c.onSurface),
                      ),
                      const Spacer(),
                      ShadBadge(
                        child: Text(t.statusLabel, style: const TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                  SizedBox(height: 20.h),
                  _TrackingStepper(steps: t.steps, colors: c),
                  SizedBox(height: 20.h),
                  UniSurfaceCard(
                    child: Row(
                      children: [
                        Stack(
                          children: [
                            CircleAvatar(
                              radius: 28.r,
                              backgroundImage: order.providerAvatarUrl != null
                                  ? NetworkImage(order.providerAvatarUrl!)
                                  : null,
                              child: order.providerAvatarUrl == null
                                  ? Icon(Icons.person, color: c.primary)
                                  : null,
                            ),
                            Positioned(
                              right: 0,
                              bottom: 0,
                              child: Container(
                                width: 14.w,
                                height: 14.w,
                                decoration: BoxDecoration(
                                  color: c.accentGreen,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: c.surface, width: 2),
                                ),
                                child: Icon(Icons.check, size: 8.sp, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    order.providerName ?? 'Tài xế',
                                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16.sp),
                                  ),
                                  SizedBox(width: 6.w),
                                  Icon(Icons.star, color: Colors.amber, size: 16.sp),
                                  Text(
                                    '${order.providerRating ?? 4.9}',
                                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.sp),
                                  ),
                                ],
                              ),
                              Text(
                                '${order.vehicleLabel} • BKS ${order.providerPlate ?? ''}',
                                style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 16.h),
                  Row(
                    children: [
                      Expanded(
                        child: PressableScale(
                          onTap: () {},
                          child: _actionBtn(Icons.call, 'Gọi điện', c.primary, AppColors.onPrimary),
                        ),
                      ),
                      SizedBox(width: 12.w),
                      Expanded(
                        child: PressableScale(
                          onTap: () {
                            if (ActiveChatContext.orderAllowsChat(order) &&
                                order.conversationId != null) {
                              context.push('/chat/${order.conversationId}');
                            }
                          },
                          child: _actionBtn(
                            Icons.chat_bubble_outline,
                            'Nhắn tin',
                            c.primaryContainer,
                            c.primary,
                            outlined: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label, Color bg, Color fg, {bool outlined = false}) {
    return Container(
      height: 48.h,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: outlined ? Colors.transparent : bg,
        borderRadius: BorderRadius.circular(14.r),
        border: outlined ? Border.all(color: fg, width: 1.5) : null,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: fg, size: 20.sp),
          SizedBox(width: 8.w),
          Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 14.sp)),
        ],
      ),
    );
  }
}

class _TrackingStepper extends StatelessWidget {
  const _TrackingStepper({required this.steps, required this.colors});

  final List<TrackingStep> steps;
  final UniMoveColors colors;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                color: steps[i].done || steps[i].active ? colors.primary : colors.border,
              ),
            ),
          _stepDot(steps[i]),
        ],
      ],
    );
  }

  Widget _stepDot(TrackingStep step) {
    final active = step.active;
    final done = step.done;
    return Column(
      children: [
        Container(
          width: 32.w,
          height: 32.w,
          decoration: BoxDecoration(
            color: active || done ? colors.primary : colors.surfaceTint,
            shape: BoxShape.circle,
          ),
          child: Icon(
            done
                ? Icons.check
                : step.key == 'coming'
                    ? Icons.navigation_rounded
                    : step.key == 'moving'
                        ? Icons.local_shipping_outlined
                        : Icons.location_on_outlined,
            color: active || done ? AppColors.onPrimary : colors.onSurfaceMuted,
            size: 16.sp,
          ),
        ),
        SizedBox(height: 6.h),
        Text(
          step.label,
          style: TextStyle(
            fontSize: 10.sp,
            fontWeight: FontWeight.w600,
            color: active ? colors.primary : colors.onSurfaceMuted,
          ),
        ),
      ],
    );
  }
}
