// Định dạng số và ngày theo kiểu Việt Nam: 15.805 và 70,2.

String pad2(int n) => n.toString().padLeft(2, '0');

String fmtInt(num n) {
  final neg = n < 0;
  final s = n.abs().round().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write('.');
    b.write(s[i]);
  }
  return (neg ? '-' : '') + b.toString();
}

String fmtDec(num n, [int digits = 1]) {
  final fixed = n.abs().toStringAsFixed(digits);
  final parts = fixed.split('.');
  final whole = fmtInt(int.parse(parts[0]));
  final out = parts.length > 1 ? '$whole,${parts[1]}' : whole;
  return n < 0 ? '-$out' : out;
}

String dstr(DateTime d) => '${pad2(d.day)}/${pad2(d.month)}/${d.year}';

String hm(DateTime d) => '${pad2(d.hour)}:${pad2(d.minute)}';

const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
String weekday(DateTime d) => weekdays[d.weekday - 1];

/// Số giờ ra chữ: +7 giờ, −22 phút, +2 giờ 30 phút.
String hstr(double h) {
  final sign = h > 0 ? '+' : (h < 0 ? '−' : '');
  final a = h.abs();
  var hh = a.floor();
  var mm = ((a - hh) * 60).round();
  if (mm == 60) {
    hh++;
    mm = 0;
  }
  final parts = <String>[];
  if (hh > 0) parts.add('$hh giờ');
  if (mm > 0 || hh == 0) parts.add('$mm phút');
  return sign + parts.join(' ');
}

/// Khoảng thời gian ra chữ: 2 ngày 23 giờ, hoặc 4 giờ 12 phút.
String dur(Duration d) {
  if (d.isNegative) d = -d;
  final days = d.inDays;
  final hours = d.inHours % 24;
  final mins = d.inMinutes % 60;
  return days > 0 ? '$days ngày $hours giờ' : '$hours giờ $mins phút';
}
