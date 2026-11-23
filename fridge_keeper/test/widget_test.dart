// File này được giữ lại để `flutter create` không sinh file test mẫu
// (tham chiếu tới MyApp không tồn tại). Logic được test trong các file khác.
import 'package:flutter_test/flutter_test.dart';
import 'package:fridge_keeper/models/food_item.dart';

void main() {
  test('FoodItem JSON round-trip', () {
    final item = FoodItem.create(
      name: 'Sữa tươi',
      category: FoodCategory.dairyEgg,
      expiryDate: DateTime(2027, 1, 1),
      quantity: 2,
      unit: 'hộp',
    );
    final back = FoodItem.fromJson(item.toJson());
    expect(back.name, item.name);
    expect(back.category, item.category);
    expect(back.expiryDate, item.expiryDate);
    expect(back.quantity, 2);
    expect(back.notificationId, item.notificationId);
  });
}
