import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../../../core/widgets/theme_toggle_tile.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../orders/presentation/providers/orders_providers.dart';

class ProviderProfileTabPage extends ConsumerWidget {
  const ProviderProfileTabPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(providerProfileProvider);
    final ordersAsync = ref.watch(providerOrdersListProvider);
    final completedCount = ordersAsync.maybeWhen(
      data: (orders) => orders.where((o) => o.isCompleted).length,
      orElse: () => 0,
    );
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return SafeArea(
          child: profileAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Lỗi: $e')),
            data: (profile) {
              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  Text('Hồ sơ', style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800, color: c.onSurface)),
                  const SizedBox(height: 16),
                  GlassCard(
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: c.iconBgSecondary,
                          child: Text(
                            (profile?.fullName.isNotEmpty == true ? profile!.fullName[0] : 'P').toUpperCase(),
                            style: theme.textTheme.h3.copyWith(color: c.primary, fontWeight: FontWeight.w800),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                profile?.fullName ?? '',
                                style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w700, color: c.onSurface),
                              ),
                              Text(profile?.email ?? '', style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                              if ((profile?.businessName ?? '').isNotEmpty)
                                Text(profile!.businessName!, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                              const SizedBox(height: 6),
                              if (profile?.isVerified ?? false)
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(LucideIcons.badgeCheck, size: 14, color: c.success),
                                    const SizedBox(width: 4),
                                    Text('Đã xác thực', style: theme.textTheme.small.copyWith(color: c.success, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _statBox(theme, c, LucideIcons.star, '${profile?.rating ?? 0}', 'Đánh giá')),
                      const SizedBox(width: 12),
                      Expanded(child: _statBox(theme, c, LucideIcons.circleCheck, '$completedCount', 'Đơn hoàn thành')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const ThemeToggleTile(),
                  const SizedBox(height: 12),
                  _MenuTile(
                    icon: LucideIcons.fileUp,
                    title: 'Giấy tờ & xác thực',
                    onTap: () => context.push('/documents'),
                  ),
                  _MenuTile(
                    icon: LucideIcons.bell,
                    title: 'Thông báo',
                    subtitle: 'Sắp có',
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cài đặt thông báo — sắp có')),
                    ),
                  ),
                  _MenuTile(
                    icon: LucideIcons.helpCircle,
                    title: 'Hỗ trợ',
                    onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Hotline hỗ trợ đối tác: 1900 1234')),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ShadButton.destructive(
                    width: double.infinity,
                    onPressed: () async {
                      await ref.read(authRepositoryProvider).signOut();
                      if (context.mounted) context.go('/login');
                    },
                    child: const Text('Đăng xuất'),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }
}

Widget _statBox(ShadThemeData theme, UniMoveColors c, IconData icon, String value, String label) {
  return GlassCard(
    padding: const EdgeInsets.all(14),
    radius: 16,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: c.primary),
        const SizedBox(height: 8),
        Text(value, style: theme.textTheme.h4.copyWith(fontWeight: FontWeight.w800, color: c.onSurface)),
        Text(label, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
      ],
    ),
  );
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            radius: 16,
            child: Row(
              children: [
                Icon(icon, color: c.primary, size: 22),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w600, color: c.onSurface)),
                      if (subtitle != null)
                        Text(subtitle!, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                    ],
                  ),
                ),
                Icon(LucideIcons.chevronRight, color: c.onSurfaceMuted, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
