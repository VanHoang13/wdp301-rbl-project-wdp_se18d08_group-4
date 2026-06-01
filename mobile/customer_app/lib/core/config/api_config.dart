import 'package:flutter/foundation.dart';

/// Base URL Node API — Android emulator dùng 10.0.2.2 thay localhost.
abstract final class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000';
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:3000';
      default:
        return 'http://localhost:3000';
    }
  }

  static const apiPrefix = '/api';
}
