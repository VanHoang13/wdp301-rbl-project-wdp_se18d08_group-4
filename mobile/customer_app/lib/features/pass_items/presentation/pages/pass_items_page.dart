import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/theme/uni_move_colors.dart';
import '../../data/pass_item_location_prefs.dart';
import '../../data/pass_item_repository.dart';
import '../../domain/pass_item.dart';
import '../../domain/pass_item_provinces.dart';
import '../pass_item_format.dart';
import '../widgets/pass_item_image.dart';
import '../widgets/pass_item_province_picker_sheet.dart';

class PassItemsPage extends StatefulWidget {
  const PassItemsPage({super.key});

  @override
  State<PassItemsPage> createState() => _PassItemsPageState();
}

class _PassItemsPageState extends State<PassItemsPage> with SingleTickerProviderStateMixin {
  final _repo = PassItemRepository();
  late final TabController _tab = TabController(length: 2, vsync: this);
  final _searchCtrl = TextEditingController();

  String _category = 'Tất cả';
  String _provinceId = PassItemProvince.defaultId;
  String _keyword = '';
  bool _loading = true;
  List<PassItemPost> _browse = const [];
  List<PassItemPost> _mine = const [];

  PassItemProvince get _province => PassItemProvince.resolve(_provinceId);

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _tab.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final saved = await loadPassItemsProvinceId();
    if (!mounted) return;
    setState(() => _provinceId = saved);
    await _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final browse = await _repo.browse(
      keyword: _keyword,
      category: _category,
      provinceId: _provinceId,
    );
    final mine = await _repo.myPosts();
    if (!mounted) return;
    setState(() {
      _browse = browse;
      _mine = mine;
      _loading = false;
    });
  }

  Future<void> _pickProvince() async {
    final picked = await showPassItemProvincePicker(context, selectedId: _provinceId);
    if (picked == null || picked == _provinceId) return;
    await savePassItemsProvinceId(picked);
    if (!mounted) return;
    setState(() => _provinceId = picked);
    _load();
  }

  Future<void> _openCreate() async {
    final created = await context.push<bool>('/pass-items/new');
    if (created == true) {
      _tab.animateTo(1);
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      appBar: AppBar(
        backgroundColor: c.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: c.onSurface),
        title: Text('Chợ pass đồ cũ', style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w800)),
        bottom: TabBar(
          controller: _tab,
          labelColor: c.primary,
          unselectedLabelColor: c.onSurfaceMuted,
          indicatorColor: c.primary,
          indicatorWeight: 2.5,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700),
          tabs: const [
            Tab(text: 'Khám phá'),
            Tab(text: 'Tin của tôi'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: c.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Đăng tin'),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _browseTab(c),
          _myTab(c),
        ],
      ),
    );
  }

  Widget _browseTab(UniMoveColors c) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: _provinceSelector(c),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: ShadInput(
            controller: _searchCtrl,
            placeholder: const Text('Tìm tủ, bàn, tủ lạnh, sách...'),
            leading: Icon(LucideIcons.search, size: 18, color: c.primary),
            onChanged: (v) {
              _keyword = v;
              _load();
            },
          ),
        ),
        _filterLabel(c, 'Danh mục'),
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: PassItemCategories.all.length + 1,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final label = i == 0 ? 'Tất cả' : PassItemCategories.all[i - 1];
              return _categoryChip(c, label);
            },
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _browse.isEmpty
                  ? _emptyBrowse(c)
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                        itemCount: _browse.length,
                        itemBuilder: (_, i) => _listingCard(c, _browse[i]),
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _provinceSelector(UniMoveColors c) {
    return Material(
      color: c.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: _pickProvince,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.border),
          ),
          child: Row(
            children: [
              Icon(Icons.location_on_outlined, color: c.primary, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Đang xem tin tại', style: TextStyle(fontSize: 11, color: c.onSurfaceMuted)),
                    Text(
                      _province.label,
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c.onSurface),
                    ),
                  ],
                ),
              ),
              Text('Đổi', style: TextStyle(fontWeight: FontWeight.w700, color: c.primary)),
              Icon(Icons.chevron_right, color: c.primary, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterLabel(UniMoveColors c, String text) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          text,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c.onSurfaceMuted),
        ),
      ),
    );
  }

  Widget _categoryChip(UniMoveColors c, String label) {
    final active = _category == label;
    return GestureDetector(
      onTap: () {
        setState(() => _category = label);
        _load();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? c.primary : c.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? c.primary : c.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? Colors.white : c.onSurface,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _listingCard(UniMoveColors c, PassItemPost post) {
    final provinceLabel = PassItemProvince.resolve(PassItemProvince.provinceIdOf(post)).label;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () async {
            await context.push('/pass-items/${post.id}');
            _load();
          },
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                PassItemImage(
                  imageUrl: post.imageUrl,
                  width: 96,
                  height: 96,
                  borderRadius: BorderRadius.circular(12),
                  errorPlaceholder: Container(
                    width: 96,
                    height: 96,
                    color: c.surfaceTint,
                    child: Icon(Icons.inventory_2_outlined, color: c.onSurfaceMuted),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: c.onSurface),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            passItemPriceLabel(post),
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                              color: post.isFree ? c.success : c.primary,
                            ),
                          ),
                          if (post.isNegotiable) ...[
                            const SizedBox(width: 6),
                            Text('· có thương lượng',
                                style: TextStyle(fontSize: 11, color: c.onSurfaceMuted)),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _tag(c, post.condition.label),
                          _tag(c, post.category),
                          _tag(c, provinceLabel, accent: true),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(Icons.place_outlined, size: 13, color: c.onSurfaceMuted),
                          const SizedBox(width: 3),
                          Expanded(
                            child: Text(
                              post.area,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: c.onSurfaceMuted),
                            ),
                          ),
                          Text(passItemTimeAgo(post.createdAt),
                              style: TextStyle(fontSize: 11, color: c.onSurfaceMuted)),
                        ],
                      ),
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

  Widget _tag(UniMoveColors c, String text, {bool accent = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: accent ? c.primary.withValues(alpha: 0.12) : c.surfaceTint,
        borderRadius: BorderRadius.circular(8),
        border: accent ? Border.all(color: c.primary.withValues(alpha: 0.35)) : null,
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          color: accent ? c.primary : c.onSurface,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _emptyBrowse(UniMoveColors c) {
    return ListView(
      children: [
        const SizedBox(height: 64),
        Icon(Icons.location_city_outlined, size: 40, color: c.onSurfaceMuted),
        const SizedBox(height: 12),
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              'Chưa có tin tại ${_province.label}.\nThử đổi tỉnh/thành phố hoặc đăng tin mới.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w600, height: 1.4),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: TextButton(onPressed: _pickProvince, child: const Text('Chọn tỉnh / thành phố khác')),
        ),
      ],
    );
  }

  // ---------------- Tin của tôi ----------------
  Widget _myTab(UniMoveColors c) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_mine.isEmpty) return _empty(c, 'Bạn chưa đăng tin nào');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        itemCount: _mine.length,
        itemBuilder: (_, i) => _myCard(c, _mine[i]),
      ),
    );
  }

  Widget _myCard(UniMoveColors c, PassItemPost post) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _listingCardInner(c, post),
          Divider(height: 1, color: c.border),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.favorite_border, size: 15, color: c.onSurfaceMuted),
                const SizedBox(width: 4),
                InkWell(
                  onTap: () => context.push('/pass-items/${post.id}/chat'),
                  child: Text(
                    '${post.interestedCount} khách quan tâm',
                    style: TextStyle(fontSize: 12, color: c.primary, fontWeight: FontWeight.w600),
                  ),
                ),
                if (post.buyerTransportBooked) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: c.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('Khách đã đặt xe', style: TextStyle(fontSize: 10, color: c.primary, fontWeight: FontWeight.w700)),
                  ),
                ] else if (post.dealConfirmed) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: c.success.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('Đã chốt', style: TextStyle(fontSize: 10, color: c.success, fontWeight: FontWeight.w700)),
                  ),
                ] else ...[
                  const SizedBox(width: 6),
                  Text('· chốt đơn trong chat', style: TextStyle(fontSize: 11, color: c.onSurfaceMuted)),
                ],
                const Spacer(),
                _statusBadge(c, post.status),
                const SizedBox(width: 8),
                PopupMenuButton<PassItemStatus>(
                  icon: Icon(Icons.more_horiz, color: c.onSurfaceMuted),
                  onSelected: (s) async {
                    await _repo.updateStatus(post.id, s);
                    _load();
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: PassItemStatus.reserved, child: Text('Đánh dấu đang giữ chỗ')),
                    PopupMenuItem(value: PassItemStatus.completed, child: Text('Đã pass xong')),
                    PopupMenuItem(value: PassItemStatus.hidden, child: Text('Ẩn tin')),
                    PopupMenuItem(value: PassItemStatus.open, child: Text('Mở lại tin')),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _listingCardInner(UniMoveColors c, PassItemPost post) {
    return InkWell(
      onTap: () async {
        await context.push('/pass-items/${post.id}');
        _load();
      },
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            PassItemImage(
              imageUrl: post.imageUrl,
              width: 72,
              height: 72,
              borderRadius: BorderRadius.circular(12),
              errorPlaceholder: Container(
                width: 72,
                height: 72,
                color: c.surfaceTint,
                child: Icon(Icons.inventory_2_outlined, color: c.onSurfaceMuted),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(post.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontWeight: FontWeight.w700, color: c.onSurface)),
                  const SizedBox(height: 4),
                  Text(passItemPriceLabel(post),
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: post.isFree ? c.success : c.primary)),
                  const SizedBox(height: 4),
                  Text('${post.category} · ${passItemTimeAgo(post.createdAt)}',
                      style: TextStyle(fontSize: 12, color: c.onSurfaceMuted)),
                ],
              ),
            ),
          ],
        ),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: tint.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(999)),
      child: Text(status.label, style: TextStyle(color: tint, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }

  Widget _empty(UniMoveColors c, String text) {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Icon(Icons.inventory_2_outlined, size: 40, color: c.onSurfaceMuted),
        const SizedBox(height: 12),
        Center(child: Text(text, style: TextStyle(color: c.onSurface, fontWeight: FontWeight.w600))),
      ],
    );
  }
}
