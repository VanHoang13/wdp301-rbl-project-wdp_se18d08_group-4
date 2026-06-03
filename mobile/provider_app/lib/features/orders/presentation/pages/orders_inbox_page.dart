import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/mock/mock_provider_data.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../domain/provider_order.dart';
import '../providers/orders_providers.dart';

class OrdersInboxPage extends ConsumerWidget {
  const OrdersInboxPage({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(providerOrdersListProvider);
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        Widget body = ordersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _ErrorState(
            message: e.toString(),
            onRetry: () => ref.invalidate(providerOrdersListProvider),
          ),
          data: (orders) {
            if (orders.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Chưa có đơn nào.\nĐảm bảo backend đang chạy và tài khoản role provider.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.muted.copyWith(color: c.onSurfaceMuted),
                  ),
                ),
              );
            }

            final pending = orders.where((o) => o.isPending).toList();
            final active = orders.where((o) => o.isActive).toList();
            final done = orders.where((o) => !o.isPending && !o.isActive).toList();

            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(providerOrdersListProvider),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  if (pending.isNotEmpty) ...[
                    _sectionHeader(theme, c, 'Cần xử lý', pending.length),
                    const SizedBox(height: 8),
                    ...pending.map((o) => _OrderTile(order: o, highlight: true)),
                    const SizedBox(height: 16),
                  ],
                  if (active.isNotEmpty) ...[
                    _sectionHeader(theme, c, 'Đang thực hiện', active.length),
                    const SizedBox(height: 8),
                    ...active.map((o) => _OrderTile(order: o)),
                    const SizedBox(height: 16),
                  ],
                  if (done.isNotEmpty) ...[
                    _sectionHeader(theme, c, 'Lịch sử', done.length),
                    const SizedBox(height: 8),
                    ...done.map((o) => _OrderTile(order: o)),
                  ],
                ],
              ),
            );
          },
        );

        if (embedded) {
          return SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Đơn hàng',
                          style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                        ),
                      ),
                      IconButton(
                        icon: Icon(LucideIcons.refreshCw, color: c.onSurfaceMuted, size: 20),
                        onPressed: () => ref.invalidate(providerOrdersListProvider),
                      ),
                    ],
                  ),
                ),
                Expanded(child: body),
              ],
            ),
          );
        }

        return Scaffold(
          backgroundColor: c.background,
          appBar: AppBar(
            backgroundColor: c.background,
            surfaceTintColor: Colors.transparent,
            scrolledUnderElevation: 0,
            elevation: 0,
            title: Text('Đơn hàng', style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w700)),
            iconTheme: IconThemeData(color: c.onSurface),
            actions: [
              IconButton(
                icon: Icon(LucideIcons.refreshCw, color: c.onSurfaceMuted),
                onPressed: () => ref.invalidate(providerOrdersListProvider),
              ),
            ],
          ),
          body: body,
        );
      },
    );
  }
}

Widget _sectionHeader(ShadThemeData theme, UniMoveColors c, String label, int count) {
  return Row(
    children: [
      Text(label, style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
      const SizedBox(width: 8),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: c.chipBg, borderRadius: BorderRadius.circular(20)),
        child: Text('$count', style: theme.textTheme.small.copyWith(fontWeight: FontWeight.w700, color: c.primaryLight)),
      ),
    ],
  );
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({
    required this.order,
    this.highlight = false,
  });

  final ProviderOrder order;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);
    final customer = MockProviderData.customerNameOf(order.customerId);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/orders/${order.id}'),
          borderRadius: BorderRadius.circular(16),
          child: GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            radius: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: highlight ? c.chipBg : c.iconBgSecondary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        highlight ? LucideIcons.bell : LucideIcons.package,
                        color: c.primary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '#${order.orderNumber ?? order.id}  ·  $customer',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
                          ),
                          Text(
                            order.statusLabel,
                            style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      _formatPrice(order.totalPrice),
                      style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w800, color: c.primaryLight),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _addrLine(theme, c, LucideIcons.circleDot, order.pickupAddress),
                const SizedBox(height: 4),
                _addrLine(theme, c, LucideIcons.mapPin, order.deliveryAddress),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _addrLine(ShadThemeData theme, UniMoveColors c, IconData icon, String text) {
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
            style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
          ),
        ),
      ],
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

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ShadButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}
