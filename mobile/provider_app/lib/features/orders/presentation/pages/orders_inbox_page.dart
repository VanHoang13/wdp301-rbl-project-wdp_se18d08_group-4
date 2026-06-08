import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/config/dev_config.dart';
import '../../../../core/mock/mock_auth_session.dart';
import '../../../../core/mock/mock_provider_data.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/category_filter_bar.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../../auth/data/auth_repository.dart';
import '../../domain/provider_order.dart';
import '../providers/orders_providers.dart';

class OrdersInboxPage extends ConsumerStatefulWidget {
  const OrdersInboxPage({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<OrdersInboxPage> createState() => _OrdersInboxPageState();
}

class _OrdersInboxPageState extends ConsumerState<OrdersInboxPage> {
  OrderInboxFilter _filter = OrderInboxFilter.all;

  List<ProviderOrder> _sorted(List<ProviderOrder> orders) {
    final list = List<ProviderOrder>.from(orders);
    list.sort((a, b) => (b.createdAt ?? DateTime(0)).compareTo(a.createdAt ?? DateTime(0)));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(providerOrdersListProvider);
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        Widget body = ordersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _ErrorState(
            message: _friendlyError(e),
            isAuthError: _isAuthError(e),
            onRetry: () => ref.invalidate(providerOrdersListProvider),
            onSignOut: () async {
              await ref.read(authRepositoryProvider).signOut();
              if (context.mounted) context.go('/login');
            },
            onDemoLogin: DevConfig.useMockAuth
                ? () async {
                    await MockAuthSession.signIn();
                    ref.invalidate(providerOrdersListProvider);
                    ref.invalidate(providerProfileProvider);
                  }
                : null,
          ),
          data: (orders) {
            if (orders.isEmpty) {
              return _emptyAll(theme, c);
            }

            final filterOptions = OrderInboxFilter.values
                .map(
                  (f) => CategoryFilterOption(
                    id: f.id,
                    label: f.label,
                    count: orders.where(f.matches).length,
                  ),
                )
                .toList();

            final filtered = _sorted(orders.where(_filter.matches).toList());

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CategoryFilterBar(
                  options: filterOptions,
                  selectedId: _filter.id,
                  onSelected: (id) {
                    setState(() {
                      _filter = OrderInboxFilter.values.firstWhere((f) => f.id == id);
                    });
                  },
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: filtered.isEmpty
                      ? _emptyFilter(theme, c, _filter.label)
                      : RefreshIndicator(
                          onRefresh: () async => ref.invalidate(providerOrdersListProvider),
                          child: ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                            padding: EdgeInsets.fromLTRB(20, 0, 20, 24),
                            itemCount: filtered.length,
                            itemBuilder: (_, i) => _OrderTile(
                              order: filtered[i],
                              onTrack: filtered[i].isActive
                                  ? () => context.push('/orders/${filtered[i].id}/tracking')
                                  : null,
                            ),
                          ),
                        ),
                ),
              ],
            );
          },
        );

        if (widget.embedded) {
          return SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 12, 4),
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
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text(
                    'Chọn loại đơn để lọc nhanh',
                    style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
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

  Widget _emptyAll(ShadThemeData theme, UniMoveColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.inbox, size: 48, color: c.onSurfaceMuted),
            const SizedBox(height: 12),
            Text(
              'Chưa có đơn nào',
              style: theme.textTheme.large.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
            ),
            const SizedBox(height: 8),
            Text(
              'Đơn mới sẽ hiển thị khi khách đặt hoặc khi dùng dữ liệu demo.',
              textAlign: TextAlign.center,
              style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyFilter(ShadThemeData theme, UniMoveColors c, String label) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.filterX, size: 40, color: c.onSurfaceMuted),
            const SizedBox(height: 12),
            Text(
              'Không có đơn «$label»',
              style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
            ),
            const SizedBox(height: 8),
            Text(
              'Thử chọn «Tất cả» hoặc loại khác.',
              style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({required this.order, this.onTrack});

  final ProviderOrder order;
  final VoidCallback? onTrack;

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);
    final highlight = order.isPending;
    final customer = MockProviderData.customerNameOf(order.customerId);

    final statusColor = switch (true) {
      _ when order.isPending => c.primaryLight,
      _ when order.isActive => c.primary,
      _ when order.isCompleted => c.success,
      _ => c.onSurfaceMuted,
    };

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
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
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
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              '#${order.orderNumber ?? order.id.substring(0, 8)}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.small.copyWith(
                                fontWeight: FontWeight.w800,
                                color: c.onSurface,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            ProviderOrder.formatMoney(order.totalPrice),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.small.copyWith(
                              fontWeight: FontWeight.w800,
                              color: c.primaryLight,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          order.statusLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.small.copyWith(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        customer,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.small.copyWith(
                          color: c.onSurfaceMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        order.pickupAddress,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                      ),
                      if (order.createdAt != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          ProviderOrder.formatDateTime(order.createdAt),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, fontSize: 11),
                        ),
                      ],
                      if (onTrack != null) ...[
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Material(
                            color: c.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            child: InkWell(
                              onTap: onTrack,
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(LucideIcons.navigation, size: 14, color: c.primary),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Theo dõi GPS',
                                      style: theme.textTheme.small.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: c.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

bool _isAuthError(Object e) {
  if (e is ApiException) {
    return e.statusCode == 401 ||
        (e.message.contains('Token') && e.message.contains('hết hạn'));
  }
  final s = e.toString();
  return s.contains('Token không hợp lệ') || s.contains('hết hạn');
}

String _friendlyError(Object e) {
  if (_isAuthError(e)) {
    return 'Phiên đăng nhập đã hết hạn.\nVui lòng đăng nhập lại hoặc dùng tài khoản demo.';
  }
  if (e is ApiException) return e.message;
  return e.toString();
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
    this.isAuthError = false,
    this.onSignOut,
    this.onDemoLogin,
  });

  final String message;
  final VoidCallback onRetry;
  final bool isAuthError;
  final VoidCallback? onSignOut;
  final VoidCallback? onDemoLogin;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isAuthError ? Icons.lock_clock_outlined : Icons.cloud_off_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            if (isAuthError && onSignOut != null) ...[
              ShadButton(
                width: double.infinity,
                onPressed: onSignOut,
                child: const Text('Đăng nhập lại'),
              ),
              if (onDemoLogin != null) ...[
                const SizedBox(height: 10),
                ShadButton.outline(
                  width: double.infinity,
                  onPressed: onDemoLogin,
                  child: const Text('Dùng tài khoản demo (không cần API)'),
                ),
              ],
            ] else
              ShadButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}
