import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/food_item.dart';
import '../services/recipe_engine.dart';
import '../state/inventory_store.dart';
import '../widgets/expiry_style.dart';
import 'recipe_detail_screen.dart';

/// Gợi ý món ăn từ đồ trong tủ. Nếu có [focus] thì chỉ gợi ý món dùng món đó.
class RecipesScreen extends StatelessWidget {
  const RecipesScreen({super.key, this.focus});

  final FoodItem? focus;

  @override
  Widget build(BuildContext context) {
    final store = context.watch<InventoryStore>();
    final items = store.items;
    final suggestions = store.engine.suggest(items, focus: focus);
    final plan = focus == null ? store.engine.planMeals(items) : null;

    final ready = suggestions.where((m) => m.canCookNow).toList();
    final almost = suggestions
        .where((m) => !m.canCookNow && m.missingRequired.length <= 2)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(focus == null ? 'Gợi ý món ăn' : 'Món ngon với ${focus!.name}'),
      ),
      body: items.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('Thêm đồ vào tủ lạnh để nhận gợi ý món ăn 🍽️',
                    textAlign: TextAlign.center),
              ),
            )
          : ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                if (plan != null && !plan.isEmpty) _PlanCard(plan: plan),
                if (plan != null && plan.isEmpty && store.soonCount == 0)
                  const _InfoBanner(
                      '✅ Không có món nào sắp hết hạn. Dưới đây là các món bạn có thể nấu.'),
                if (ready.isNotEmpty) ...[
                  const _SectionTitle('🍳 Nấu được ngay'),
                  for (final m in ready) _RecipeTile(match: m),
                ],
                if (almost.isNotEmpty) ...[
                  const _SectionTitle('🛒 Thiếu một chút nguyên liệu'),
                  for (final m in almost) _RecipeTile(match: m),
                ],
                if (ready.isEmpty && almost.isEmpty)
                  const _InfoBanner(
                      'Chưa tìm được món phù hợp. Thử thêm vài nguyên liệu như trứng, rau, thịt nhé!'),
              ],
            ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan});

  final MealPlan plan;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      color: theme.colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('♻️ Kế hoạch dùng hết đồ sắp hết hạn',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(
              'Kết hợp ${plan.recipes.length} món để dùng ${plan.rescued.length} '
              'món đồ sắp hết hạn:',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            for (final m in plan.recipes)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Text(m.recipe.emoji,
                    style: const TextStyle(fontSize: 28)),
                title: Text(m.recipe.name),
                subtitle: Text(
                  'Dùng: ${m.usedItems.map((i) => i.name).join(', ')}'
                  '${m.canCookNow ? '' : '\nCần mua: ${m.missingRequired.map((i) => i.name).join(', ')}'}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => RecipeDetailScreen(match: m))),
              ),
            if (plan.notCovered.isNotEmpty)
              Text(
                'Chưa có món cho: ${plan.notCovered.map((i) => i.name).join(', ')}',
                style: theme.textTheme.bodySmall,
              ),
          ],
        ),
      ),
    );
  }
}

class _RecipeTile extends StatelessWidget {
  const _RecipeTile({required this.match});

  final RecipeMatch match;

  @override
  Widget build(BuildContext context) {
    final r = match.recipe;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => RecipeDetailScreen(match: match))),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(r.emoji, style: const TextStyle(fontSize: 36)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(r.name,
                        style: Theme.of(context).textTheme.titleMedium),
                    Text('⏱ ${r.minutes} phút',
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: [
                        for (final m in match.matched)
                          _ItemChip(item: m.item),
                        for (final miss in match.missingRequired)
                          Chip(
                            visualDensity: VisualDensity.compact,
                            label: Text('Thiếu: ${miss.name}'),
                            labelStyle: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.error),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ItemChip extends StatelessWidget {
  const _ItemChip({required this.item});

  final FoodItem item;

  @override
  Widget build(BuildContext context) {
    final status = item.status();
    final color = expiryColor(context, status);
    final urgent = status != ExpiryStatus.fresh;
    return Chip(
      visualDensity: VisualDensity.compact,
      backgroundColor: urgent ? color.withValues(alpha: 0.12) : null,
      label: Text(urgent ? '${item.name} · ${describeDaysLeft(item.daysLeft())}' : item.name),
      labelStyle: TextStyle(fontSize: 12, color: urgent ? color : null),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: Text(text,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
      );
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
      );
}
