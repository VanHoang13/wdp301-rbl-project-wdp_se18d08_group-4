import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/auth_repository.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../auth/auth_token_storage.dart';
import '../services/auth_session_notifier.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: authSessionNotifier,
    redirect: (context, state) {
      final isLogin = state.matchedLocation == '/login';
      final hasSession = AuthTokenStorage.instance.cachedToken?.isNotEmpty == true;

      if (!hasSession && !isLogin) return '/login';
      if (hasSession && isLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/dashboard', builder: (_, __) => const DashboardPage()),
    ],
  );
});
