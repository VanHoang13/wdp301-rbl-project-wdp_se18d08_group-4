import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../../orders/domain/provider_order.dart';
import '../../../orders/presentation/providers/orders_providers.dart';

class EarningsTabPage extends ConsumerWidget {
  const EarningsTabPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(providerOrdersListProvider);
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: ordersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Lỗi: $e', style: TextStyle(color: c.onSurface))),
            data: (orders) {
              final now = DateTime.now();
              final monthOrders = orders.where((o) {
                final d = o.createdAt;
                return d != null && d.year == now.year && d.month == now.month;
              }).toList();
              final completed = monthOrders.where((o) => o.isCompleted).toList();
              final gross = completed.fold<int>(0, (s, o) => s + o.totalPrice);
              final net = completed.fold<int>(0, (s, o) => s + o.netEarnings);
              final fee = (gross * 0.15).round();
              final recent = orders
                  .where((o) => o.isCompleted)
                  .toList()
                ..sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));

              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(providerOrdersListProvider),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: c.chipBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: c.border),
                      ),
                      child: Text(
                        'Ước tính từ đơn đã hoàn thành — chưa có API thanh toán/thu nhập riêng.',
                        style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, height: 1.35),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Thu nhập',
                            style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => context.push('/payout/settings'),
                          icon: Icon(LucideIcons.landmark, size: 18, color: c.primaryLight),
                          label: Text(
                            'Nhận tiền',
                            style: theme.textTheme.small.copyWith(
                              color: c.primaryLight,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () => context.push('/earnings/history'),
                          icon: Icon(LucideIcons.history, size: 18, color: c.primaryLight),
                          label: Text(
                            'Lịch sử',
                            style: theme.textTheme.small.copyWith(
                              color: c.primaryLight,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tháng ${now.month}/${now.year} · sau phí nền tảng 15%',
                      style: theme.textTheme.muted.copyWith(color: c.onSurfaceMuted),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [c.primary, c.primaryLight],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thực nhận tháng này',
                            style: theme.textTheme.small.copyWith(color: Colors.white70, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            ProviderOrder.formatMoney(net),
                            style: theme.textTheme.h2.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => context.push('/payout/settings'),
                        borderRadius: BorderRadius.circular(16),
                        child: GlassCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: c.iconBgTertiary,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(LucideIcons.wallet, color: c.primaryLight, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Phương thức nhận tiền',
                                      style: theme.textTheme.p.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: c.onSurface,
                                      ),
                                    ),
                                    Text(
                                      'Ngân hàng, MoMo, ZaloPay · quản lý giải ngân',
                                      style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(LucideIcons.chevronRight, size: 18, color: c.onSurfaceMuted),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    GlassCard(
                      child: Column(
                        children: [
                          _row(theme, c, 'Đơn hoàn thành', '${completed.length}'),
                          _row(theme, c, 'Doanh thu gộp', ProviderOrder.formatMoney(gross)),
                          _row(theme, c, 'Phí nền tảng', ProviderOrder.formatMoney(fee)),
                          _row(theme, c, 'Đang xử lý', '${monthOrders.where((o) => o.isActive).length}'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Đơn gần đây',
                      style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
                    ),
                    const SizedBox(height: 12),
                    if (recent.isEmpty)
                      GlassCard(
                        child: Text(
                          'Chưa có đơn hoàn thành.',
                          style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                        ),
                      )
                    else
                      ...recent.take(5).map((o) => _payoutTile(context, theme, c, o)),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _row(ShadThemeData theme, UniMoveColors c, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.p.copyWith(color: c.onSurfaceMuted)),
          Text(value, style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
        ],
      ),
    );
  }

  Widget _payoutTile(BuildContext context, ShadThemeData theme, UniMoveColors c, ProviderOrder o) {
    final d = o.createdAt;
    final dateStr = d == null ? '' : '${d.day}/${d.month}/${d.year}';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/orders/${o.id}'),
          child: GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            radius: 16,
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: c.iconBgTertiary, borderRadius: BorderRadius.circular(10)),
                  child: Icon(LucideIcons.circleCheck, color: c.success, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#${o.orderNumber ?? o.id.substring(0, 8)}',
                        style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
                      ),
                      if (dateStr.isNotEmpty)
                        Text(dateStr, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      ProviderOrder.formatMoney(o.netEarnings),
                      style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w800, color: c.success),
                    ),
                    Text(
                      ProviderOrder.formatMoney(o.totalPrice),
                      style: theme.textTheme.small.copyWith(
                        color: c.onSurfaceMuted,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 4),
                Icon(LucideIcons.chevronRight, size: 18, color: c.onSurfaceMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
