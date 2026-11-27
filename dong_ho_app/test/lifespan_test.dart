// Đối chiếu với bản web: cùng hồ sơ phải ra cùng tuổi thọ.
import 'package:dong_ho_doi_nguoi/src/format.dart';
import 'package:dong_ho_doi_nguoi/src/lifespan.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime(2026, 11, 27);

  test('hồ sơ mẫu ra 70,2 tuổi như bản web', () {
    final r = computeLife(Profile(), now: now);
    expect(r.total.toStringAsFixed(1), '70.2');
    expect(r.floored, isFalse);
  });

  test('người khỏe mạnh ra 74,4 tuổi', () {
    final p = Profile(birth: '2000-01-01', height: 170, weight: 65, exercise: 30, sitting: 4, sleep: 7, alcohol: 0);
    expect(computeLife(p, now: now).total.toStringAsFixed(1), '74.4');
  });

  test('hút thuốc, ngồi nhiều, ba bệnh nặng ra 43,5 tuổi', () {
    final p = Profile(birth: '2000-01-01', height: 170, weight: 65, exercise: 0, sitting: 12, sleep: 7, alcohol: 0, smoke: 'yes', ills: ['dm', 'htn', 'cvd']);
    final r = computeLife(p, now: now);
    expect(r.total.toStringAsFixed(1), '43.5');
    expect(r.cause, 'Hậu quả của thuốc lá');
  });

  test('người đã sống vượt dự báo thì không bị tính chết trong quá khứ', () {
    final p = Profile(birth: '1940-01-01', smoke: 'yes', ills: ['cvd', 'dm', 'cancer']);
    final r = computeLife(p, now: now);
    expect(r.floored, isTrue);
    expect(r.total, greaterThan(r.ageNow));
  });

  test('mua giờ sống cộng vào tuổi thọ', () {
    final a = computeLife(Profile(), now: now).total;
    final b = computeLife(Profile(), boughtHours: 365.2425 * 24, now: now).total;
    expect((b - a).toStringAsFixed(3), '1.000');
  });

  test('đọc được hồ sơ do bản web lưu (số dạng chuỗi)', () {
    final p = Profile.fromJson({'birth': '1999-05-06', 'sex': 'f', 'height': '160', 'alcohol': '2', 'ills': ['htn']});
    expect(p.height, 160);
    expect(p.alcohol, 2);
    expect(p.sex, 'f');
    expect(Profile.fromJson(p.toJson()).toJson(), p.toJson());
  });

  test('định dạng số kiểu Việt Nam', () {
    expect(fmtInt(15805), '15.805');
    expect(fmtInt(1638699043), '1.638.699.043');
    expect(fmtDec(70.18), '70,2');
    expect(hstr(7), '+7 giờ');
    expect(hstr(-22 / 60), '−22 phút');
    expect(hstr(2.5), '+2 giờ 30 phút');
  });
}
