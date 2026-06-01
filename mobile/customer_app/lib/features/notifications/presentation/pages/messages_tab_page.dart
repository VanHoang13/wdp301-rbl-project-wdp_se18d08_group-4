import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../data/notifications_repository.dart';
import '../../domain/notification_models.dart';
import 'notification_detail_page.dart';
/// Tab Tin nhắn — thông báo ưu đãi / voucher / hệ thống (Grab-style).
class MessagesTabPage extends StatefulWidget {
  const MessagesTabPage({super.key});

  @override
  State<MessagesTabPage> createState() => _MessagesTabPageState();
}

class _MessagesTabPageState extends State<MessagesTabPage> {
  final _repo = NotificationsRepository();
  List<AppNotification> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final items = await _repo.fetchInbox();
    if (mounted) {
      setState(() {
        _items = items;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);

    if (_loading) {
      return Center(child: CircularProgressIndicator(color: c.primary));
    }

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, 8.h),
            child: Text(
              'Tin nhắn',
              style: theme.textTheme.h2.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(
            child: _items.isEmpty
                ? _emptyState(c)
                : RefreshIndicator(
                    color: c.primary,
                    onRefresh: _load,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      padding: EdgeInsets.fromLTRB(12.w, 0, 12.w, 120.h),
                      itemCount: _items.length,
                      separatorBuilder: (_, __) => Divider(height: 1, color: c.glassBorder),
                      itemBuilder: (context, i) {
                        final n = _items[i];
                        return _NotificationTile(
                          notification: n,
                          onTap: () async {
                            await Navigator.of(context, rootNavigator: true).push<void>(
                              MaterialPageRoute(
                                builder: (_) => NotificationDetailPage(notificationId: n.id),
                              ),
                            );
                            if (mounted) _load();
                          },
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState(UniMoveColors c) {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(32.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none_rounded, size: 56.sp, color: c.onSurfaceMuted),
            SizedBox(height: 16.h),
            Text(
              'Chưa có thông báo',
              style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w700, color: c.onSurface),
            ),
            SizedBox(height: 8.h),
            Text(
              'Ưu đãi và quà tặng sẽ hiện ở đây.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14.sp, color: c.onSurfaceMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    if (now.difference(dt).inDays == 0) {
      final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final suffix = dt.hour >= 12 ? 'CH' : 'SA';
      return '$h:${dt.minute.toString().padLeft(2, '0')} $suffix';
    }
    if (now.difference(dt).inDays < 7) {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return days[dt.weekday % 7];
    }
    return '${dt.day}/${dt.month}';
  }

  IconData _iconFor(String? key) => switch (key) {
        'gift' => Icons.card_giftcard_rounded,
        'star' => Icons.star_rounded,
        'ticket' => Icons.confirmation_number_outlined,
        'bell' => Icons.notifications_rounded,
        _ => Icons.local_offer_outlined,
      };

  Color _iconColor(AppNotificationType type, UniMoveColors c) => switch (type) {
        AppNotificationType.promotion => c.primaryLight,
        AppNotificationType.systemAnnouncement => c.primary,
        _ => c.onSurfaceMuted,
      };

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final n = notification;
    final unread = !n.isRead;
    final isPromo = n.type == AppNotificationType.promotion;
    final title = isPromo ? 'Ưu đãi UniMove' : n.title;
    final preview = isPromo ? (n.subtitle ?? n.preview) : n.preview;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14.r),
        splashColor: c.primary.withValues(alpha: 0.08),
        highlightColor: c.primary.withValues(alpha: 0.04),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 14.h),
          child: Row(
            children: [
              Container(
                width: 48.w,
                height: 48.w,
                decoration: BoxDecoration(
                  color: isPromo
                      ? AppColors.accentOrange.withValues(alpha: 0.18)
                      : _iconColor(n.type, c).withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isPromo ? Icons.local_offer_rounded : _iconFor(n.icon),
                  color: isPromo ? AppColors.accentOrange : _iconColor(n.type, c),
                  size: 24.sp,
                ),
              ),
              SizedBox(width: 12.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: unread ? FontWeight.w800 : FontWeight.w600,
                              fontSize: 15.sp,
                              color: c.onSurface,
                            ),
                          ),
                        ),
                        if (isPromo) ...[
                          SizedBox(width: 4.w),
                          Icon(Icons.verified, color: AppColors.primary, size: 16.sp),
                        ],
                      ],
                    ),
                    SizedBox(height: 4.h),
                    Text(
                      preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13.sp, color: c.onSurfaceMuted),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 8.w),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    _formatTime(n.createdAt),
                    style: TextStyle(fontSize: 12.sp, color: c.onSurfaceMuted),
                  ),
                  if (unread) ...[
                    SizedBox(height: 6.h),
                    Container(
                      width: 10.w,
                      height: 10.w,
                      decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
