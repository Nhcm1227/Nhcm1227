import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:intl/intl.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../models/food_item.dart';

/// Lên lịch thông báo trên máy (không cần server):
/// - 9:00 sáng, 1 ngày trước khi hết hạn
/// - 8:00 sáng ngày hết hạn
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  static const reminderHourDayBefore = 9;
  static const reminderHourSameDay = 8;

  /// iOS chỉ giữ tối đa 64 thông báo đang chờ — chừa lại một ít.
  static const _maxPending = 60;

  final _plugin = FlutterLocalNotificationsPlugin();
  final _dateFmt = DateFormat('dd/MM');

  Future<void> init() async {
    tzdata.initializeTimeZones();
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      ),
    );
    await _plugin.initialize(settings);
  }

  Future<bool> requestPermission() async {
    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      return await android?.requestNotificationsPermission() ?? false;
    }
    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      return await ios?.requestPermissions(
              alert: true, badge: true, sound: true) ??
          false;
    }
    return false;
  }

  NotificationDetails get _details => const NotificationDetails(
        android: AndroidNotificationDetails(
          'expiry_reminders',
          'Nhắc hạn sử dụng',
          channelDescription: 'Thông báo khi đồ ăn sắp hết hạn',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      );

  /// Lên lịch thông báo cho một món đồ.
  /// [suggestion]: tên món ăn gợi ý để đưa vào nội dung thông báo.
  /// [notifyNowIfLate]: nếu đã qua giờ nhắc "trước 1 ngày" (vd vừa thêm món
  /// hết hạn ngày mai lúc 20h) thì báo ngay.
  Future<void> scheduleFor(FoodItem item,
      {String? suggestion, bool notifyNowIfLate = false}) async {
    await cancelFor(item);
    final now = DateTime.now();
    final e = item.expiryDate;
    final hint = suggestion == null ? '' : ' Gợi ý: nấu "$suggestion" 🍳';

    final dayBefore =
        DateTime(e.year, e.month, e.day - 1, reminderHourDayBefore);
    final dayBeforeTitle = '⏰ ${item.name} sắp hết hạn';
    final dayBeforeBody =
        'Hạn dùng ngày mai (${_dateFmt.format(e)}). Dùng sớm nhé!$hint';
    if (dayBefore.isAfter(now)) {
      await _schedule(_idBefore(item), dayBeforeTitle, dayBeforeBody, dayBefore);
    } else if (notifyNowIfLate && item.daysLeft(now) == 1) {
      await _plugin.show(
          _idBefore(item), dayBeforeTitle, dayBeforeBody, _details);
    }

    final sameDay = DateTime(e.year, e.month, e.day, reminderHourSameDay);
    if (sameDay.isAfter(now)) {
      await _schedule(_idSameDay(item), '⚠️ ${item.name} hết hạn hôm nay',
          'Hãy dùng ngay hôm nay hoặc kiểm tra trước khi ăn.$hint', sameDay);
    }
  }

  /// Huỷ hết và lên lịch lại (ưu tiên món sắp hết hạn trước vì giới hạn iOS).
  Future<void> rescheduleAll(List<FoodItem> items,
      {String? Function(FoodItem)? suggestionFor}) async {
    await _plugin.cancelAll();
    final sorted = [...items]
      ..sort((a, b) => a.expiryDate.compareTo(b.expiryDate));
    var count = 0;
    for (final item in sorted) {
      if (item.daysLeft() < 0) continue;
      if (count + 2 > _maxPending) break;
      await scheduleFor(item, suggestion: suggestionFor?.call(item));
      count += 2;
    }
  }

  Future<void> cancelFor(FoodItem item) async {
    await _plugin.cancel(_idBefore(item));
    await _plugin.cancel(_idSameDay(item));
  }

  int _idBefore(FoodItem item) => item.notificationId * 2;
  int _idSameDay(FoodItem item) => item.notificationId * 2 + 1;

  Future<void> _schedule(int id, String title, String body, DateTime when) {
    // Dùng mốc UTC tuyệt đối nên không cần biết múi giờ của máy.
    return _plugin.zonedSchedule(
      id,
      title,
      body,
      tz.TZDateTime.from(when.toUtc(), tz.UTC),
      _details,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    );
  }
}
