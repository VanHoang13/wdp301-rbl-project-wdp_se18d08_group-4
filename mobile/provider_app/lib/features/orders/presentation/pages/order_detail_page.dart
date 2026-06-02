import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/dark_glass_background.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../providers/orders_providers.dart';

class OrderDetailPage extends ConsumerStatefulWidget {
  const OrderDetailPage({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends ConsumerState<OrderDetailPage> {
  final _declineReasonCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _declineReasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _respond(String response) async {
    setState(() => _submitting = true);
    try {
      await ref.read(providerOrdersRepositoryProvider).respond(
            orderId: widget.orderId,
            response: response,
            declineReason: response == 'declined' ? _declineReasonCtrl.text : null,
          );
      ref.invalidate(providerOrdersListProvider);
      ref.invalidate(providerOrderDetailProvider(widget.orderId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response == 'accepted' ? 'Đã nhận đơn' : 'Đã từ chối đơn')),
      );
      if (response == 'accepted') context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(providerOrderDetailProvider(widget.orderId));
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: Text('Chi tiết đơn', style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w700)),
            iconTheme: IconThemeData(color: c.onSurface),
          ),
          body: Stack(
            fit: StackFit.expand,
            children: [
              const DarkGlassBackground(variant: DarkGlassVariant.subtle, animated: false),
              orderAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('Lỗi: $e', style: TextStyle(color: c.onSurface))),
                data: (order) {
                  return ListView(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                    children: [
                      GlassCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(LucideIcons.package, color: c.primary),
                                const SizedBox(width: 8),
                                Text(
                                  order.statusLabel,
                                  style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            _row(theme, c, 'Từ', order.pickupAddress),
                            const SizedBox(height: 12),
                            _row(theme, c, 'Đến', order.deliveryAddress),
                            const SizedBox(height: 16),
                            Text(
                              'Tổng: ${_formatPrice(order.totalPrice)}',
                              style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.primaryLight),
                            ),
                          ],
                        ),
                      ),
                      if (order.isPending) ...[
                        const SizedBox(height: 20),
                        ShadButton(
                          width: double.infinity,
                          onPressed: _submitting ? null : () => _respond('accepted'),
                          child: _submitting
                              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('Nhận đơn'),
                        ),
                        const SizedBox(height: 16),
                        GlassCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Lý do từ chối (tuỳ chọn)',
                                style: theme.textTheme.small.copyWith(fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 8),
                              ShadInput(
                                controller: _declineReasonCtrl,
                                placeholder: const Text('Ví dụ: không còn slot...'),
                                maxLines: 2,
                              ),
                              const SizedBox(height: 12),
                              ShadButton.outline(
                                width: double.infinity,
                                onPressed: _submitting ? null : () => _respond('declined'),
                                child: const Text('Từ chối đơn'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _row(ShadThemeData theme, UniMoveColors c, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(value, style: theme.textTheme.p.copyWith(color: c.onSurface)),
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
