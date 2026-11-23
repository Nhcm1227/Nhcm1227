import '../utils/text_utils.dart';

/// Kết quả đọc hạn sử dụng từ chữ nhận diện được trên bao bì.
class ParsedExpiry {
  const ParsedExpiry(this.date, this.confidence, this.reason);

  final DateTime date;

  /// 0..1 — độ tin cậy ước lượng.
  final double confidence;

  /// Giải thích ngắn gọn, hiển thị cho người dùng.
  final String reason;

  @override
  String toString() => 'ParsedExpiry($date, $confidence, $reason)';
}

enum _Label { expiry, production, none }

class _Candidate {
  _Candidate(this.date, this.line, this.start, this.end,
      {this.monthOnly = false, this.requiresLabel = false});

  final DateTime date;
  final int line;
  final int start;
  final int end;
  final bool monthOnly;

  /// Dạng dễ nhầm (vd 6 chữ số liền nhau) — chỉ chấp nhận khi có nhãn HSD/NSX.
  final bool requiresLabel;
  _Label label = _Label.none;
}

/// Đọc hạn sử dụng từ văn bản OCR. Hỗ trợ:
/// - 12/05/2027, 12-05-27, 12.05.2027, 2027-05-12, 20270512, 12052027
/// - 12 MAY 2027, MAY 12, 2027, 05/2027, MAY 2027 (lấy ngày cuối tháng)
/// - Nhãn: HSD, Hạn sử dụng, EXP, Best before, BB, Use by... và NSX, MFG...
/// - "HSD: 12 tháng kể từ NSX" + ngày NSX.
class ExpiryDateParser {
  static const _expiryKeywords = [
    'han su dung', 'han dung', 'hsd', 'h s d', 'han sd',
    'ngay het han', 'het han', 'su dung den', 'dung truoc', 'sd truoc',
    'su dung tot nhat truoc', 'exp date', 'expiry date', 'expiration date',
    'expiry', 'expires', 'expire', 'exp', 'ex', 'best before end',
    'best before', 'best by', 'bbe', 'bbd', 'bb', 'use by', 'use before',
    'consume before', 'valid until', 'a consommer', 'mindestens haltbar',
  ];

  static const _productionKeywords = [
    'ngay san xuat', 'san xuat', 'nsx', 'ngay sx', 'n s x', 'sx',
    'mfg date', 'mfg', 'mfd', 'mf', 'manufactured', 'manufacturing date',
    'date of manufacture', 'production date', 'prod date', 'prod',
    'packed on', 'packed', 'pkd', 'dom',
  ];

  static const _months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];
  static const _monthAlt =
      '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

  static final _ymd = RegExp(
      r'(?<!\d)(\d{4})\s?[/.\-]\s?(\d{1,2})\s?[/.\-]\s?(\d{1,2})(?!\d)');
  static final _dMonY = RegExp(
      '(?<!\\d)(\\d{1,2})\\s?[ /.\\-]?\\s?$_monthAlt\\s?[ /.\\-,]?\\s?(\\d{4}|\\d{2})(?!\\d)');
  static final _monDY = RegExp(
      '(?<![a-z])$_monthAlt\\s?(\\d{1,2}),?\\s(\\d{4})(?!\\d)');
  static final _dmy = RegExp(
      r'(?<!\d)(\d{1,2})\s?[/.\-]\s?(\d{1,2})\s?[/.\-]\s?(\d{4}|\d{2})(?!\d)');
  static final _compact8 = RegExp(r'(?<!\d)(\d{8})(?!\d)');
  static final _compact6 = RegExp(r'(?<!\d)(\d{6})(?!\d)');
  static final _monY =
      RegExp('(?<![a-z])$_monthAlt\\s?[ /.\\-]?\\s?(\\d{4})(?!\\d)');
  static final _my =
      RegExp(r'(?<![\d/.\-])(\d{1,2})\s?[/.\-]\s?(\d{4})(?![\d/.\-]*\d)');

  static final _relative = RegExp(
      r'(?<!\d)(\d{1,4})\s?(thang|months?|mths?|ngay|days?|nam|years?)(?![a-z])');

  /// Đọc ngày hết hạn từ [text]. Trả về null nếu không tìm thấy.
  static ParsedExpiry? parse(String text, {DateTime? now}) {
    final today = now ?? DateTime.now();
    final lines = text
        .split(RegExp(r'[\r\n]+'))
        .map((l) => _fixOcrDigits(removeDiacritics(l)))
        .toList();

    final candidates = <_Candidate>[];
    for (var i = 0; i < lines.length; i++) {
      candidates.addAll(_findDates(lines[i], i));
    }

    // Gán nhãn HSD / NSX cho từng ngày tìm được.
    for (final c in candidates) {
      c.label = _labelFor(lines, candidates, c);
    }
    candidates.removeWhere((c) => c.requiresLabel && c.label == _Label.none);

    final expiry = candidates.where((c) => c.label == _Label.expiry).toList();
    if (expiry.isNotEmpty) {
      expiry.sort((a, b) => b.date.compareTo(a.date));
      final best = expiry.first;
      return ParsedExpiry(best.date, best.monthOnly ? 0.85 : 0.95,
          'Tìm thấy nhãn hạn sử dụng (HSD/EXP)');
    }

    final production =
        candidates.where((c) => c.label == _Label.production).toList();

    // "HSD: 12 tháng kể từ NSX"
    if (production.isNotEmpty) {
      final rel = _findRelativeDuration(lines);
      if (rel != null) {
        production.sort((a, b) => a.date.compareTo(b.date));
        final p = production.first.date;
        final date = rel.$2 == _Unit.month
            ? _addMonths(p, rel.$1)
            : rel.$2 == _Unit.year
                ? _addMonths(p, rel.$1 * 12)
                : DateTime(p.year, p.month, p.day + rel.$1);
        return ParsedExpiry(
            date, 0.8, 'Tính từ ngày sản xuất + thời hạn sử dụng');
      }
    }

    var unlabeled = candidates.where((c) => c.label == _Label.none).toList();
    if (production.isNotEmpty) {
      final latestProd = production
          .map((c) => c.date)
          .reduce((a, b) => a.isAfter(b) ? a : b);
      unlabeled = unlabeled.where((c) => c.date.isAfter(latestProd)).toList();
    }
    // Ngày quá xa trong quá khứ thường là ngày sản xuất.
    final oneYearAgo = DateTime(today.year - 1, today.month, today.day);
    unlabeled = unlabeled.where((c) => c.date.isAfter(oneYearAgo)).toList();

    if (unlabeled.isNotEmpty) {
      unlabeled.sort((a, b) => b.date.compareTo(a.date));
      final best = unlabeled.first;
      // Có nhiều ngày: NSX luôn trước HSD nên ngày muộn nhất là HSD.
      final conf = unlabeled.length > 1 ? 0.7 : 0.6;
      return ParsedExpiry(best.date, best.monthOnly ? conf - 0.1 : conf,
          'Không có nhãn rõ ràng — lấy ngày muộn nhất');
    }
    return null;
  }

  // ---------------------------------------------------------------------------

  /// Sửa lỗi OCR thường gặp trong cụm số: O->0, I/l->1.
  static String _fixOcrDigits(String line) {
    return line.replaceAllMapped(RegExp(r'[0-9oil/.\-]{4,}'), (m) {
      final token = m[0]!;
      final digits = token.replaceAll(RegExp(r'[^0-9]'), '').length;
      if (digits < 3) return token;
      return token.replaceAll('o', '0').replaceAll(RegExp('[il]'), '1');
    });
  }

  static List<_Candidate> _findDates(String line, int lineIndex) {
    final found = <_Candidate>[];
    final used = <(int, int)>[];

    bool overlaps(int s, int e) => used.any((u) => s < u.$2 && e > u.$1);

    void scan(RegExp re, _Candidate? Function(RegExpMatch m) build) {
      for (final m in re.allMatches(line)) {
        if (overlaps(m.start, m.end)) continue;
        final c = build(m);
        if (c != null) {
          found.add(c);
          used.add((m.start, m.end));
        }
      }
    }

    scan(_ymd, (m) {
      final d = _makeDate(_int(m[1]), _int(m[2]), _int(m[3]));
      return d == null ? null : _Candidate(d, lineIndex, m.start, m.end);
    });
    scan(_dMonY, (m) {
      final d = _makeDate(_year(m[3]!), _monthIndex(m[2]!), _int(m[1]));
      return d == null ? null : _Candidate(d, lineIndex, m.start, m.end);
    });
    scan(_monDY, (m) {
      final d = _makeDate(_int(m[3]), _monthIndex(m[1]!), _int(m[2]));
      return d == null ? null : _Candidate(d, lineIndex, m.start, m.end);
    });
    scan(_dmy, (m) {
      var a = _int(m[1]);
      var b = _int(m[2]);
      // Mặc định dd/mm (Việt Nam). Nếu số thứ hai > 12 thì là mm/dd (kiểu Mỹ).
      if (a <= 12 && b > 12) {
        final t = a;
        a = b;
        b = t;
      }
      final d = _makeDate(_year(m[3]!), b, a);
      return d == null ? null : _Candidate(d, lineIndex, m.start, m.end);
    });
    scan(_compact8, (m) {
      final s = m[1]!;
      // ddmmyyyy trước, rồi tới yyyymmdd.
      final d = _makeDate(_int(s.substring(4)), _int(s.substring(2, 4)),
              _int(s.substring(0, 2))) ??
          _makeDate(_int(s.substring(0, 4)), _int(s.substring(4, 6)),
              _int(s.substring(6)));
      return d == null ? null : _Candidate(d, lineIndex, m.start, m.end);
    });
    scan(_compact6, (m) {
      final s = m[1]!;
      final d = _makeDate(2000 + _int(s.substring(4)), _int(s.substring(2, 4)),
          _int(s.substring(0, 2)));
      return d == null
          ? null
          : _Candidate(d, lineIndex, m.start, m.end, requiresLabel: true);
    });
    scan(_monY, (m) {
      final d = _endOfMonth(_int(m[2]), _monthIndex(m[1]!));
      return d == null
          ? null
          : _Candidate(d, lineIndex, m.start, m.end, monthOnly: true);
    });
    scan(_my, (m) {
      final d = _endOfMonth(_int(m[2]), _int(m[1]));
      return d == null
          ? null
          : _Candidate(d, lineIndex, m.start, m.end, monthOnly: true);
    });

    found.sort((a, b) => a.start.compareTo(b.start));
    return found;
  }

  static _Label _labelFor(
      List<String> lines, List<_Candidate> all, _Candidate c) {
    final sameLine = all.where((o) => o.line == c.line).toList()
      ..sort((a, b) => a.start.compareTo(b.start));
    final idx = sameLine.indexOf(c);
    // Chỉ xét phần chữ nằm giữa ngày trước đó (cùng dòng) và ngày này.
    final prevEnd = idx == 0 ? 0 : sameLine[idx - 1].end;
    final label =
        _lastKeyword(normalizeText(lines[c.line].substring(prevEnd, c.start)));
    if (label != _Label.none) return label;

    // Nhãn nằm ở dòng phía trên, vd:
    //   "HSD:"            hoặc   "NSX        HSD"
    //   "12/05/2027"             "01/01/26   01/01/27"
    if (c.line == 0) return _Label.none;
    if (all.any((o) => o.line == c.line - 1)) return _Label.none;
    final labels = _keywordSequence(normalizeText(lines[c.line - 1]));
    if (labels.isEmpty) return _Label.none;
    if (labels.length == sameLine.length) return labels[idx];
    return idx == 0 ? labels.last : _Label.none;
  }

  static final List<(List<String>, _Label)> _allKeywords = [
    for (final k in _expiryKeywords) (k.split(' '), _Label.expiry),
    for (final k in _productionKeywords) (k.split(' '), _Label.production),
  ]..sort((a, b) => b.$1.length.compareTo(a.$1.length));

  /// Danh sách nhãn theo thứ tự xuất hiện trong [normalized].
  static List<_Label> _keywordSequence(String normalized) {
    final words = normalized.split(' ').where((w) => w.isNotEmpty).toList();
    final out = <_Label>[];
    var i = 0;
    while (i < words.length) {
      var matched = false;
      for (final (kw, label) in _allKeywords) {
        if (i + kw.length > words.length) continue;
        var ok = true;
        for (var j = 0; j < kw.length; j++) {
          if (words[i + j] != kw[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          out.add(label);
          i += kw.length;
          matched = true;
          break;
        }
      }
      if (!matched) i++;
    }
    return out;
  }

  static _Label _lastKeyword(String normalized) =>
      _keywordSequence(normalized).lastOrNull ?? _Label.none;

  static (int, _Unit)? _findRelativeDuration(List<String> lines) {
    for (final line in lines) {
      final norm = normalizeText(line);
      final hasContext = _lastKeyword(norm) == _Label.expiry ||
          containsPhrase(norm, 'ke tu') ||
          containsPhrase(norm, 'tu ngay') ||
          containsPhrase(norm, 'trong vong') ||
          containsPhrase(norm, 'from') ||
          containsPhrase(norm, 'within');
      if (!hasContext) continue;
      for (final m in _relative.allMatches(norm)) {
        // Bỏ qua "6 tháng tuổi" (độ tuổi sử dụng).
        final after = norm.substring(m.end).trimLeft();
        if (after.startsWith('tuoi') || after.startsWith('old')) continue;
        final n = _int(m[1]);
        if (n <= 0) continue;
        final unit = m[2]!;
        if (unit.startsWith('thang') || unit.startsWith('m')) {
          return (n, _Unit.month);
        }
        if (unit.startsWith('nam') || unit.startsWith('y')) {
          return (n, _Unit.year);
        }
        return (n, _Unit.day);
      }
    }
    return null;
  }

  static int _int(String? s) => int.tryParse(s ?? '') ?? -1;

  static int _year(String s) {
    final y = _int(s);
    return s.length == 2 ? 2000 + y : y;
  }

  static int _monthIndex(String s) =>
      _months.indexOf(s.substring(0, 3).toLowerCase()) + 1;

  static DateTime? _makeDate(int y, int m, int d) {
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
    if (d > _daysInMonth(y, m)) return null;
    return DateTime(y, m, d);
  }

  static DateTime? _endOfMonth(int y, int m) {
    if (y < 2000 || y > 2100 || m < 1 || m > 12) return null;
    return DateTime(y, m, _daysInMonth(y, m));
  }

  static int _daysInMonth(int y, int m) => DateTime.utc(y, m + 1, 0).day;

  static DateTime _addMonths(DateTime d, int months) {
    final total = d.month - 1 + months;
    final y = d.year + total ~/ 12;
    final m = total % 12 + 1;
    final day = d.day.clamp(1, _daysInMonth(y, m));
    return DateTime(y, m, day);
  }
}

enum _Unit { day, month, year }
