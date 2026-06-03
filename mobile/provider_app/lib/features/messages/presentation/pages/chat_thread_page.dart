import 'package:flutter/material.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../../core/mock/mock_provider_data.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/shad_screen_scope.dart';
import '../../domain/chat_models.dart';

class ChatThreadPage extends StatefulWidget {
  const ChatThreadPage({super.key, required this.threadId});

  final String threadId;

  @override
  State<ChatThreadPage> createState() => _ChatThreadPageState();
}

class _ChatThreadPageState extends State<ChatThreadPage> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  late final ChatThread? _thread;

  /// Số tin nhắn ban đầu — chỉ animate "bay vào" cho tin gửi mới sau đó.
  int _initialCount = 0;

  @override
  void initState() {
    super.initState();
    _thread = MockProviderData.chatThreadById(widget.threadId);
    _initialCount = _thread?.messages.length ?? 0;
    WidgetsBinding.instance.addPostFrameCallback((_) => _jumpToBottom(animate: false));
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  bool get _canChat => MockProviderData.customerHasActiveTrip(_thread?.customerId);

  void _jumpToBottom({bool animate = true}) {
    if (!_scrollCtrl.hasClients) return;
    final target = _scrollCtrl.position.maxScrollExtent;
    if (animate) {
      _scrollCtrl.animateTo(target, duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
    } else {
      _scrollCtrl.jumpTo(target);
    }
  }

  void _send() {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _thread == null) return;
    setState(() {
      _thread.messages.add(ChatMessage(text: text, fromProvider: true, time: 'Vừa xong'));
      _inputCtrl.clear();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _jumpToBottom());
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final thread = _thread;

    return ShadScreenScope(
      builder: (_, theme) {
        return Scaffold(
          backgroundColor: c.background,
          appBar: _appBar(theme, c, thread),
          body: thread == null
              ? Center(child: Text('Không tìm thấy hội thoại', style: TextStyle(color: c.onSurfaceMuted)))
              : Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.fromLTRB(14, 16, 14, 12),
                        itemCount: thread.messages.length + 1,
                        itemBuilder: (_, i) {
                          if (i == 0) return _dateChip(theme, c);
                          final idx = i - 1;
                          final m = thread.messages[idx];
                          final prev = idx > 0 ? thread.messages[idx - 1] : null;
                          final grouped = prev != null && prev.fromProvider == m.fromProvider;
                          final isNew = idx >= _initialCount;
                          return _animatedBubble(theme, c, m, idx, grouped, isNew);
                        },
                      ),
                    ),
                    _canChat ? _composer(theme, c) : _readOnlyBanner(theme, c),
                  ],
                ),
        );
      },
    );
  }

  // ---------- App bar ----------
  PreferredSizeWidget _appBar(ShadThemeData theme, UniMoveColors c, ChatThread? thread) {
    return AppBar(
      backgroundColor: c.background,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      elevation: 0,
      iconTheme: IconThemeData(color: c.onSurface),
      titleSpacing: 0,
      title: thread == null
          ? Text('Tin nhắn', style: TextStyle(color: c.onSurface))
          : Row(
              children: [
                _avatar(theme, c, thread.name, online: _canChat),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        thread.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.p.copyWith(color: c.onSurface, fontWeight: FontWeight.w800),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_canChat ? LucideIcons.truck : LucideIcons.eye,
                              size: 12, color: _canChat ? c.success : c.onSurfaceMuted),
                          const SizedBox(width: 4),
                          Text(
                            _canChat ? 'Đang thực hiện chuyến' : 'Chỉ xem lại',
                            style: theme.textTheme.small.copyWith(
                              color: _canChat ? c.success : c.onSurfaceMuted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ).animate().fadeIn(duration: 350.ms).slideX(begin: 0.1, end: 0, curve: Curves.easeOut),
      actions: [
        IconButton(
          icon: Icon(LucideIcons.phone, color: _canChat ? c.primary : c.onSurfaceMuted, size: 20),
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Gọi điện — tích hợp sắp tới')),
          ),
        ),
      ],
    );
  }

  Widget _avatar(ShadThemeData theme, UniMoveColors c, String name, {required bool online}) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return SizedBox(
      width: 40,
      height: 40,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [c.primary, c.primaryLight]),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(initial,
                style: theme.textTheme.p.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
          ),
          if (online)
            Positioned(
              right: -1,
              bottom: -1,
              child: Container(
                width: 13,
                height: 13,
                decoration: BoxDecoration(
                  color: c.success,
                  shape: BoxShape.circle,
                  border: Border.all(color: c.surface, width: 2),
                ),
              )
                  .animate(onPlay: (ctrl) => ctrl.repeat(reverse: true))
                  .scaleXY(begin: 1, end: 1.25, duration: 900.ms, curve: Curves.easeInOut),
            ),
        ],
      ),
    );
  }

  // ---------- Date chip ----------
  Widget _dateChip(ShadThemeData theme, UniMoveColors c) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: c.chipBg,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          'Hôm nay',
          style: theme.textTheme.small.copyWith(color: c.primaryLight, fontWeight: FontWeight.w600),
        ),
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  // ---------- Bubbles ----------
  Widget _animatedBubble(
      ShadThemeData theme, UniMoveColors c, ChatMessage m, int idx, bool grouped, bool isNew) {
    final bubble = _bubble(theme, c, m, grouped);
    if (isNew) {
      return bubble
          .animate()
          .fadeIn(duration: 220.ms)
          .slideY(begin: 0.25, end: 0, curve: Curves.easeOutCubic)
          .scaleXY(begin: 0.96, end: 1, curve: Curves.easeOutCubic);
    }
    final delay = Duration(milliseconds: (idx * 45).clamp(0, 420));
    return bubble
        .animate()
        .fadeIn(duration: 300.ms, delay: delay)
        .slideX(begin: m.fromProvider ? 0.12 : -0.12, end: 0, delay: delay, curve: Curves.easeOutCubic);
  }

  Widget _bubble(ShadThemeData theme, UniMoveColors c, ChatMessage m, bool grouped) {
    final mine = m.fromProvider;
    final radius = BorderRadius.only(
      topLeft: Radius.circular(mine ? 18 : (grouped ? 6 : 18)),
      topRight: Radius.circular(mine ? (grouped ? 6 : 18) : 18),
      bottomLeft: const Radius.circular(18),
      bottomRight: const Radius.circular(18),
    );

    final bubbleContent = Flexible(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: mine ? LinearGradient(colors: [c.primary, c.primaryLight]) : null,
          color: mine ? null : c.surface,
          borderRadius: radius,
          border: mine ? null : Border.all(color: c.border),
          boxShadow: [
            BoxShadow(
              color: mine ? c.primary.withValues(alpha: 0.22) : c.navBarShadow,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(m.text,
                style: theme.textTheme.p.copyWith(color: mine ? Colors.white : c.onSurface, height: 1.35)),
            const SizedBox(height: 3),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(m.time,
                    style: theme.textTheme.small
                        .copyWith(color: mine ? Colors.white70 : c.onSurfaceMuted, fontSize: 10)),
                if (mine) ...[
                  const SizedBox(width: 4),
                  const Icon(LucideIcons.checkCheck, size: 12, color: Colors.white70),
                ],
              ],
            ),
          ],
        ),
      ),
    );

    return Padding(
      padding: EdgeInsets.only(bottom: grouped ? 4 : 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!mine) ...[
            SizedBox(
              width: 28,
              child: grouped
                  ? null
                  : CircleAvatar(
                      radius: 14,
                      backgroundColor: c.iconBgSecondary,
                      child: Icon(LucideIcons.user, size: 15, color: c.primary),
                    ),
            ),
            const SizedBox(width: 8),
          ],
          bubbleContent,
          if (mine) const SizedBox(width: 4),
        ],
      ),
    );
  }

  // ---------- Composer ----------
  Widget _composer(ShadThemeData theme, UniMoveColors c) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(top: BorderSide(color: c.border)),
        boxShadow: [BoxShadow(color: c.navBarShadow, blurRadius: 16, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: c.surfaceHigh,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: c.border),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  controller: _inputCtrl,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _send(),
                  style: theme.textTheme.p.copyWith(color: c.onSurface),
                  decoration: InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    hintText: 'Nhập tin nhắn...',
                    hintStyle: theme.textTheme.p.copyWith(color: c.onSurfaceMuted),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _SendButton(color: c.primary, onTap: _send),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.3, end: 0, curve: Curves.easeOut);
  }

  Widget _readOnlyBanner(ShadThemeData theme, UniMoveColors c) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: c.surfaceHigh, borderRadius: BorderRadius.circular(12)),
              child: Icon(LucideIcons.lock, size: 18, color: c.onSurfaceMuted),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Chỉ xem lại đoạn chat. Bạn chỉ nhắn tin được khi đang thực hiện chuyến của khách này.',
                style: theme.textTheme.small.copyWith(color: c.onSurfaceMuted, height: 1.4),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.3, end: 0, curve: Curves.easeOut);
  }
}

class _SendButton extends StatefulWidget {
  const _SendButton({required this.color, required this.onTap});

  final Color color;
  final VoidCallback onTap;

  @override
  State<_SendButton> createState() => _SendButtonState();
}

class _SendButtonState extends State<_SendButton> {
  double _scale = 1;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _scale = 0.86),
      onTapUp: (_) => setState(() => _scale = 1),
      onTapCancel: () => setState(() => _scale = 1),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [widget.color, widget.color.withValues(alpha: 0.8)],
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(color: widget.color.withValues(alpha: 0.4), blurRadius: 12, offset: const Offset(0, 4)),
            ],
          ),
          child: const Icon(LucideIcons.send, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}
