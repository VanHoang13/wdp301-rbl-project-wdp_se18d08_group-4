import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';

class MessagesTabPage extends StatelessWidget {
  const MessagesTabPage({super.key});

  static const _mockThreads = [
    ('Khách #1042', 'Đơn UM-2024-1042 · 2 phút trước', true),
    ('Khách #1038', 'Cảm ơn anh/chị!', false),
    ('Hỗ trợ UniMove', 'Tài liệu đã được duyệt.', false),
  ];

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                child: Text(
                  'Tin nhắn',
                  style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  itemCount: _mockThreads.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final t = _mockThreads[i];
                    return GlassCard(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      radius: 16,
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: c.iconBgSecondary,
                            child: Icon(LucideIcons.user, color: c.primary, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  t.$1,
                                  style: theme.textTheme.p.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: c.onSurface,
                                  ),
                                ),
                                Text(
                                  t.$2,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                                ),
                              ],
                            ),
                          ),
                          if (t.$3)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Chat realtime theo order_id — đang trong roadmap.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
