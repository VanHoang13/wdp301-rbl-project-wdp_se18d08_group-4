import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/mock/mock_provider_data.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';

class MessagesTabPage extends StatelessWidget {
  const MessagesTabPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final threads = MockProviderData.chatThreads;

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
                  itemCount: threads.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final t = threads[i];
                    final tile = Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => context.push('/chat/${t.id}'),
                        child: GlassCard(
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
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            t.name,
                                            style: theme.textTheme.p.copyWith(
                                              fontWeight: FontWeight.w700,
                                              color: c.onSurface,
                                            ),
                                          ),
                                        ),
                                        Text(t.time, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      t.preview,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted),
                                    ),
                                    if (MockProviderData.customerHasActiveTrip(t.customerId)) ...[
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: c.iconBgTertiary,
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(LucideIcons.truck, size: 11, color: c.success),
                                            const SizedBox(width: 4),
                                            Text(
                                              'Đang có chuyến · nhắn tin được',
                                              style: theme.textTheme.small.copyWith(
                                                color: c.success,
                                                fontWeight: FontWeight.w600,
                                                fontSize: 10,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              if (t.unread) ...[
                                const SizedBox(width: 8),
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                    return tile
                        .animate()
                        .fadeIn(duration: 320.ms, delay: (i * 60).ms)
                        .slideX(begin: 0.12, end: 0, delay: (i * 60).ms, curve: Curves.easeOutCubic);
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Chỉ nhắn tin khi đang thực hiện chuyến của khách. Hội thoại khác chỉ xem lại.',
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
