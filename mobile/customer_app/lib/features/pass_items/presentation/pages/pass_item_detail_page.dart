import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../../booking/presentation/cubit/booking_flow_cubit.dart';
import '../../data/pass_item_repository.dart';
import '../../domain/pass_extras.dart';
import '../../domain/pass_item.dart';
import '../pass_item_format.dart';
import '../widgets/pass_item_image.dart';
import '../widgets/pass_interested_buyer_tile.dart';

class PassItemDetailPage extends StatefulWidget {
  const PassItemDetailPage({super.key, required this.id});

  final String id;

  @override
  State<PassItemDetailPage> createState() => _PassItemDetailPageState();
}

class _PassItemDetailPageState extends State<PassItemDetailPage> {
  final _repo = PassItemRepository();
  PassItemPost? _post;
  List<PassInterestedBuyer> _interestedBuyers = const [];
  bool _loading = true;
  bool _interested = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final post = await _repo.byId(widget.id);
    var buyers = const <PassInterestedBuyer>[];
    if (post?.isMine == true) {
      buyers = await _repo.interestedBuyers(widget.id);
    }
    if (!mounted) return;
    setState(() {
      _post = post;
      _interestedBuyers = buyers;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    if (_loading) {
      return Scaffold(
        backgroundColor: c.background,
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    final post = _post;
    if (post == null) {
      return Scaffold(
        backgroundColor: c.background,
        appBar: AppBar(backgroundColor: c.background, elevation: 0),
        body: Center(child: Text('Không tìm thấy tin', style: TextStyle(color: c.onSurface))),
      );
    }

    return Scaffold(
      backgroundColor: c.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 280,
            backgroundColor: c.surface,
            surfaceTintColor: Colors.transparent,
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  PassItemImage(
                    imageUrl: post.imageUrl,
                    fit: BoxFit.cover,
                    errorPlaceholder: Container(
                      color: c.surfaceTint,
                      child: Icon(Icons.inventory_2_outlined, size: 60, color: c.onSurfaceMuted),
                    ),
                  ),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black38, Colors.transparent],
                        stops: [0, 0.35],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          post.title,
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: c.onSurface),
                        ),
                      ),
                      _statusBadge(c, post.status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        passItemPriceLabel(post),
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: post.isFree ? c.success : c.primary,
                        ),
                      ),
                      if (post.isNegotiable)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: c.chipBg, borderRadius: BorderRadius.circular(999)),
                          child: Text('Có thể thương lượng',
                              style: TextStyle(fontSize: 12, color: c.primary, fontWeight: FontWeight.w600)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Đăng ${passItemTimeAgo(post.createdAt)} · ${post.interestedCount} người quan tâm',
                      style: TextStyle(fontSize: 12, color: c.onSurfaceMuted)),
                  const SizedBox(height: 18),
                  _infoGrid(c, post),
                  const SizedBox(height: 18),
                  Text('Mô tả', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: c.onSurface)),
                  const SizedBox(height: 6),
                  Text(post.description, style: TextStyle(fontSize: 14, height: 1.5, color: c.onSurface)),
                  const SizedBox(height: 18),
                  if (post.isMine) ...[
                    _ownerTipsCard(c, post),
                    const SizedBox(height: 14),
                    _interestedBuyersSection(c, post),
                    const SizedBox(height: 14),
                    _sellerLogisticsInfoCard(c, post),
                  ] else ...[
                    _buyerFlowSteps(c, post),
                    const SizedBox(height: 14),
                    if (post.dealConfirmed)
                      _buyerTransportCard(c, post)
                    else
                      _buyerAwaitDealCard(c),
                    const SizedBox(height: 18),
                    _sellerCard(c, post),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: post.isMine ? _sellerManageBar(c, post) : _buyerBottomBar(c, post),
    );
  }

  Widget _infoGrid(UniMoveColors c, PassItemPost post) {
    final items = [
      (Icons.fact_check_outlined, 'Tình trạng', post.condition.label),
      (Icons.category_outlined, 'Danh mục', post.category),
      (Icons.timelapse_outlined, 'Đã dùng', post.usageDuration),
      (Icons.place_outlined, 'Khu vực', post.area),
    ];
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Icon(items[i].$1, size: 18, color: c.primary),
                  const SizedBox(width: 12),
                  Text(items[i].$2, style: TextStyle(color: c.onSurfaceMuted, fontSize: 13)),
                  const Spacer(),
                  Flexible(
                    child: Text(
                      items[i].$3,
                      textAlign: TextAlign.right,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
            if (i != items.length - 1) Divider(height: 1, color: c.border),
          ],
        ],
      ),
    );
  }

  Widget _buyerFlowSteps(UniMoveColors c, PassItemPost post) {
    final steps = [
      (Icons.chat_bubble_outline, 'Chat thỏa giá đồ'),
      (Icons.handshake_outlined, 'Người bán chốt đơn trong chat'),
      (Icons.local_shipping_outlined, 'Bạn đặt xe lấy hàng'),
      (Icons.inventory_2_outlined, 'Nhận đồ tại nhà'),
    ];
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quy trình nhận đồ', style: TextStyle(fontWeight: FontWeight.w700, color: c.onSurface)),
          const SizedBox(height: 10),
          for (var i = 0; i < steps.length; i++) ...[
            Row(
              children: [
                CircleAvatar(
                  radius: 12,
                  backgroundColor: (post.dealConfirmed && i >= 2) || (i == 1 && post.dealConfirmed)
                      ? c.success
                      : (i == 1 && !post.dealConfirmed ? c.onSurfaceMuted : c.primary),
                  child: Text('${i + 1}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(width: 10),
                Icon(steps[i].$1, size: 16, color: c.primaryLight),
                const SizedBox(width: 8),
                Expanded(child: Text(steps[i].$2, style: TextStyle(fontSize: 13, color: c.onSurface))),
              ],
            ),
            if (i < steps.length - 1) const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }

  Widget _buyerTransportCard(UniMoveColors c, PassItemPost post) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [c.primaryContainer, c.surfaceTint],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.local_shipping_outlined, color: c.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Chở đồ về chỗ bạn',
                        style: TextStyle(fontWeight: FontWeight.w800, color: c.onSurface, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text('Lấy tại: ${post.area}',
                        style: TextStyle(fontSize: 12, color: c.onSurfaceMuted, height: 1.35)),
                    const SizedBox(height: 4),
                    Text('Người bán đã chốt đơn. Nhập địa chỉ nhận → chọn nhà xe báo giá.',
                        style: TextStyle(fontSize: 11, color: c.onSurfaceMuted, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ShadButton(
            width: double.infinity,
            onPressed: () => _startDelivery(post),
            leading: const Icon(LucideIcons.truck, size: 18),
            child: const Text('Đặt chuyển đồ'),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 260.ms).slideY(begin: 0.12, end: 0, curve: Curves.easeOut);
  }

  Widget _buyerAwaitDealCard(UniMoveColors c) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(LucideIcons.lock, size: 20, color: c.onSurfaceMuted),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Chưa thể đặt xe',
                  style: TextStyle(fontWeight: FontWeight.w800, color: c.onSurface, fontSize: 15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Nhắn tin thương lượng giá. Sau khi người bán bấm Chốt đơn trong chat, nút đặt chuyển đồ sẽ được mở cho bạn.',
            style: TextStyle(fontSize: 12, color: c.onSurfaceMuted, height: 1.4),
          ),
          const SizedBox(height: 12),
          ShadButton.outline(
            width: double.infinity,
            onPressed: () async {
              await context.push('/pass-items/${widget.id}/chat');
              _load();
            },
            leading: const Icon(LucideIcons.messageCircle, size: 18),
            child: const Text('Vào chat thương lượng'),
          ),
        ],
      ),
    );
  }

  Widget _sellerLogisticsInfoCard(UniMoveColors c, PassItemPost post) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(LucideIcons.info, size: 20, color: c.primaryLight),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Vận chuyển do khách đặt',
                        style: TextStyle(fontWeight: FontWeight.w700, color: c.onSurface)),
                    const SizedBox(height: 4),
                    Text(
                      post.buyerTransportBooked
                          ? 'Khách đã đặt xe — không thể huỷ chốt đơn.'
                          : post.dealConfirmed
                              ? 'Đã chốt đơn — khách có thể đặt xe tại ${post.area}. Có thể huỷ chốt nếu đổi ý.'
                              : 'Thỏa giá trong chat rồi bấm Chốt đơn để khách được đặt xe lấy đồ tại ${post.area}.',
                      style: TextStyle(fontSize: 12, color: c.onSurfaceMuted, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (post.sellerCanCancelDeal) ...[
            const SizedBox(height: 12),
            ShadButton.outline(
              width: double.infinity,
              onPressed: () => _cancelDealConfirmation(post),
              leading: Icon(LucideIcons.undo2, size: 18, color: c.accentGreen),
              child: Text('Huỷ chốt đơn', style: TextStyle(color: c.accentGreen)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _interestedBuyersSection(UniMoveColors c, PassItemPost post) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text('Người quan tâm',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: c.onSurface)),
            const Spacer(),
            TextButton(
              onPressed: () async {
                await context.push('/pass-items/${post.id}/chat');
                _load();
              },
              child: Text('Xem tất cả', style: TextStyle(color: c.primary, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_interestedBuyers.isEmpty)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border),
            ),
            child: Text(
              'Chưa có khách quan tâm. Họ sẽ hiện ở đây sau khi bấm "Tôi muốn nhận".',
              style: TextStyle(fontSize: 12, color: c.onSurfaceMuted, height: 1.4),
            ),
          )
        else
          ..._interestedBuyers.take(3).map(
            (b) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: PassInterestedBuyerTile(
                buyer: b,
                onTap: () async {
                  await context.push('/pass-items/${post.id}/chat?buyer=${b.id}');
                  _load();
                },
              ),
            ),
          ),
        if (_interestedBuyers.length > 3)
          Align(
            alignment: Alignment.center,
            child: TextButton.icon(
              onPressed: () async {
                await context.push('/pass-items/${post.id}/chat');
                _load();
              },
              icon: Icon(LucideIcons.users, size: 16, color: c.primary),
              label: Text('${_interestedBuyers.length} khách — mở danh sách chat',
                  style: TextStyle(color: c.primary)),
            ),
          ),
      ],
    );
  }

  Widget _ownerTipsCard(UniMoveColors c, PassItemPost post) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.chipBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.primary.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(LucideIcons.userCheck, size: 18, color: c.primary),
              const SizedBox(width: 8),
              Text('Tin của bạn', style: TextStyle(fontWeight: FontWeight.w800, color: c.primary)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            post.buyerTransportBooked
                ? 'Khách đã đặt xe — không huỷ chốt được.'
                : post.dealConfirmed
                    ? 'Đã chốt đơn · Khách có thể đặt xe (huỷ chốt nếu đổi ý).'
                    : '${post.interestedCount} người quan tâm · Chốt đơn trong chat sau khi thỏa giá.',
            style: TextStyle(fontSize: 12, color: c.onSurface, height: 1.35),
          ),
        ],
      ),
    );
  }

  void _startDelivery(PassItemPost post) {
    if (!post.dealConfirmed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chờ người bán chốt đơn trong chat')),
      );
      return;
    }
    context.read<BookingFlowCubit>().startPassItemDelivery(pickup: post.area, passItemId: post.id);
    context.push('/booking/location');
  }

  Future<void> _cancelDealConfirmation(PassItemPost post) async {
    if (!post.sellerCanCancelDeal) {
      if (post.buyerTransportBooked) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Khách đã đặt xe — không thể huỷ chốt đơn')),
        );
      }
      return;
    }
    final c = UniMoveColors.of(context);
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.surface,
        title: Text('Huỷ chốt đơn?', style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w800)),
        content: Text(
          'Khách sẽ không đặt được xe cho đến khi bạn chốt đơn lại.',
          style: TextStyle(color: c.onSurfaceMuted, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Không')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Huỷ chốt', style: TextStyle(color: c.accentGreen)),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    final ok = await _repo.cancelDealConfirmation(post.id);
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã huỷ chốt đơn')));
      _load();
    }
  }

  Widget _sellerCard(UniMoveColors c, PassItemPost post) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: c.iconBgSecondary,
            child: Text(
              post.posterName.substring(0, 1).toUpperCase(),
              style: TextStyle(color: c.primary, fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(post.posterName, style: TextStyle(fontWeight: FontWeight.w700, color: c.onSurface)),
                const SizedBox(height: 2),
                Text('Người đăng · ${post.posterContact}',
                    style: TextStyle(fontSize: 12, color: c.onSurfaceMuted)),
              ],
            ),
          ),
          Icon(Icons.verified, color: c.primary, size: 20),
        ],
      ),
    );
  }

  Widget _statusBadge(UniMoveColors c, PassItemStatus status) {
    final tint = switch (status) {
      PassItemStatus.open => c.primary,
      PassItemStatus.reserved => c.primaryLight,
      PassItemStatus.completed => c.success,
      PassItemStatus.hidden => c.onSurfaceMuted,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: tint.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(999)),
      child: Text(status.label, style: TextStyle(color: tint, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }

  Widget _sellerManageBar(UniMoveColors c, PassItemPost post) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        decoration: BoxDecoration(
          color: c.surface,
          border: Border(top: BorderSide(color: c.border)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              post.buyerTransportBooked
                  ? 'Khách đã đặt xe — không huỷ chốt'
                  : post.dealConfirmed
                      ? 'Đã chốt — huỷ chốt trong chat nếu đổi ý (trước khi khách đặt xe)'
                      : 'Thỏa giá trong chat → bấm Chốt đơn để mở đặt xe cho khách',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: c.onSurfaceMuted),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await context.push('/pass-items/${post.id}/chat');
                        _load();
                      },
                      icon: const Icon(LucideIcons.users, size: 18),
                      label: Text('Khách (${_interestedBuyers.length})'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: c.primary,
                        side: BorderSide(color: c.primary.withValues(alpha: 0.4)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: OutlinedButton.icon(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back, size: 18),
                      label: const Text('Quay lại'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: c.onSurface,
                        side: BorderSide(color: c.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
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

  Widget _buyerBottomBar(UniMoveColors c, PassItemPost post) {
    final available = post.status == PassItemStatus.open || post.status == PassItemStatus.reserved;
    final ctaLabel = _interested ? 'Đã quan tâm' : 'Tôi muốn nhận';

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: BoxDecoration(
          color: c.surface,
          border: Border(top: BorderSide(color: c.border)),
        ),
        child: Row(
          children: [
            _compactIconBtn(
              c,
              LucideIcons.phone,
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Đang gọi ${post.posterContact}...')),
              ),
            ),
            const SizedBox(width: 8),
            _compactIconBtn(
              c,
              LucideIcons.messageCircle,
              onTap: () async {
                await context.push('/pass-items/${post.id}/chat');
                _load();
              },
            ),
            const SizedBox(width: 8),
            Expanded(
              child: SizedBox(
                height: 44,
                child: ElevatedButton(
                  onPressed: available && !_interested
                      ? () async {
                          await _repo.expressInterest(post.id);
                          if (!mounted) return;
                          setState(() => _interested = true);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Đã gửi quan tâm — người đăng sẽ liên hệ bạn')),
                          );
                          _load();
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: c.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: c.border,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _interested ? LucideIcons.check : LucideIcons.heart,
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          ctaLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _compactIconBtn(UniMoveColors c, IconData icon, {required VoidCallback onTap}) {
    return SizedBox(
      width: 44,
      height: 44,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          side: BorderSide(color: c.border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Icon(icon, size: 18, color: c.onSurface),
      ),
    );
  }
}
