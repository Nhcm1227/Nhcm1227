import '../data/recipes_data.dart';
import '../models/food_item.dart';
import '../models/recipe.dart';

class IngredientMatch {
  const IngredientMatch(this.ingredient, this.item);
  final RecipeIngredient ingredient;
  final FoodItem item;
}

class RecipeMatch {
  RecipeMatch({
    required this.recipe,
    required this.matched,
    required this.missingRequired,
    required this.missingOptional,
    required this.coverage,
    required this.score,
  });

  final Recipe recipe;
  final List<IngredientMatch> matched;
  final List<RecipeIngredient> missingRequired;
  final List<RecipeIngredient> missingOptional;

  /// Tỉ lệ nguyên liệu bắt buộc đã có (0..1).
  final double coverage;
  final double score;

  bool get canCookNow => missingRequired.isEmpty;
  List<FoodItem> get usedItems => matched.map((m) => m.item).toList();
}

/// Một bộ món ăn được chọn để dùng hết nhiều đồ sắp hết hạn nhất.
class MealPlan {
  const MealPlan(this.recipes, this.rescued, this.notCovered);

  final List<RecipeMatch> recipes;

  /// Các món đồ sắp hết hạn được "cứu" bởi kế hoạch này.
  final List<FoodItem> rescued;

  /// Các món đồ sắp hết hạn chưa có món nào dùng tới.
  final List<FoodItem> notCovered;

  bool get isEmpty => recipes.isEmpty;
}

class RecipeEngine {
  RecipeEngine({List<Recipe>? recipes}) : recipes = recipes ?? kRecipes;

  final List<Recipe> recipes;

  /// Món đồ được coi là "sắp hết hạn" nếu còn <= số ngày này.
  static const urgentDays = 5;

  /// Trọng số ưu tiên theo số ngày còn lại — càng gần hết hạn càng cao.
  static double urgencyWeight(int daysLeft) {
    if (daysLeft <= 1) return 20;
    if (daysLeft <= 3) return 12;
    if (daysLeft <= urgentDays) return 6;
    if (daysLeft <= 10) return 2;
    return 1;
  }

  /// Ghép nguyên liệu trong tủ với từng công thức.
  /// Mỗi nguyên liệu ưu tiên món đồ sắp hết hạn nhất.
  /// [preferId]: món đồ được ưu tiên dùng trước (món người dùng đang xem).
  RecipeMatch match(Recipe recipe, List<FoodItem> items,
      {DateTime? now, String? preferId}) {
    final available = items.where((i) => i.daysLeft(now) >= 0).toList()
      ..sort((a, b) {
        if (a.id == preferId) return -1;
        if (b.id == preferId) return 1;
        return a.expiryDate.compareTo(b.expiryDate);
      });

    final matched = <IngredientMatch>[];
    final missingRequired = <RecipeIngredient>[];
    final missingOptional = <RecipeIngredient>[];
    final usedIds = <String>{};

    for (final ing in recipe.ingredients) {
      FoodItem? found;
      for (final item in available) {
        if (!usedIds.contains(item.id) && ing.matches(item)) {
          found = item;
          break;
        }
      }
      if (found != null) {
        usedIds.add(found.id);
        matched.add(IngredientMatch(ing, found));
      } else if (ing.optional) {
        missingOptional.add(ing);
      } else {
        missingRequired.add(ing);
      }
    }

    final requiredCount = recipe.requiredIngredients.length;
    final haveRequired = requiredCount - missingRequired.length;
    final coverage = requiredCount == 0 ? 1.0 : haveRequired / requiredCount;

    var urgency = 0.0;
    for (final m in matched) {
      urgency += urgencyWeight(m.item.daysLeft(now));
    }

    final score = coverage * 60 +
        urgency +
        (missingRequired.isEmpty ? 15 : 0) -
        missingRequired.length * 8;

    return RecipeMatch(
      recipe: recipe,
      matched: matched,
      missingRequired: missingRequired,
      missingOptional: missingOptional,
      coverage: coverage,
      score: score,
    );
  }

  /// Gợi ý món ăn, sắp xếp theo điểm.
  /// Nếu có [focus], chỉ trả về các món dùng tới món đồ đó.
  List<RecipeMatch> suggest(List<FoodItem> items,
      {DateTime? now, FoodItem? focus}) {
    final results = <RecipeMatch>[];
    for (final r in recipes) {
      if (focus != null && !r.ingredients.any((i) => i.matches(focus))) {
        continue;
      }
      final m = match(r, items, now: now, preferId: focus?.id);
      if (m.matched.isEmpty) continue;
      final hasUrgent =
          m.matched.any((x) => x.item.daysLeft(now) <= urgentDays);
      if (focus == null && m.coverage < 0.5 && !hasUrgent) continue;
      results.add(m);
    }
    results.sort((a, b) => b.score.compareTo(a.score));
    return results;
  }

  /// Tìm tổ hợp tối đa [maxRecipes] món nấu được (thiếu tối đa
  /// [maxMissing] nguyên liệu) sao cho dùng được nhiều đồ sắp hết hạn nhất.
  ///
  /// Dùng thuật toán tham lam theo bài toán "phủ tập hợp có trọng số":
  /// mỗi bước chọn món "cứu" được tổng trọng số lớn nhất trong số đồ
  /// sắp hết hạn chưa được dùng; một món đồ không bị dùng cho 2 món.
  MealPlan planMeals(List<FoodItem> items,
      {DateTime? now, int maxRecipes = 3, int maxMissing = 1}) {
    final urgent = items
        .where((i) {
          final d = i.daysLeft(now);
          return d >= 0 && d <= urgentDays;
        })
        .toList()
      ..sort((a, b) => a.expiryDate.compareTo(b.expiryDate));
    if (urgent.isEmpty) return const MealPlan([], [], []);

    final chosen = <RecipeMatch>[];
    final usedIds = <String>{};
    final covered = <String>{};
    final chosenRecipeIds = <String>{};

    for (var round = 0; round < maxRecipes; round++) {
      RecipeMatch? best;
      var bestGain = 0.0;
      final remaining = items.where((i) => !usedIds.contains(i.id)).toList();
      for (final r in recipes) {
        if (chosenRecipeIds.contains(r.id)) continue;
        final m = match(r, remaining, now: now);
        if (m.missingRequired.length > maxMissing) continue;
        var gain = 0.0;
        for (final it in m.usedItems) {
          final d = it.daysLeft(now);
          if (d <= urgentDays && !covered.contains(it.id)) {
            gain += urgencyWeight(d);
          }
        }
        if (gain <= 0) continue;
        // Ưu tiên món nấu được ngay.
        gain -= m.missingRequired.length * 4;
        if (best == null ||
            gain > bestGain ||
            (gain == bestGain && m.score > best.score)) {
          best = m;
          bestGain = gain;
        }
      }
      if (best == null || bestGain <= 0) break;
      chosen.add(best);
      chosenRecipeIds.add(best.recipe.id);
      for (final it in best.usedItems) {
        usedIds.add(it.id);
        covered.add(it.id);
      }
    }

    return MealPlan(
      chosen,
      urgent.where((i) => covered.contains(i.id)).toList(),
      urgent.where((i) => !covered.contains(i.id)).toList(),
    );
  }
}
