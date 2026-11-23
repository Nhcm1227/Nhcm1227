import 'dart:math';

enum FoodCategory {
  vegetable('Rau củ', '🥬', 5),
  fruit('Trái cây', '🍎', 7),
  meat('Thịt', '🥩', 3),
  seafood('Hải sản', '🐟', 2),
  dairyEgg('Sữa & trứng', '🥚', 10),
  cooked('Đồ nấu sẵn', '🍲', 3),
  dryGoods('Đồ khô', '🍚', 180),
  drink('Đồ uống', '🧃', 30),
  sauce('Gia vị & sốt', '🧂', 90),
  other('Khác', '📦', 7);

  const FoodCategory(this.label, this.emoji, this.defaultShelfDays);

  final String label;
  final String emoji;

  /// Số ngày bảo quản gợi ý khi người dùng không có hạn in trên bao bì.
  final int defaultShelfDays;
}

enum ExpiryStatus { expired, today, soon, fresh }

class FoodItem {
  FoodItem({
    required this.id,
    required this.name,
    required this.category,
    required this.expiryDate,
    this.quantity = 1,
    this.unit = 'cái',
    this.imageFileName,
    required this.addedAt,
    required this.notificationId,
    this.note,
  });

  factory FoodItem.create({
    required String name,
    required FoodCategory category,
    required DateTime expiryDate,
    double quantity = 1,
    String unit = 'cái',
    String? imageFileName,
    String? note,
  }) {
    final rnd = Random();
    return FoodItem(
      id: '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}'
          '${rnd.nextInt(1 << 20).toRadixString(36)}',
      name: name,
      category: category,
      expiryDate: expiryDate,
      quantity: quantity,
      unit: unit,
      imageFileName: imageFileName,
      addedAt: DateTime.now(),
      // Mỗi món dùng 2 id thông báo: notificationId*2 và notificationId*2+1.
      notificationId: rnd.nextInt(1 << 29),
      note: note,
    );
  }

  final String id;
  final String name;
  final FoodCategory category;
  final DateTime expiryDate;
  final double quantity;
  final String unit;

  /// Tên file ảnh (chỉ tên, không phải đường dẫn) trong thư mục ảnh của app.
  /// iOS đổi đường dẫn container sau mỗi lần cập nhật app nên không lưu
  /// đường dẫn tuyệt đối.
  final String? imageFileName;
  final DateTime addedAt;
  final int notificationId;
  final String? note;

  /// Số ngày còn lại tính theo ngày lịch (âm = đã quá hạn).
  int daysLeft([DateTime? now]) {
    final n = now ?? DateTime.now();
    final today = DateTime.utc(n.year, n.month, n.day);
    final exp = DateTime.utc(expiryDate.year, expiryDate.month, expiryDate.day);
    return exp.difference(today).inDays;
  }

  ExpiryStatus status([DateTime? now]) {
    final d = daysLeft(now);
    if (d < 0) return ExpiryStatus.expired;
    if (d == 0) return ExpiryStatus.today;
    if (d <= 3) return ExpiryStatus.soon;
    return ExpiryStatus.fresh;
  }

  FoodItem copyWith({
    String? name,
    FoodCategory? category,
    DateTime? expiryDate,
    double? quantity,
    String? unit,
    String? imageFileName,
    bool clearImage = false,
    String? note,
  }) {
    return FoodItem(
      id: id,
      name: name ?? this.name,
      category: category ?? this.category,
      expiryDate: expiryDate ?? this.expiryDate,
      quantity: quantity ?? this.quantity,
      unit: unit ?? this.unit,
      imageFileName: clearImage ? null : (imageFileName ?? this.imageFileName),
      addedAt: addedAt,
      notificationId: notificationId,
      note: note ?? this.note,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category.name,
        'expiryDate': expiryDate.toIso8601String(),
        'quantity': quantity,
        'unit': unit,
        'imageFileName': imageFileName,
        'addedAt': addedAt.toIso8601String(),
        'notificationId': notificationId,
        'note': note,
      };

  factory FoodItem.fromJson(Map<String, dynamic> json) => FoodItem(
        id: json['id'] as String,
        name: json['name'] as String,
        category: FoodCategory.values.firstWhere(
          (c) => c.name == json['category'],
          orElse: () => FoodCategory.other,
        ),
        expiryDate: DateTime.parse(json['expiryDate'] as String),
        quantity: (json['quantity'] as num?)?.toDouble() ?? 1,
        unit: json['unit'] as String? ?? 'cái',
        imageFileName: json['imageFileName'] as String?,
        addedAt: DateTime.parse(json['addedAt'] as String),
        notificationId: json['notificationId'] as int,
        note: json['note'] as String?,
      );
}

/// Mô tả số ngày còn lại bằng tiếng Việt.
String describeDaysLeft(int days) {
  if (days < -1) return 'Đã hết hạn ${-days} ngày';
  if (days == -1) return 'Hết hạn hôm qua';
  if (days == 0) return 'Hết hạn hôm nay';
  if (days == 1) return 'Hết hạn ngày mai';
  return 'Còn $days ngày';
}

String formatQuantity(double q) =>
    q == q.roundToDouble() ? q.toInt().toString() : q.toStringAsFixed(1);
