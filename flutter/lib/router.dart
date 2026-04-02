import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'screens/carte_screen.dart';
import 'screens/accueil_screen.dart';
import 'screens/comprendre_screen.dart';
import 'screens/plan_screen.dart';
import 'screens/programme_screen.dart';
import 'screens/fiche_poi_screen.dart';

/// Configuration du routeur avec support deep links QR Code.
///
/// URLs supportées :
///   /                         → Carte France (accueil app)
///   /eglise/:slug             → Écran d'accueil d'une église (QR Code)
///   /eglise/:slug/comprendre  → Section "Comprendre la religion"
///   /eglise/:slug/plan        → Plan interactif
///   /eglise/:slug/poi/:poiId  → Fiche POI complète
///   /eglise/:slug/programme   → "Au programme"
final appRouter = GoRouter(
  initialLocation: '/',
  debugLogDiagnostics: false,
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const CarteScreen(),
    ),
    GoRoute(
      path: '/eglise/:slug',
      builder: (context, state) {
        final slug = state.pathParameters['slug']!;
        return AccueilScreen(slug: slug);
      },
      routes: [
        GoRoute(
          path: 'comprendre',
          builder: (context, state) {
            final slug = state.pathParameters['slug']!;
            return ComprendreScreen(slug: slug);
          },
        ),
        GoRoute(
          path: 'plan',
          builder: (context, state) {
            final slug = state.pathParameters['slug']!;
            return PlanScreen(slug: slug);
          },
        ),
        GoRoute(
          path: 'poi/:poiId',
          builder: (context, state) {
            final slug = state.pathParameters['slug']!;
            final poiId = int.parse(state.pathParameters['poiId']!);
            return FichePoiScreen(slug: slug, poiId: poiId);
          },
        ),
        GoRoute(
          path: 'programme',
          builder: (context, state) {
            final slug = state.pathParameters['slug']!;
            return ProgrammeScreen(slug: slug);
          },
        ),
      ],
    ),
  ],

  // Redirection 404 → carte
  errorBuilder: (context, state) => const CarteScreen(),
);
