import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/config/api_config.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../orders/domain/provider_order.dart';
import '../../../orders/presentation/providers/orders_providers.dart';

class ProviderDashboardPage extends ConsumerWidget {
  const ProviderDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(providerProfileProvider);
    final ordersAsync = ref.watch(providerOrdersListProvider);
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: profileAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Lỗi: $e', style: TextStyle(color: c.onSurface))),
            data: (profile) {
              final verified = profile?.isVerified ?? false;
              return RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(providerProfileProvider);
                  ref.invalidate(providerOrdersListProvider);
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Xin chào,',
                                style: theme.textTheme.muted.copyWith(color: c.onSurfaceMuted),
                              ),
                              Text(
                                profile?.fullName ?? 'Partner',
                                style: theme.textTheme.h3.copyWith(
                                  color: c.onSurface,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if ((profile?.businessName ?? '').isNotEmpty)
                                Text(
                                  profile!.businessName!,
                                  style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                                ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: verified ? c.iconBgTertiary : c.chipBg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: c.border),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                verified ? LucideIcons.badgeCheck : LucideIcons.clock,
                                size: 16,
                                color: verified ? c.success : c.primaryLight,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                verified ? 'Đã xác thực' : 'Chờ duyệt',
                                style: theme.textTheme.small.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: c.onSurface,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(child: _StatCard(label: 'Đánh giá', value: '${profile?.rating ?? 0}', icon: LucideIcons.star)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ordersAsync.when(
                            data: (orders) => _StatCard(
                              label: 'Đơn tháng',
                              value: '${_ordersThisMonth(orders)}',
                              icon: LucideIcons.package,
                            ),
                            loading: () => const _StatCard(label: 'Đơn tháng', value: '…', icon: LucideIcons.package),
                            error: (_, __) => const _StatCard(label: 'Đơn tháng', value: '—', icon: LucideIcons.package),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ordersAsync.when(
                            data: (orders) => _StatCard(
                              label: 'Thu nhập',
                              value: _formatEarnings(_completedEarnings(orders)),
                              icon: LucideIcons.wallet,
                            ),
                            loading: () => const _StatCard(label: 'Thu nhập', value: '…', icon: LucideIcons.wallet),
                            error: (_, __) => const _StatCard(label: 'Thu nhập', value: '—', icon: LucideIcons.wallet),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text('Thao tác nhanh', style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                    const SizedBox(height: 12),
                    _QuickAction(
                      icon: LucideIcons.inbox,
                      title: 'Hộp thư đơn hàng',
                      subtitle: 'Nhận hoặc từ chối đơn mới',
                      onTap: () => context.push('/orders'),
                    ),
                    const SizedBox(height: 10),
                    _QuickAction(
                      icon: LucideIcons.fileUp,
                      title: 'Giấy tờ đối tác',
                      subtitle: 'GPLX, đăng ký xe, bảo hiểm',
                      onTap: () => context.push('/documents'),
                    ),
                    const SizedBox(height: 10),
                    _QuickAction(
                      icon: LucideIcons.messageCircle,
                      title: 'Tin nhắn khách',
                      subtitle: 'Chat theo đơn — sắp có',
                      onTap: () {},
                    ),
                    const SizedBox(height: 20),
                    GlassCard(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(LucideIcons.info, color: c.primaryLight, size: 20),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Backend API: ${ApiConfig.baseUrl}\nĐăng nhập tài khoản role provider.',
                              style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);

    return GlassCard(
      padding: const EdgeInsets.all(14),
      radius: 16,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: c.primary),
          const SizedBox(height: 8),
          Text(value, style: theme.textTheme.h4.copyWith(fontWeight: FontWeight.w800, color: c.onSurface)),
          Text(label, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
        ],
      ),
    );
  }
}

int _ordersThisMonth(List<ProviderOrder> orders) {
  final now = DateTime.now();
  return orders.where((o) {
    final d = o.createdAt;
    return d != null && d.year == now.year && d.month == now.month;
  }).length;
}

int _completedEarnings(List<ProviderOrder> orders) {
  return orders
      .where((o) => o.status == 'completed')
      .fold<int>(0, (sum, o) => sum + o.totalPrice);
}

String _formatEarnings(int amount) {
  if (amount <= 0) return '0đ';
  final s = amount.toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return '${buf}đ';
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: GlassCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          radius: 16,
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: c.iconBgSecondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: c.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                    Text(subtitle, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                  ],
                ),
              ),
              Icon(LucideIcons.chevronRight, color: c.onSurfaceMuted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
