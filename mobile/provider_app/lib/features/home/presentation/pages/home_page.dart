import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../auth/data/auth_repository.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(providerProfileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('UniMove Partner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authRepositoryProvider).signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Lỗi: $e')),
        data: (profile) {
          final verified = profile?.isVerified ?? false;
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Xin chào, ${profile?.fullName ?? ''}!', style: Theme.of(context).textTheme.headlineSmall),
                Text('${profile?.businessName ?? ''} • Rating: ${profile?.rating ?? 0}'),
                const SizedBox(height: 12),
                Chip(
                  avatar: Icon(verified ? Icons.verified : Icons.pending, size: 18),
                  label: Text(verified ? 'Đã xác thực' : 'Chờ admin duyệt'),
                ),
                const SizedBox(height: 24),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.inbox),
                    title: const Text('Đơn hàng mới'),
                    subtitle: const Text('Accept / Decline — coming soon'),
                  ),
                ),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.upload_file),
                    title: const Text('Upload giấy tờ'),
                    subtitle: const Text('provider_documents — coming soon'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
