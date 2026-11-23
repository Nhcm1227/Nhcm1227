import '../utils/text_utils.dart';
import 'food_item.dart';

/// Một nguyên liệu trong công thức và cách nhận ra nó trong tủ lạnh.
class RecipeIngredient {
  const RecipeIngredient(
    this.name, {
    required this.keywords,
    this.excludes = const [],
    this.categories = const <FoodCategory>{},
    this.optional = false,
  });

  final String name;

  /// Từ khoá đã bỏ dấu, viết thường. So khớp nguyên cụm từ trong tên món đồ.
  /// Tiền tố '=' nghĩa là tên món đồ phải đúng y như vậy (vd '=ca' cho "Cá").
  final List<String> keywords;

  /// Nếu tên món đồ chứa một trong các cụm này thì KHÔNG khớp
  /// (vd "trứng gà" không phải "thịt gà").
  final List<String> excludes;

  /// Khớp với mọi món đồ thuộc các nhóm này (vd "trái cây bất kỳ").
  final Set<FoodCategory> categories;

  final bool optional;

  RecipeIngredient asOptional() => RecipeIngredient(name,
      keywords: keywords,
      excludes: excludes,
      categories: categories,
      optional: true);

  bool matches(FoodItem item) {
    final n = normalizeText(item.name);
    if (excludes.any((e) => containsPhrase(n, e))) return false;
    if (categories.contains(item.category)) return true;
    for (final k in keywords) {
      if (k.startsWith('=')) {
        if (n == k.substring(1)) return true;
      } else if (containsPhrase(n, k)) {
        return true;
      }
    }
    return false;
  }
}

class Recipe {
  const Recipe({
    required this.id,
    required this.name,
    required this.emoji,
    required this.minutes,
    required this.ingredients,
    this.pantry = const [],
    required this.steps,
  });

  final String id;
  final String name;
  final String emoji;
  final int minutes;
  final List<RecipeIngredient> ingredients;

  /// Gia vị cơ bản coi như nhà nào cũng có (muối, dầu ăn, nước mắm...).
  final List<String> pantry;
  final List<String> steps;

  Iterable<RecipeIngredient> get requiredIngredients =>
      ingredients.where((i) => !i.optional);
}
