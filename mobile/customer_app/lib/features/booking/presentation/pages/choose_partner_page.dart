import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/booking_scaffold.dart';
import '../../../../core/widgets/cached_hero_image.dart';
import '../../domain/booking_models.dart';
import '../cubit/booking_flow_cubit.dart';
import '../cubit/booking_flow_state.dart';

class ChoosePartnerPage extends StatefulWidget {
  const ChoosePartnerPage({super.key});

  @override
  State<ChoosePartnerPage> createState() => _ChoosePartnerPageState();
}

class _ChoosePartnerPageState extends State<ChoosePartnerPage> {
  int _filterIndex = 0;

  @override
  void initState() {
    super.initState();
    context.read<BookingFlowCubit>().loadPartners();
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return BlocBuilder<BookingFlowCubit, BookingFlowState>(
      builder: (context, state) {
        final partners = _applySort(state.partners);
        return BookingScaffold(
          title: 'Chọn nhà xe',
          trailing: IconButton(icon: const Icon(Icons.tune), onPressed: () {}),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(height: 8.h),
              _filterChips(c),
              SizedBox(height: 12.h),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 20.w),
                child: Container(
                  padding: EdgeInsets.all(14.w),
                  decoration: BoxDecoration(
                    color: c.chipBg,
                    borderRadius: BorderRadius.circular(14.r),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.verified, color: c.primary, size: 22.sp),
                      SizedBox(width: 10.w),
                      Expanded(
                        child: Text(
                          'Marketplace · Nhiều nhà xe đã xác minh · Giá do đối tác báo',
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w600,
                            color: c.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: 12.h),
              Expanded(
                child: state.loadingPartners
                    ? ListView.builder(
                        padding: EdgeInsets.symmetric(horizontal: 20.w),
                        itemCount: 3,
                        itemBuilder: (_, __) => _partnerShimmer(c),
                      )
                    : ListView.builder(
                        padding: EdgeInsets.fromLTRB(20.w, 0, 20.w, 24.h),
                        itemCount: partners.length,
                        itemBuilder: (context, index) {
                          final p = partners[index];
                          return _partnerCard(context, state, p, c);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _filterChips(UniMoveColors c) {
    const labels = ['Giá rẻ nhất', 'Đánh giá cao', 'Gần nhất'];
    return SizedBox(
      height: 40.h,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        itemCount: labels.length,
        separatorBuilder: (_, __) => SizedBox(width: 8.w),
        itemBuilder: (context, i) {
          final active = i == _filterIndex;
          return GestureDetector(
            onTap: () => setState(() => _filterIndex = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: active ? c.primary : c.surface,
                borderRadius: BorderRadius.circular(20.r),
                border: Border.all(color: active ? c.primary : c.border),
              ),
              child: Text(
                labels[i],
                style: TextStyle(
                  color: active ? Colors.white : c.onSurface,
                  fontWeight: FontWeight.w600,
                  fontSize: 13.sp,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _partnerCard(BuildContext context, BookingFlowState state, PartnerOffer p, UniMoveColors c) {
    return Padding(
      padding: EdgeInsets.only(bottom: 16.h),
      child: Material(
        color: c.surface,
        borderRadius: BorderRadius.circular(20.r),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                CachedHeroImage(url: p.imageUrl, height: 160.h, borderRadius: BorderRadius.zero),
                Positioned(
                  top: 12.h,
                  right: 12.w,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(8.r),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.star, color: Colors.amber, size: 14.sp),
                        SizedBox(width: 4.w),
                        Text(
                          '${p.rating}',
                          style: TextStyle(color: Colors.white, fontSize: 12.sp, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: EdgeInsets.all(14.w),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.name,
                          style: TextStyle(fontSize: 17.sp, fontWeight: FontWeight.w700, color: c.onSurface),
                        ),
                        SizedBox(height: 4.h),
                        Text(
                          'Cách bạn ${p.distanceKm} km · ${p.vehicleLabel}',
                          style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted),
                        ),
                        SizedBox(height: 4.h),
                        Row(
                          children: [
                            Icon(Icons.star_rounded, size: 15.sp, color: Colors.amber.shade700),
                            SizedBox(width: 4.w),
                            Text(
                              '${p.rating.toStringAsFixed(1)} (${p.reviewCount} đánh giá)',
                              style: TextStyle(
                                fontSize: 12.sp,
                                color: c.onSurface,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('GIÁ KHỞI ĐIỂM', style: TextStyle(fontSize: 10.sp, color: c.onSurfaceMuted)),
                      Text(
                        _formatPrice(p.price),
                        style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w800, color: c.primary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(14.w, 0, 14.w, 8.h),
              child: OutlinedButton.icon(
                onPressed: () => _showReviewsSheet(context, p, c),
                icon: const Icon(Icons.reviews_outlined),
                label: const Text('Xem đánh giá nhà xe'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: c.primary,
                  side: BorderSide(color: c.primary.withValues(alpha: 0.38)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(14.w, 0, 14.w, 14.h),
              child: SizedBox(
                width: double.infinity,
                height: 44.h,
                child: ElevatedButton(
                  onPressed: () {
                    context.read<BookingFlowCubit>().selectPartner(p.id);
                    context.push('/booking/insurance');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: c.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                  ),
                  child: Text('Chọn', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15.sp)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _partnerShimmer(UniMoveColors c) {
    return Padding(
      padding: EdgeInsets.only(bottom: 16.h),
      child: Shimmer.fromColors(
        baseColor: c.surfaceTint,
        highlightColor: c.surface,
        child: Container(
          height: 260.h,
          decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(20.r)),
        ),
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
    return '$buf' 'đ';
  }

  List<PartnerOffer> _applySort(List<PartnerOffer> partners) {
    final list = [...partners];
    switch (_filterIndex) {
      case 0:
        list.sort((a, b) => a.price.compareTo(b.price));
        break;
      case 1:
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case 2:
        list.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
        break;
    }
    return list;
  }

  Future<void> _showReviewsSheet(BuildContext context, PartnerOffer p, UniMoveColors c) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (ctx) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(18.w, 12.h, 18.w, 18.h),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 44.w,
                    height: 5.h,
                    decoration: BoxDecoration(
                      color: c.border,
                      borderRadius: BorderRadius.circular(999.r),
                    ),
                  ),
                ),
                SizedBox(height: 14.h),
                Text(
                  p.name,
                  style: TextStyle(
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w800,
                    color: c.onSurface,
                  ),
                ),
                SizedBox(height: 8.h),
                Wrap(
                  spacing: 8.w,
                  runSpacing: 8.h,
                  children: [
                    _metaChip(c, Icons.star_rounded, '${p.rating.toStringAsFixed(1)} điểm'),
                    _metaChip(c, Icons.rate_review_outlined, '${p.reviewCount} đánh giá'),
                    _metaChip(c, Icons.local_shipping_outlined, '${p.completedTrips} chuyến'),
                  ],
                ),
                SizedBox(height: 12.h),
                SizedBox(
                  height: 260.h,
                  child: ListView.separated(
                    itemCount: p.recentReviews.length,
                    separatorBuilder: (_, __) => Divider(height: 18.h, color: c.border),
                    itemBuilder: (_, index) {
                      final review = p.recentReviews[index];
                      return _reviewItem(c, review);
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _metaChip(UniMoveColors c, IconData icon, String label) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: c.chipBg,
        borderRadius: BorderRadius.circular(999.r),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14.sp, color: c.primary),
          SizedBox(width: 6.w),
          Text(
            label,
            style: TextStyle(
              fontSize: 12.sp,
              fontWeight: FontWeight.w700,
              color: c.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _reviewItem(UniMoveColors c, ProviderReview review) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 13.r,
              backgroundColor: c.iconBgSecondary,
              child: Text(
                review.author.substring(0, 1).toUpperCase(),
                style: TextStyle(
                  fontSize: 11.sp,
                  fontWeight: FontWeight.w700,
                  color: c.primary,
                ),
              ),
            ),
            SizedBox(width: 8.w),
            Expanded(
              child: Text(
                review.author,
                style: TextStyle(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w700,
                  color: c.onSurface,
                ),
              ),
            ),
            Icon(Icons.star_rounded, size: 14.sp, color: Colors.amber.shade700),
            SizedBox(width: 2.w),
            Text(
              review.rating.toStringAsFixed(1),
              style: TextStyle(fontSize: 12.sp, fontWeight: FontWeight.w700, color: c.onSurface),
            ),
          ],
        ),
        SizedBox(height: 6.h),
        Text(
          review.comment,
          style: TextStyle(
            fontSize: 13.sp,
            height: 1.35,
            color: c.onSurface,
          ),
        ),
        SizedBox(height: 4.h),
        Text(
          review.timeAgoLabel,
          style: TextStyle(
            fontSize: 11.sp,
            fontWeight: FontWeight.w600,
            color: c.onSurfaceMuted,
          ),
        ),
      ],
    );
  }
}
