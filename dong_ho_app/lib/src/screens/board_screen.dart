// Mục Xếp hạng: so sánh tuổi thọ dự báo, giờ sống mua được và số việc làm xong trong tuần.
import 'package:flutter/material.dart';

import '../app_state.dart';
import '../format.dart';
import '../lifespan.dart';
import '../theme.dart';
import '../widgets.dart';

class BoardScreen extends StatefulWidget {
  const BoardScreen({super.key, required this.state, required this.onNeedAccount});
  final AppState state;
  final VoidCallback onNeedAccount;
  @override
  State<BoardScreen> createState() => _BoardScreenState();
}

class _BoardScreenState extends State<BoardScreen> {
  String _key = 'life';
  final _nick = TextEditingController();
  String? _err;
  bool _busy = false;
  bool _nickFilled = false;

  static const _hints = {
    'life': 'Xếp theo tuổi thọ dự báo từ hồ sơ sức khỏe.',
    'hours': 'Xếp theo giờ sống mua được trong Chợ giờ sống từ thứ Hai tuần này.',
    'done': 'Xếp theo số việc đã làm xong từ thứ Hai tuần này.',
  };

  @override
  void dispose() {
    _nick.dispose();
    super.dispose();
  }

  String _value(String key, num v) {
    if (key == 'life') return '${fmtDec(v)} tuổi';
    if (key == 'hours') return hstr(v.toDouble());
    return '$v việc';
  }

  Future<void> _join() async {
    if (widget.state.user == null) {
      widget.onNeedAccount();
      return;
    }
    final nick = _nick.text.trim();
    if (nick.length < 2) {
      setState(() => _err = 'Tên hiển thị cần ít nhất 2 ký tự.');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    final e = await widget.state.joinBoard(nick);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _err = e;
    });
    if (e == null) toast(context, 'Đã lên bảng xếp hạng.');
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final r = s.result;
    final base = kBaseLife[s.profile.sex] ?? kBaseLife['m']!;
    final diff = r.total - base;
    final b = s.board;
    final rows = (b?[_key] as List?) ?? const [];
    final me = b?['${_key}Me'] as Map<String, dynamic>?;
    final joined = b?['joined'] == true;
    if (!_nickFilled && b != null && (b['nick'] ?? '').toString().isNotEmpty) {
      _nickFilled = true;
      final nick = b['nick'].toString();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _nick.text.isEmpty) _nick.text = nick;
      });
    }

    return RefreshIndicator(
      onRefresh: s.loadBoard,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(border: Border.all(color: kRust)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Label('Tuổi thọ dự báo của bạn'),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(fmtDec(r.total), style: goth(64, weight: 900)),
                    const SizedBox(width: 8),
                    Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('tuổi', style: body(18, color: kBoneDim, italic: true))),
                  ],
                ),
                Text.rich(TextSpan(style: body(15), children: [
                  TextSpan(
                    text: '${diff >= 0 ? '+' : '−'}${fmtDec(diff.abs())} năm ',
                    style: mono(14, color: diff >= 0 ? kMoss : kBloodHi, weight: FontWeight.w600),
                  ),
                  TextSpan(text: 'so với trung bình người Việt cùng giới (${fmtDec(base)} tuổi).'),
                ])),
                if (joined && me != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text('Bạn đứng thứ ${me['rank']} trên ${b?['total']} người ở bảng này.', style: body(13.5, color: kBoneDim, italic: true)),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Pill(label: 'Sống lâu nhất', selected: _key == 'life', onTap: () => setState(() => _key = 'life')),
              Pill(label: 'Mua giờ tuần này', selected: _key == 'hours', onTap: () => setState(() => _key = 'hours')),
              Pill(label: 'Chăm nhất tuần', selected: _key == 'done', onTap: () => setState(() => _key = 'done')),
            ],
          ),
          const SizedBox(height: 10),
          Text(_hints[_key]!, style: body(13, color: kBoneDim, italic: true)),
          const SizedBox(height: 8),
          if (s.boardLoading && b == null) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
          if (s.boardError != null && b == null)
            Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text(s.boardError!, style: body(14, color: kBloodHi))),
          if (b != null && rows.isEmpty)
            Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text('Chưa có ai trên bảng. Hãy là người đầu tiên.', style: body(14, color: kBoneDim, italic: true))),
          for (final row in rows.cast<Map<String, dynamic>>())
            Container(
              color: row['me'] == true ? const Color(0x29A8120C) : null,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              decoration: null,
              child: Row(
                children: [
                  SizedBox(
                    width: 42,
                    child: Text(
                      '${row['rank']}',
                      textAlign: TextAlign.center,
                      style: goth(24, color: switch (row['rank']) { 1 => kAmber, 2 => const Color(0xFFC9C3B8), 3 => const Color(0xFFB07A4A), _ => kBoneDim }),
                    ),
                  ),
                  Expanded(child: Text('${row['nick']}${row['me'] == true ? '  (bạn)' : ''}', style: body(16))),
                  Text(_value(_key, (row['value'] as num?) ?? 0), style: mono(14)),
                ],
              ),
            ),
          const SizedBox(height: 28),
          SectionTitle(joined ? 'Bạn đang trên bảng' : 'Lên bảng xếp hạng'),
          Text('Bảng chỉ hiện tên hiển thị và con số cuối cùng. Không ai thấy bệnh, cân nặng hay thói quen của bạn.',
              style: body(14, color: kBoneDim, italic: true)),
          const SizedBox(height: 12),
          TextField(controller: _nick, maxLength: 24, decoration: const InputDecoration(labelText: 'TÊN HIỂN THỊ', counterText: '')),
          const SizedBox(height: 10),
          Row(
            children: [
              FilledButton(onPressed: _busy ? null : _join, child: Text(joined ? 'ĐỔI TÊN' : 'THAM GIA')),
              const SizedBox(width: 10),
              if (joined)
                OutlinedButton(
                  onPressed: () async {
                    await s.leaveBoard();
                    if (context.mounted) toast(context, 'Đã rời bảng xếp hạng.');
                  },
                  child: const Text('RỜI BẢNG'),
                ),
            ],
          ),
          if (_err != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_err!, style: body(14, color: const Color(0xFFFF8A80)))),
        ],
      ),
    );
  }
}
