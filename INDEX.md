# 📑 Index — Modifications Supabase Visite+ Flutter

> **Navigation rapide** des fichiers modifiés et créés pour la migration Supabase.

---

## 🔄 Fichiers existants modifiés (2)

### Architecture & données
| Fichier | Changements | Impact |
|---------|-------------|--------|
| [flutter/lib/services/supabase_service.dart](flutter/lib/services/supabase_service.dart) | ✅ Cache in-memory (5-30 min) | ↓ Requêtes x5-6 |
| | ✅ Support Google Calendar | Fusion événements |
| | ✅ Gestion erreurs robuste | Offline-first |
| | ✅ Filtre `statut='publié'` | Accès public sécurisé |

### Modèles
| Fichier | Changements | Impact |
|---------|-------------|--------|
| [flutter/lib/models/evenement.dart](flutter/lib/models/evenement.dart) | ✅ Champ `source` | Traçabilité origine |
| | ✅ Déduplication multi-source | Pas de doublons |
| | ✅ Factory `fromGoogleCalendar()` | Support Google |

---

## ✨ Nouveaux fichiers créés (6)

### Services Flutter
| Fichier | Rôle | Usage |
|---------|------|-------|
| [flutter/lib/services/external_events_service.dart](flutter/lib/services/external_events_service.dart) | Appels API externes | Dev/test uniquement |

### Configuration SQL
| Fichier | Contenu | Où/Quand |
|---------|---------|----------|
| [supabase_rls_setup.sql](supabase_rls_setup.sql) | 5 politiques RLS | Supabase SQL Editor (une fois) |
| [supabase_edge_function_placeholder.sql](supabase_edge_function_placeholder.sql) | Stub Edge Function | Avant déploiement Deno |

### Documentation
| Fichier | Public | Lecteurs |
|---------|--------|----------|
| [SUPABASE_FLUTTER_CONFIG.md](SUPABASE_FLUTTER_CONFIG.md) | 📖 Configuration détaillée | Devs Flutter |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | ✅ Pre-prod + go-live | Tech lead + DevOps |
| [MODIFICATIONS_SUMMARY.md](MODIFICATIONS_SUMMARY.md) | 📝 Résumé complet | Tout le monde |
| [INDEX.md](INDEX.md) | This file | Navigation rapide |

### Scripts
| Fichier | Fonction | Plateforme |
|---------|----------|-----------|
| [setup-supabase.sh](setup-supabase.sh) | Aide configuration | bash (macOS/Linux) |

---

## 🚀 Quick Start

### Pour un dev Flutter vierge d'une config Supabase

1. 📖 Lire: [SUPABASE_FLUTTER_CONFIG.md](SUPABASE_FLUTTER_CONFIG.md) (5 min)
2. 🛠️ Exécuter: [supabase_schema.sql](supabase_schema.sql) dans Supabase SQL Editor
3. 🔐 Exécuter: [supabase_rls_setup.sql](supabase_rls_setup.sql) dans Supabase SQL Editor
4. 🔑 Remplacer credentials dans: `flutter/lib/main.dart`
5. ✅ Run: `flutter pub get && flutter run`

---

## 📋 Pour les DevOps / Tech Lead

### Avant la mise en production
1. Lire: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Configurer: Secrets Google Calendar en Supabase
3. Déployer: Edge Function (optionnel pour v1)
4. Tester: Staging environment

### Après le go-live
- Monitorer: `stats_vues` dans Supabase
- Vérifier: Logs RLS pour les rejets d'accès

---

## 🏗️ Architecture globale

```
          Fichiers Flutter
          ┌────────────────────────┐
          │ supabase_service.dart  │ ← Cache + RPC + erreurs
          │ evenement.dart         │ ← Multi-source
          │ external_events_...    │ ← APIs externes
          └────────────────────────┘
                    ↓
          Fichiers de configuration SQL
          ┌────────────────────────┐
          │ supabase_rls_setup.sql │ ← Sécurité
          │ edge_function_...      │ ← Backend logique
          └────────────────────────┘
                    ↓
          Documentation pour devs
          ┌────────────────────────┐
          │ SUPABASE_FLUTTER_...   │ ← Setup
          │ DEPLOYMENT_CHECKLIST   │ ← Production
          └────────────────────────┘
```

---

## 📊 État de préparation

| Étape | Statut | Note |
|-------|--------|------|
| Code Supabase service | ✅ Ready | Cache + RPC + Google Calendar |
| RLS policies SQL | ✅ Ready | À exécuter dans Supabase console |
| Edge Function stub | ✅ Ready | Placeholder, implémenter Deno version |
| Tests unitaires | ⏳ À faire | flutter test (couverture models + service) |
| Tests d'intégration | ⏳ À faire | Staging environment |
| Documentation | ✅ Ready | Complète + checklists |

---

## 🆘 Aide

### Je comprends pas comment Supabase fonctionne
→ Lire: [SUPABASE_FLUTTER_CONFIG.md](SUPABASE_FLUTTER_CONFIG.md#principes-clés) (section "Principes clés")

### Je dois déployer en production demain
→ Suivre: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) étape par étape

### Je débuggue une erreur RLS
→ Vérifier: [supabase_rls_setup.sql](supabase_rls_setup.sql) ligne par ligne

### Je veux configurer Google Calendar
→ Voir: [SUPABASE_FLUTTER_CONFIG.md](SUPABASE_FLUTTER_CONFIG.md#événements-externes-google-calendar)

### Je suis nouveau sur le projet
→ Commencer par: [architecture.md](/architecture.md) (vue globale)

---

## 📞 Contexte du projet

**Projet**: Visite+ — Guide de visite des églises  
**Plateforme**: Flutter (iOS + Android) + React BO  
**Backend**: Supabase (PostgreSQL + Edge Functions)  
**Dernière MAJ**: Avril 2, 2026  

**Équipe décisionnaire**: Communauté Emmanuel / Équipe Invisible  
**Tech Lead Supabase**: À désigner  
**Dev Flutter Lead**: À désigner  

---

## 🔗 Ressources externes

- 🎥 [Supabase Docs](https://supabase.com/docs)
- 📚 [supabase-flutter pub.dev](https://pub.dev/packages/supabase_flutter)
- 🗺️ [architecture.md](/architecture.md) — Vision globale
- 💬 [GitHub Issues](https://github.com/MilleBii/visite-plus/issues)

---

**Créé par**: GitHub Copilot  
**Dernière mise à jour**: Avril 2, 2026  
**Version**: 1.0 (migration initiale)
