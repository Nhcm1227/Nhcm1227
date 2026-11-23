import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'screens/home_shell.dart';
import 'services/notification_service.dart';
import 'services/storage_service.dart';
import 'state/inventory_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi');

  final storage = StorageService();
  await storage.init();
  await NotificationService.instance.init();

  final store = InventoryStore(
    storage: storage,
    notifications: NotificationService.instance,
  );
  await store.load();

  runApp(ChangeNotifierProvider.value(value: store, child: const FridgeApp()));
}

class FridgeApp extends StatelessWidget {
  const FridgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    ThemeData theme(Brightness b) => ThemeData(
          colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF2E9E6B), brightness: b),
          useMaterial3: true,
        );

    return MaterialApp(
      title: 'Tủ lạnh của tôi',
      debugShowCheckedModeBanner: false,
      theme: theme(Brightness.light),
      darkTheme: theme(Brightness.dark),
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const HomeShell(),
    );
  }
}
