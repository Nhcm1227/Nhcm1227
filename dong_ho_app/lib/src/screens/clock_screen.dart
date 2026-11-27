// Mục Đồng hồ: đếm ngược, giấy báo tử, số lần còn lại.
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app_state.dart';
import '../format.dart';
import '../lifespan.dart';
import '../theme.dart';
import '../widgets.dart';

const _quotes = [
  ['Không phải ta có quá ít thời gian, mà là ta lãng phí quá nhiều.', 'Seneca, Về sự ngắn ngủi của đời người'],
  ['Nếu hôm nay là ngày cuối cùng của đời tôi, tôi có muốn làm điều tôi sắp làm hôm nay không?', 'Steve Jobs, Stanford, 2005'],
  ['Thời gian thấm thoắt thoi đưa, nó đi đi mãi có chờ đợi ai.', 'Ca dao Việt Nam'],
  ['Ở đây yên nghỉ một người đã định bắt đầu từ ngày mai.', 'Văn bia không ai muốn có'],
  ['Ngày mai là cái cớ đẹp nhất mà sự lười biếng từng nghĩ ra.', 'Đồng hồ đời người'],
];

class ClockScreen extends StatefulWidget {
  const ClockScreen({super.key, required this.state, required this.onOpenProfile});
  final AppState state;
  final VoidCallback onOpenProfile;
  @override
  State<ClockScreen> createState() => _ClockScreenState();
}

class _ClockScreenState extends State<ClockScreen> {
  Timer? _ticker;
  int _quote = DateTime.now().day % _quotes.length;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final now = DateTime.now();
    final death = s.deathAt;
    final leftMs = math.max(0, death.difference(now).inMilliseconds);

    var years = 0;
    var cur = now;
    while (years < 200) {
      final next = DateTime(cur.year + 1, cur.month, cur.day, cur.hour, cur.minute, cur.second, cur.millisecond);
      if (next.isAfter(death)) break;
      cur = next;
      years++;
    }
    final rest = math.max(0, death.difference(cur).inMilliseconds);
    final days = rest ~/ 86400000;
    final hours = (rest % 86400000) ~/ 3600000;
    final mins = (rest % 3600000) ~/ 60000;
    final secs = (rest % 60000) ~/ 1000;
    final endOfDay = DateTime(now.year, now.month, now.day + 1).difference(now);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      children: [
        if (s.profile.isSample)
          _Banner(
            text: 'Đang dùng hồ sơ mẫu. Nhập ngày sinh và thói quen của bạn để có con số thật.',
            action: 'Khai hồ sơ',
            onTap: widget.onOpenProfile,
          ),
        const Label('Thời gian còn lại của bạn', color: kBloodHi),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(fmtInt(leftMs ~/ 86400000), style: goth(132, weight: 900)),
        ),
        Text('ngày. Rồi hết.', style: body(22, color: kBoneDim, italic: true)),
        const SizedBox(height: 16),
        Wrap(
          spacing: 20,
          runSpacing: 8,
          children: [
            _Unit('$years', 'năm'),
            _Unit('$days', 'ngày'),
            _Unit(pad2(hours), 'giờ'),
            _Unit(pad2(mins), 'phút'),
            _Unit(pad2(secs), 'giây', color: kBloodHi),
          ],
        ),
        const SizedBox(height: 14),
        Text.rich(
          TextSpan(style: body(15, color: kBoneDim), children: [
            const TextSpan(text: 'Tim bạn còn đập khoảng '),
            TextSpan(text: fmtInt(leftMs / 60000 * 72), style: mono(14)),
            const TextSpan(text: ' lần nữa. Hôm nay chỉ còn '),
            TextSpan(text: '${endOfDay.inHours} giờ ${endOfDay.inMinutes % 60} phút', style: mono(14)),
            const TextSpan(text: '.'),
          ]),
        ),
        const SizedBox(height: 32),
        _Certificate(state: s),
        const SizedBox(height: 36),
        const SectionTitle('Bạn còn bao nhiêu lần nữa?'),
        _Counts(state: s),
        const SizedBox(height: 36),
        Container(
          padding: const EdgeInsets.only(top: 24),
          decoration: const BoxDecoration(border: Border(top: BorderSide(color: kRust))),
          child: Column(
            children: [
              Text('“${_quotes[_quote][0]}”', textAlign: TextAlign.center, style: goth(26, weight: 600).copyWith(height: 1.15)),
              const SizedBox(height: 10),
              Text(_quotes[_quote][1], style: body(14, color: kBoneDim, italic: true)),
              TextButton(onPressed: () => setState(() => _quote = (_quote + 1) % _quotes.length), child: const Text('CÂU KHÁC')),
            ],
          ),
        ),
      ],
    );
  }
}

class _Unit extends StatelessWidget {
  const _Unit(this.value, this.unit, {this.color = kBone});
  final String value;
  final String unit;
  final Color color;
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value, style: mono(30, color: color, weight: FontWeight.w600)),
          Text(unit.toUpperCase(), style: labelStyle()),
        ],
      );
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.action, required this.onTap});
  final String text;
  final String action;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(border: Border.all(color: kRust)),
        child: Row(
          children: [
            Expanded(child: Text(text, style: body(14, color: kBoneDim))),
            const SizedBox(width: 10),
            OutlinedButton(onPressed: onTap, child: Text(action.toUpperCase())),
          ],
        ),
      );
}

class _Certificate extends StatelessWidget {
  const _Certificate({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final r = state.result;
    final lived = (r.ageNow / r.total).clamp(0.0, 1.0);
    final stamp = r.floored ? 'ĐANG SỐNG\nTRÊN THỜI GIAN VAY' : lived > .75 ? 'THỜI GIAN\nSẮP CẠN' : 'CHƯA\nQUÁ MUỘN';
    final ink = body(15, color: kPaperInk);
    Widget row(String k, String v, {bool big = false}) => Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(k, style: body(13.5, color: kPaperInk, italic: true)),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(bottom: 3),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kPaperLine))),
                child: Text(v, style: mono(big ? 18 : 14.5, color: kPaperInk, weight: big ? FontWeight.w600 : FontWeight.w400)),
              ),
            ],
          ),
        );

    return Transform.rotate(
      angle: -0.01,
      child: Container(
        color: kPaper,
        padding: const EdgeInsets.all(14),
        child: Stack(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 64),
              decoration: BoxDecoration(border: Border.all(color: kPaperInk, width: 2)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(child: Text('SỔ ĐĂNG KÝ NHỮNG NGÀY CÒN LẠI', style: mono(10, color: kPaperInk, spacing: 1.5))),
                  Center(child: Text('Giấy Báo Tử', style: goth(44, color: kPaperInk, weight: 900))),
                  const SizedBox(height: 4),
                  row('Người được dự báo', 'Bạn, người đang đọc dòng này'),
                  row('Ngày sinh', dstr(state.profile.birthDate)),
                  row('Ngày mất dự kiến', '${weekday(state.deathAt)}, ${dstr(state.deathAt)}', big: true),
                  row('Hưởng dương', '${fmtDec(r.total)} tuổi'),
                  row('Nguyên nhân chính', r.cause),
                  row('Đã sống được', '${fmtDec(lived * 100)}% quãng đời'),
                  const SizedBox(height: 12),
                  Text('Văn bản này không có giá trị pháp lý và có thể bị thay đổi bởi chính đương sự, bắt đầu từ hôm nay.',
                      style: ink.copyWith(fontSize: 12, fontStyle: FontStyle.italic)),
                ],
              ),
            ),
            Positioned(
              right: 12,
              bottom: 12,
              child: Transform.rotate(
                angle: -0.24,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(border: Border.all(color: kBlood, width: 3)),
                  child: Text(stamp, textAlign: TextAlign.center, style: mono(12, color: kBlood, weight: FontWeight.w600, spacing: 1.5)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Counts extends StatelessWidget {
  const _Counts({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final p = state.profile;
    final yearsLeft = math.max(0, state.deathAt.difference(DateTime.now()).inMilliseconds) / kYearMs;
    final daysLeft = yearsLeft * 365.2425;
    final parentLife = kBaseLife['f']! - 1.5;
    final parentYears = math.min(yearsLeft, math.max(0.0, parentLife - p.parentAge));
    final items = <(String, String, String, bool)>[
      (fmtInt(yearsLeft.floor()), 'cái Tết', 'Năm ngoái bạn đã dùng cái Tết của mình vào việc gì?', false),
      (fmtInt(parentYears * p.visits), 'lần gặp bố mẹ', 'Nếu bố mẹ sống đến khoảng ${parentLife.round()} tuổi và bạn về ${p.visits.round()} lần mỗi năm.', true),
      (fmtInt((daysLeft / 7).floor()), 'ngày thứ Bảy', 'Mỗi thứ Bảy nằm ườn trên giường là một số bị gạch khỏi đây.', false),
      (fmtDec(daysLeft * p.phone / 365.2425 / 24), 'năm nhìn màn hình', 'Tính liền 24/24, nếu cứ lướt ${fmtDec(p.phone)} giờ mỗi ngày.', true),
      (fmtDec(daysLeft * p.sitting / 365.2425 / 24), 'năm ngồi một chỗ', 'Phần đời còn lại bạn sẽ dành cho cái ghế.', true),
      (fmtInt(yearsLeft * 12.37), 'đêm trăng rằm', 'Lần cuối bạn ngẩng đầu nhìn trăng là khi nào?', false),
    ];
    return LayoutBuilder(builder: (context, c) {
      final w = (c.maxWidth - 16) / 2;
      return Wrap(
        spacing: 16,
        runSpacing: 22,
        children: [
          for (final it in items)
            SizedBox(
              width: w,
              child: Container(
                padding: const EdgeInsets.only(top: 10),
                decoration: const BoxDecoration(border: Border(top: BorderSide(color: kRust))),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(it.$1, style: goth(44, color: it.$4 ? kBloodHi : kBone, weight: 900)),
                    ),
                    Text(it.$2, style: body(15, weight: FontWeight.w600)),
                    Text(it.$3, style: body(12.5, color: kBoneDim, italic: true)),
                  ],
                ),
              ),
            ),
        ],
      );
    });
  }
}
