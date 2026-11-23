import 'dart:io';

import 'package:flutter/foundation.dart';

import '../models/food_item.dart';
import '../services/notification_service.dart';
import '../services/recipe_engine.dart';
import '../services/storage_service.dart';

class InventoryStore extends ChangeNotifier {
  InventoryStore({
    required this.storage,
    required this.notifications,
    RecipeEngine? engine,
  }) : engine = engine ?? RecipeEngine();

  final StorageService storage;
  final NotificationService notifications;
  final RecipeEngine engine;

  List<FoodItem> _items = [];

  /// Danh sách sắp xếp theo hạn sử dụng gần nhất trước.
  List<FoodItem> get items => List.unmodifiable(
      [..._items]..sort((a, b) => a.expiryDate.compareTo(b.expiryDate)));

  int get expiredCount =>
      _items.where((i) => i.status() == ExpiryStatus.expired).length;
  int get soonCount => _items.where((i) {
        final s = i.status();
        return s == ExpiryStatus.today || s == ExpiryStatus.soon;
      }).length;

  Future<void> load() async {
    _items = storage.loadItems();
    notifyListeners();
    // Lên lịch lại mỗi lần mở app để thông báo luôn đúng.
    await notifications.rescheduleAll(_items, suggestionFor: suggestionFor);
  }

  File? imageFor(FoodItem item) => storage.imageFile(item.imageFileName);

  /// Tên món ăn gợi ý tốt nhất có dùng [item].
  String? suggestionFor(FoodItem item) =>
      engine.suggest(_items, focus: item).firstOrNull?.recipe.name;

  Future<void> addOrUpdate(FoodItem item) async {
    final idx = _items.indexWhere((i) => i.id == item.id);
    if (idx >= 0) {
      final old = _items[idx];
      if (old.imageFileName != null &&
          old.imageFileName != item.imageFileName) {
        await storage.deleteImage(old.imageFileName);
      }
      _items[idx] = item;
    } else {
      _items.add(item);
    }
    await _persist();
    await notifications.scheduleFor(item,
        suggestion: suggestionFor(item), notifyNowIfLate: true);
  }

  /// Xoá khỏi tủ. [keepImage] dùng cho tính năng "Hoàn tác".
  Future<void> remove(FoodItem item, {bool keepImage = false}) async {
    _items.removeWhere((i) => i.id == item.id);
    await _persist();
    await notifications.cancelFor(item);
    if (!keepImage) await storage.deleteImage(item.imageFileName);
  }

  /// Đánh dấu đã dùng [amount]; hết số lượng thì xoá khỏi tủ.
  Future<void> consume(FoodItem item, double amount) async {
    final left = item.quantity - amount;
    if (left <= 0.0001) {
      await remove(item);
    } else {
      final idx = _items.indexWhere((i) => i.id == item.id);
      if (idx < 0) return;
      _items[idx] = item.copyWith(quantity: left);
      await _persist();
    }
  }

  /// Dùng nguyên liệu cho một món ăn: trừ 1 đơn vị mỗi món đồ.
  Future<void> cookWith(List<FoodItem> used) async {
    for (final it in used) {
      final current = _items.where((i) => i.id == it.id).firstOrNull;
      if (current != null) await consume(current, 1);
    }
  }

  Future<void> _persist() async {
    await storage.saveItems(_items);
    notifyListeners();
  }
}
