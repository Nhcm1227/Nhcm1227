import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'src/app_state.dart';
import 'src/home_shell.dart';
import 'src/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  final state = AppState();
  await state.init();
  runApp(DongHoApp(state: state));
}

class DongHoApp extends StatelessWidget {
  const DongHoApp({super.key, required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Đồng hồ đời người',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: HomeShell(state: state),
    );
  }
}
