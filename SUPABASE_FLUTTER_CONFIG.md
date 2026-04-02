# Configuration Supabase — Visite+ Flutter

## Vue d'ensemble

L'app Flutter Visite+ implémente l'architecture scalable décrite dans [architecture.md](/architecture.md) en utilisant Supabase comme backend unique.

## Principes clés

✓ **Accès anonyme public** → les utilisateurs visiteurs ne s'authentifient pas ; les RLS permettent l'accès lecture seule aux données publiées  
✓ **Cache local** → les données sont cachées 5-30 min côté client pour réduire les requêtes  
✓ **Sources multiples** → événements fusionnés depuis BD locale + Google Calendar + Messe Info  
✓ **Stats temps réel** → tracking via fonction RPC `track_view` (atomique, SECURITY DEFINER)  
✓ **Cloudinary CDN** → images servies en edge, jamais via le backend  

## Configuration locale

### 1. Credentials Supabase

Dans [lib/main.dart](lib/main.dart), vérifier les credentials :

```dart
const _supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co';
const _supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO';
```

À remplacer par les vraies valeurs depuis votre projet Supabase.

### 2. Row Level Security (RLS)

Exécuter le script SQL dans la console Supabase:

```bash
# Dans Supabase Dashboard → SQL Editor
# Copier/coller : supabase_rls_setup.sql
```

Cela configure les **politiques RLS** pour :
- ✓ Lecture publique des églises publiées (`statut = 'publié'`)
- ✓ Lecture publique des POIs, questions, événements
- ✓ Écriture via RPC uniquement (aucun accès direct )

### 3. Service Supabase

[lib/services/supabase_service.dart](lib/services/supabase_service.dart) encapsule tous les appels Supabase:

- `fetchEglises()` — avec cache 5 min
- `fetchEgliseBySlug(slug)` — recherche par slug calculé
- `fetchPois(egliseId)` — tous les POIs d'une église
- `fetchEvenements(egliseId)` — événements locaux + Google Calendar fusionnés
- `fetchQuestions()` — Q/R "Comprendre la religion", cache 30 min
- `trackView()` — enregistre une consultation (fire-and-forget)

## Événements externes (Google Calendar)

### Approche recommandée (production)

Les appels Google Calendar doivent passer par une **Edge Function Supabase** plutôt que directement depuis le client Flutter:

```
App Flutter
    ↓ rpc('get_google_calendar_events', ...)
Edge Function (Supabase)
    ↓ appel Google Calendar API (avec credentials server-side)
Google Calendar
```

**Avantages:**
- Credentials non exposés côté client
- Caching côté serveur
- Logique métier centralisée

### Implémentation

1. Créer une Edge Function dans `supabase/functions/get_google_calendar_events/index.ts` (Deno)
2. Configurer les credentials Google Calendar en secrets Supabase
3. La fonction retourne les événements au format JSON standardisé
4. [supabase_edge_function_placeholder.sql](supabase_edge_function_placeholder.sql) crée le stub

### Pour le développement / test

[lib/services/external_events_service.dart](lib/services/external_events_service.dart) peut appeler directement Google Calendar API avec une clé publique, mais c'est uniquement pour le dev.

## Modèles

- [lib/models/eglise.dart](lib/models/eglise.dart) — Église + informations géolocalisées
- [lib/models/poi.dart](lib/models/poi.dart) — Point d'intérêt (vitrail, statue, etc.)
- [lib/models/evenement.dart](lib/models/evenement.dart) — Événement (avec support 3 sources)
- [lib/models/question.dart](lib/models/question.dart) — Question/réponse

## Écrans

Tous les écrans utilisent le service SupabaseService pour charger les données:

| Écran | Données | Service |
|---|---|---|
| [accueil_screen.dart](./screens/accueil_screen.dart) | Fiche église (slug) | `fetchEgliseBySlug()` |
| [carte_screen.dart](./screens/carte_screen.dart) | Toutes les églises | `fetchEglises()` |
| [plan_screen.dart](./screens/plan_screen.dart) | POIs d'une église | `fetchPois()` |
| [programme_screen.dart](./screens/programme_screen.dart) | Événements futurs | `fetchEvenements()` |
| [comprendre_screen.dart](./screens/comprendre_screen.dart) | Q/R explicatives | `fetchQuestions()` |

## Cache local

Simple cache in-memory avec TTL :

```dart
clearCache()                    // Invalider tout le cache
clearCache(pattern: 'eglises')  // Invalider les entrées matches
getCacheStats()                 // Voir ce qui est en cache
```

## Stats & tracking

Chaque vue est enregistrée via `trackView()`:

```dart
SupabaseService.trackView(entiteType: 'eglise', entiteId: egliseId);
```

La fonction RPC `track_view` (SECURITY DEFINER) gère l'upsert atomique:

```sql
INSERT INTO stats_vues (entite_type, entite_id, slot, count)
VALUES (...)
ON CONFLICT (entite_type, entite_id, slot)
DO UPDATE SET count = count + 1;
```

Dashboard BO peut ensuite requêter `stats_vues` pour les analytics.

## Déploiement

### Avant le lancement en production

- [ ] Remplacer les credentials Supabase par les vraies valeurs
- [ ] Exécuter `supabase_rls_setup.sql` pour activer les RLS
- [ ] Configurer les secrets Google Calendar (si Edge Function)
- [ ] Valider les filtres OSM dans la BD (colonnes `osm_footprint_json`, `osm_rotation_angle`)
- [ ] Tester deep linking: QR Code → app natvie / web
- [ ] Vérifier les images Cloudinary (pas de ruptures)

### Monitoring

- Stats consultées via BO (Dashboard) depuis `stats_vues`
- Logs Supabase consultables dans la console (onglet Logs)
- Google Calendar : vérifier logs côté Edge Function

## Troubleshooting

### "Église introuvable"
- Vérifier que `statut = 'publié'` en BDD
- RLS bloque-t-elle les lectures ? (Vérifier `supabase_rls_setup.sql` executé)

### "Pas de POIs affichés"
- Échec du fetch due au timeout → vérifier connexion réseau
- RLS sur POIs ? Vérifier qu'on a bien la politique `pois_select_public`

### "Événements Google Calendar n'apparaissent pas"
- Edge Function déployée ? Vérifier : `supabase/functions/get_google_calendar_events/`
- Credentials Google valides ? Vérifier les secrets Supabase
- Calendrier accessible publiquement ? (Sinon, utiliser service account)

### Cache ne se vide pas
- Appeler `SupabaseService.clearCache()` manuellement
- Ou redémarrer l'app (cache in-memory)

## Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase RLS](https://supabase.com/docs/guides/security/row-level-security)
- [supabase-flutter](https://pub.dev/packages/supabase_flutter)
- [architecture.md](/architecture.md) — Architecture globale du projet
