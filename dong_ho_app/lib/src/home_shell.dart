// Khung app: thanh tiêu đề trên, 5 mục ở dưới, báo động khi việc đến hạn.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_state.dart';
import 'screens/board_screen.dart';
import 'screens/clock_screen.dart';
import 'screens/market_screen.dart';
import 'screens/me_screen.dart';
import 'screens/tasks_screen.dart';
import 'theme.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.state});
  final AppState state;
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  int _index = 0;
  Timer? _alarmTimer;
  bool _alarmOpen = false;

  static const _titles = ['Đồng hồ', 'Việc phải làm', 'Mua giờ sống', 'Xếp hạng', 'Tôi'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _alarmTimer = Timer.periodic(const Duration(seconds: 10), (_) => _checkAlarm());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _alarmTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.paused) widget.state.pushSync();
    if (s == AppLifecycleState.resumed) {
      widget.state.refreshMe();
      _checkAlarm();
    }
  }

  void _go(int i) {
    setState(() => _index = i);
    if (i == 3) widget.state.loadBoard();
  }

  Future<void> _checkAlarm() async {
    if (_alarmOpen || !mounted) return;
    final t = widget.state.takeDueAlarm();
    if (t == null) return;
    _alarmOpen = true;
    HapticFeedback.heavyImpact();
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text('Hết giờ.', style: goth(44, color: kBloodHi, weight: 900)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.title, style: body(20)),
            const SizedBox(height: 8),
            Text('Một phút trì hoãn nữa là một phút bạn không bao giờ lấy lại.', style: body(14, color: kBoneDim, italic: true)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('ĐÓNG')),
          TextButton(
            onPressed: () {
              widget.state.snooze(t.id);
              Navigator.pop(ctx);
            },
            child: const Text('CHO TÔI 10 PHÚT'),
          ),
          FilledButton(
            onPressed: () {
              widget.state.setDone(t.id, true);
              Navigator.pop(ctx);
            },
            child: const Text('ĐÃ XONG'),
          ),
        ],
      ),
    );
    _alarmOpen = false;
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    return ListenableBuilder(
      listenable: s,
      builder: (context, _) => Scaffold(
        appBar: AppBar(
          title: Text(_titles[_index]),
          toolbarHeight: 64,
        ),
        body: IndexedStack(
          index: _index,
          children: [
            ClockScreen(state: s, onOpenProfile: () => _go(4)),
            TasksScreen(state: s),
            MarketScreen(state: s),
            BoardScreen(state: s, onNeedAccount: () => showAuthSheet(context, s, register: true)),
            MeScreen(state: s),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: _go,
          destinations: const [
            NavigationDestination(icon: Icon(Icons.timer_outlined), selectedIcon: Icon(Icons.timer), label: 'Đồng hồ'),
            NavigationDestination(icon: Icon(Icons.checklist_outlined), selectedIcon: Icon(Icons.checklist), label: 'Việc'),
            NavigationDestination(icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Mua giờ'),
            NavigationDestination(icon: Icon(Icons.leaderboard_outlined), selectedIcon: Icon(Icons.leaderboard), label: 'Xếp hạng'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Tôi'),
          ],
        ),
      ),
    );
  }
}
