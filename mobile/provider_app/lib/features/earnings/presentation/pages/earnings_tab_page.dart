import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';

class EarningsTabPage extends StatelessWidget {
  const EarningsTabPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Text('Thu nhập', style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface)),
              const SizedBox(height: 8),
              Text(
                'Tổng hợp từ đơn hoàn thành — API sẽ bổ sung sau.',
                style: theme.textTheme.muted.copyWith(color: c.onSurfaceMuted),
              ),
              const SizedBox(height: 20),
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Tháng này', style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                    const SizedBox(height: 8),
                    Text(
                      '0đ',
                      style: theme.textTheme.h2.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                    ),
                    const SizedBox(height: 16),
                    const Divider(height: 1),
                    const SizedBox(height: 16),
                    _row(theme, c, 'Đơn hoàn thành', '0'),
                    _row(theme, c, 'Đang xử lý', '—'),
                    _row(theme, c, 'Phí nền tảng', '—'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              GlassCard(
                child: Row(
                  children: [
                    Icon(LucideIcons.history, color: c.primaryLight),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Lịch sử thanh toán chi tiết sẽ hiển thị khi tích hợp `/api/payments` cho provider.',
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
}
