// Mục Mua giờ: đổi hành động tốt lấy giờ sống, thói quen xấu thì bị trừ.
import 'package:flutter/material.dart';

import '../app_state.dart';
import '../format.dart';
import '../lifespan.dart';
import '../theme.dart';
import '../widgets.dart';

class MarketScreen extends StatelessWidget {
  const MarketScreen({super.key, required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final s = state;
    final total = s.boughtHours;
    final recent = s.bought.reversed.take(6).toList();
    final buys = kWares.where((w) => !w.sell).toList();
    final sells = kWares.where((w) => w.sell).toList();

    Widget ware(Ware w) {
      final n = s.todayCount(w.id);
      final full = n >= w.cap;
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kRust))),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(w.name, style: body(16)),
                  Text(w.source, style: body(12, color: kBoneDim, italic: true)),
                  Text('Hôm nay: $n/${w.cap}${full ? ' · đủ cho hôm nay' : ''}', style: mono(11, color: kBoneDim)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(hstr(w.hours), style: mono(14, color: w.sell ? kBloodHi : kMoss, weight: FontWeight.w600)),
            const SizedBox(width: 10),
            OutlinedButton(
              style: w.sell ? OutlinedButton.styleFrom(side: const BorderSide(color: kBlood)) : null,
              onPressed: full
                  ? null
                  : () {
                      s.buy(w);
                      toast(context, '${w.sell ? 'Đã trừ' : 'Đã cộng'} ${hstr(w.hours)} vào đồng hồ.');
                    },
              child: Text(w.sell ? 'ĐÃ LỠ' : 'MUA'),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      children: [
        const Lede('Làm việc tốt cho cơ thể thì bấm Mua: giờ sống được cộng thẳng vào đồng hồ. Thuốc lá, rượu bia thì bị trừ.'),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(border: Border.all(color: kRust)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Label('Số dư giờ sống'),
              const SizedBox(height: 6),
              Text(hstr(total), style: goth(44, color: total > 0 ? kMoss : (total < 0 ? kBloodHi : kBone), weight: 900)),
              Text('Hôm nay: ${hstr(s.boughtToday)}', style: body(13, color: kBoneDim, italic: true)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Label('Mua thêm giờ sống'),
        for (final w in buys) ware(w),
        const SizedBox(height: 20),
        const Label('Bán đi giờ sống'),
        for (final w in sells) ware(w),
        const SizedBox(height: 26),
        const Label('Giao dịch gần đây'),
        if (recent.isEmpty) Padding(padding: const EdgeInsets.only(top: 10), child: Text('Chưa có giao dịch nào.', style: body(14, color: kBoneDim, italic: true))),
        for (final e in recent)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 6),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kRust))),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${kWares.firstWhere((w) => w.id == e.id, orElse: () => const Ware('?', 'Mục đã bỏ', 0, 0, '')).name}  ${hm(DateTime.fromMillisecondsSinceEpoch(e.at))}',
                    style: body(14),
                  ),
                ),
                Text(hstr(e.hours), style: mono(12.5, color: e.hours > 0 ? kMoss : kBloodHi)),
                IconButton(tooltip: 'Hoàn tác', onPressed: () => s.undoPurchase(e.at), icon: const Icon(Icons.undo, size: 18)),
              ],
            ),
          ),
        const SizedBox(height: 18),
        Text(
          'Số giờ là mức trung bình rút ra từ các nghiên cứu lớn, áp dụng cho cả một quần thể, không phải lời hứa cho riêng ai. Mỗi mục có giới hạn trong ngày.',
          style: body(13, color: kBoneDim),
        ),
      ],
    );
  }
}
