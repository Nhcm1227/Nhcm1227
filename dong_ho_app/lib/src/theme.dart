// Bảng màu và kiểu chữ: cùng ngôn ngữ thiết kế "giấy báo tử" với bản web.
import 'dart:ui' show FontFeature, FontVariation;

import 'package:flutter/material.dart';

const kBg = Color(0xFF0F0D0C);
const kAsh = Color(0xFF1A1716);
const kBone = Color(0xFFE8E1D3);
const kBoneDim = Color(0xFFABA396);
const kRust = Color(0xFF3A322E);
const kBlood = Color(0xFFA8120C);
const kBloodHi = Color(0xFFD21A12);
const kMoss = Color(0xFF8FA88A);
const kAmber = Color(0xFFD9A441);
const kPaper = Color(0xFFCFC5AE);
const kPaperInk = Color(0xFF1B1510);
const kPaperLine = Color(0xFF8C7F66);

TextStyle goth(double size, {Color color = kBone, double weight = 800}) => TextStyle(
      fontFamily: 'Grenze',
      fontSize: size,
      color: color,
      height: 1.0,
      fontVariations: [FontVariation('wght', weight)],
    );

TextStyle mono(double size, {Color color = kBone, FontWeight weight = FontWeight.w400, double spacing = 0}) => TextStyle(
      fontFamily: 'PlexMono',
      fontSize: size,
      color: color,
      fontWeight: weight,
      letterSpacing: spacing,
      fontFeatures: const [FontFeature.tabularFigures()],
    );

TextStyle body(double size, {Color color = kBone, bool italic = false, FontWeight weight = FontWeight.w400}) => TextStyle(
      fontFamily: 'Spectral',
      fontSize: size,
      color: color,
      height: 1.45,
      fontWeight: weight,
      fontStyle: italic ? FontStyle.italic : FontStyle.normal,
    );

TextStyle labelStyle({Color color = kBoneDim}) => mono(11, color: color, spacing: 2);

ThemeData buildTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: kBloodHi,
      onPrimary: Colors.white,
      secondary: kBone,
      onSecondary: kBg,
      surface: kBg,
      onSurface: kBone,
      error: kBloodHi,
    ),
    scaffoldBackgroundColor: kBg,
    fontFamily: 'Spectral',
    dividerColor: kRust,
    appBarTheme: AppBarTheme(
      backgroundColor: kBg,
      foregroundColor: kBone,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: goth(34, weight: 900),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF151210),
      indicatorColor: const Color(0x40A8120C),
      surfaceTintColor: Colors.transparent,
      height: 68,
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(color: states.contains(WidgetState.selected) ? kBloodHi : kBoneDim),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => mono(11, color: states.contains(WidgetState.selected) ? kBloodHi : kBoneDim),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kAsh,
      labelStyle: mono(12, color: kBoneDim),
      hintStyle: body(15, color: const Color(0xFF6F685E), italic: true),
      enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: kBoneDim)),
      focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: kBloodHi, width: 2)),
      border: const UnderlineInputBorder(),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kBlood,
        foregroundColor: Colors.white,
        shape: const RoundedRectangleBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        textStyle: mono(13, weight: FontWeight.w600, spacing: 1),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kBone,
        side: const BorderSide(color: kRust),
        shape: const RoundedRectangleBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        textStyle: mono(12, spacing: 1),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: kBone, textStyle: mono(12))),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? kBlood : Colors.transparent),
      checkColor: const WidgetStatePropertyAll(Colors.white),
      side: const BorderSide(color: kBoneDim, width: 1.5),
    ),
    dialogTheme: const DialogThemeData(backgroundColor: kAsh, shape: RoundedRectangleBorder(side: BorderSide(color: kBlood))),
    bottomSheetTheme: const BottomSheetThemeData(backgroundColor: kAsh, shape: RoundedRectangleBorder()),
    snackBarTheme: SnackBarThemeData(backgroundColor: kBone, contentTextStyle: mono(13, color: kBg), behavior: SnackBarBehavior.floating),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: kBloodHi),
  );
}
