import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/food_item.dart';

/// Lưu danh sách đồ ăn (JSON) và ảnh chụp ngay trên máy.
class StorageService {
  static const _itemsKey = 'food_items_v1';

  late final SharedPreferences _prefs;
  late final Directory _imagesDir;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    final docs = await getApplicationDocumentsDirectory();
    _imagesDir = Directory('${docs.path}/food_images');
    if (!await _imagesDir.exists()) {
      await _imagesDir.create(recursive: true);
    }
  }

  List<FoodItem> loadItems() {
    final raw = _prefs.getString(_itemsKey);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => FoodItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveItems(List<FoodItem> items) =>
      _prefs.setString(_itemsKey, jsonEncode(items.map((e) => e.toJson()).toList()));

  /// Sao chép ảnh tạm từ camera vào thư mục của app, trả về tên file.
  Future<String> saveImage(String sourcePath) async {
    final ext = sourcePath.contains('.') ? sourcePath.split('.').last : 'jpg';
    final name = 'img_${DateTime.now().microsecondsSinceEpoch}.$ext';
    await File(sourcePath).copy('${_imagesDir.path}/$name');
    return name;
  }

  File? imageFile(String? fileName) {
    if (fileName == null) return null;
    final f = File('${_imagesDir.path}/$fileName');
    return f.existsSync() ? f : null;
  }

  Future<void> deleteImage(String? fileName) async {
    final f = imageFile(fileName);
    if (f != null) await f.delete();
  }
}
