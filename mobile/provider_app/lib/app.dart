import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _appName = 'UniMove Provider';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

class UniMoveProviderApp extends ConsumerWidget {
  const UniMoveProviderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: _appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
