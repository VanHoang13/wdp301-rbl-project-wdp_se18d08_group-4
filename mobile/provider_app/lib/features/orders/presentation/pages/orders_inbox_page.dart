import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
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
            final others = orders.where((o) => !o.isPending).toList();

            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(providerOrdersListProvider),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: EdgeInsets.fromLTRB(20, embedded ? 12 : 0, 20, 24),
                children: [
                  if (!embedded)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        'Đơn hàng',
                        style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                      ),
                    ),
                  if (pending.isNotEmpty) ...[
                    Text('Cần xử lý', style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                    const SizedBox(height: 8),
                    ...pending.map(
                      (o) => _OrderTile(
                        orderId: o.id,
                        title: o.statusLabel,
                        subtitle: o.pickupAddress,
                        price: o.totalPrice,
                        highlight: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (others.isNotEmpty) ...[
                    Text('Khác', style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                    const SizedBox(height: 8),
                    ...others.map(
                      (o) => _OrderTile(
                        orderId: o.id,
                        title: o.statusLabel,
                        subtitle: o.pickupAddress,
                        price: o.totalPrice,
                      ),
                    ),
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
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
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

class _OrderTile extends StatelessWidget {
  const _OrderTile({
    required this.orderId,
    required this.title,
    required this.subtitle,
    required this.price,
    this.highlight = false,
  });

  final String orderId;
  final String title;
  final String subtitle;
  final int price;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/orders/$orderId'),
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
                      Text(title, style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface)),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                      ),
                    ],
                  ),
                ),
                Text(
                  _formatPrice(price),
                  style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w800, color: c.primaryLight),
                ),
              ],
            ),
          ),
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
