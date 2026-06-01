import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/auth/auth_token_storage.dart';
import '../../../../core/services/onboarding_prefs.dart';

const _minSplashDuration = Duration(milliseconds: 1500);

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_navigateWhenReady());
    });
  }

  Future<void> _navigateWhenReady() async {
    await Future<void>.delayed(_minSplashDuration);
    if (!mounted || _navigated) return;
    _navigated = true;

    final hasSession = await AuthTokenStorage.instance.hasSession();
    if (hasSession) {
      context.go('/home');
      return;
    }

    final onboardingDone = await isProviderOnboardingDone();
    context.go(onboardingDone ? '/login' : '/onboarding');
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_shipping, size: 72),
            SizedBox(height: 16),
            Text('UniMove Partner', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
