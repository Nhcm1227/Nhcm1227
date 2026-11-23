import 'package:flutter/material.dart';

import '../services/notification_service.dart';
import 'inventory_screen.dart';
import 'recipes_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    // Xin quyền gửi thông báo ngay lần mở app đầu tiên.
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => NotificationService.instance.requestPermission());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: const [InventoryScreen(), RecipesScreen()],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.kitchen_outlined),
            selectedIcon: Icon(Icons.kitchen),
            label: 'Tủ lạnh',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu_outlined),
            selectedIcon: Icon(Icons.restaurant_menu),
            label: 'Gợi ý món',
          ),
        ],
      ),
    );
  }
}
