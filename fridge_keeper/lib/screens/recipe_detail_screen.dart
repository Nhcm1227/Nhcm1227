import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/food_item.dart';
import '../services/recipe_engine.dart';
import '../state/inventory_store.dart';

class RecipeDetailScreen extends StatelessWidget {
  const RecipeDetailScreen({super.key, required this.match});

  final RecipeMatch match;

  @override
  Widget build(BuildContext context) {
    final r = match.recipe;
    final theme = Theme.of(context);
    final byIngredient = {for (final m in match.matched) m.ingredient: m.item};

    return Scaffold(
      appBar: AppBar(title: Text(r.name)),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: FilledButton.icon(
            icon: const Icon(Icons.soup_kitchen),
            label: const Text('Đã nấu món này — trừ nguyên liệu'),
            onPressed: () => _confirmCook(context),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(child: Text(r.emoji, style: const TextStyle(fontSize: 72))),
          Center(
            child: Text('⏱ ${r.minutes} phút',
                style: theme.textTheme.bodyMedium),
          ),
          const SizedBox(height: 16),
          Text('Nguyên liệu', style: theme.textTheme.titleMedium),
          for (final ing in r.ingredients)
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                byIngredient.containsKey(ing)
                    ? Icons.check_circle
                    : (ing.optional
                        ? Icons.radio_button_unchecked
                        : Icons.shopping_cart_outlined),
                color: byIngredient.containsKey(ing)
                    ? Colors.green
                    : (ing.optional ? theme.disabledColor : theme.colorScheme.error),
              ),
              title: Text('${ing.name}${ing.optional ? ' (tuỳ chọn)' : ''}'),
              subtitle: byIngredient.containsKey(ing)
                  ? Text('Có: ${byIngredient[ing]!.name} · '
                      '${describeDaysLeft(byIngredient[ing]!.daysLeft())}')
                  : (ing.optional ? null : const Text('Cần mua thêm')),
            ),
          if (r.pantry.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Gia vị: ${r.pantry.join(', ')}',
                  style: theme.textTheme.bodySmall),
            ),
          const SizedBox(height: 16),
          Text('Cách làm', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          for (var i = 0; i < r.steps.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(radius: 12, child: Text('${i + 1}',
                      style: const TextStyle(fontSize: 12))),
                  const SizedBox(width: 10),
                  Expanded(child: Text(r.steps[i])),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _confirmCook(BuildContext context) async {
    final store = context.read<InventoryStore>();
    final used = match.usedItems;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Trừ nguyên liệu?'),
        content: Text(used.isEmpty
            ? 'Món này không dùng đồ nào trong tủ.'
            : 'Mỗi món sau sẽ bị trừ 1 đơn vị (hết thì xoá khỏi tủ):\n'
                '${used.map((i) => '• ${i.name}').join('\n')}'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Huỷ')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Đồng ý')),
        ],
      ),
    );
    if (ok != true) return;
    await store.cookWith(used);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ngon miệng nhé! 😋')));
      Navigator.pop(context);
    }
  }
}
