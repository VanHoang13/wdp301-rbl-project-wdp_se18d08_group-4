import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/mock/mock_auth_session.dart';
import '../../../../core/mock/mock_customer_data.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/uni_move_colors.dart';
import '../../../../core/widgets/pressable_scale.dart';
import '../../../../core/widgets/theme_toggle_tile.dart';
import '../../../../core/widgets/uni_surface_card.dart';
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
  int _totalOrders = MockCustomerData.totalOrders;
  double _rating = MockCustomerData.rating;
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
          _totalOrders = MockCustomerData.totalOrders;
          _rating = MockCustomerData.rating;
          _wallet = MockCustomerData.walletBalance;
          _avatarUrl = MockCustomerData.avatarUrl;
          _loadingProfile = false;
        });
      }
      return;
    }

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        if (mounted) setState(() => _loadingProfile = false);
        return;
      }
      final row = await Supabase.instance.client
          .from('profiles')
          .select('full_name, email, phone, avatar_url, student_id, total_orders, rating, loyalty_points')
          .eq('id', user.id)
          .maybeSingle();
      if (mounted) {
        setState(() {
          if (row != null) {
            _fullName = (row['full_name'] as String?) ?? _fullName;
            _email = (row['email'] as String?) ?? _email;
            _phone = (row['phone'] as String?) ?? _phone;
            _studentId = (row['student_id'] as String?) ?? _studentId;
            _avatarUrl = row['avatar_url'] as String?;
            _totalOrders = (row['total_orders'] as num?)?.toInt() ?? _totalOrders;
            _rating = (row['rating'] as num?)?.toDouble() ?? _rating;
            _wallet = (row['loyalty_points'] as num?)?.toInt() ?? _wallet;
          }
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
      await CustomerAuthRepository(Supabase.instance.client).signOut();
      if (mounted) context.go('/login');
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  String _formatWallet(int v) {
    final s = v.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return '${buf}đ';
  }

  @override
  Widget build(BuildContext context) {
    final c = UniMoveColors.of(context);
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: context.canPop()
          ? AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                icon: Icon(Icons.arrow_back_ios_new, color: c.onSurface, size: 20),
                onPressed: () => context.pop(),
              ),
              title: Text('Hồ sơ', style: theme.textTheme.h4.copyWith(fontWeight: FontWeight.w800)),
            )
          : null,
      body: SafeArea(
        top: !context.canPop(),
        child: _loadingProfile
          ? Center(child: CircularProgressIndicator(color: c.primary))
          : ListView(
              padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 120.h),
              children: [
                Center(
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 48.r,
                        backgroundImage: _avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl!) : null,
                        child: _avatarUrl == null ? Icon(Icons.person, size: 48.sp, color: c.primary) : null,
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          width: 32.w,
                          height: 32.w,
                          decoration: BoxDecoration(
                            color: c.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: c.surface, width: 2),
                          ),
                          child: Icon(Icons.edit, color: AppColors.onPrimary, size: 16.sp),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 12.h),
                Text(
                  _fullName,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.h3.copyWith(fontWeight: FontWeight.w800),
                ),
                Text(
                  'MSSV: $_studentId • $_phone',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.muted,
                ),
                SizedBox(height: 20.h),
                UniSurfaceCard(
                  padding: EdgeInsets.symmetric(vertical: 16.h),
                  child: Row(
                    children: [
                      Expanded(child: _stat('CHUYẾN ĐI', '$_totalOrders', c)),
                      Container(width: 1, height: 40.h, color: c.border),
                      Expanded(child: _stat('ĐÁNH GIÁ', '$_rating ★', c)),
                    ],
                  ),
                ),
                SizedBox(height: 12.h),
                PressableScale(
                  onTap: () {},
                  child: UniSurfaceCard(
                    child: Row(
                      children: [
                        Container(
                          width: 44.w,
                          height: 44.w,
                          decoration: BoxDecoration(color: c.chipBg, shape: BoxShape.circle),
                          child: Icon(Icons.account_balance_wallet_outlined, color: c.primary),
                        ),
                        SizedBox(width: 12.w),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Ví UniMove', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15.sp)),
                              Text(
                                'Số dư: ${_formatWallet(_wallet)}',
                                style: TextStyle(color: c.primary, fontWeight: FontWeight.w800, fontSize: 14.sp),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, color: c.onSurfaceMuted),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16.h),
                UniSurfaceCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _menuRow(Icons.confirmation_number_outlined, 'Mã giảm giá của tôi', c),
                      Divider(height: 1, color: c.border),
                      _menuRow(Icons.location_on_outlined, 'Địa chỉ đã lưu', c),
                      Divider(height: 1, color: c.border),
                      _menuRow(Icons.link, 'Liên kết tài khoản', c),
                    ],
                  ),
                ),
                SizedBox(height: 12.h),
                UniSurfaceCard(
                  onTap: () {},
                  child: Row(
                    children: [
                      Icon(Icons.help_outline, color: c.primary),
                      SizedBox(width: 12.w),
                      Text('Trung tâm trợ giúp', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15.sp)),
                      const Spacer(),
                      Icon(Icons.chevron_right, color: c.onSurfaceMuted),
                    ],
                  ),
                ),
                SizedBox(height: 12.h),
                const ThemeToggleTile(),
                SizedBox(height: 12.h),
                PressableScale(
                  onTap: _signingOut ? null : _signOut,
                  child: Container(
                    padding: EdgeInsets.symmetric(vertical: 14.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(16.r),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_signingOut)
                          SizedBox(
                            width: 18.w,
                            height: 18.w,
                            child: const CircularProgressIndicator(strokeWidth: 2),
                          )
                        else
                          Icon(Icons.logout, color: const Color(0xFFDC2626), size: 20.sp),
                        SizedBox(width: 8.w),
                        Text(
                          _signingOut ? 'Đang đăng xuất...' : 'Đăng xuất',
                          style: TextStyle(
                            color: const Color(0xFFDC2626),
                            fontWeight: FontWeight.w700,
                            fontSize: 15.sp,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 20.h),
                Text(
                  'UniMove Version 2.4.0-build.11',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11.sp, color: c.onSurfaceMuted),
                ),
              ],
            ),
      ),
    );
  }

  Widget _stat(String label, String value, UniMoveColors c) {
    return Column(
      children: [
        Text(label, style: TextStyle(fontSize: 10.sp, fontWeight: FontWeight.w700, color: c.onSurfaceMuted)),
        SizedBox(height: 4.h),
        Text(value, style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w800, color: c.onSurface)),
      ],
    );
  }

  Widget _menuRow(IconData icon, String label, UniMoveColors c) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
      child: Row(
        children: [
          Icon(icon, color: c.primary, size: 22.sp),
          SizedBox(width: 12.w),
          Expanded(child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15.sp))),
          Icon(Icons.chevron_right, color: c.onSurfaceMuted),
        ],
      ),
    );
  }
}
