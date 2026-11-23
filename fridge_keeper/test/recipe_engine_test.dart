import 'package:flutter_test/flutter_test.dart';
import 'package:fridge_keeper/data/recipes_data.dart';
import 'package:fridge_keeper/models/food_item.dart';
import 'package:fridge_keeper/services/recipe_engine.dart';
import 'package:fridge_keeper/utils/text_utils.dart';

void main() {
  final now = DateTime(2026, 11, 23, 10);
  var seq = 0;

  FoodItem item(String name, int daysLeft,
      {FoodCategory cat = FoodCategory.other}) {
    seq++;
    return FoodItem(
      id: 'id$seq',
      name: name,
      category: cat,
      expiryDate: DateTime(now.year, now.month, now.day + daysLeft),
      addedAt: now,
      notificationId: seq,
    );
  }

  final engine = RecipeEngine();

  test('normalizeText bỏ dấu tiếng Việt', () {
    expect(normalizeText('Thịt Bò Úc (500g)'), 'thit bo uc 500g');
    expect(normalizeText('Đậu phụ'), 'dau phu');
  });

  test('Trứng gà không bị nhận là thịt gà', () {
    final items = [item('Trứng gà', 5)];
    final m = engine.match(
        kRecipes.firstWhere((r) => r.id == 'ga_kho_gung'), items,
        now: now);
    expect(m.matched, isEmpty);
  });

  test('Bò Mỹ không bị nhận là mì', () {
    final items = [item('Thịt bò Mỹ', 5)];
    final m = engine.match(
        kRecipes.firstWhere((r) => r.id == 'mi_xao_bo'), items,
        now: now);
    expect(m.matched.map((x) => x.ingredient.name), ['Thịt bò']);
  });

  test('Gợi ý món nấu được ngay, ưu tiên đồ sắp hết hạn', () {
    final items = [
      item('Trứng gà', 10),
      item('Cà chua', 1),
      item('Thịt bò', 20),
    ];
    final s = engine.suggest(items, now: now);
    expect(s, isNotEmpty);
    expect(s.first.canCookNow, isTrue);
    expect(s.first.usedItems.map((i) => i.name), contains('Cà chua'));
  });

  test('Đồ đã hết hạn không được dùng để gợi ý', () {
    final items = [item('Trứng', -1), item('Cà chua', -2)];
    expect(engine.suggest(items, now: now), isEmpty);
  });

  test('Gợi ý theo một món cụ thể', () {
    final chuoi = item('Chuối', 2, cat: FoodCategory.fruit);
    final items = [chuoi, item('Sữa tươi', 5), item('Sữa chua', 4)];
    final s = engine.suggest(items, now: now, focus: chuoi);
    final ids = s.map((m) => m.recipe.id).toList();
    expect(ids, containsAll(['sinh_to_chuoi', 'sua_chua_trai_cay']));
    for (final m in s) {
      expect(m.usedItems.any((i) => i.id == chuoi.id), isTrue);
    }
  });

  test('Kế hoạch kết hợp nhiều món dùng hết đồ sắp hết hạn', () {
    final items = [
      item('Trứng gà', 2),
      item('Cà chua', 1),
      item('Chuối', 1, cat: FoodCategory.fruit),
      item('Sữa tươi', 3),
      item('Rau muống', 1),
      item('Gạo', 300, cat: FoodCategory.dryGoods),
    ];
    final plan = engine.planMeals(items, now: now);
    expect(plan.recipes.length, greaterThanOrEqualTo(3));
    final rescuedNames = plan.rescued.map((i) => i.name).toSet();
    expect(rescuedNames,
        containsAll(['Trứng gà', 'Cà chua', 'Chuối', 'Sữa tươi', 'Rau muống']));
    expect(plan.notCovered, isEmpty);

    // Không món đồ nào bị dùng cho 2 món.
    final used = plan.recipes.expand((m) => m.usedItems.map((i) => i.id));
    expect(used.length, used.toSet().length);
  });

  test('Không có đồ sắp hết hạn thì kế hoạch rỗng', () {
    final plan = engine.planMeals([item('Gạo', 200)], now: now);
    expect(plan.isEmpty, isTrue);
  });

  test('Số ngày còn lại và trạng thái', () {
    expect(item('A', 0).daysLeft(now), 0);
    expect(item('A', 0).status(now), ExpiryStatus.today);
    expect(item('A', 2).status(now), ExpiryStatus.soon);
    expect(item('A', -3).status(now), ExpiryStatus.expired);
    expect(item('A', 30).status(now), ExpiryStatus.fresh);
    expect(describeDaysLeft(1), 'Hết hạn ngày mai');
  });
}
