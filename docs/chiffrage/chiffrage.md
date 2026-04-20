# Chiffrage — Visite+

> Taux horaire : 62.5€/h (TJM 500€ / 8h)
> Chiffrage établi le 2026-03-31 — mis à jour le 2026-04-20

---

## Détail des phases

| Tâche | Sans IA | Avec IA |
|---|---|---|
| **Cadrage & ateliers client** | | |
| Ateliers client (plan, POI, droits, événements...) | 8h | 8h |
| Architecture & choix techniques | 4h | 1h |
| *Sous-total* | *12h* | *9h* |
| **Backend — Supabase (BDD + Edge Functions)** | | |
| Setup projet, BDD, auth (rôles super_admin / editeur_1visible) | 6h | 1h |
| BDD + requêtes Supabase — églises (géolocalisation, photo façade Wikimedia) | 4h | 1h |
| Footprint OSM (Overpass) + rotation + ajustement manuel angle | 12h | 3h |
| Upload plan photo (override OSM) | 4h | 30min |
| BDD + requêtes Supabase — POI (positionnement, upload photo Cloudinary) | 4h | 1h |
| Intégration Google Calendar (lecture événements) | 4h | 1h |
| Génération QR Code + deep link config (apple-app-site-association + assetlinks.json) | 4h | 2h |
| Stats — endpoint POST /stats/view + agrégations dashboard | 6h | 1h |
| *Sous-total* | *44h* | *10h30* |
| **Back Office — React (Vite)** | | |
| Setup projet, navigation, design system PC | 4h | 1h |
| Gestion des églises (fiche, photo, géocodage) | 4h | 30min |
| Éditeur plan + positionnement POI (Leaflet CRS.Simple) | 8h | 3h |
| Fiches POI — formulaire + upload photo | 4h | 30min |
| Gestion événements (config Google Calendar ID par église) | 2h | 30min |
| Génération QR Code + page impression A4 | 4h | 30min |
| Gestion des utilisateurs (super_admin) | 4h | 30min |
| Dashboard stats (courbe fréquentation + classement POI) | 8h | 1h |
| *Sous-total* | *38h* | *7h30* |
| **App Flutter — iOS + Android + Web** | | |
| Setup projet Flutter (iOS + Android + Web targets) | 4h | 1h |
| Carte d'accueil (flutter_map + markers types + géoloc) | 8h | 3h |
| Deep linking — Universal Links (iOS) + App Links (Android) | 4h | 2h |
| Bannière de téléchargement (Flutter Web → app native) | 2h | 30min |
| Accueil église (photo façade + message + navigation) | 2h | 30min |
| Section "Comprendre la religion" (4 Q/R) | 2h | 30min |
| Plan interactif (flutter_map CRS.Simple + POI + légende) | 12h | 3h |
| Fiche POI courte + fiche complète (sections dépliables) | 4h | 30min |
| Section "Au programme" (Google Calendar) | 4h | 1h |
| Audio guide TTS natif (flutter_tts — lecture des textes POI) | 2h | 1h |
| *Sous-total* | *44h* | *13h* |
| **Gestion diocèse / paroisse / clocher** | | |
| Ateliers client (trancher les 5 questions) | 4h | 4h |
| Modélisation BDD (diocèse/paroisse/affiliation) + migration | 4h | 1h |
| RLS multi-niveaux (policies Supabase) | 4h | 1h |
| BO — écrans CRUD diocèse + paroisse | 8h | 1h |
| BO — navigation hiérarchique (breadcrumbs, filtres cascade) | 4h | 1h |
| BO — vue paroisse (liste clochers) + vue diocèse (agrégats) | 4h | 1h |
| Flux invitation / activation compte (email + lien) | 6h | 1h |
| Stats multi-niveaux (agrégations diocèse/paroisse + drill-down) | 4h | 1h |
| *Sous-total* | *38h* | *11h* |
| **Déploiement & livraison** | | |
| Déploiement Firebase Hosting + Supabase (prod) | 4h | 1h |
| Soumission technique App Store + Google Play (build, signature, upload) | 4h | 4h |
| Tests sur devices réels (iOS Safari, Android Chrome + app native) | 12h | 8h |
| Formation client BO | 4h | 4h |
| *Sous-total* | *24h* | *17h* |

---

## Récapitulatif

| | Sans IA | Avec IA |
|---|---|---|
| Cadrage & Ateliers clients | 12h | 9h |
| Backend (Edge Functions) | 44h | 10h30 |
| Back Office (React) | 38h | 7h30 |
| App Flutter | 44h | 13h |
| Diocèse / paroisse / clocher | 38h | 11h |
| Déploiement | 24h | 17h |
| **Base** | **200h** | **68h** |
| Marge imprévus (20%) | 40h | 14h |
| **Total facturable** | **240h** | **82h** |
| **Honoraires à 62.5€/h** | **15 000€ HT** | **5 125€ HT** |
| **Arrondi commercial** | **15 000€ HT** | **5 000€ HT** |

---

> **Note sur l'IA** : le développement assisté par IA réduit le temps de production du code d'un facteur 3 à 4 sur les tâches de développement pur. Les tâches incompressibles restent les ateliers client, la publication stores, les tests sur devices réels et la formation. Le résultat livré est identique — seul le temps de production change.

---

## Conditions & garanties

### Modalités de paiement
- 30% à la signature (1 500€ HT)
- 40% à la livraison de la phase BO + backend fonctionnel (2 000€ HT)
- 30% à la recette finale (1 500€ HT)

---

### Prérequis client
- **Compte développeur Apple** (~99€/an) — à souscrire par le client avant la publication iOS
- **Compte développeur Google Play** (~25€ unique) — à souscrire par le client avant la publication Android
- **Compte Firebase** (gratuit) — à créer par le client
- **Compte Supabase** (gratuit au démarrage) — à créer par le client

### Garantie après livraison
- **3 mois de garantie** sur les bugs liés au développement livré
- Correction gratuite de tout bug reproductible signalé dans ce délai
- Hors : nouvelles fonctionnalités, évolutions de specs, bugs liés à des services tiers (Cloudinary, Supabase, Google...)

### Ce qui est inclus
- Livraison du code source complet (propriété du client)
- Déploiement initial sur l'environnement de production
- Publication initiale sur App Store et Google Play
- Formation BO (1 session, jusqu'à 3 personnes)
- Documentation d'utilisation du BO

### Ce qui est exclu
- Maintenance mensuelle (à chiffrer séparément si besoin)
- Hébergement et abonnements tiers (Supabase, Cloudinary, Firebase, comptes développeurs, nom de domaine)
- Saisie du contenu (fiches POI, textes, photos)
- Évolutions fonctionnelles post-livraison

### Gestion des modifications de specs
- Toute modification substantielle du périmètre après validation des specs fera l'objet d'un avenant
- Les modifications mineures (textes, couleurs, ajustements UX) sont incluses dans la marge de 20%

---

## Options à chiffrer séparément

> **i18n** : la version de base inclut **français et anglais** (app + publication stores). L'infrastructure multi-langue est dans le socle (tables de traductions en BDD, ARB Flutter, BO multi-langue). Les options ci-dessous concernent l'ajout de langues supplémentaires.

| Option | Sans IA | Avec IA | Honoraires |
|---|---|---|---|
| Traduction automatique fiches POI (Claude API — batch) | 8h | 2h | 125€ HT |
| Audio guide — ElevenLabs ou Grok Aurora (voix IA réaliste, MP3 stocké Cloudinary) | 8h | 3h | 150€ HT |
| Pipeline Fastlane — langues supplémentaires (screenshots + upload stores) | 8h | 4h | 250€ HT |
| Connexion calendrier Enoria (spec interface à confirmer) | 8h | 4h | 250€ HT |

---

## TMA — Tierce Maintenance Applicative

> Forfait mensuel récurrent, sur abonnement. Démarre à la fin de la période de garantie de 3 mois.

| Prestation | Forfait/mois |
|---|---|
| Surveillance & monitoring (uptime, alertes) | inclus |
| Mises à jour de sécurité (dépendances, patches) | inclus |
| Correction de bugs post-garantie (jusqu'à 1h/mois) | inclus |
| **Forfait TMA de base** | **100€ HT/mois** |
| Heures supplémentaires (au-delà du forfait) | 62.5€/h |

---

## Coûts d'hébergement mensuels (hors honoraires)

> Hypothèses : ~10 photos par église (façade + POI), ~500 Ko/photo après compression Cloudinary.
> Stack : Firebase Hosting + Supabase (BDD + Edge Functions + auth) + Cloudinary

> Hypothèses cibles réelles : sanctuaires Communauté Emmanuel + Fourvière. 80 % des visiteurs arrivent via QR Code (0 tuile carte), 10 % ouvrent la carte France (~20 tuiles/session). Plan intérieur = image locale, 0 tuile.

| Poste | Lancement (5 sites) | An 1 (20 sites) | An 3 (80 sites) |
|---|---|---|---|
| Firebase Hosting (Flutter Web + BO statique) | 0€ | 0€ | 0€ |
| Supabase (PostgreSQL + Edge Functions + auth) | 0€ (free) | 25€ | 25€ |
| Cloudinary (images CDN) | 0€ (free) | 0€ (free) | 89€* |
| Tuiles carte (Stadia Maps / Jawg) | 0€ (free, ~200K tuiles/mois) | 0-20€ (~450K tuiles/mois) | ~30€ (~1,5M tuiles/mois) |
| **Total/mois** | **0€** | **~25-45€** | **~144€** |

*Cloudinary free tier (25 Go) couvre ~500 sites à 10 photos. Au-delà : plan payant ~89€/mois.

> **vs chiffrage précédent** : suppression du backend Railway (~10-80€/mois selon charge) — Supabase Edge Functions inclus dans l'abonnement Supabase. Économie de 10 à 80€/mois selon l'échelle.

### Nom de domaine
| Poste | Coût/an |
|---|---|
| Nom de domaine (ex. visite-plus.fr) | ~15€/an |

### Comptes développeurs
L'1visible gère déjà l'app "Prier Aujourd'hui" — ils disposent vraisemblablement déjà d'un compte Apple Developer et Google Play Console. **À confirmer** : si c'est le cas, aucun coût ni délai supplémentaire pour la publication.
