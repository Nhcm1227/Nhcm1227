// Thuật toán dự báo tuổi thọ. Chép đúng công thức của bản web (public/index.html)
// để hai bên cho cùng một con số.
import 'dart:math' as math;

const double kDayMs = 864e5;
const double kYearMs = 365.2425 * kDayMs;

/// Tuổi thọ trung bình người Việt theo giới (Tổng cục Thống kê, khoảng 2023).
const Map<String, double> kBaseLife = {'m': 71.1, 'f': 76.3};

class Illness {
  const Illness(this.id, this.name, this.years, this.source);
  final String id;
  final String name;
  final double years;
  final String source;
}

const List<Illness> kIllnesses = [
  Illness('cvd', 'Bệnh tim mạch hoặc từng đột quỵ', 7, 'Emerging Risk Factors Collab., JAMA 2015'),
  Illness('dep', 'Trầm cảm, rối loạn lo âu kéo dài', 7, 'Chesney et al., World Psychiatry 2014'),
  Illness('dm', 'Tiểu đường type 2', 6, 'Emerging Risk Factors Collab., JAMA 2015'),
  Illness('cancer', 'Ung thư đang điều trị', 6, 'Rất khác nhau theo loại; lấy mức trung bình thận trọng'),
  Illness('ckd', 'Bệnh thận mạn', 5, 'Turin et al., JASN 2012'),
  Illness('htn', 'Tăng huyết áp', 5, 'Franco et al., Hypertension 2005 (Framingham)'),
  Illness('copd', 'Bệnh phổi tắc nghẽn mạn tính, hen nặng', 4, 'Shavelle et al., Int J COPD 2009'),
  Illness('liver', 'Viêm gan B/C mạn, xơ gan', 4, 'Ước tính từ các nghiên cứu theo dõi viêm gan mạn'),
  Illness('lipid', 'Mỡ máu cao', 1.5, 'Ước tính từ nguy cơ tim mạch tăng thêm'),
];

const List<double> kDiminish = [1, .75, .6, .5, .4, .35, .3, .3, .3];

/// Moore et al., PLoS Medicine 2012: phút vận động mỗi tuần -> năm sống thêm.
const List<List<double>> kExerciseCurve = [
  [0, 0],
  [75, 1.8],
  [150, 3.4],
  [300, 4.2],
  [450, 4.5],
];

double lerpCurve(List<List<double>> pts, double x) {
  if (x <= pts.first[0]) return pts.first[1];
  for (var i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      final a = pts[i - 1], b = pts[i];
      return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
  }
  return pts.last[1];
}

/// Katzmarzyk & Lee, BMJ Open 2012: ngồi quá 3 giờ mỗi ngày bị trừ dần.
double sitPenalty(double h) => math.min(3.0, math.max(0.0, h - 3) * 0.33);

double _num(Object? v, double fallback) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

/// Hồ sơ sức khỏe. Tên trường giống bản web để đồng bộ qua máy chủ.
class Profile {
  Profile({
    this.birth = '',
    this.sex = 'm',
    this.height = 168,
    this.weight = 62,
    this.exercise = 10,
    this.sitting = 9,
    this.sleep = 6.5,
    this.smoke = 'never',
    this.alcohol = 1,
    this.phone = 5,
    this.parentAge = 50,
    this.visits = 6,
    List<String>? ills,
  }) : ills = ills ?? <String>[];

  String birth;
  String sex;
  double height;
  double weight;
  double exercise;
  double sitting;
  double sleep;
  String smoke;
  int alcohol;
  double phone;
  double parentAge;
  double visits;
  List<String> ills;

  bool get isSample => birth.isEmpty;

  DateTime get birthDate {
    final p = birth.split('-');
    if (p.length == 3) {
      final y = int.tryParse(p[0]), m = int.tryParse(p[1]), d = int.tryParse(p[2]);
      if (y != null && m != null && d != null) return DateTime(y, m, d);
    }
    return DateTime(2000, 1, 1);
  }

  double get bmi {
    final h = height / 100;
    return h > 0 && weight > 0 ? weight / (h * h) : 0;
  }

  factory Profile.fromJson(Map<String, dynamic> j) {
    final d = Profile();
    return Profile(
      birth: (j['birth'] ?? '').toString(),
      sex: j['sex'] == 'f' ? 'f' : 'm',
      height: _num(j['height'], d.height),
      weight: _num(j['weight'], d.weight),
      exercise: _num(j['exercise'], d.exercise),
      sitting: _num(j['sitting'], d.sitting),
      sleep: _num(j['sleep'], d.sleep),
      smoke: const ['never', 'quit', 'yes'].contains(j['smoke']) ? j['smoke'] as String : 'never',
      alcohol: _num(j['alcohol'], 1).round().clamp(0, 3),
      phone: _num(j['phone'], d.phone),
      parentAge: _num(j['parentAge'], d.parentAge),
      visits: _num(j['visits'], d.visits),
      ills: (j['ills'] is List) ? (j['ills'] as List).map((e) => e.toString()).toList() : <String>[],
    );
  }

  Map<String, dynamic> toJson() => {
        'birth': birth,
        'sex': sex,
        'height': height,
        'weight': weight,
        'exercise': exercise,
        'sitting': sitting,
        'sleep': sleep,
        'smoke': smoke,
        'alcohol': alcohol.toString(),
        'phone': phone,
        'parentAge': parentAge,
        'visits': visits,
        'ills': ills,
      };
}

class LifeRow {
  const LifeRow(this.factor, this.value, this.years, this.source, {this.isBase = false});
  final String factor;
  final String value;
  final double years;
  final String source;
  final bool isBase;
}

class LifeResult {
  const LifeResult(this.rows, this.total, this.floored, this.ageNow, this.cause);
  final List<LifeRow> rows;
  final double total;
  final bool floored;
  final double ageNow;
  final String cause;
}

String _fmt1(double v) => v.toStringAsFixed(1).replaceAll('.', ',');
String _trim(double v) => v == v.roundToDouble() ? v.round().toString() : _fmt1(v);

LifeResult computeLife(Profile p, {double boughtHours = 0, DateTime? now}) {
  final at = now ?? DateTime.now();
  final rows = <LifeRow>[];
  final base = kBaseLife[p.sex] ?? kBaseLife['m']!;
  rows.add(LifeRow('Tuổi thọ trung bình người Việt (${p.sex == 'f' ? 'nữ' : 'nam'})', '', base, 'Tổng cục Thống kê Việt Nam', isBase: true));

  final exRef = lerpCurve(kExerciseCurve, 60);
  rows.add(LifeRow('Tập thể dục', '${_trim(p.exercise)} phút/ngày', lerpCurve(kExerciseCurve, p.exercise * 7) - exRef,
      'Moore et al., PLoS Medicine 2012 (654.827 người)'));

  rows.add(LifeRow('Ngồi không', '${_trim(p.sitting)} giờ/ngày', sitPenalty(7) - sitPenalty(p.sitting), 'Katzmarzyk & Lee, BMJ Open 2012'));

  final bmi = p.bmi;
  if (bmi > 0) {
    final double by = bmi < 18.5 ? -1 : bmi < 25 ? 0 : bmi < 30 ? -0.5 : bmi < 35 ? -3 : bmi < 40 ? -5 : -9;
    rows.add(LifeRow('Chỉ số BMI', _fmt1(bmi), by, 'Prospective Studies Collab., Lancet 2009'));
  }

  final double sl = p.sleep < 6 ? -1 : (p.sleep > 9 ? -0.5 : 0);
  rows.add(LifeRow('Giấc ngủ', '${_trim(p.sleep)} giờ/đêm', sl, 'Cappuccio et al., Sleep 2010'));

  const smokeYears = {'never': 0.0, 'quit': -2.0, 'yes': -10.0};
  const smokeText = {'never': 'không hút', 'quit': 'đã bỏ', 'yes': 'đang hút'};
  rows.add(LifeRow('Thuốc lá', smokeText[p.smoke] ?? 'không hút', smokeYears[p.smoke] ?? 0, 'Jha et al., NEJM 2013'));

  const alcYears = [0.0, -0.5, -1.5, -4.5];
  const alcText = ['dưới 10 ly/tuần', '10–20 ly/tuần', '20–35 ly/tuần', 'trên 35 ly/tuần'];
  final ai = p.alcohol.clamp(0, 3);
  rows.add(LifeRow('Rượu bia', alcText[ai], alcYears[ai], 'Wood et al., Lancet 2018'));

  final chosen = kIllnesses.where((i) => p.ills.contains(i.id)).toList()..sort((a, b) => b.years.compareTo(a.years));
  for (var i = 0; i < chosen.length; i++) {
    final w = i < kDiminish.length ? kDiminish[i] : 0.3;
    rows.add(LifeRow(chosen[i].name, w < 1 ? 'tính ${(w * 100).round()}% vì trùng lặp' : 'đang mắc', -chosen[i].years * w, chosen[i].source));
  }

  var total = rows.fold<double>(0, (s, r) => s + r.years);
  final ageNow = at.difference(p.birthDate).inMilliseconds / kYearMs;
  var floored = false;
  if (total < ageNow + 0.5) {
    total = ageNow + 0.5;
    floored = true;
  }
  total = math.min(total, 105.0);

  if (boughtHours != 0) {
    final extra = boughtHours / (365.2425 * 24);
    rows.add(LifeRow('Chợ giờ sống', '', extra, 'Tổng các lần mua và bán trong Chợ giờ sống'));
    total = math.min(105.0, math.max(ageNow + 1 / 365, total + extra));
  }

  final negatives = rows.where((r) => !r.isBase && r.years < 0).toList()..sort((a, b) => a.years.compareTo(b.years));
  final worst = negatives.isEmpty ? null : negatives.first;
  final cause = (worst != null && worst.years <= -0.9) ? _causeText(worst.factor) : 'Tuổi già. Nếu bạn may mắn.';
  return LifeResult(rows, total, floored, ageNow, cause);
}

String _causeText(String factor) {
  const map = {
    'Thuốc lá': 'Hậu quả của thuốc lá',
    'Rượu bia': 'Hậu quả của rượu bia',
    'Ngồi không': 'Ngồi một chỗ quá lâu, quá nhiều năm',
    'Tập thể dục': 'Cơ thể không được vận động',
    'Chỉ số BMI': 'Biến chứng của béo phì',
    'Giấc ngủ': 'Thiếu ngủ kéo dài',
  };
  return map[factor] ?? 'Biến chứng của ${factor.toLowerCase()}';
}

/// Chợ giờ sống: mua bằng hành động tốt, bán bằng thói quen xấu.
class Ware {
  const Ware(this.id, this.name, this.hours, this.cap, this.source, {this.sell = false});
  final String id;
  final String name;
  final double hours;
  final int cap;
  final String source;
  final bool sell;
}

const List<Ware> kWares = [
  Ware('run', 'Chạy bộ 1 giờ', 7, 2, 'Lee et al., Progress in Cardiovascular Diseases 2017'),
  Ware('walk', 'Đi bộ nhanh 30 phút', 2.5, 4, 'Quy đổi từ Moore et al., PLoS Medicine 2012'),
  Ware('stand', 'Đứng dậy vận động thay vì ngồi 1 giờ', 22 / 60, 8, 'Veerman et al., Br J Sports Med 2012'),
  Ware('smoke', 'Hút 1 điếu thuốc', -20 / 60, 60, 'Jackson et al., UCL, Addiction 2025', sell: true),
  Ware('drink', 'Uống 1 ly rượu bia vượt mức khuyến cáo', -15 / 60, 30, 'Spiegelhalter, dựa trên Wood et al., Lancet 2018', sell: true),
  Ware('screen', 'Ngồi xem màn hình thêm 1 giờ', -22 / 60, 16, 'Veerman et al., Br J Sports Med 2012', sell: true),
];
