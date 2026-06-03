import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/mock/mock_provider_data.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';

class DocumentsPage extends StatelessWidget {
  const DocumentsPage({super.key});

  static const _icons = {
    'Giấy phép lái xe': LucideIcons.idCard,
    'Đăng ký phương tiện': LucideIcons.car,
    'Bảo hiểm vận tải': LucideIcons.shield,
    'Giấy phép kinh doanh': LucideIcons.building2,
  };

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return Scaffold(
          backgroundColor: c.background,
          appBar: AppBar(
            backgroundColor: c.background,
            surfaceTintColor: Colors.transparent,
            scrolledUnderElevation: 0,
            elevation: 0,
            title: Text('Giấy tờ đối tác', style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w700)),
            iconTheme: IconThemeData(color: c.onSurface),
          ),
          body: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  GlassCard(
                    child: Row(
                      children: [
                        Icon(LucideIcons.info, color: c.primaryLight),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Upload lên Supabase Storage (`provider_documents`). Admin duyệt trước khi hiển thị badge xác thực.',
                            style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...MockProviderData.documents.map((d) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: GlassCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        radius: 16,
                        child: Row(
                          children: [
                            Icon(_icons[d.title] ?? LucideIcons.fileText, color: c.primary),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    d.title,
                                    style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w600, color: c.onSurface),
                                  ),
                                  Text(d.requirement, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                                ],
                              ),
                            ),
                            _docTrailing(context, theme, c, d.title, d.status),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
        );
      },
    );
  }

  Widget _docTrailing(BuildContext context, ShadThemeData theme, UniMoveColors c, String title, String status) {
    switch (status) {
      case 'verified':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: c.iconBgTertiary, borderRadius: BorderRadius.circular(20)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.badgeCheck, size: 14, color: c.success),
              const SizedBox(width: 4),
              Text('Đã duyệt', style: theme.textTheme.small.copyWith(color: c.success, fontWeight: FontWeight.w600)),
            ],
          ),
        );
      case 'pending':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: c.chipBg, borderRadius: BorderRadius.circular(20)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.clock, size: 14, color: c.primaryLight),
              const SizedBox(width: 4),
              Text('Chờ duyệt', style: theme.textTheme.small.copyWith(color: c.primaryLight, fontWeight: FontWeight.w600)),
            ],
          ),
        );
      default:
        return ShadButton.outline(
          size: ShadButtonSize.sm,
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Upload $title — tích hợp Storage sắp tới')),
            );
          },
          child: const Text('Tải lên'),
        );
    }
  }
}
