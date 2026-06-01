import 'package:dio/dio.dart';

/// HTTP client dùng chung (sẵn sàng nối API backend).
class ApiClient {
  ApiClient({String? baseUrl})
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? 'https://api.unimove.app',
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 12),
            headers: {'Accept': 'application/json'},
          ),
        );

  final Dio dio;
}
