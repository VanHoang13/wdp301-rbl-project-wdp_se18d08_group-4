import 'package:flutter/foundation.dart';

class AuthSessionNotifier extends ChangeNotifier {
  void notifyAuthChanged() => notifyListeners();
}

final authSessionNotifier = AuthSessionNotifier();
