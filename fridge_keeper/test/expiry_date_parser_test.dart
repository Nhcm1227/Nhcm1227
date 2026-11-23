import 'package:flutter_test/flutter_test.dart';
import 'package:fridge_keeper/services/expiry_date_parser.dart';

void main() {
  final now = DateTime(2026, 11, 23);
  DateTime? parse(String s) => ExpiryDateParser.parse(s, now: now)?.date;

  group('ExpiryDateParser', () {
    test('HSD dd/mm/yyyy', () {
      expect(parse('HSD: 12/05/2027'), DateTime(2027, 5, 12));
    });

    test('Hạn sử dụng có dấu, ngày gạch ngang, năm 2 số', () {
      expect(parse('Hạn sử dụng: 05-01-27'), DateTime(2027, 1, 5));
    });

    test('Chọn HSD chứ không chọn NSX trên cùng một dòng', () {
      expect(parse('NSX: 01/10/2026  HSD: 01/04/2027'), DateTime(2027, 4, 1));
    });

    test('NSX và HSD trên hai dòng', () {
      expect(parse('NSX 15.11.2026\nHSD 15.12.2026'), DateTime(2026, 12, 15));
    });

    test('Nhãn ở dòng trên, ngày ở dòng dưới', () {
      expect(parse('HẠN SỬ DỤNG\n20/12/2026'), DateTime(2026, 12, 20));
    });

    test('Bảng 2 cột NSX / HSD', () {
      expect(parse('NSX        HSD\n01/11/26   01/02/27'), DateTime(2027, 2, 1));
    });

    test('EXP tiếng Anh với tháng chữ', () {
      expect(parse('EXP 12 JAN 2027'), DateTime(2027, 1, 12));
      expect(parse('Best before: MAR 05, 2027'), DateTime(2027, 3, 5));
    });

    test('Chỉ có tháng/năm -> ngày cuối tháng', () {
      expect(parse('BB 02/2027'), DateTime(2027, 2, 28));
      expect(parse('EXP: JUN 2027'), DateTime(2027, 6, 30));
    });

    test('ISO yyyy-mm-dd', () {
      expect(parse('Use by 2027-03-09'), DateTime(2027, 3, 9));
    });

    test('Dạng liền 8 số', () {
      expect(parse('EXP 31122026'), DateTime(2026, 12, 31));
    });

    test('Dạng liền 6 số chỉ nhận khi có nhãn', () {
      expect(parse('HSD 311226'), DateTime(2026, 12, 31));
      expect(parse('LOT 311226'), isNull);
    });

    test('Không có nhãn: lấy ngày muộn nhất', () {
      expect(parse('10/11/2026\n10/05/2027'), DateTime(2027, 5, 10));
    });

    test('Sửa lỗi OCR chữ O thành số 0', () {
      expect(parse('HSD: 1O/O5/2O27'), DateTime(2027, 5, 10));
    });

    test('HSD tương đối: 12 tháng kể từ NSX', () {
      expect(parse('NSX: 15/03/2026\nHSD: 12 tháng kể từ NSX'),
          DateTime(2027, 3, 15));
    });

    test('Không nhầm "6 tháng tuổi" là hạn sử dụng', () {
      final r = ExpiryDateParser.parse(
          'Dùng cho trẻ từ 6 tháng tuổi\nNSX: 01/10/2026',
          now: now);
      expect(r, isNull);
    });

    test('Không có ngày nào', () {
      expect(parse('Sữa tươi tiệt trùng 180ml'), isNull);
    });

    test('Ngày không hợp lệ bị bỏ qua', () {
      expect(parse('HSD 31/02/2027'), isNull);
    });
  });
}
