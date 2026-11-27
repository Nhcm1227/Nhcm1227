// Gọi máy chủ dùng chung với bản web. Phiên đăng nhập giữ bằng cookie dh_s.
import 'dart:convert';

import 'package:http/http.dart' as http;

const String kApiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://dong-ho-doi-nguoi.vercel.app');

class ApiException implements Exception {
  ApiException(this.message, this.status);
  final String message;
  final int status;
  @override
  String toString() => message;
}

class Api {
  Api({this.base = kApiBase});

  final String base;
  String? cookie;
  void Function(String? cookie)? onCookie;
  final http.Client _client = http.Client();

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);
  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) => _send('POST', path, body ?? const {});
  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) => _send('PUT', path, body);

  Future<Map<String, dynamic>> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final uri = Uri.parse('$base/api/$path');
    final headers = <String, String>{'accept': 'application/json'};
    if (body != null) headers['content-type'] = 'application/json';
    final c = cookie;
    if (c != null) headers['cookie'] = c;

    final http.Response res;
    try {
      final req = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(await _client.send(req)).timeout(const Duration(seconds: 20));
    } catch (_) {
      throw ApiException('Mất kết nối. Kiểm tra mạng rồi thử lại.', 0);
    }

    final setCookie = res.headers['set-cookie'];
    if (setCookie != null) {
      final m = RegExp(r'dh_s=([^;]*)').firstMatch(setCookie);
      if (m != null) {
        final v = m.group(1) ?? '';
        cookie = v.isEmpty ? null : 'dh_s=$v';
        onCookie?.call(cookie);
      }
    }

    Map<String, dynamic> json = <String, dynamic>{};
    try {
      final decoded = jsonDecode(utf8.decode(res.bodyBytes));
      if (decoded is Map<String, dynamic>) json = decoded;
    } catch (_) {}

    if (res.statusCode >= 400) {
      final err = json['error'];
      throw ApiException(err is String ? err : 'Có lỗi xảy ra (mã ${res.statusCode}).', res.statusCode);
    }
    return json;
  }
}
