# Checklist — Configuration Supabase & Déploiement Visite+ Flutter

## Phase 1 : Configuration Supabase (une fois)

### 1.1 Créer le projet Supabase
- [ ] Créer un projet sur https://supabase.com
- [ ] Noter l'URL et la clé ANON_KEY
- [ ] Donner accès au projet à toute l'équipe

### 1.2 Base de données
- [ ] Exécuter le schéma SQL (`supabase_schema.sql`) dans le SQL Editor
  - Tables : `eglises`, `pois`, `evenements`, `questions`, `stats_vues`
  - Fonction RPC : `track_view()`

### 1.3 Row Level Security (RLS)
- [ ] Exécuter `supabase_rls_setup.sql` dans le SQL Editor
  - Active RLS sur toutes les tables
  - Crée les politiques Pour accès anonyme public

### 1.4 Edge Functions (optionnel pour v1, requis pour Google Calendar)
Pour recevoir les événements Google Calendar :
- [ ] Installer Supabase CLI : `npm install -g supabase`
- [ ] Créer une fonction : `supabase functions new get_google_calendar_events`
- [ ] Implémenter en Deno/TypeScript (voir `supabase_edge_function_placeholder.sql` pour le stub)
- [ ] Configurer les secrets : `supabase secrets set GOOGLE_CALENDAR_API_KEY=...`
- [ ] Déployer : `supabase functions deploy`

## Phase 2 : Configuration Flutter (App)

### 2.1 Credentials Supabase
- [ ] Mettre à jour `lib/main.dart` avec les vraies credentials Supabase
  ```dart
  const _supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
  const _supabaseAnonKey = 'YOUR_ANON_KEY';
  ```

### 2.2 Dépendances
- [ ] Vérifier que `pubspec.yaml` contient bien :
  - `supabase_flutter: ^2.5.0`
  - `flutter_map: ^7.0.1`
  - `geolocator: ^12.0.0`
  - etc.
- [ ] Lancer : `flutter pub get`

### 2.3 Services
- [ ] `lib/services/supabase_service.dart` — OK (implémente cache + RPC)
- [ ] `lib/services/external_events_service.dart` — OK (placeholder Google Calendar)
- [ ] `lib/models/evenement.dart` — OK (support multi-source + déduplication)

### 2.4 Écrans
- [ ] `accueil_screen.dart` — ✓ Charge église via `fetchEgliseBySlug()`
- [ ] `carte_screen.dart` — ✓ Charge églises via `fetchEglises()`
- [ ] `plan_screen.dart` — ✓ Charge POIs via `fetchPois()`
- [ ] `programme_screen.dart` — ✓ Charge événements via `fetchEvenements()`
- [ ] `comprendre_screen.dart` — ✓ Charge questions via `fetchQuestions()`

## Phase 3 : Données de production

### 3.1 Migration données
- [ ] Charger les églises, POIs, questions depuis le BO ou script CLI
  - Voir `app/importMockToSupabase.js` pour le pattern
  - Adapter : supprimer `eglise_id` pour POIs → sera set par le BO
  - S'assurer que `statut = 'publié'` sur les églises

### 3.2 Données critiques à vérifier
- [ ] Chaque église : longitude, latitude (position[])
- [ ] Plan OSM footprint JSON et rotation angle
- [ ] Images Cloudinary (photo_facade, plan_image) — liens valides
- [ ] Chaque church : message_bienvenue traduit
- [ ] POIs : titre, position[], textes (résumé, comprendre, historique, bible)

### 3.3 Google Calendar
- [ ] Créer un compte service Google avec accès Calendar API
- [ ] Dans Supabase, configurer secrets :
  ```bash
  supabase secrets set \
    GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
    GOOGLE_SERVICE_ACCOUNT_KEY=... \
    GOOGLE_CALENDAR_PRIVATE_KEY=...
  ```
- [ ] Chaque église : configurer `google_calendar_id` en BDD
- [ ] Tester la récupération d'événements

### 3.4 Messe Info (optionnel)
- [ ] Si activation : chaque église peut avoir `messeinfo_id`
- [ ] Implémenter le parsing dans `ExternalEventsService.fetchMesseInfoEvents()`
- [ ] Configurer la clé API Messe Info en secrets Supabase

## Phase 4 : Tests

### 4.1 Tests locaux
- [ ] `flutter run` sur un appareil / émulateur
  - Sur aura, 3G, WiFi (vérifier latence)
  - Carte France charge et affiche les églises ✓
  - Clic sur une église → AccueilScreen ✓
  - Événements fusionnés (local + Google) ✓
  - Stats tracking fire-and-forget (aucune erreur) ✓

### 4.2 Tests réseaux
- [ ] Test offline → app utilise cache (5-30 min)
- [ ] Test en 2G/3G → vérifier timeouts, gestion d'erreurs

### 4.3 Deep linking
- [ ] QR Code → `https://visite-plus.fr/eglise/saint-victor` 
- [ ] App installée → FichePoi screen lance nativement ✓
- [ ] App non installée → Flutter Web page s'affiche ✓

### 4.4 Tableau de bord BO
- [ ] Stats s'accumulent bien dans `stats_vues`
- [ ] BO peut interroger `stats_vues` pour les graphiques

## Phase 5 : Pre-production

### 5.1 Performance
- [ ] Cache in-memory = pas de doubles requêtes sur 5-30 min ✓
- [ ] RLS ne ralentit pas les SELECT (index sur `statut`, `eglise_id`) ✓
- [ ] Zoom carte + placement marqueurs = sans lag

### 5.2 Sécurité
- [ ] ANON_KEY n'expose que SELECT sur données publiées ✓
- [ ] RPC track_view ne peut pas être appelée directement pour écrire ✓
- [ ] Pas de clés Google Calendar exposées en client ✓

### 5.3 Monitoring
- [ ] Dashboard Supabase : accès aux logs SQL, RLS rejets
- [ ] Sentry / Crashlytics (optionnel) : erreurs app

## Phase 6 : Lancement production

### 6.1 Avant le go-live
- [ ] Vérifier le `.well-known/apple-app-site-association` pour deep linking iOS
- [ ] Vérifier le `.well-known/assetlinks.json` pour deep linking Android
- [ ] Backup BDD Supabase
- [ ] Tester le process de rollback

### 6.2 Go-live
- [ ] Publier sur Apple Store (TestFlight → Production)
- [ ] Publier sur Google Play Store
- [ ] Activer Google Calendar sync
- [ ] Monitorer les erreurs en temps réel

### 6.3 Post-lancement
- [ ] Vérifier analytics BO (stats_vues remplit-elle ?)
- [ ] Écouter les retours utilisateurs (app store reviews)
- [ ] Planing l'intégration Messe Info (v1.1 ?)

## Ressources

- 📄 [architecture.md](/architecture.md) — Architecture globale
- 📄 [SUPABASE_FLUTTER_CONFIG.md](/SUPABASE_FLUTTER_CONFIG.md) — Config détaillée
- 📄 [supabase_schema.sql](supabase_schema.sql) — Schéma BD
- 📄 [supabase_rls_setup.sql](supabase_rls_setup.sql) — RLS policies
- 🎥 [Supabase Docs](https://supabase.com/docs)

## Contacts

- Project Lead: [équipe de l'Invisible]
- Tech Lead Supabase: [DevOps responsable]
- Flutter Lead: [Dev mobile responsable]
