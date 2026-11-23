import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/food_item.dart';
import '../state/inventory_store.dart';
import '../widgets/expiry_style.dart';
import 'add_item_screen.dart';
import 'recipes_screen.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  String _query = '';
  FoodCategory? _filter;

  @override
  Widget build(BuildContext context) {
    final store = context.watch<InventoryStore>();
    final items = store.items.where((i) {
      if (_filter != null && i.category != _filter) return false;
      if (_query.isEmpty) return true;
      return i.name.toLowerCase().contains(_query.toLowerCase());
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Tủ lạnh của tôi')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AddItemScreen())),
        icon: const Icon(Icons.add_a_photo),
        label: const Text('Thêm đồ'),
      ),
      body: store.items.isEmpty
          ? const _EmptyState()
          : CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: _Summary(
                    expired: store.expiredCount,
                    soon: store.soonCount,
                    total: store.items.length,
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                    child: TextField(
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: 'Tìm món đồ...',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (v) => setState(() => _query = v),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(4),
                          child: ChoiceChip(
                            label: const Text('Tất cả'),
                            selected: _filter == null,
                            onSelected: (_) => setState(() => _filter = null),
                          ),
                        ),
                        for (final c in FoodCategory.values)
                          Padding(
                            padding: const EdgeInsets.all(4),
                            child: ChoiceChip(
                              label: Text('${c.emoji} ${c.label}'),
                              selected: _filter == c,
                              onSelected: (s) =>
                                  setState(() => _filter = s ? c : null),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.only(bottom: 96),
                  sliver: SliverList.builder(
                    itemCount: items.length,
                    itemBuilder: (context, i) => _FoodTile(item: items[i]),
                  ),
                ),
              ],
            ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary(
      {required this.expired, required this.soon, required this.total});

  final int expired;
  final int soon;
  final int total;

  @override
  Widget build(BuildContext context) {
    Widget box(String label, int value, Color color) => Expanded(
          child: Card(
            color: color.withValues(alpha: 0.12),
            elevation: 0,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                children: [
                  Text('$value',
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(color: color, fontWeight: FontWeight.bold)),
                  Text(label, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ),
        );

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Row(
        children: [
          box('Đã hết hạn', expired, Colors.red.shade700),
          box('Sắp hết hạn', soon, Colors.orange.shade700),
          box('Tổng số', total, Theme.of(context).colorScheme.primary),
        ],
      ),
    );
  }
}

class _FoodTile extends StatelessWidget {
  const _FoodTile({required this.item});

  final FoodItem item;

  @override
  Widget build(BuildContext context) {
    final store = context.read<InventoryStore>();
    final days = item.daysLeft();
    final color = expiryColor(context, item.status());
    final dateText = DateFormat('dd/MM/yyyy').format(item.expiryDate);

    return Dismissible(
      key: ValueKey(item.id),
      background: _swipeBg(context, Icons.check_circle, 'Đã dùng hết',
          Colors.green, Alignment.centerLeft),
      secondaryBackground: _swipeBg(
          context, Icons.delete, 'Bỏ đi', Colors.red, Alignment.centerRight),
      onDismissed: (dir) => _removeWithUndo(
          context,
          store,
          dir == DismissDirection.startToEnd
              ? 'Đã dùng hết "${item.name}" 👍'
              : 'Đã bỏ "${item.name}"'),
      child: ListTile(
        leading: FoodThumb(item: item, file: store.imageFor(item)),
        title: Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
            '${formatQuantity(item.quantity)} ${item.unit} · HSD $dateText'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(describeDaysLeft(days),
              style: TextStyle(color: color, fontWeight: FontWeight.w600)),
        ),
        onTap: () => _showActions(context, store),
      ),
    );
  }

  Widget _swipeBg(BuildContext context, IconData icon, String text, Color c,
      Alignment align) {
    return Container(
      color: c.withValues(alpha: 0.85),
      alignment: align,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }

  Future<void> _removeWithUndo(
      BuildContext context, InventoryStore store, String message) async {
    final messenger = ScaffoldMessenger.of(context);
    await store.remove(item, keepImage: true);
    final reason = await messenger
        .showSnackBar(SnackBar(
          content: Text(message),
          action: SnackBarAction(label: 'Hoàn tác', onPressed: () {}),
        ))
        .closed;
    if (reason == SnackBarClosedReason.action) {
      await store.addOrUpdate(item);
    } else {
      await store.storage.deleteImage(item.imageFileName);
    }
  }

  void _showActions(BuildContext context, InventoryStore store) {
    final expired = item.daysLeft() < 0;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetCtx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: FoodThumb(item: item, file: store.imageFor(item), size: 64),
              title: Text(item.name,
                  style: Theme.of(context).textTheme.titleLarge),
              subtitle: Text(
                  '${item.category.emoji} ${item.category.label} · '
                  '${describeDaysLeft(item.daysLeft())}'
                  '${item.note == null || item.note!.isEmpty ? '' : '\n${item.note}'}'),
            ),
            const Divider(),
            if (!expired)
              ListTile(
                leading: const Icon(Icons.restaurant_menu),
                title: const Text('Gợi ý món ăn với món này'),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => RecipesScreen(focus: item)));
                },
              ),
            if (item.quantity > 1)
              ListTile(
                leading: const Icon(Icons.remove_circle_outline),
                title: Text('Dùng 1 ${item.unit}'),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  store.consume(item, 1);
                },
              ),
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: const Text('Đã dùng hết'),
              onTap: () {
                Navigator.pop(sheetCtx);
                store.remove(item);
              },
            ),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Sửa'),
              onTap: () {
                Navigator.pop(sheetCtx);
                Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) => AddItemScreen(existing: item)));
              },
            ),
            ListTile(
              leading: Icon(Icons.delete_outline, color: Colors.red.shade700),
              title: Text('Xoá / bỏ đi',
                  style: TextStyle(color: Colors.red.shade700)),
              onTap: () {
                Navigator.pop(sheetCtx);
                store.remove(item);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🧊', style: TextStyle(fontSize: 72)),
            const SizedBox(height: 16),
            Text('Tủ lạnh đang trống',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text(
              'Bấm "Thêm đồ" để chụp ảnh món vừa mua và hạn sử dụng. '
              'App sẽ nhắc bạn trước 1 ngày khi món sắp hết hạn.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
