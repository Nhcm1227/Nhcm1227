// Mục Tôi: tài khoản, gói, hồ sơ sức khỏe, cách tính tuổi thọ, xóa tài khoản.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../app_state.dart';
import '../format.dart';
import '../lifespan.dart';
import '../theme.dart';
import '../widgets.dart';

class MeScreen extends StatelessWidget {
  const MeScreen({super.key, required this.state});
  final AppState state;

  Future<void> _pickBirth(BuildContext context) async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: state.profile.isSample ? DateTime(2000, 1, 1) : state.profile.birthDate,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Ngày sinh của bạn',
      initialEntryMode: DatePickerEntryMode.input,
    );
    if (d != null) state.updateProfile((p) => p.birth = '${d.year}-${pad2(d.month)}-${pad2(d.day)}');
  }

  @override
  Widget build(BuildContext context) {
    final s = state;
    final p = s.profile;
    final u = s.user;
    final plan = s.planKind;
    final planText = switch (plan) {
      'paid' => 'Gói Người Sống đến ${dstr(DateTime.fromMillisecondsSinceEpoch(((u?['paidUntil'] ?? 0) as num).toInt()))}.',
      'trial' => 'Đang dùng thử, còn ${dur(DateTime.fromMillisecondsSinceEpoch(((u?['trialEnds'] ?? 0) as num).toInt()).difference(s.now))}.',
      'free' => 'Hết 3 ngày dùng thử.',
      _ => 'Tạo tài khoản để lưu dữ liệu trên máy chủ, dùng chung với bản web và lên bảng xếp hạng.',
    };

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 40),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(border: Border.all(color: kRust)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Label('Tài khoản'),
              const SizedBox(height: 6),
              Text(u == null ? 'Chưa đăng nhập' : ((u['name'] ?? '').toString().isNotEmpty ? u['name'].toString() : u['email'].toString()), style: body(18)),
              if (u != null) Text(u['email'].toString(), style: mono(12, color: kBoneDim)),
              const SizedBox(height: 6),
              Text(planText, style: body(14, color: kBoneDim, italic: true)),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (u == null) ...[
                    FilledButton(onPressed: () => showAuthSheet(context, s, register: true), child: const Text('TẠO TÀI KHOẢN')),
                    const SizedBox(width: 10),
                    OutlinedButton(onPressed: () => showAuthSheet(context, s, register: false), child: const Text('ĐĂNG NHẬP')),
                  ] else
                    OutlinedButton(
                      onPressed: () async {
                        await s.logout();
                        if (context.mounted) toast(context, 'Đã đăng xuất.');
                      },
                      child: const Text('ĐĂNG XUẤT'),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        const SectionTitle('Hồ sơ sức khỏe'),
        Lede(p.isSample ? 'Đang dùng hồ sơ mẫu (nam, sinh 01/01/2000). Sửa từng mục, đồng hồ đổi theo ngay.' : 'Sửa từng mục, đồng hồ đổi theo ngay.'),
        InkWell(
          onTap: () => _pickBirth(context),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kRust))),
            child: Row(
              children: [
                Expanded(child: Text('Ngày sinh', style: body(16))),
                Text(p.isSample ? 'Chọn ngày' : dstr(p.birthDate), style: mono(14, weight: FontWeight.w600, color: p.isSample ? kBloodHi : kBone)),
                const SizedBox(width: 6),
                const Icon(Icons.chevron_right, color: kBoneDim),
              ],
            ),
          ),
        ),
        _Choice(
          label: 'Giới tính',
          options: const {'m': 'Nam', 'f': 'Nữ'},
          value: p.sex,
          onChanged: (v) => s.updateProfile((x) => x.sex = v),
        ),
        NumStep(label: 'Chiều cao', unit: 'cm', value: p.height, step: 1, min: 100, max: 230, onChanged: (v) => s.updateProfile((x) => x.height = v)),
        NumStep(
          label: 'Cân nặng',
          unit: 'kg',
          value: p.weight,
          step: 1,
          min: 25,
          max: 250,
          hint: p.bmi > 0 ? 'BMI ${fmtDec(p.bmi)}' : null,
          onChanged: (v) => s.updateProfile((x) => x.weight = v),
        ),
        NumStep(label: 'Tập thể dục', hint: 'Đi bộ nhanh trở lên, mỗi ngày', unit: 'phút', value: p.exercise, step: 5, min: 0, max: 300, onChanged: (v) => s.updateProfile((x) => x.exercise = v)),
        NumStep(label: 'Ngồi không', hint: 'Ngồi học, ngồi máy, nằm lướt điện thoại', unit: 'giờ', value: p.sitting, step: 0.5, min: 0, max: 20, onChanged: (v) => s.updateProfile((x) => x.sitting = v)),
        NumStep(label: 'Ngủ mỗi đêm', unit: 'giờ', value: p.sleep, step: 0.5, min: 2, max: 14, onChanged: (v) => s.updateProfile((x) => x.sleep = v)),
        NumStep(label: 'Lướt điện thoại', hint: 'Mỗi ngày', unit: 'giờ', value: p.phone, step: 0.5, min: 0, max: 20, onChanged: (v) => s.updateProfile((x) => x.phone = v)),
        _Choice(
          label: 'Thuốc lá',
          options: const {'never': 'Chưa hút', 'quit': 'Đã bỏ', 'yes': 'Đang hút'},
          value: p.smoke,
          onChanged: (v) => s.updateProfile((x) => x.smoke = v),
        ),
        _Choice(
          label: 'Rượu bia mỗi tuần',
          options: const {'0': 'Dưới 10 ly', '1': '10–20 ly', '2': '20–35 ly', '3': 'Trên 35 ly'},
          value: p.alcohol.toString(),
          onChanged: (v) => s.updateProfile((x) => x.alcohol = int.parse(v)),
        ),
        NumStep(label: 'Tuổi của bố mẹ', unit: 'tuổi', value: p.parentAge, step: 1, min: 20, max: 110, onChanged: (v) => s.updateProfile((x) => x.parentAge = v)),
        NumStep(label: 'Gặp bố mẹ mỗi năm', unit: 'lần', value: p.visits, step: 1, min: 0, max: 365, onChanged: (v) => s.updateProfile((x) => x.visits = v)),
        const SizedBox(height: 18),
        const Label('Bệnh đang mắc'),
        for (final ill in kIllnesses)
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: p.ills.contains(ill.id),
            onChanged: (v) => s.updateProfile((x) {
              x.ills.remove(ill.id);
              if (v == true) x.ills.add(ill.id);
            }),
            title: Text(ill.name, style: body(15)),
            secondary: Text('−${ill.years == ill.years.roundToDouble() ? ill.years.round() : fmtDec(ill.years)} năm', style: mono(12, color: kBloodHi)),
          ),
        const SizedBox(height: 10),
        Text(
          'Đây là ước tính thống kê từ các nghiên cứu dịch tễ lớn, không phải chẩn đoán. Nếu bạn có bệnh, con số đúng nhất là con số bác sĩ của bạn nói.',
          style: body(13, color: kBoneDim),
        ),
        const SizedBox(height: 12),
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text('XEM CÁCH TÍNH TUỔI THỌ', style: mono(12, color: kBoneDim, spacing: 1.5)),
            children: [
              for (final r in s.result.rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(r.value.isEmpty ? r.factor : '${r.factor} · ${r.value}', style: body(14)),
                            Text(r.source, style: body(11.5, color: kBoneDim, italic: true)),
                          ],
                        ),
                      ),
                      Text(
                        r.isBase ? fmtDec(r.years) : '${r.years > 0.05 ? '+' : (r.years < -0.05 ? '−' : '±')}${fmtDec(r.years.abs())}',
                        style: mono(14, color: r.isBase ? kBone : (r.years > 0.05 ? kMoss : (r.years < -0.05 ? kBloodHi : kBoneDim))),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(top: 8, bottom: 8),
                child: Row(
                  children: [
                    Expanded(child: Text('Tuổi thọ dự báo', style: body(16, weight: FontWeight.w600))),
                    Text(fmtDec(s.result.total), style: mono(16, weight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (u != null) ...[
          const SizedBox(height: 28),
          OutlinedButton(
            style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFFF8A80), side: const BorderSide(color: kBlood)),
            onPressed: () => _confirmDelete(context, s),
            child: const Text('XÓA TÀI KHOẢN'),
          ),
        ],
        const SizedBox(height: 28),
        Text('Bản web: dong-ho-doi-nguoi.vercel.app', style: mono(11.5, color: kBoneDim)),
        Text('Điều khoản, bảo mật, hoàn tiền: dong-ho-doi-nguoi.vercel.app/dieu-khoan', style: mono(11.5, color: kBoneDim)),
      ],
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({required this.label, required this.options, required this.value, required this.onChanged});
  final String label;
  final Map<String, String> options;
  final String value;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kRust))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: body(16)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final e in options.entries) Pill(label: e.value, selected: e.key == value, onTap: () => onChanged(e.key)),
              ],
            ),
          ],
        ),
      );
}

Future<void> _confirmDelete(BuildContext context, AppState s) async {
  final pass = TextEditingController();
  String? err;
  await showDialog<void>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setLocal) => AlertDialog(
        title: Text('Xóa tài khoản?', style: goth(30, color: kBloodHi)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hồ sơ, sổ việc, giờ sống và tên trên bảng xếp hạng sẽ bị xóa vĩnh viễn.', style: body(15)),
            const SizedBox(height: 12),
            TextField(controller: pass, obscureText: true, decoration: const InputDecoration(labelText: 'NHẬP MẬT KHẨU ĐỂ XÁC NHẬN')),
            if (err != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(err!, style: body(13, color: const Color(0xFFFF8A80)))),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('HỦY')),
          FilledButton(
            onPressed: () async {
              final e = await s.deleteAccount(pass.text);
              if (e != null) {
                setLocal(() => err = e);
                return;
              }
              if (ctx.mounted) Navigator.pop(ctx);
              if (context.mounted) toast(context, 'Đã xóa tài khoản.');
            },
            child: const Text('XÓA VĨNH VIỄN'),
          ),
        ],
      ),
    ),
  );
  pass.dispose();
}

/// Bảng đăng ký / đăng nhập trượt lên từ dưới.
Future<void> showAuthSheet(BuildContext context, AppState s, {required bool register}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => _AuthSheet(state: s, register: register),
  );
}

class _AuthSheet extends StatefulWidget {
  const _AuthSheet({required this.state, required this.register});
  final AppState state;
  final bool register;
  @override
  State<_AuthSheet> createState() => _AuthSheetState();
}

class _AuthSheetState extends State<_AuthSheet> {
  late bool _register = widget.register;
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _name = TextEditingController();
  String? _err;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _pass.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$').hasMatch(email)) {
      setState(() => _err = 'Email chưa đúng định dạng.');
      return;
    }
    if (_pass.text.length < 8) {
      setState(() => _err = 'Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    final e = _register ? await widget.state.register(email, _pass.text, _name.text.trim()) : await widget.state.login(email, _pass.text);
    if (!mounted) return;
    if (e != null) {
      setState(() {
        _busy = false;
        _err = e;
      });
      return;
    }
    HapticFeedback.mediumImpact();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_register ? 'Tạo tài khoản' : 'Đăng nhập', style: goth(34, weight: 900)),
          const SizedBox(height: 6),
          Text(
            _register ? 'Được dùng đủ tính năng 3 ngày. Dữ liệu trên máy này sẽ được chuyển vào tài khoản.' : 'Dùng cùng tài khoản với bản web.',
            style: body(14, color: kBoneDim, italic: true),
          ),
          const SizedBox(height: 14),
          if (_register) ...[
            TextField(controller: _name, maxLength: 60, decoration: const InputDecoration(labelText: 'TÊN GỌI (KHÔNG BẮT BUỘC)', counterText: '')),
            const SizedBox(height: 10),
          ],
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(labelText: 'EMAIL'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _pass,
            obscureText: true,
            autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
            onSubmitted: (_) => _submit(),
            decoration: const InputDecoration(labelText: 'MẬT KHẨU (ÍT NHẤT 8 KÝ TỰ)'),
          ),
          if (_err != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_err!, style: body(14, color: const Color(0xFFFF8A80)))),
          const SizedBox(height: 16),
          FilledButton(onPressed: _busy ? null : _submit, child: Text(_register ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP')),
          TextButton(
            onPressed: () => setState(() {
              _register = !_register;
              _err = null;
            }),
            child: Text(_register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Tạo mới'),
          ),
          Text('Máy chủ: $kApiBase', textAlign: TextAlign.center, style: mono(10, color: kBoneDim)),
        ],
      ),
    );
  }
}
