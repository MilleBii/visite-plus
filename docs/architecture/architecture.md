# Architecture — Visite+

**Pilotage : Ce projet est piloté par l'équipe de l'Invisible.**

**Distribution :** Application native Flutter, publiée sur l'Apple Store et le Google Play Store.

## Principe : architecture scalable à la demande

Chaque couche scale **indépendamment** selon la charge réelle.
- Le front (web app + BO) est statique → CDN → scale infini sans coût supplémentaire
- Le backend scale horizontalement à la demande (serverless)
- La BDD tient la charge grâce au connection pooling
- Les images sont toujours servies par Cloudinary CDN, jamais par le backend

---

## Vue d'ensemble

```
                      Firebase Hosting (CDN Google)
              ┌──────────────────────────────┐
              │  Back Office  │  Flutter Web │
              │  (React)      │  (visiteur)  │
              └────────────┬─────────────────┘
                           │ REST API
              ┌────────────┴─────────────────────────────┐
              │             Supabase                     │
              │  ┌─────────────────────────────────┐    │
              │  │  Edge Functions (Deno/TypeScript)│    │
              │  │  — API REST backend              │    │
              │  └──────────────┬──────────────────┘    │
              │  ┌──────────────┴──────────────────┐    │
              │  │  PostgreSQL + PgBouncer          │    │
              │  │  (connection pooling intégré)    │    │
              │  └─────────────────────────────────┘    │
              └──────────────────┬───────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │  Cloudinary CDN                     │
              │  (images servies en edge,           │
              │   jamais via le backend)            │
              └─────────────────────────────────────┘
```

**Notion de client :**
Chaque client (paroisse, diocèse, sanctuaire, association…) possède un ou plusieurs clochers (églises). **C’est l’équipe de l’1visible qui gère le BO pour le compte de ses clients** — les clients finaux ne se connectent pas au BO en v1. Les utilisateurs et droits sont rattachés à un client. L’équipe de l’1visible administre l’ensemble.

**Application mobile :** Flutter natif (iOS + Android). Partage la même API REST et la même BDD que le Back Office.

**Deep linking (QR Code) :**
- QR Code → `https://visite-plus.fr/eglise/{slug}`
- App installée → Universal Links (iOS) / App Links (Android) → Flutter natif ouvre directement l’église
- App non installée → le navigateur charge `visite-plus.fr/eglise/{slug}` servi par la **Flutter Web app** (même codebase) — visite complète dans le navigateur + bannière de téléchargement de l’app native
- Configuration requise : `.well-known/apple-app-site-association` + `.well-known/assetlinks.json` sur le domaine

---

## Pourquoi cette archi scale bien

| Couche | Comportement sous charge |
|---|---|
| Flutter Web + BO React (statique) | Servi par Firebase Hosting (CDN Google) — scale infini, 0€ supplémentaire |
| Edge Functions | Serverless : 0 instance au repos, scale automatiquement au pic |
| PostgreSQL + PgBouncer | Le pooler absorbe les connexions simultanées sans saturer la BDD |
| Images | Cloudinary CDN edge — jamais de round-trip vers le backend |

**Avantage clé de Supabase Edge Functions :** le backend tourne dans la même infrastructure que la BDD — latence minimale, un seul outil à gérer, inclus dans l'abonnement Supabase.

**Concrètement** : une cathédrale avec 1 000 visiteurs/jour et une petite chapelle avec 10 visiteurs/jour coexistent sans que l'une pénalise l'autre.

---

## Volumétrie et coûts tuiles cartographiques

### Principe clé : le QR Code bypass la carte France

Le chemin principal (visiteur sur place, scan QR → fiche église) **ne charge aucune tuile OSM** : l'utilisateur arrive directement sur l'écran de l'église. La carte France n'est chargée que par les utilisateurs qui ouvrent l'app manuellement sans QR Code — estimé à ~10 % des sessions.

Le plan intérieur (Leaflet CRS.Simple) utilise une image/SVG stocké en BDD — **zéro tuile externe**.

### Cibles réelles

Les clients de l'1visible sont principalement :
- Les **sanctuaires gérés par la Communauté Emmanuel** — trafic modéré à significatif
- La **Basilique de Fourvière** (Lyon) — ~2M visiteurs/an (~5 500/j en moyenne, pic estival et fêtes religieuses)

Ce ne sont pas des sites Lourdes-niveau. La volumétrie est maîtrisable.

### Hypothèses de profils

| Profil | Exemple | Visiteurs/j (moy.) | Sessions carte (~10%) | Tuiles/mois |
|---|---|---|---|---|
| Clocher / paroisse | Paroisse Emmanuel type | 100 | 300/mois | ~6 000 |
| Sanctuaire Emmanuel | Sanctuaire régional Cté Emmanuel | 400 | 1 200/mois | ~24 000 |
| Grand sanctuaire | Fourvière (hors pic) | 2 000 | 6 000/mois | ~120 000 |
| Fourvière pic | Fourvière août / 15 août | 8 000 | 24 000/mois | ~480 000 |

### Consommation cumulée par scénario

| Scénario | Mix | Tuiles/mois | Coût tuiles |
|---|---|---|---|
| Lancement (5 sites pilotes) | Fourvière + 4 sanctuaires Emmanuel | ~200 000 | 0€ (free tier) |
| An 1 (20 sites) | 1 Fourvière + 10 sanctuaires + 9 paroisses | ~450 000 | 0-20€/mois |
| An 3 (80 sites) | 2 grands + 30 sanctuaires + 48 paroisses | ~1 500 000 | ~30€/mois |

### Fournisseur retenu : Stadia Maps (ou MapTiler)

Les serveurs OSM publics interdisent explicitement les apps à volume significatif. En production, utiliser un fournisseur de tuiles tiers :

| Fournisseur | Free tier | Palier suivant |
|---|---|---|
| **Stadia Maps** | 200 000 tuiles/mois | $20/mois pour 1M |
| MapTiler | 100 000 tuiles/mois | €30/mois pour 1M |
| Jawg Maps | 500 000 tuiles/mois | €60/mois pour 5M |

> **Recommandation** : Stadia Maps pour le lancement (free tier généreux, styles OSM natifs). Jawg si le free tier est dépassé — meilleur ratio volume/prix.

> **Développement** : tiles OSM standard, pas de clé requise. Passer sur Stadia/Jawg uniquement avant la mise en production.

---

## Entités principales


### Client
- id, nom, contact, email, téléphone, adresse

### Église (Clocher)
- id, client_id, nom, adresse, ville, latitude, longitude
- type : église / sanctuaire / cathédrale
- photo_facade (URL Cloudinary)
- message_bienvenue
- plan_image (URL Cloudinary)
- google_calendar_id (identifiant du Google Calendar de l'église)
- messeinfo_id (nullable — option Messe Info)

### POI (Point d'intérêt)
- id, eglise_id
- type : tableau / vitrail / statue / démarche / ...
- position_x, position_y (coordonnées pixels Leaflet CRS.Simple)
- photo (URL Cloudinary)

Contenus textuels stockés dans une table `poi_traductions` (une ligne par langue) :
- poi_id, langue (ex. `fr`, `en`, `es`…)
- titre
- texte_resume
- texte_comprendre
- texte_historique
- texte_bible

### Église — contenus traduisibles
Même principe : table `eglise_traductions` (une ligne par langue) :
- eglise_id, langue
- message_bienvenue

### Stats vues
- slot (timestamp tronqué à la granularité retenue — `date_trunc('hour', now())` ou `date_trunc('minute', ...)` arrondi au quart d'heure)
- entite_type : `eglise` | `poi`
- entite_id
- count (incrément par slot)

Index sur `(entite_type, entite_id, slot)` pour les requêtes de dashboard.
Les agrégations jour / semaine / mois sont calculées à la volée par `GROUP BY`.

**Granularité à confirmer avec le client : 15 min ou 1h.** Les deux sont gérables en PostgreSQL/Supabase sans outil tiers. À 15 min et 1 000 églises actives en continu : ~50M lignes/an max — négligeable pour PostgreSQL avec le bon index.

**Stack stats :** PostgreSQL natif (Supabase) + `pg_partman` pour le partitionnement mensuel automatique. TimescaleDB écarté (déprécié sur Supabase Postgres 17).

### Événement
Pas de stockage en BDD — les événements sont récupérés en temps réel depuis les sources externes.

Sources :
- **Google Calendar** (socle) : récupéré via l'API Google Calendar (lecture seule)
- **Messe Info** (option) : récupéré via l'API Messe Info

Fiche église stocke :
- `google_calendar_id` : identifiant du Google Calendar de l'église
- `messeinfo_id` : identifiant Messe Info (nullable — option activée ou non)

### Utilisateur BO
- id, email, rôle : super_admin / editeur_1visible / editeur_client* / editeur_eglise*
- client_id (si éditeur client ou église)
- eglise_id (si éditeur local)

*roles `editeur_client` et `editeur_eglise` réservés pour une évolution future — non activés en v1.

---

## App Flutter (visiteur) — écrans

```
Accueil
  ├── Carte France → sélection église (géolocalisation auto)
  └── Deep link QR Code → entrée directe dans une église

Église
  ├── Photo + message de bienvenue
  ├── [1] Comprendre la religion (4 Q/R statiques)
  ├── [2] Visiter → Plan interactif
  │         └── Tap POI → fiche courte (bas d'écran)
  │                   └── Tap → fiche complète (page scrollable : photo, titre, ▶ TTS, résumé, comprendre, historique, bible)
  └── [3] Au programme → liste événements (messe / confession / événement)
```

## Flutter Web (fallback QR Code)

Servi sur `visite-plus.fr` — même codebase Flutter compilé pour le web (`flutter build web`).

Quand l'app native n'est pas installée, le visiteur obtient **la visite complète dans son navigateur** (plan interactif, fiches POI, programme). Une bannière persistante propose de télécharger l'app native pour une meilleure expérience (performances, accès hors ligne futur).

**Avantage :** un seul codebase Flutter pour les trois targets : iOS, Android, Web.

---

## Back Office — utilisateurs et accès

Le BO est une **web app React**, principalement utilisée sur PC par l'équipe de l'1visible. Les membres de l'1visible créent et maintiennent les contenus pour le compte de leurs clients (paroisses, sanctuaires…).

**Cas d'usage terrain :** un membre de l'équipe peut aussi utiliser le BO en déplacement depuis son smartphone pour photographier et uploader sur place. Le BO est responsive ; les navigateurs mobiles modernes (Chrome Android, Safari iOS) permettent l'accès direct à l'appareil photo via `<input type="file" accept="image/*" capture="environment">` et l'upload vers Cloudinary.

**En v1, les clients finaux (paroisses, diocèses) n'ont pas d'accès au BO.** L'ouverture d'un rôle éditeur pour les clients est une évolution possible selon le modèle opérationnel retenu.

---

## Back Office — écrans

```
Gestion des églises
  └── Fiche église : infos, photo façade, upload plan

Gestion des POI
  └── Vue plan (Leaflet CRS.Simple) → cliquer pour placer un POI → remplir la fiche + photo

Gestion des événements
  └── Formulaire simple : type / titre / date / heure

Gestion des utilisateurs (super_admin uniquement)
```

---

## Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| App visiteur (natif) | Flutter | iOS + Android, publiée sur les stores |
| App visiteur (web) | Flutter Web | Même codebase, servi par Firebase Hosting |
| Back Office | React (Vite) | Statique, servi par Firebase Hosting |
| Hébergement front | Firebase Hosting | CDN Google mondial, free tier généreux, `firebase deploy` |
| Backend | Supabase Edge Functions (Deno/TypeScript) | API REST, serverless, même plateforme que la BDD |
| Base de données | PostgreSQL | Supabase (inclut PgBouncer + auth) |
| Connection pooling | PgBouncer (inclus Supabase) | Absorbe les pics de connexions |
| Stockage & CDN images | Cloudinary | Resize auto, servi en edge |
| Carte France | Leaflet + React-Leaflet | Localisation des églises |
| Plan intérieur | Leaflet + CRS.Simple | Zoom/pan + positionnement POI |
| Auth | JWT | Supabase Auth ou custom |
| i18n Flutter | flutter_localizations + ARB | Chaînes d'interface par langue |
| Traduction contenu | DeepL API ou Google Translate API | Option — si traduction automatique validée |

### Pourquoi Supabase pour la BDD ?
- PostgreSQL managé avec PgBouncer intégré — essentiel pour tenir la charge
- Auth incluse — évite de la coder
- Free tier jusqu'à 500 Mo, puis ~25€/mois
- Pas de vendor lock-in (c'est du PostgreSQL standard)

### Pourquoi Leaflet CRS.Simple pour le plan intérieur ?
- Zoom / pan / pinch natif dans le navigateur mobile
- POI repositionnés automatiquement au zoom
- Même lib que la carte France

### Plan par défaut — extraction du polygone OSM

À la création d'une église, le BO récupère automatiquement le footprint du bâtiment :

1. **Trouver le way ID** sur openstreetmap.org : rechercher l'église → cliquer sur le bâtiment → le panneau latéral affiche l'identifiant (ex : `way 71854018` pour l'Église Saint-Victor, Saône)

2. **Requête Overpass API** avec le way ID exact :
   ```
   POST https://overpass-api.de/api/interpreter
   [out:json];way(WAY_ID);out geom;
   ```
   → retourne un tableau de nœuds GPS `[lat, lon]` formant le polygone cadastral exact

3. Le polygone est **converti en coordonnées locales** (mètres, centrées sur le bâtiment, avec correction cos(lat)) puis orienté sur le grand axe (entrée en bas, chœur en haut) avant d'être stocké en BDD et affiché dans Leaflet CRS.Simple.

> **Important** : ne pas utiliser une recherche par proximité (`around:`) — elle peut retourner n'importe quel élément OSM proche. Le way ID est la seule requête fiable. L'admin peut le saisir manuellement si la détection automatique échoue.

4. **Orientation du plan** : le polygone doit être tourné pour que l'entrée soit en bas et le chœur en haut. Deux approches :
   - *Automatique* : calculer l'angle du grand axe du bâtiment (PCA ou vecteur entrée→chœur depuis les nœuds OSM), puis rotation des coordonnées en conséquence
   - *Manuelle* : l'admin dispose d'un curseur/bouton +/− dans le BO pour ajuster l'angle de rotation et valider

   La correction manuelle est indispensable en fallback car l'orientation automatique peut être imprécise selon la qualité des données OSM. L'angle est stocké en BDD avec le polygone.

---

## Estimation des coûts d'hébergement selon l'échelle

| Échelle | Vercel (front) | Supabase (BDD) | Backend | Cloudinary | **Total/mois** |
|---|---|---|---|---|---|
| 10 églises | 0€ | 0€ (free) | 0€ (free) | 0€ (free) | **0€** |
| 100 églises | 0€ | 25€ | 10-20€ | 0€ (free) | **~35-45€** |
| 1 000 églises | 0€ | 25€ | 40-80€ | 0€* | **~65-105€** |

*Cloudinary free tier (25 Go) couvre ~1 000 églises à 5 photos par église.

---

## Points ouverts

- Voir [questions-client.md](questions-client.md) pour les décisions à prendre avec le client
