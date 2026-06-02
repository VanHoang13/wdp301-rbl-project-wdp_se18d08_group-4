import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/api_client.dart';
import '../../../../data/admin_repository.dart';
import '../../../auth/data/auth_repository.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          TextButton.icon(
            onPressed: () async {
              await ref.read(authRepositoryProvider).signOut();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
            label: const Text('Đăng xuất'),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final crossAxisCount = constraints.maxWidth > 900 ? 4 : 2;
            return GridView.count(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _StatCard(
                  title: 'Đơn hàng',
                  icon: Icons.receipt_long,
                  onTap: () => _showTableCount(context, ref, 'orders', 'Tổng đơn hàng'),
                ),
                _StatCard(
                  title: 'Providers chờ duyệt',
                  icon: Icons.pending_actions,
                  onTap: () => _loadPendingProviders(ref, context),
                ),
                _StatCard(
                  title: 'Disputes mở',
                  icon: Icons.gavel,
                  onTap: () => _showOpenDisputes(context, ref),
                ),
                _StatCard(
                  title: 'Users',
                  icon: Icons.people,
                  onTap: () => _showTableCount(context, ref, 'profiles', 'Tổng users'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _showTableCount(
    BuildContext context,
    WidgetRef ref,
    String table,
    String title,
  ) async {
    try {
      final count = await ref.read(adminRepositoryProvider).getTableCount(table);
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: Text(title),
          content: Text('Số lượng: $count'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng'))],
        ),
      );
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _showOpenDisputes(BuildContext context, WidgetRef ref) async {
    try {
      final rows = await ref.read(adminRepositoryProvider).getOpenDisputes();
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Disputes đang mở'),
          content: rows.isEmpty
              ? const Text('Không có dispute nào.')
              : SizedBox(
                  width: 420,
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final row in rows)
                        ListTile(
                          title: Text(row['subject']?.toString() ?? ''),
                          subtitle: Text(row['status']?.toString() ?? ''),
                        ),
                    ],
                  ),
                ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng'))],
        ),
      );
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _loadPendingProviders(WidgetRef ref, BuildContext context) async {
    try {
      final rows = await ref.read(adminRepositoryProvider).getPendingProviders();
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Provider chờ duyệt'),
          content: rows.isEmpty
              ? const Text('Không có provider nào chờ duyệt.')
              : SizedBox(
                  width: 400,
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final row in rows)
                        ListTile(title: Text(row['business_name']?.toString() ?? 'N/A')),
                    ],
                  ),
                ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng'))],
        ),
      );
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.icon, required this.onTap});

  final String title;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 40, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 12),
              Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
        ),
      ),
    );
  }
}
