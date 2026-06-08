import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/dev/dev_session_bootstrap.dart';
import '../../../../core/mock/mock_provider_data.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../documents/presentation/providers/documents_providers.dart';
import '../../../notifications/presentation/providers/notifications_providers.dart';
import '../../../orders/domain/provider_order.dart';
import '../../../orders/presentation/providers/orders_providers.dart';

class ProviderDashboardPage extends ConsumerStatefulWidget {
  const ProviderDashboardPage({super.key});

  @override
  ConsumerState<ProviderDashboardPage> createState() => _ProviderDashboardPageState();
}

class _ProviderDashboardPageState extends ConsumerState<ProviderDashboardPage> {
  bool _online = true;

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(providerProfileProvider);
    final ordersAsync = ref.watch(providerOrdersListProvider);
    final verification = ref.watch(providerVerificationProvider).asData?.value;
    final canGoOnline = verification?.canGoOnline ?? false;
    final unreadNotifications = ref.watch(providerUnreadNotificationsProvider).asData?.value ?? 0;
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: profileAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Lỗi: $e', textAlign: TextAlign.center, style: TextStyle(color: c.onSurface)),
                    const SizedBox(height: 16),
                    ShadButton(
                      onPressed: () async {
                        await DevSessionBootstrap.apply();
                        ref.invalidate(providerProfileProvider);
                        ref.invalidate(providerOrdersListProvider);
                      },
                      child: const Text('Thử lại (phiên demo)'),
                    ),
                    const SizedBox(height: 8),
                    ShadButton.outline(
                      onPressed: () => context.go('/login'),
                      child: const Text('Đăng nhập lại'),
                    ),
                  ],
                ),
              ),
            ),
            data: (profile) {
              final orders = ordersAsync.asData?.value ?? const <ProviderOrder>[];
              final completed = orders.where((o) => o.isCompleted).toList();
              final active = orders.where((o) => o.isActive).toList();
              final pending = orders.where((o) => o.isPending).toList();
              final earnings = completed.fold<int>(0, (s, o) => s + o.netEarnings);

              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(providerProfileProvider);
                  ref.invalidate(providerOrdersListProvider);
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  children: [
                    _header(
                      theme,
                      c,
                      profile?.fullName ?? 'Đối tác',
                      profile?.businessName,
                      unreadNotifications,
                    ),
                    if (!canGoOnline) ...[
                      const SizedBox(height: 12),
                      _kycBanner(theme, c, verification?.kycStatus.label ?? 'Chưa xác thực'),
                    ],
                    const SizedBox(height: 16),
                    _onlineCard(theme, c, canGoOnline: canGoOnline),
                    const SizedBox(height: 16),
                    _earningsHero(theme, c, earnings, completed.length),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _statCard(theme, c, LucideIcons.circleCheck, '${completed.length}',
                              'Chuyến hoàn thành', c.success),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _statCard(theme, c, LucideIcons.star,
                              '${profile?.rating ?? 0}', 'Đánh giá', c.primary),
                        ),
                      ],
                    ),
                    if (active.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      _sectionTitle(theme, c, 'Đơn đang thực hiện'),
                      const SizedBox(height: 10),
                      _activeOrderCard(theme, c, active.first),
                    ],
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(child: _sectionTitle(theme, c, 'Đơn mới')),
                        GestureDetector(
                          onTap: () => context.push('/orders'),
                          child: Text(
                            '${pending.length} chờ nhận',
                            style: theme.textTheme.small.copyWith(
                              color: c.primaryLight,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (pending.isEmpty)
                      _emptyRequests(theme, c)
                    else
                      ...pending.map((o) => _requestCard(theme, c, o)),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  // ---------- Header ----------
  Widget _header(
    ShadThemeData theme,
    UniMoveColors c,
    String name,
    String? business,
    int unreadNotifications,
  ) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'P';
    return Row(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [c.primary, c.primaryLight]),
            borderRadius: BorderRadius.circular(14),
          ),
          alignment: Alignment.center,
          child: Text(initial, style: theme.textTheme.h4.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Xin chào,', style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
              ),
            ],
          ),
        ),
        _notificationButton(c, unreadNotifications),
      ],
    );
  }

  Widget _notificationButton(UniMoveColors c, int unread) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        _iconButton(c, LucideIcons.bell, () => context.push('/notifications')),
        if (unread > 0)
          Positioned(
            right: 2,
            top: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: c.surface, width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                unread > 9 ? '9+' : '$unread',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _iconButton(UniMoveColors c, IconData icon, VoidCallback onTap) {
    return Material(
      color: c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: c.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, color: c.onSurface, size: 20),
        ),
      ),
    );
  }

  Widget _kycBanner(ShadThemeData theme, UniMoveColors c, String statusLabel) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push('/documents'),
        borderRadius: BorderRadius.circular(16),
        child: GlassCard(
          padding: const EdgeInsets.all(14),
          radius: 16,
          child: Row(
            children: [
              Icon(LucideIcons.shieldAlert, color: Colors.orange.shade700, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hoàn tất xác thực giấy tờ',
                      style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                    ),
                    Text(
                      '$statusLabel · Nhấn để nộp hồ sơ',
                      style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                    ),
                  ],
                ),
              ),
              Icon(LucideIcons.chevronRight, color: c.onSurfaceMuted, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  // ---------- Online toggle ----------
  Widget _onlineCard(ShadThemeData theme, UniMoveColors c, {required bool canGoOnline}) {
    final effectiveOnline = canGoOnline && _online;
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      radius: 18,
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: effectiveOnline ? c.success : c.onSurfaceMuted,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  effectiveOnline ? 'Đang nhận đơn' : 'Đang nghỉ',
                  style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
                ),
                Text(
                  canGoOnline
                      ? (effectiveOnline ? 'Khách có thể thấy và đặt bạn' : 'Bạn sẽ không nhận đơn mới')
                      : 'Cần xác thực giấy tờ trước khi nhận đơn',
                  style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: effectiveOnline,
            activeThumbColor: c.primary,
            onChanged: canGoOnline
                ? (v) {
                    setState(() => _online = v);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(v ? 'Đã bật nhận đơn' : 'Đã tạm nghỉ')),
                    );
                  }
                : (_) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Hoàn tất xác thực giấy tờ để bật nhận đơn')),
                    );
                    context.push('/documents');
                  },
          ),
        ],
      ),
    );
  }

  // ---------- Earnings hero ----------
  Widget _earningsHero(ShadThemeData theme, UniMoveColors c, int earnings, int trips) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push('/earnings/history'),
        borderRadius: BorderRadius.circular(22),
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [c.primary, c.primaryLight],
            ),
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(color: c.primary.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 10)),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.wallet, color: Colors.white70, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'TỔNG THU NHẬP',
                      style: theme.textTheme.small.copyWith(
                        color: Colors.white70,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Xem tất cả',
                            style: theme.textTheme.small.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(Icons.chevron_right, color: Colors.white, size: 18),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  _money(earnings),
                  style: theme.textTheme.h1.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Từ $trips chuyến hoàn thành · chạm để xem lịch sử',
                  style: theme.textTheme.small.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _statCard(ShadThemeData theme, UniMoveColors c, IconData icon, String value, String label, Color tint) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      radius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: tint.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 20, color: tint),
          ),
          const SizedBox(height: 10),
          Text(value, style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface)),
          Text(label, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
        ],
      ),
    );
  }

  Widget _sectionTitle(ShadThemeData theme, UniMoveColors c, String text) {
    return Text(text, style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w800, color: c.onSurface));
  }

  // ---------- Active order ----------
  Widget _activeOrderCard(ShadThemeData theme, UniMoveColors c, ProviderOrder o) {
    final customer = MockProviderData.customerNameOf(o.customerId);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => context.push('/orders/${o.id}'),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [c.primaryLight, c.primary],
            ),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.truck, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '#${o.orderNumber ?? o.id} · $customer',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.p.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.22),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(o.statusLabel, style: theme.textTheme.small.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _routeLine(theme, LucideIcons.circleDot, 'Điểm lấy', o.pickupAddress),
              const SizedBox(height: 8),
              _routeLine(theme, LucideIcons.mapPin, 'Điểm giao', o.deliveryAddress),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: c.primary,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => context.push('/orders/${o.id}/tracking'),
                      child: const Text('Theo dõi GPS', style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white70),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => context.push('/orders/${o.id}'),
                      child: const Text('Chi tiết', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _routeLine(ShadThemeData theme, IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.white70, size: 16),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.small.copyWith(color: Colors.white60)),
              Text(
                value,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.small.copyWith(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ---------- Request card ----------
  Widget _requestCard(ShadThemeData theme, UniMoveColors c, ProviderOrder o) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => context.push('/orders/${o.id}'),
          child: GlassCard(
            padding: const EdgeInsets.all(16),
            radius: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: c.chipBg, borderRadius: BorderRadius.circular(20)),
                      child: Text(
                        'Gói ${o.serviceLabel}',
                        style: theme.textTheme.small.copyWith(color: c.primaryLight, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _money(o.totalPrice),
                      style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w800, color: c.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _reqRow(theme, c, LucideIcons.circleDot, o.pickupAddress),
                const SizedBox(height: 6),
                _reqRow(theme, c, LucideIcons.mapPin, o.deliveryAddress),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _reqRow(ShadThemeData theme, UniMoveColors c, IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: c.onSurfaceMuted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.small.copyWith(color: c.onSurface),
          ),
        ),
      ],
    );
  }

  Widget _emptyRequests(ShadThemeData theme, UniMoveColors c) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      radius: 18,
      child: Row(
        children: [
          Icon(LucideIcons.inbox, color: c.onSurfaceMuted),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Chưa có đơn mới. Bật "Đang nhận đơn" để nhận yêu cầu.',
              style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  static String _money(int amount) {
    if (amount <= 0) return '0đ';
    final s = amount.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    buf.write('đ');
    return buf.toString();
  }
}
