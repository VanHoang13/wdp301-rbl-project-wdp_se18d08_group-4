import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/constants/app_images.dart';
import '../../../../core/mock/mock_orders_data.dart';
import '../../../chat/domain/active_chat_context.dart';
import '../../../../core/mock/mock_auth_session.dart';
import '../../../../core/mock/mock_customer_data.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/widgets/pressable_scale.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _userName = 'Nam';

  @override
  void initState() {
    super.initState();
    _loadProfileName();
  }

  Future<void> _loadProfileName() async {
    if (await MockAuthSession.isSignedIn()) {
      if (mounted) setState(() => _userName = MockCustomerData.greetingName);
      return;
    }

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      final row = await Supabase.instance.client
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
      final name = row?['full_name'] as String?;
      if (name != null && name.trim().isNotEmpty && mounted) {
        setState(() => _userName = name.trim().split(' ').last);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : MediaQuery.sizeOf(context).width;

        return SizedBox(
          width: width,
          child: _buildScrollContent(c),
        );
      },
    );
  }

  Widget _buildScrollContent(UniMoveColors c) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      slivers: [
        SliverAppBar(
          pinned: true,
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: c.glassCard,
          surfaceTintColor: Colors.transparent,
          toolbarHeight: 64,
          title: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: c.glassBorderStrong, width: 2),
                ),
                child: Material(
                  color: Colors.transparent,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: () => context.push('/profile'),
                    customBorder: const CircleBorder(),
                    child: ClipOval(
                      child: Image.network(
                        AppImages.profileAvatar,
                        fit: BoxFit.cover,
                        cacheWidth: 80,
                        errorBuilder: (_, __, ___) => Icon(Icons.person, color: c.primary),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Flexible(
                child: Text(
                  'UniMove',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: c.primary,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () {},
                customBorder: const CircleBorder(),
                child: SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(Icons.notifications_outlined, color: c.primary),
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              FadeSlideIn(
                delay: const Duration(milliseconds: 80),
                child: Text(
                  'Chào buổi sáng, $_userName! 👋',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: c.onSurface,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              FadeSlideIn(
                delay: const Duration(milliseconds: 140),
                child: Text(
                  'Sẵn sàng chuyển đến nơi ở mới chưa?',
                  style: TextStyle(fontSize: 16, color: c.onSurfaceMuted),
                ),
              ),
              const SizedBox(height: 16),
              FadeSlideIn(
                delay: const Duration(milliseconds: 200),
                child: _SearchBar(colors: c),
              ),
              const SizedBox(height: 24),
              FadeSlideIn(
                delay: const Duration(milliseconds: 260),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Dịch vụ chính',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: c.onSurface),
                      ),
                    ),
                    TextButton(
                      onPressed: () {},
                      style: TextButton.styleFrom(foregroundColor: c.primary),
                      child: const Text('Xem tất cả', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              FadeSlideIn(
                delay: const Duration(milliseconds: 320),
                child: _MainServiceCard(colors: c),
              ),
              const SizedBox(height: 12),
              FadeSlideIn(
                delay: const Duration(milliseconds: 380),
                child: Row(
                  children: [
                    Expanded(
                      child: _SmallServiceCard(
                        colors: c,
                        icon: Icons.local_shipping_outlined,
                        useSecondaryIconBg: true,
                        title: 'Xe tải chuyển đồ',
                        subtitle: 'Đa dạng kích cỡ',
                        onTap: () => context.push('/booking/location'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _SmallServiceCard(
                        colors: c,
                        icon: Icons.person_pin_circle_outlined,
                        useSecondaryIconBg: false,
                        title: 'Thuê người khuân vác',
                        subtitle: 'Nhanh chóng, uy tín',
                        onTap: () => context.push('/booking/labor'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              FadeSlideIn(
                delay: const Duration(milliseconds: 440),
                child: _FlashSaleBanner(colors: c),
              ),
              const SizedBox(height: 24),
              FadeSlideIn(
                delay: const Duration(milliseconds: 500),
                child: Text(
                  'Đơn hàng gần đây',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: c.onSurface),
                ),
              ),
              const SizedBox(height: 12),
              FadeSlideIn(
                delay: const Duration(milliseconds: 560),
                child: _RecentOrderCard(colors: c),
              ),
            ]),
          ),
        ),
      ],
    );
  }
}

class _SearchBar extends StatelessWidget {
  _SearchBar({required this.colors});

  final UniMoveColors colors;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/booking/location'),
      child: AbsorbPointer(
        child: ShadInput(
          placeholder: const Text('Bạn muốn chuyển đến đâu?'),
          leading: Icon(LucideIcons.search, size: 18, color: colors.primary),
        ),
      ),
    );
  }
}

class _MainServiceCard extends StatelessWidget {
  _MainServiceCard({required this.colors});

  final UniMoveColors colors;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PressableScale(
      onTap: () => context.push('/booking/location'),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: isDark
              ? null
              : LinearGradient(
                  colors: [colors.primaryContainer, colors.surfaceTint],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
          color: isDark ? colors.primaryContainer : null,
          borderRadius: BorderRadius.circular(16),
          border: isDark ? null : Border.all(color: colors.border),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.08),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ưu đãi sinh viên',
                    style: TextStyle(
                      color: isDark ? colors.onPrimaryContainer : colors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Chuyển trọ gói (Tiết kiệm)',
                    style: TextStyle(
                      color: isDark ? AppColors.onPrimary : colors.onSurface,
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Trọn gói từ A-Z với giá cực mềm',
                    style: TextStyle(
                      color: isDark ? colors.onPrimaryContainer : colors.onSurfaceMuted,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : colors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.inventory_2_outlined,
                color: isDark ? AppColors.onPrimary : colors.primary,
                size: 36,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallServiceCard extends StatelessWidget {
  _SmallServiceCard({
    required this.colors,
    required this.icon,
    required this.useSecondaryIconBg,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final UniMoveColors colors;
  final IconData icon;
  final bool useSecondaryIconBg;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconBg = useSecondaryIconBg ? colors.iconBgSecondary : colors.iconBgTertiary;

    return PressableScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: colors.border),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: colors.navBarShadow,
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(16)),
              child: Icon(icon, color: colors.primary, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: colors.onSurface),
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: TextStyle(color: colors.onSurfaceMuted, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _FlashSaleBanner extends StatelessWidget {
  _FlashSaleBanner({required this.colors});

  final UniMoveColors colors;

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      onTap: () {},
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SizedBox(
          height: 192,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                AppImages.flashSaleBanner,
                fit: BoxFit.cover,
                cacheWidth: 800,
                errorBuilder: (_, __, ___) => ColoredBox(color: colors.primaryContainer),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [colors.onSurface.withValues(alpha: 0.72), Colors.transparent],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: colors.primary,
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: const Text(
                          'FLASH SALE',
                          style: TextStyle(
                            color: AppColors.onPrimary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const Spacer(),
                      const Text(
                        'Giảm 50% cho SV mới',
                        style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                      ),
                      const Text('Nhập mã: TAN_SINH_VIEN', style: TextStyle(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 10),
                      Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(99),
                        child: InkWell(
                          onTap: () {},
                          borderRadius: BorderRadius.circular(99),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            child: Text(
                              'Nhận ngay',
                              style: TextStyle(color: colors.primary, fontWeight: FontWeight.w600, fontSize: 12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentOrderCard extends StatelessWidget {
  _RecentOrderCard({required this.colors});

  final UniMoveColors colors;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PressableScale(
      onTap: () => context.push('/orders/${MockOrdersData.activeOrderId}/tracking'),
      child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: colors.navBarShadow,
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colors.surfaceTint,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: colors.border),
                ),
                child: Icon(Icons.local_shipping_outlined, color: colors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '#UM-29304',
                      style: TextStyle(color: colors.primary, fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Xe tải 500kg',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18, color: colors.onSurface),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: colors.accentGreen.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  'Đang đến',
                  style: TextStyle(color: colors.accentGreen, fontWeight: FontWeight.w600, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _RouteTimeline(
            colors: colors,
            startLabel: 'Ký túc xá khu B, ĐHQG',
            endLabel: '152 Nguyễn Văn Cừ, Quận 5',
          ),
          const SizedBox(height: 16),
          Divider(color: colors.border, height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              ClipOval(
                child: Image.network(
                  AppImages.driverAvatar,
                  width: 32,
                  height: 32,
                  fit: BoxFit.cover,
                  cacheWidth: 64,
                  errorBuilder: (_, __, ___) => CircleAvatar(
                    radius: 16,
                    backgroundColor: colors.surfaceTint,
                    child: Icon(Icons.person, size: 16, color: colors.onSurfaceMuted),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Tài xế: Minh Quân',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: colors.onSurface),
                ),
              ),
              Material(
                color: colors.primaryContainer,
                shape: const CircleBorder(),
                elevation: isDark ? 4 : 0,
                shadowColor: colors.primary.withValues(alpha: 0.3),
                child: InkWell(
                  onTap: () {
                    final order = MockOrdersData.orders.first;
                    if (ActiveChatContext.orderAllowsChat(order) && order.conversationId != null) {
                      context.push('/chat/${order.conversationId}');
                    }
                  },
                  customBorder: const CircleBorder(),
                  child: SizedBox(
                    width: 40,
                    height: 40,
                    child: Icon(Icons.chat_bubble_outline, color: colors.primary, size: 20),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
    );
  }
}

class _RouteTimeline extends StatelessWidget {
  _RouteTimeline({
    required this.colors,
    required this.startLabel,
    required this.endLabel,
  });

  final UniMoveColors colors;
  final String startLabel;
  final String endLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _routeRow(colors.onSurfaceMuted, startLabel),
        const SizedBox(height: 10),
        _routeRow(colors.primary, endLabel),
      ],
    );
  }

  Widget _routeRow(Color dot, String label) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label, style: TextStyle(fontSize: 14, color: colors.onSurfaceMuted)),
        ),
      ],
    );
  }
}
