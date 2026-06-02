import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import '../../../../core/mock/mock_auth_session.dart';
import '../../../../core/mock/mock_customer_data.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/theme_toggle_tile.dart';
import '../../../../core/widgets/uni_surface_card.dart';
import '../../../../core/auth/auth_token_storage.dart';
import '../../../auth/data/customer_auth_repository.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  String _fullName = MockCustomerData.fullName;
  String _email = MockCustomerData.email;
  String _phone = MockCustomerData.phone;
  String _studentId = MockCustomerData.studentId;
  int _wallet = MockCustomerData.walletBalance;
  String? _avatarUrl = MockCustomerData.avatarUrl;
  bool _loadingProfile = true;
  bool _signingOut = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    if (await MockAuthSession.isSignedIn()) {
      if (mounted) {
        setState(() {
          _fullName = MockCustomerData.fullName;
          _email = MockCustomerData.email;
          _phone = MockCustomerData.phone;
          _studentId = MockCustomerData.studentId;
          _wallet = MockCustomerData.walletBalance;
          _avatarUrl = MockCustomerData.avatarUrl;
          _loadingProfile = false;
        });
      }
      return;
    }

    final stored = await AuthTokenStorage.instance.loadUser();
    if (stored != null && mounted) {
      setState(() {
        _fullName = stored['full_name'] as String? ?? _fullName;
        _email = stored['email'] as String? ?? _email;
        _phone = stored['phone'] as String? ?? _phone;
        _avatarUrl = stored['avatar_url'] as String? ?? _avatarUrl;
      });
    }

    try {
      final user = await CustomerAuthRepository().fetchMe();
      if (mounted) {
        setState(() {
          _fullName = user.fullName;
          _email = user.email;
          _phone = user.phone ?? _phone;
          _studentId = user.studentId ?? _studentId;
          _avatarUrl = user.avatarUrl ?? _avatarUrl;
          _wallet = user.loyaltyPoints ?? _wallet;
          _loadingProfile = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingProfile = false);
    }
  }

  Future<void> _signOut() async {
    setState(() => _signingOut = true);
    try {
      await CustomerAuthRepository().signOut();
      if (mounted) context.go('/login');
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);

    return Scaffold(
      backgroundColor: c.background,
      body: SafeArea(
        child: _loadingProfile
            ? const Center(child: CircularProgressIndicator())
            : CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, 0),
                      child: Text(
                        'Hồ sơ',
                        style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w700, color: c.onSurface),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(20.w),
                      child: UniSurfaceCard(
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 36.r,
                              backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                              backgroundImage: _avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl!) : null,
                              child: _avatarUrl == null
                                  ? Text(
                                      _fullName.isNotEmpty ? _fullName[0].toUpperCase() : '?',
                                      style: TextStyle(fontSize: 24.sp, fontWeight: FontWeight.bold, color: AppColors.primary),
                                    )
                                  : null,
                            ),
                            SizedBox(width: 16.w),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_fullName, style: TextStyle(fontSize: 18.sp, fontWeight: FontWeight.w700, color: c.onSurface)),
                                  SizedBox(height: 4.h),
                                  Text(_email, style: TextStyle(fontSize: 13.sp, color: c.onSurfaceMuted)),
                                  if (_phone.isNotEmpty) ...[
                                    SizedBox(height: 2.h),
                                    Text(_phone, style: TextStyle(fontSize: 13.sp, color: c.onSurfaceMuted)),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      child: const ThemeToggleTile(),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(20.w, 24.h, 20.w, 32.h),
                      child: ShadButton.destructive(
                        width: double.infinity,
                        onPressed: _signingOut ? null : _signOut,
                        child: _signingOut
                            ? SizedBox(width: 20.w, height: 20.w, child: const CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Đăng xuất'),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
