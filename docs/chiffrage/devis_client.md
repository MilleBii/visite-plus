# Devis — Visite+

**Raymond Balmès**
17 rue de la fontaine — 25660 Saône
SIREN : 980 578 546

> Devis n° RB-2026-001 — v1.0 — Établi le 2026-04-23

---

## Périmètre

### Cadrage & ateliers client
Ateliers de cadrage pour définir le plan de l'église, les points d'intérêt, les droits d'accès et les événements. Choix de l'architecture technique et des intégrations tierces.

### Backend — Supabase
Mise en place de la base de données, de l'authentification et des rôles (super admin / éditeur). Gestion des données églises avec géolocalisation et photo de façade. Footprint bâtiment (OpenStreetMap) avec rotation et ajustement d'angle. Gestion des points d'intérêt avec upload photo. Intégration agenda (Google Calendar et Enoria). Génération des QR Codes et configuration des deep links iOS + Android. Tableau de bord statistiques de fréquentation.

### Back Office — Application web
Interface de gestion complète accessible sur ordinateur. Fiches église (informations, photo, géocodage). Éditeur de plan interactif avec positionnement des POI. Formulaires POI avec upload photo. Configuration de l'agenda par église. Génération et impression des QR Codes. Gestion des utilisateurs (super admin). Tableau de bord statistiques avec courbe de fréquentation et classement des POI. Configuration et suivi des dons (partenaire Hello Asso ou Enoria).

### Application mobile — iOS, Android et Web
Application disponible sur App Store, Google Play et navigateur web. Carte d'accueil avec localisation des églises et géolocalisation de l'utilisateur. Deep linking depuis les QR Codes vers la fiche de l'église concernée. Bannière de téléchargement de l'app native depuis la version web. Accueil église avec photo de façade et navigation. Section "Comprendre la religion". Plan interactif de l'église avec points d'intérêt et légende. Fiches POI courtes et complètes (sections dépliables). Agenda des événements (Google Calendar et Enoria). Audio guide intégré (synthèse vocale native). Bouton "Faire un don" (Hello Asso ou Enoria — partenaire à confirmer).

### Pipeline multilingue
L'application est livrée en quatre langues : français, anglais, espagnol et italien (à confirmer). L'interface et les publications stores sont traduits dans chacune de ces langues. Le contenu des fiches POI est saisi et traduit par le client dans le back office. Le back office est livré en français. L'infrastructure supporte l'ajout de langues supplémentaires (tables de traductions en base, fichiers ARB Flutter, back office i18n-ready, screenshots stores automatisés via Fastlane). L'ajout d'une nouvelle langue suppose une nouvelle soumission et publication de l'application sur les stores.

### Gestion diocèse / paroisse / clocher
Modélisation de la hiérarchie à trois niveaux (diocèse, paroisse, clocher). Droits d'accès multi-niveaux (RLS Supabase). Écrans de gestion dans le back office avec navigation hiérarchique. Vues agrégées par paroisse et par diocèse. Flux d'invitation et d'activation de compte par email. Statistiques multi-niveaux avec drill-down.

### Déploiement & livraison
Déploiement en production (Firebase Hosting + Supabase). Soumission et publication sur App Store et Google Play. Tests sur appareils réels (iOS, Android, navigateur). Formation à l'utilisation du back office (1 session, jusqu'à 3 personnes). Documentation d'utilisation.

---

## Prix

Prestation facturée au temps passé réel, sur la base d'un taux journalier de **500€ HT/jour**.

Estimation : **6 à 10 jours** selon le niveau de personnalisation et les allers-retours de validation.

Engagement : le montant facturé ne dépassera pas **5 000€ HT**, quelle que soit la durée effective.

### Modalités de paiement
- 30% à la signature — **1 500€ HT**
- 40% à la livraison du back office et du backend fonctionnel — **2 000€ HT**
- 30% à la recette finale — **1 500€ HT**

---

## Ce qui est inclus
- Livraison du code source complet (propriété du client)
- Déploiement initial sur l'environnement de production
- Publication initiale sur App Store et Google Play
- Formation BO (1 session, jusqu'à 3 personnes)
- Documentation d'utilisation du BO

## Ce qui est exclu
- Maintenance mensuelle (voir TMA ci-dessous)
- Hébergement et abonnements tiers (Supabase, Cloudinary, Firebase, comptes développeurs, nom de domaine)
- Saisie du contenu (fiches POI, textes, photos)
- Évolutions fonctionnelles post-livraison

## Prérequis client
- **Compte développeur Apple** (~99€/an) — à souscrire avant la publication iOS
- **Compte développeur Google Play** (~25€ unique) — à souscrire avant la publication Android
- **Compte Firebase** (gratuit)
- **Compte Supabase** (gratuit au démarrage)
- **Compte Cloudinary** (gratuit au démarrage)

## Garantie après livraison
- **3 mois de garantie** sur les bugs liés au développement livré
- Correction gratuite de tout bug reproductible signalé dans ce délai
- Hors : nouvelles fonctionnalités, évolutions de specs, bugs liés à des services tiers

## Gestion des modifications de specs
- Toute modification substantielle du périmètre après validation fera l'objet d'un avenant
- Les modifications mineures (textes, couleurs, ajustements UX) sont incluses

---

## Option

| Option | Honoraires |
|---|---|
| Audio guide — voix IA réaliste (ElevenLabs ou Grok Aurora, MP3 stocké Cloudinary) | 150€ HT |

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

> **Hypothèses de volume** : 10 photos par site (façade + POI), 500 Ko/photo après compression. 80 % des visiteurs arrivent via QR Code (0 tuile carte chargée), 10 % ouvrent la carte de localisation (≈ 20 tuiles/session). Le plan intérieur est une image locale, aucune tuile externe.

| Poste | Lancement (5 sites) | An 1 (20 sites) | An 3 (80 sites) |
|---|---|---|---|
| Firebase Hosting (Flutter Web + BO statique) | 0€ | 0€ | 0€ |
| Supabase (PostgreSQL + Edge Functions + auth) | 0€ (free) | 25€ | 25€ |
| Cloudinary (images CDN) | 0€ (free) | 0€ (free) | 0€ (free) |
| Tuiles carte (Stadia Maps / Jawg) | 0€ (free) | 0-20€ | ~30€ |
| **Total/mois** | **0€** | **~25-45€** | **~55€** |

*Cloudinary free tier (25 Go) couvre ~500 sites à 10 photos. Au-delà : plan payant ~89€/mois.

### Nom de domaine
| Poste | Coût/an |
|---|---|
| Nom de domaine (ex. visite-plus.fr) | ~15€/an |
