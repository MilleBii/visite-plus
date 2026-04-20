# Spécifications fonctionnelles — Visite+ · Application mobile

**Pilotage : Ce projet est piloté par l'équipe de l'Invisible.**

**Distribution :** Application native Flutter, publiée sur l'Apple Store et le Google Play Store.

---

## 1. Application mobile visiteur

### 1.1 Accès à l'application

#### Accès 1 — QR Code

Le QR Code encode une URL HTTPS standard (`visite-plus.fr/eglise/{slug}`). Le comportement dépend du terminal :

**App déjà installée :**
- L'OS intercepte l'URL (Universal Links iOS / App Links Android) et ouvre l'application Flutter directement sur l'écran d'accueil de l'église ciblée
- Aucune étape intermédiaire, aucun compte requis

**App non installée :**
- Le navigateur s'ouvre sur `visite-plus.fr/eglise/{slug}` — servi par la **version web de l'app Flutter** (même codebase, compilé en Flutter Web)
- Le visiteur peut immédiatement visiter l'église dans son navigateur, sans rien installer
- Une bannière/invite propose de télécharger l'app native (App Store / Google Play) pour une meilleure expérience

> Techniquement : fichiers `.well-known/apple-app-site-association` (iOS) et `.well-known/assetlinks.json` (Android) hébergés sur `visite-plus.fr`, configurés pour intercepter le path `/eglise/*` vers l'app Flutter.

#### Accès 2 — Recherche manuelle
- Le visiteur ouvre l'application mobile.
- Il voit une carte de France avec les églises référencées.
- Il est automatiquement géolocalisé à l'ouverture (demande de permission système).
- Chaque église est représentée par un picto selon son type :
  - Église simple
  - Sanctuaire
  - Cathédrale
- Premier tap sur le picto → bulle avec le nom de l'église
- Second tap → accès à la visite de l'église

---

### 1.2 Écran d'accueil de l'église

**Contenu :**
- Grande photo de la façade de l'église (plein écran)
- Nom de l'église en surimpression
- Message de bienvenue : *"Croyant ou non, bienvenue dans cette église !"* (personnalisable)
- 3 boutons de navigation :
  - **Comprendre la religion chrétienne**
  - **Visiter cette église**
  - **Au programme**

**Bannière de téléchargement (Flutter Web uniquement) :**
- Affichée uniquement si l'utilisateur est sur la version web (app non installée)
- Détection du système via le user-agent :
  - iOS → bouton "Télécharger sur l'App Store"
  - Android → bouton "Disponible sur Google Play"
  - Desktop → non affiché
- La bannière est discrète (bas d'écran ou sous le message de bienvenue) pour ne pas bloquer l'accès à la visite

---

### 1.3 Section "Comprendre la religion chrétienne"

**Contenu :**
- 4 questions / réponses présentées sous forme d'accordéon ou de cartes
- Contenu **identique pour toutes les églises** (géré centralement)
- Questions à définir avec le client

**Navigation :**
- Flèche retour → écran d'accueil de l'église

---

### 1.4 Section "Visiter cette église"

#### Écran plan interactif

**Contenu :**
- Plan de l'église affiché en plein écran (Leaflet CRS.Simple)
- Zoom par pinch (mobile) ou molette (desktop)
- Pan par glisser-déposer
- Les POI sont affichés sur le plan avec un picto selon leur type :
  - Tableau
  - Vitrail
  - Statue
  - Démarche (ex. cierge, livre d'or...)
  - Autres types à définir avec le client

**Interaction :**
- Tap/clic sur un POI → fiche courte apparaît dans le **panneau bas** (occupe ~40% bas d'écran)
- Le plan reste visible au-dessus
- Tap/clic sur la fiche courte → fiche complète en plein écran

#### Panneau bas — fiche POI courte

**Contenu :**
- Picto du type
- Titre du POI
- Photo (vignette)

#### Écran fiche POI complète

Page scrollable — pas d'onglets, pas d'accordéon. L'utilisateur est debout, une main occupée : le scroll vers le bas est le geste le plus naturel.

```
┌─────────────────────────┐
│   Grande photo          │
│                         │
├─────────────────────────┤
│  [picto]  Titre         │
│  ▶ Écouter              │  ← bouton TTS
├─────────────────────────┤
│  Résumé                 │
│  (texte affiché)        │
├─────────────────────────┤
│  Comprendre l'œuvre     │
│  (texte)                │
├─────────────────────────┤
│  Contexte historique    │
│  (texte)                │
├─────────────────────────┤
│  Dans la Bible          │  ← masqué si non renseigné
│  (texte)                │
└─────────────────────────┘
```

Les sections non renseignées ne sont pas affichées.

**Audio guide :**
- Bouton "▶ Écouter" sous le titre → lecture TTS enchaînée de toutes les sections (flutter_tts, voix système)
- Lecture dans la langue de l'app
- Contrôles lecture / pause / stop

**Navigation :**
- Flèche en haut à gauche → retour au plan

---

### 1.5 Section "Au programme"

**Contenu :**
- Liste des événements à venir de l'église
- 3 types d'événements, code couleur distinct :
  - 🟣 Messe
  - 🟠 Confession
  - 🟢 Événement (concert, exposition...)
- Pour chaque événement : type, titre, date, heure
- Si intégration Messe Info : les messes sont récupérées en temps réel depuis leur API

**Navigation :**
- Flèche retour → écran d'accueil de l'église

---

## 2. Internationalisation (i18n)

L'application est multi-langue. La langue est détectée automatiquement depuis les préférences système du téléphone, avec possibilité de changer manuellement dans l'app.

**Périmètre des contenus à traduire :**

| Contenu | Nature | Stratégie |
|---|---|---|
| Interface (boutons, labels, navigation) | Chaînes statiques | Traduction manuelle par langue (ARB Flutter) |
| Section "Comprendre la religion" (4 Q/R) | Contenu central géré par l'1visible | Traduction manuelle, saisie dans le BO par langue |
| Fiches POI (titre, résumé, textes) | Contenu par église | À décider — voir ci-dessous |
| Message de bienvenue de l'église | Contenu par église | À décider — voir ci-dessous |

**Points en attente (à valider avec le client) :**
- Combien de langues au lancement ? (ex. FR + EN minimum ? + ES, IT, DE, PT ?)
- Pour les contenus par église (fiches POI, message de bienvenue) : traduction **manuelle** par l'équipe l'1visible, ou **traduction automatique** (DeepL / Google Translate API) générée à la publication ?
- La traduction automatique nécessite une relecture humaine ou est publiée directement ?

> **Impact chiffrage :** le nombre de langues et le choix traduction manuelle vs automatique sont les deux variables qui font le plus varier le coût. À trancher avant estimation.

---

## 3. Option à chiffrer séparément

### Pipeline Fastlane — automatisation stores *(500€ HT)*

Mise en place d'un pipeline **Fastlane** qui automatise la partie la plus pénible de la publication stores :

- `snapshot` (iOS) + `screengrab` (Android) : lance l'app sur des simulateurs, navigue automatiquement via les integration tests Flutter, capture les screenshots dans **tous les formats requis** (6 tailles iPhone, iPad, Android…)
- `frameit` : ajoute les cadres de téléphone et les textes marketing par-dessus chaque screenshot
- `deliver` (iOS) + `supply` (Android) : upload automatique sur App Store Connect et Google Play (screenshots + textes + métadonnées)

**Résultat :** une seule commande (`fastlane screenshots && fastlane upload`) regénère et republie tous les visuels stores dans toutes les langues. Indispensable dès que le nombre de langues augmente ou à chaque mise à jour majeure.

Le pipeline est configuré une fois et réutilisable indéfiniment.

> **Pertinence :** cette option ne se justifie vraiment qu'avec un grand nombre de langues et des mises à jour fréquentes. Si Visite+ évolue peu et reste sur 2-3 langues, le coût de mise en place (500€) dépasse probablement le gain. À réévaluer selon le nombre de langues retenu.
