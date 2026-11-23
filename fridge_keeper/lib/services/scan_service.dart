import 'package:google_mlkit_image_labeling/google_mlkit_image_labeling.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../models/food_item.dart';
import 'expiry_date_parser.dart';

class ProductScanResult {
  const ProductScanResult({
    required this.nameSuggestions,
    this.category,
    this.expiry,
  });

  final List<String> nameSuggestions;
  final FoodCategory? category;
  final ParsedExpiry? expiry;
}

class ExpiryScanResult {
  const ExpiryScanResult(this.rawText, this.expiry);
  final String rawText;
  final ParsedExpiry? expiry;
}

/// Nhận diện ảnh hoàn toàn trên máy bằng Google ML Kit (không cần mạng).
class ScanService {
  /// Đọc chữ trên ảnh chụp hạn sử dụng và tìm ngày hết hạn.
  Future<ExpiryScanResult> scanExpiry(String imagePath) async {
    final text = await _recognizeText(imagePath);
    return ExpiryScanResult(text, ExpiryDateParser.parse(text));
  }

  /// Phân tích ảnh chụp sản phẩm: gợi ý tên, nhóm, và thử tìm luôn HSD.
  Future<ProductScanResult> scanProduct(String imagePath) async {
    final labeler =
        ImageLabeler(options: ImageLabelerOptions(confidenceThreshold: 0.55));
    List<ImageLabel> labels;
    try {
      labels = await labeler.processImage(InputImage.fromFilePath(imagePath));
    } finally {
      await labeler.close();
    }
    final text = await _recognizeText(imagePath);

    final suggestions = <String>[];
    FoodCategory? category;
    for (final l in labels) {
      final key = l.label.toLowerCase();
      final vi = _labelVi[key];
      if (vi != null && !suggestions.contains(vi.$1)) {
        suggestions.add(vi.$1);
        category ??= vi.$2;
      }
    }

    // Các dòng chữ lớn trên bao bì thường là tên sản phẩm / thương hiệu.
    for (final line in text.split('\n')) {
      final t = line.trim();
      final letters = t.replaceAll(RegExp(r'[^A-Za-zÀ-ỹ]'), '').length;
      if (t.length >= 3 && t.length <= 30 && letters >= t.length * 0.6) {
        if (!suggestions.contains(t)) suggestions.add(t);
      }
      if (suggestions.length >= 6) break;
    }

    return ProductScanResult(
      nameSuggestions: suggestions,
      category: category,
      expiry: ExpiryDateParser.parse(text),
    );
  }

  Future<String> _recognizeText(String imagePath) async {
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final result =
          await recognizer.processImage(InputImage.fromFilePath(imagePath));
      return result.text;
    } finally {
      await recognizer.close();
    }
  }

  /// Nhãn tiếng Anh của ML Kit -> (tên tiếng Việt, nhóm).
  static const Map<String, (String, FoodCategory)> _labelVi = {
    'egg': ('Trứng', FoodCategory.dairyEgg),
    'milk': ('Sữa', FoodCategory.dairyEgg),
    'cheese': ('Phô mai', FoodCategory.dairyEgg),
    'yogurt': ('Sữa chua', FoodCategory.dairyEgg),
    'bread': ('Bánh mì', FoodCategory.dryGoods),
    'meat': ('Thịt', FoodCategory.meat),
    'beef': ('Thịt bò', FoodCategory.meat),
    'pork': ('Thịt heo', FoodCategory.meat),
    'chicken': ('Thịt gà', FoodCategory.meat),
    'sausage': ('Xúc xích', FoodCategory.meat),
    'fish': ('Cá', FoodCategory.seafood),
    'seafood': ('Hải sản', FoodCategory.seafood),
    'shrimp': ('Tôm', FoodCategory.seafood),
    'vegetable': ('Rau củ', FoodCategory.vegetable),
    'tomato': ('Cà chua', FoodCategory.vegetable),
    'carrot': ('Cà rốt', FoodCategory.vegetable),
    'potato': ('Khoai tây', FoodCategory.vegetable),
    'cabbage': ('Bắp cải', FoodCategory.vegetable),
    'mushroom': ('Nấm', FoodCategory.vegetable),
    'pumpkin': ('Bí đỏ', FoodCategory.vegetable),
    'fruit': ('Trái cây', FoodCategory.fruit),
    'banana': ('Chuối', FoodCategory.fruit),
    'apple': ('Táo', FoodCategory.fruit),
    'orange': ('Cam', FoodCategory.fruit),
    'grape': ('Nho', FoodCategory.fruit),
    'strawberry': ('Dâu tây', FoodCategory.fruit),
    'lemon': ('Chanh', FoodCategory.fruit),
    'juice': ('Nước ép', FoodCategory.drink),
    'drink': ('Đồ uống', FoodCategory.drink),
    'soft drink': ('Nước ngọt', FoodCategory.drink),
    'bottle': ('Đồ uống đóng chai', FoodCategory.drink),
    'noodle': ('Mì', FoodCategory.dryGoods),
    'rice': ('Gạo', FoodCategory.dryGoods),
    'cake': ('Bánh ngọt', FoodCategory.other),
    'cookie': ('Bánh quy', FoodCategory.dryGoods),
    'sauce': ('Nước sốt', FoodCategory.sauce),
    'food': ('Thực phẩm', FoodCategory.other),
  };
}
