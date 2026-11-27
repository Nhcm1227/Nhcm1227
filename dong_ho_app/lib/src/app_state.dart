// Toàn bộ dữ liệu của app: hồ sơ, sổ việc, chợ giờ sống, tài khoản, bảng xếp hạng.
// Lưu trên máy; khi đăng nhập thì đồng bộ với máy chủ (dùng chung với bản web).
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'lifespan.dart';

/// Apple và Google bắt gói trả phí trong app phải mua qua hệ thống của họ.
/// Khi chưa gắn mua trong app, mọi tính năng trong app đều mở để không bị từ chối khi duyệt.
const bool kGatePremium = false;
const int kFreeTaskLimit = 3;

class TaskItem {
  TaskItem({required this.id, required this.title, this.due = 0, this.done = false, this.doneAt = 0, int? created, this.fired = false})
      : created = created ?? DateTime.now().millisecondsSinceEpoch;

  final String id;
  String title;
  int due;
  bool done;
  int doneAt;
  final int created;
  bool fired;

  DateTime? get dueDate => due > 0 ? DateTime.fromMillisecondsSinceEpoch(due) : null;

  factory TaskItem.fromJson(Map<String, dynamic> j) => TaskItem(
        id: (j['id'] ?? '').toString(),
        title: (j['t'] ?? '').toString(),
        due: (j['due'] is num) ? (j['due'] as num).toInt() : 0,
        done: j['done'] == true,
        doneAt: (j['doneAt'] is num) ? (j['doneAt'] as num).toInt() : 0,
        created: (j['created'] is num) ? (j['created'] as num).toInt() : null,
        fired: j['fired'] == true,
      );

  Map<String, dynamic> toJson() => {'id': id, 't': title, 'due': due, 'done': done, 'doneAt': doneAt, 'created': created, 'fired': fired};
}

class Purchase {
  Purchase(this.id, this.hours, this.at);
  final String id;
  final double hours;
  final int at;

  factory Purchase.fromJson(Map<String, dynamic> j) =>
      Purchase((j['id'] ?? '').toString(), (j['h'] is num) ? (j['h'] as num).toDouble() : 0, (j['at'] is num) ? (j['at'] as num).toInt() : 0);

  Map<String, dynamic> toJson() => {'id': id, 'h': hours, 'at': at};
}

class AppState extends ChangeNotifier {
  late SharedPreferences _prefs;
  final Api api = Api();

  Profile profile = Profile();
  List<TaskItem> tasks = [];
  List<Purchase> bought = [];
  Map<String, dynamic>? user;
  int serverSkewMs = 0;

  Map<String, dynamic>? board;
  bool boardLoading = false;
  String? boardError;

  late LifeResult result;
  late DateTime deathAt;
  Timer? _syncTimer;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    api.cookie = _prefs.getString('cookie');
    api.onCookie = (c) => c == null ? _prefs.remove('cookie') : _prefs.setString('cookie', c);
    _loadLocal();
    if (tasks.isEmpty && !(_prefs.getBool('seeded') ?? false)) {
      final now = DateTime.now().millisecondsSinceEpoch;
      tasks = [
        TaskItem(id: 's1', title: 'Ví dụ: gọi điện cho mẹ', due: now + 2 * 3600000),
        TaskItem(id: 's2', title: 'Ví dụ: đi bộ 20 phút, để điện thoại ở nhà'),
      ];
      await _prefs.setBool('seeded', true);
      _writeLocal();
    }
    recompute();
    unawaited(refreshMe());
  }

  // ---------- lưu trên máy ----------
  void _loadLocal() {
    try {
      final p = _prefs.getString('cfg');
      if (p != null) profile = Profile.fromJson(jsonDecode(p) as Map<String, dynamic>);
      final t = _prefs.getString('tasks');
      if (t != null) tasks = (jsonDecode(t) as List).map((e) => TaskItem.fromJson(e as Map<String, dynamic>)).toList();
      final b = _prefs.getString('bought');
      if (b != null) bought = (jsonDecode(b) as List).map((e) => Purchase.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
  }

  void _writeLocal() {
    _prefs.setString('cfg', jsonEncode(profile.toJson()));
    _prefs.setString('tasks', jsonEncode(tasks.map((e) => e.toJson()).toList()));
    _prefs.setString('bought', jsonEncode(bought.map((e) => e.toJson()).toList()));
  }

  void _changed() {
    recompute();
    _writeLocal();
    notifyListeners();
    _queueSync();
  }

  // ---------- tuổi thọ ----------
  double get boughtHours => bought.fold<double>(0, (s, e) => s + e.hours);

  void recompute() {
    result = computeLife(profile, boughtHours: boughtHours);
    deathAt = profile.birthDate.add(Duration(milliseconds: (result.total * kYearMs).round()));
  }

  void updateProfile(void Function(Profile p) edit) {
    edit(profile);
    _changed();
  }

  // ---------- gói ----------
  DateTime get now => DateTime.now().add(Duration(milliseconds: serverSkewMs));
  String get planKind {
    final u = user;
    if (u == null) return 'guest';
    final n = now.millisecondsSinceEpoch;
    if (((u['paidUntil'] ?? 0) as num) > n) return 'paid';
    if (((u['trialEnds'] ?? 0) as num) > n) return 'trial';
    return 'free';
  }

  bool get isPro => !kGatePremium || planKind == 'trial' || planKind == 'paid';
  List<TaskItem> get openTasks => tasks.where((t) => !t.done).toList();
  bool get canAddTask => isPro || openTasks.length < kFreeTaskLimit;

  // ---------- sổ việc ----------
  void addTask(String title, DateTime? due) {
    tasks.add(TaskItem(id: 't${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}', title: title, due: due?.millisecondsSinceEpoch ?? 0));
    _changed();
  }

  void setDone(String id, bool done) {
    for (final t in tasks) {
      if (t.id == id) {
        t.done = done;
        t.doneAt = done ? DateTime.now().millisecondsSinceEpoch : 0;
      }
    }
    _changed();
  }

  void snooze(String id) {
    for (final t in tasks) {
      if (t.id == id) {
        t.due = DateTime.now().add(const Duration(minutes: 10)).millisecondsSinceEpoch;
        t.fired = false;
      }
    }
    _changed();
  }

  void deleteTask(String id) {
    tasks.removeWhere((t) => t.id == id);
    _changed();
  }

  /// Việc vừa đến hạn mà chưa báo (để hiện báo động). Đánh dấu đã báo.
  TaskItem? takeDueAlarm() {
    if (!isPro) return null;
    final n = DateTime.now().millisecondsSinceEpoch;
    for (final t in tasks) {
      if (!t.done && t.due > 0 && t.due <= n && !t.fired) {
        t.fired = true;
        _writeLocal();
        return t;
      }
    }
    return null;
  }

  int get doneToday {
    final sod = DateTime.now();
    final start = DateTime(sod.year, sod.month, sod.day).millisecondsSinceEpoch;
    return tasks.where((t) => t.done && t.doneAt >= start).length;
  }

  int get streak {
    final days = <int>{};
    for (final t in tasks) {
      if (t.done && t.doneAt > 0) {
        final d = DateTime.fromMillisecondsSinceEpoch(t.doneAt);
        days.add(DateTime(d.year, d.month, d.day).millisecondsSinceEpoch);
      }
    }
    final today = DateTime.now();
    var d = DateTime(today.year, today.month, today.day);
    if (!days.contains(d.millisecondsSinceEpoch)) d = DateTime(d.year, d.month, d.day - 1);
    var n = 0;
    while (days.contains(d.millisecondsSinceEpoch)) {
      n++;
      d = DateTime(d.year, d.month, d.day - 1);
    }
    return n;
  }

  // ---------- chợ giờ sống ----------
  int todayCount(String wareId) {
    final t = DateTime.now();
    final start = DateTime(t.year, t.month, t.day).millisecondsSinceEpoch;
    return bought.where((e) => e.id == wareId && e.at >= start).length;
  }

  bool buy(Ware w) {
    if (todayCount(w.id) >= w.cap) return false;
    bought.add(Purchase(w.id, w.hours, DateTime.now().millisecondsSinceEpoch));
    _changed();
    return true;
  }

  void undoPurchase(int at) {
    bought.removeWhere((e) => e.at == at);
    _changed();
  }

  double get boughtToday {
    final t = DateTime.now();
    final start = DateTime(t.year, t.month, t.day).millisecondsSinceEpoch;
    return bought.where((e) => e.at >= start).fold<double>(0, (s, e) => s + e.hours);
  }

  // ---------- tài khoản và đồng bộ ----------
  Future<void> refreshMe() async {
    try {
      final j = await api.get('me');
      final u = j['user'];
      user = u is Map<String, dynamic> ? u : null;
      if (j['now'] is num) serverSkewMs = (j['now'] as num).toInt() - DateTime.now().millisecondsSinceEpoch;
      notifyListeners();
    } catch (_) {}
  }

  /// Trả về lời báo lỗi, hoặc null nếu thành công.
  Future<String?> register(String email, String password, String name) async {
    try {
      final j = await api.post('auth/register', {'email': email, 'password': password, 'name': name});
      user = j['user'] as Map<String, dynamic>?;
      await pushSync();
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> login(String email, String password) async {
    try {
      final j = await api.post('auth/login', {'email': email, 'password': password});
      user = j['user'] as Map<String, dynamic>?;
      final d = await api.get('data');
      final data = d['data'];
      if (data is Map<String, dynamic>) {
        if (data['cfg'] is Map<String, dynamic> && (data['cfg'] as Map).isNotEmpty) profile = Profile.fromJson(data['cfg'] as Map<String, dynamic>);
        if (data['tasks'] is List) tasks = (data['tasks'] as List).map((e) => TaskItem.fromJson(e as Map<String, dynamic>)).toList();
        if (data['bought'] is List) bought = (data['bought'] as List).map((e) => Purchase.fromJson(e as Map<String, dynamic>)).toList();
        recompute();
        _writeLocal();
      } else {
        await pushSync();
      }
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<void> logout() async {
    await pushSync();
    try {
      await api.post('auth/logout');
    } catch (_) {}
    api.cookie = null;
    await _prefs.remove('cookie');
    user = null;
    board = null;
    notifyListeners();
  }

  Future<String?> deleteAccount(String password) async {
    try {
      await api.post('account/delete', {'password': password});
      api.cookie = null;
      await _prefs.remove('cookie');
      user = null;
      board = null;
      profile = Profile();
      tasks = [];
      bought = [];
      _changed();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  void _queueSync() {
    if (user == null) return;
    _syncTimer?.cancel();
    _syncTimer = Timer(const Duration(milliseconds: 1500), pushSync);
  }

  Future<void> pushSync() async {
    _syncTimer?.cancel();
    if (user == null) return;
    try {
      await api.put('data', {
        'cfg': profile.toJson(),
        'tasks': tasks.map((e) => e.toJson()).toList(),
        'bought': bought.map((e) => e.toJson()).toList(),
        'life': (result.total * 10).round() / 10,
      });
    } on ApiException catch (e) {
      if (e.status == 401) {
        user = null;
        notifyListeners();
      }
    }
  }

  // ---------- bảng xếp hạng ----------
  Future<void> loadBoard() async {
    boardLoading = true;
    boardError = null;
    notifyListeners();
    try {
      board = await api.get('board');
    } on ApiException catch (e) {
      boardError = e.message;
    }
    boardLoading = false;
    notifyListeners();
  }

  Future<String?> joinBoard(String nick) async {
    if (user == null) return 'Tạo tài khoản để lên bảng xếp hạng.';
    try {
      await pushSync();
      await api.post('board', {'nick': nick, 'life': (result.total * 10).round() / 10});
      await loadBoard();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<void> leaveBoard() async {
    try {
      await api.post('board', {'leave': true});
    } catch (_) {}
    await loadBoard();
  }
}
