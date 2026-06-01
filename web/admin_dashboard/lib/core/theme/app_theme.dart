import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7C3AED)),
        inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder(), filled: true),
      );
}
