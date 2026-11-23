import 'dart:io';

import 'package:flutter/material.dart';

import '../models/food_item.dart';

Color expiryColor(BuildContext context, ExpiryStatus status) {
  switch (status) {
    case ExpiryStatus.expired:
      return Colors.red.shade700;
    case ExpiryStatus.today:
      return Colors.deepOrange;
    case ExpiryStatus.soon:
      return Colors.orange.shade700;
    case ExpiryStatus.fresh:
      return Theme.of(context).colorScheme.primary;
  }
}

/// Ảnh thu nhỏ của món đồ, hoặc emoji của nhóm nếu chưa có ảnh.
class FoodThumb extends StatelessWidget {
  const FoodThumb({super.key, required this.item, this.file, this.size = 52});

  final FoodItem item;
  final File? file;
  final double size;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(12);
    if (file != null) {
      return ClipRRect(
        borderRadius: radius,
        child: Image.file(file!, width: size, height: size, fit: BoxFit.cover),
      );
    }
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: radius,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
      ),
      child: Text(item.category.emoji, style: TextStyle(fontSize: size * 0.5)),
    );
  }
}
