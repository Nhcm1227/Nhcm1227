// Các mảnh giao diện dùng chung.
import 'package:flutter/material.dart';

import 'theme.dart';

/// Nhãn nhỏ viết hoa, giãn chữ.
class Label extends StatelessWidget {
  const Label(this.text, {super.key, this.color = kBoneDim});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style: labelStyle(color: color));
}

/// Tiêu đề mục kiểu chữ gothic.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 12),
        child: Text(text, style: goth(30)),
      );
}

/// Đoạn mô tả nghiêng, màu nhạt.
class Lede extends StatelessWidget {
  const Lede(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Text(text, style: body(15, color: kBoneDim, italic: true)),
      );
}

/// Nút chọn dạng viên (chọn một trong nhiều).
class Pill extends StatelessWidget {
  const Pill({super.key, required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? kBone : Colors.transparent,
            border: Border.all(color: selected ? kBone : kRust),
          ),
          child: Text(label, style: mono(12, color: selected ? kBg : kBone)),
        ),
      ),
    );
  }
}

/// Hàng nhập số có nút bớt / thêm.
class NumStep extends StatelessWidget {
  const NumStep({
    super.key,
    required this.label,
    required this.value,
    required this.step,
    required this.min,
    required this.max,
    required this.unit,
    required this.onChanged,
    this.hint,
  });
  final String label;
  final double value;
  final double step;
  final double min;
  final double max;
  final String unit;
  final String? hint;
  final ValueChanged<double> onChanged;

  String _show(double v) => v == v.roundToDouble() ? v.round().toString() : v.toStringAsFixed(1).replaceAll('.', ',');

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kRust))),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: body(16)),
                if (hint != null) Text(hint!, style: body(12.5, color: kBoneDim, italic: true)),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Bớt',
            onPressed: value - step >= min - 1e-9 ? () => onChanged(double.parse((value - step).toStringAsFixed(2))) : null,
            icon: const Icon(Icons.remove),
          ),
          SizedBox(
            width: 84,
            child: Text('${_show(value)} $unit', textAlign: TextAlign.center, style: mono(14, weight: FontWeight.w600)),
          ),
          IconButton(
            tooltip: 'Thêm',
            onPressed: value + step <= max + 1e-9 ? () => onChanged(double.parse((value + step).toStringAsFixed(2))) : null,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }
}

void toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
