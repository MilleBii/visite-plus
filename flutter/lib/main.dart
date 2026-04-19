import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'router.dart';

// TODO: remplacer par les vraies valeurs Supabase
const _supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co';
const _supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: _supabaseUrl,
    anonKey: _supabaseAnonKey,
  );

  await initializeDateFormatting('fr_FR');

  runApp(const VisitePlusApp());
}

class VisitePlusApp extends StatelessWidget {
  const VisitePlusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Visite+',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(),
      routerConfig: appRouter,
      localizationsDelegates: const [
        // flutter_localizations ajoutés pour i18n futur
      ],
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
