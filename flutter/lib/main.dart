import 'dart:ui' show PlatformDispatcher;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'router.dart';

const _supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co';
const _supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: _supabaseUrl,
    anonKey: _supabaseAnonKey,
  );

  await Future.wait([
    initializeDateFormatting('fr_FR'),
    initializeDateFormatting('en_US'),
  ]);

  runApp(const VisitePlusApp());
}

/// Inherited widget that holds the current locale and exposes a setter.
class LocaleScope extends InheritedWidget {
  final Locale locale;
  final ValueChanged<Locale> onLocaleChanged;

  const LocaleScope({
    super.key,
    required this.locale,
    required this.onLocaleChanged,
    required super.child,
  });

  static LocaleScope of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<LocaleScope>()!;

  @override
  bool updateShouldNotify(LocaleScope old) => locale != old.locale;
}

class VisitePlusApp extends StatefulWidget {
  const VisitePlusApp({super.key});

  @override
  State<VisitePlusApp> createState() => _VisitePlusAppState();
}

class _VisitePlusAppState extends State<VisitePlusApp> {
  late Locale _locale;

  @override
  void initState() {
    super.initState();
    // Default to platform locale, fall back to French
    final platformLang = PlatformDispatcher.instance.locale.languageCode;
    _locale = platformLang == 'en' ? const Locale('en') : const Locale('fr');
  }

  void _setLocale(Locale locale) => setState(() => _locale = locale);

  @override
  Widget build(BuildContext context) {
    return LocaleScope(
      locale: _locale,
      onLocaleChanged: _setLocale,
      child: MaterialApp.router(
        title: 'Visite+',
        debugShowCheckedModeBanner: false,
        theme: _buildTheme(),
        routerConfig: appRouter,
        locale: _locale,
        supportedLocales: const [Locale('fr'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
      ),
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF1B4332),
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: Colors.white,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF1C1917),
        elevation: 0,
        scrolledUnderElevation: 1,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: Color(0xFF1C1917),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Color(0xFF1C1917)),
        headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1C1917)),
        titleLarge: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Color(0xFF1C1917)),
        titleMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Color(0xFF1C1917)),
        bodyLarge: TextStyle(fontSize: 15, color: Color(0xFF1C1917)),
        bodyMedium: TextStyle(fontSize: 13, color: Color(0xFF78716C)),
      ),
    );
  }
}
