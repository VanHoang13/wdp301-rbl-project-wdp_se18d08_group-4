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

  static const _platformRate = 0.15; // phí nền tảng 15%

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = UniMoveColors.of(context);
    final ordersAsync = ref.watch(providerOrdersListProvider);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: ordersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Lỗi: $e', style: TextStyle(color: c.onSurface))),
            data: (orders) {
              final completed = orders.where((o) => o.isCompleted).toList();
              final active = orders.where((o) => o.isActive || o.isPending).toList();
              final gross = completed.fold<int>(0, (s, o) => s + o.totalPrice);
              final fee = (gross * _platformRate).round();
              final net = gross - fee;

              final now = DateTime.now();
              final monthGross = completed
                  .where((o) => o.createdAt != null && o.createdAt!.year == now.year && o.createdAt!.month == now.month)
                  .fold<int>(0, (s, o) => s + o.totalPrice);

              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(providerOrdersListProvider),
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
                              Text('Thu nhập', style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface)),
                              const SizedBox(height: 4),
                              Text(
                                'Tổng hợp từ ${completed.length} đơn đã hoàn thành.',
                                style: theme.textTheme.muted.copyWith(color: c.onSurfaceMuted),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.push('/earnings/history'),
                          child: const Text('Lịch sử chuyến'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Thẻ thực nhận
                    GlassCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(LucideIcons.wallet, color: c.primary, size: 20),
                              const SizedBox(width: 8),
                              Text('Thực nhận (sau phí)', style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _money(net),
                            style: theme.textTheme.h2.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                          ),
                          const SizedBox(height: 16),
                          const Divider(height: 1),
                          const SizedBox(height: 16),
                          _row(theme, c, 'Tổng doanh thu', _money(gross)),
                          _row(theme, c, 'Phí nền tảng (15%)', '- ${_money(fee)}'),
                          _row(theme, c, 'Tháng này', _money(monthGross)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Thống kê nhanh
                    Row(
                      children: [
                        Expanded(child: _miniStat(theme, c, LucideIcons.circleCheck, '${completed.length}', 'Hoàn thành')),
                        const SizedBox(width: 12),
                        Expanded(child: _miniStat(theme, c, LucideIcons.truck, '${active.length}', 'Đang/đang chờ')),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Text('Đơn gần đây', style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                    const SizedBox(height: 10),
                    if (completed.isEmpty)
                      GlassCard(
                        child: Text(
                          'Chưa có đơn hoàn thành.',
                          style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                        ),
                      )
                    else
                      ...completed.map((o) => _payoutTile(context, theme, c, o)),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _payoutTile(BuildContext context, ShadThemeData theme, UniMoveColors c, ProviderOrder o) {
    final net = (o.totalPrice * (1 - _platformRate)).round();
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
                      Text('#${o.orderNumber ?? o.id}', style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                      Text(dateStr, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('+ ${_money(net)}', style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w800, color: c.success)),
                    Text(_money(o.totalPrice), style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, decoration: TextDecoration.lineThrough)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _miniStat(ShadThemeData theme, UniMoveColors c, IconData icon, String value, String label) {
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

  static String _money(int amount) {
    if (amount == 0) return '0đ';
    final neg = amount < 0;
    final s = amount.abs().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return '${neg ? '-' : ''}${buf.toString()}đ';
  }
}
