import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/dark_glass_background.dart';
import '../../../../core/widgets/shad_screen_scope.dart';

class DocumentsPage extends StatelessWidget {
  const DocumentsPage({super.key});

  static const _docTypes = [
    (LucideIcons.idCard, 'Giấy phép lái xe', 'Bắt buộc'),
    (LucideIcons.car, 'Đăng ký phương tiện', 'Bắt buộc'),
    (LucideIcons.shield, 'Bảo hiểm vận tải', 'Khuyến nghị'),
    (LucideIcons.building2, 'Giấy phép kinh doanh', 'Tùy loại hình'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return ShadScreenScope(
      builder: (_, theme) {
        return Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: Text('Giấy tờ đối tác', style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w700)),
            iconTheme: IconThemeData(color: c.onSurface),
          ),
          body: Stack(
            fit: StackFit.expand,
            children: [
              const DarkGlassBackground(variant: DarkGlassVariant.subtle, animated: false),
              ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
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
                  ..._docTypes.map((d) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: GlassCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        radius: 16,
                        child: Row(
                          children: [
                            Icon(d.$1, color: c.primary),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    d.$2,
                                    style: theme.textTheme.p.copyWith(fontWeight: FontWeight.w600, color: c.onSurface),
                                  ),
                                  Text(d.$3, style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted)),
                                ],
                              ),
                            ),
                            ShadButton.outline(
                              size: ShadButtonSize.sm,
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Upload ${d.$2} — tích hợp Storage sắp tới')),
                                );
                              },
                              child: const Text('Tải lên'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
