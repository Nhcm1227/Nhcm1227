/// Tiện ích xử lý chuỗi tiếng Việt: bỏ dấu, chuẩn hoá để so khớp.
library;

const Map<String, String> _groups = {
  'a': 'àáạảãâầấậẩẫăằắặẳẵ',
  'e': 'èéẹẻẽêềếệểễ',
  'i': 'ìíịỉĩ',
  'o': 'òóọỏõôồốộổỗơờớợởỡ',
  'u': 'ùúụủũưừứựửữ',
  'y': 'ỳýỵỷỹ',
  'd': 'đ',
};

final Map<int, String> _diacriticMap = () {
  final map = <int, String>{};
  _groups.forEach((base, chars) {
    for (final rune in chars.runes) {
      map[rune] = base;
    }
  });
  return map;
}();

/// Chuyển về chữ thường và bỏ dấu tiếng Việt. Giữ nguyên dấu câu.
String removeDiacritics(String input) {
  final buffer = StringBuffer();
  for (final rune in input.toLowerCase().runes) {
    // Bỏ các dấu tổ hợp (combining marks) nếu chuỗi ở dạng NFD.
    if (rune >= 0x300 && rune <= 0x36f) continue;
    buffer.write(_diacriticMap[rune] ?? String.fromCharCode(rune));
  }
  return buffer.toString();
}

/// Bỏ dấu, chữ thường, chỉ giữ chữ/số, gộp khoảng trắng.
/// Ví dụ: "Thịt Bò (Úc)" -> "thit bo uc".
String normalizeText(String input) => removeDiacritics(input)
    .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
    .trim();

/// Kiểm tra [phrase] xuất hiện như một cụm từ trọn vẹn trong [text].
/// Cả hai tham số phải đã được chuẩn hoá bằng [normalizeText].
bool containsPhrase(String text, String phrase) =>
    phrase.isNotEmpty && ' $text '.contains(' $phrase ');
