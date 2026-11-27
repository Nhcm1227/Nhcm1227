// Mục Việc: sổ việc có hạn chót. App báo động khi đến hạn (xem home_shell.dart).
import 'dart:async';

import 'package:flutter/material.dart';

import '../app_state.dart';
import '../format.dart';
import '../theme.dart';
import '../widgets.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key, required this.state});
  final AppState state;
  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  final _title = TextEditingController();
  DateTime? _due;
  bool _showDone = false;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _title.dispose();
    super.dispose();
  }

  Future<void> _pickDue() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _due ?? now,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: DateTime(now.year + 5),
      helpText: 'Chọn ngày hạn chót',
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_due ?? now.add(const Duration(hours: 1))),
      helpText: 'Chọn giờ hạn chót',
    );
    if (time == null) return;
    setState(() => _due = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  void _add() {
    final s = widget.state;
    final t = _title.text.trim();
    if (t.isEmpty) {
      toast(context, 'Viết việc cần làm trước đã.');
      return;
    }
    if (!s.canAddTask) {
      toast(context, 'Gói miễn phí chỉ giữ $kFreeTaskLimit việc chưa xong. Làm xong bớt một việc đã.');
      return;
    }
    s.addTask(t, _due);
    _title.clear();
    setState(() => _due = null);
    FocusScope.of(context).unfocus();
  }

  String _dueLabel(TaskItem t, DateTime now) {
    if (t.done) {
      return t.doneAt > 0 ? 'Xong lúc ${hm(DateTime.fromMillisecondsSinceEpoch(t.doneAt))} · ${dstr(DateTime.fromMillisecondsSinceEpoch(t.doneAt))}' : 'Đã xong';
    }
    final d = t.dueDate;
    if (d == null) return 'Không hạn chót';
    final diff = d.difference(now);
    final when = '${hm(d)} · ${dstr(d)}';
    return diff.isNegative ? 'QUÁ HẠN ${dur(diff)} · hạn $when' : 'Còn ${dur(diff)} · hạn $when';
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final now = DateTime.now();
    final list = s.tasks.where((t) => t.done == _showDone).toList()
      ..sort((a, b) => _showDone ? b.doneAt.compareTo(a.doneAt) : (a.due == 0 ? 1 << 52 : a.due).compareTo(b.due == 0 ? 1 << 52 : b.due));
    final overdue = s.openTasks.where((t) => t.due > 0 && t.due < now.millisecondsSinceEpoch).length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      children: [
        const Lede('Ghi việc kèm hạn chót. Đến hạn mà chưa xong, app báo động.'),
        TextField(
          controller: _title,
          maxLength: 140,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _add(),
          decoration: const InputDecoration(labelText: 'VIỆC CẦN LÀM', hintText: 'Ví dụ: gọi điện cho mẹ', counterText: ''),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickDue,
                icon: const Icon(Icons.event, size: 18),
                label: Text(_due == null ? 'HẠN CHÓT' : '${hm(_due!)} · ${dstr(_due!)}'),
              ),
            ),
            if (_due != null) IconButton(tooltip: 'Bỏ hạn chót', onPressed: () => setState(() => _due = null), icon: const Icon(Icons.close)),
            const SizedBox(width: 10),
            FilledButton(onPressed: _add, child: const Text('GHI VÀO SỔ')),
          ],
        ),
        const SizedBox(height: 22),
        Row(
          children: [
            _Stat('${s.doneToday}', 'Xong hôm nay'),
            _Stat('$overdue', 'Quá hạn', color: overdue > 0 ? kBloodHi : kBone),
            _Stat('${s.streak}', 'Ngày liền'),
          ],
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Pill(label: 'Chưa xong (${s.openTasks.length})', selected: !_showDone, onTap: () => setState(() => _showDone = false)),
            const SizedBox(width: 8),
            Pill(label: 'Đã xong', selected: _showDone, onTap: () => setState(() => _showDone = true)),
          ],
        ),
        const SizedBox(height: 8),
        if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              _showDone ? 'Chưa xong việc nào.' : 'Không còn việc nào. Hoặc bạn đã làm hết, hoặc bạn chưa dám viết ra.',
              style: body(15, color: kBoneDim, italic: true),
            ),
          ),
        for (final t in list)
          Dismissible(
            key: ValueKey(t.id),
            direction: DismissDirection.endToStart,
            background: Container(
              color: kBlood,
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: 20),
              child: const Icon(Icons.delete_outline, color: Colors.white),
            ),
            onDismissed: (_) => s.deleteTask(t.id),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kRust))),
              child: Row(
                children: [
                  Checkbox(value: t.done, onChanged: (v) => s.setDone(t.id, v ?? false)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.title,
                          style: body(16, color: t.done ? kBoneDim : kBone).copyWith(
                            decoration: t.done ? TextDecoration.lineThrough : null,
                            decorationColor: kBlood,
                          ),
                        ),
                        Text(
                          _dueLabel(t, now),
                          style: mono(
                            11.5,
                            color: !t.done && t.due > 0 && t.due < now.millisecondsSinceEpoch
                                ? kBloodHi
                                : (!t.done && t.due > 0 && t.due - now.millisecondsSinceEpoch < 3600000 ? kAmber : kBoneDim),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (list.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text('Vuốt sang trái để xóa một việc.', style: body(12.5, color: kBoneDim, italic: true)),
          ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label, {this.color = kBone});
  final String value;
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: goth(44, color: color, weight: 900)),
            Text(label.toUpperCase(), style: labelStyle()),
          ],
        ),
      );
}
