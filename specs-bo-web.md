# Spécifications fonctionnelles — Visite+ · Site web & Back Office

**Pilotage : Ce projet est piloté par l'équipe de l'Invisible.**

---

## 1. Back Office

**Modèle de gestion : l'1visible gère le BO pour le compte de ses clients finaux (paroisses, sanctuaires, diocèses).** Les églises ne disposent pas d'un accès éditeur direct — c'est l'équipe de l'1visible qui crée et maintient les contenus en leur nom.

Le Back Office est pensé pour une utilisation sur PC (bureau ou portable), avec une interface optimisée pour le confort de saisie et la gestion avancée des contenus. La saisie se fait depuis un poste fixe ou en déplacement sur le terrain par un membre de l'équipe l'1visible.

**Langues de l'interface :** le BO est disponible en **français et en anglais**. La langue est sélectionnable manuellement (préférence utilisateur), indépendamment de la langue des contenus gérés.

Une ouverture d'accès aux clients finaux (rôle `editeur_eglise` ou `editeur_client`) pourra être envisagée dans une évolution future si le modèle opérationnel évolue.

### 1.1 Authentification

La page d'accueil du BO est une fenêtre de login. Toutes les routes sont protégées — un utilisateur non authentifié est redirigé vers cette page.

Rôles actifs (v1) :

  - **super_admin** : accès total — gère les utilisateurs, les clients et toutes les églises
  - **editeur_1visible** : peut créer et éditer toutes les églises de tous les clients, sans accès à la gestion des utilisateurs

Rôles réservés pour une évolution future (non activés en v1) :

  - **editeur_client** : pourrait éditer toutes les églises d'un client donné (ex. diocèse)
  - **editeur_eglise** : pourrait gérer uniquement son propre clocher

---

### 1.2 Tableau de bord

Une fois connecté, la home page est une vue deux colonnes :

**Colonne gauche — liste des églises**
- Tableau : nom, ville, type, statut, date de dernière modification
- Bouton "Ajouter une église"
- Recherche par nom / ville

**Colonne droite — carte interactive**
- Affiche toutes les églises en production (statut "publié"), accessibles selon le rôle
- Clic sur un marqueur → accès rapide à la fiche de l'église

---

### 1.3 Gestion des églises

#### Liste des églises
- Tableau : nom, ville, type, statut, date de dernière modification
- Bouton "Ajouter une église"
- Recherche par nom / ville

#### Fiche église
**Champs :**
- Nom
- Type : église / sanctuaire / cathédrale
- Adresse, code postal, ville
- Latitude / longitude (saisie manuelle ou via géocodage automatique à l'adresse)
- Message de bienvenue (texte personnalisable)
- Photo façade (upload + outil de recadrage manuel — ratio libre, l'image doit couvrir le plein écran mobile portrait)
- Statut : brouillon / publié

---

### 1.4 Gestion du plan

#### Photo façade par défaut — Wikimedia Commons

À la création de l'église, le BO recherche automatiquement une photo de la façade :
1. Requête sur l'API Wikimedia Commons avec le nom de l'église + commune
2. Si une photo est trouvée → affichée comme photo par défaut
3. L'admin peut la remplacer par un upload manuel à tout moment

Avantage : l'église est présentable dès sa création sans nécessiter d'upload.

---

#### Plan automatique — OSM

À la création de l'église :
1. Les coordonnées GPS sont utilisées pour interroger l'**API Overpass** (OpenStreetMap)
2. Le polygone du bâtiment est récupéré en GeoJSON
3. Il est **converti en SVG** (coordonnées normalisées dans un repère local)
4. Le SVG est stocké en BDD et affiché dans Leaflet CRS.Simple comme plan de base

Le SVG OSM est vectoriel, zoomable sans perte, stylisable en CSS.

**Si le bâtiment n'est pas trouvé dans OSM :** plan vide, l'admin doit uploader un plan manuellement.

#### Upload d'un plan personnalisé (override)
- L'admin peut uploader une image (JPG ou PNG) du plan intérieur réel
- Cette image remplace le SVG OSM comme fond de plan
- Utile pour les grandes cathédrales où le footprint extérieur ne suffit pas
- Remplacement possible à tout moment

#### Éditeur de POI

**Interface :**
- Le plan est affiché dans Leaflet CRS.Simple
- Une barre de boutons propose un bouton "Ajouter" par type de POI (Tableau, Vitrail, Statue, Démarche, etc.)
- Clic sur un bouton → le curseur passe en mode "placement" pour ce type
- Clic sur le plan → le marker est posé à cet endroit avec le picto correspondant
- Un formulaire s'ouvre immédiatement à droite

**Placement et repositionnement :**
- Le marker peut être déplacé par drag & drop à tout moment
- Clic sur un marker existant → ouvre sa fiche pour édition

**Formulaire POI :**
- Photo (upload obligatoire)
- Bouton supprimer dans la fiche

Les champs descriptifs sont saisis **par langue** (onglet ou sélecteur de langue dans le formulaire) :
- Titre
- Résumé
- Comprendre l'œuvre
- Contexte historique
- Dans la Bible (facultatif)

Le nombre de langues disponibles est celui configuré pour l'application (voir specs app mobile — section i18n).

---

### 1.5 Génération du QR Code

- Le BO génère automatiquement un QR Code pour chaque église publiée
- Le QR Code encode l'URL `visite-plus.fr/eglise/{slug}`
- Le BO affiche une **page d'impression mise en page A4** que l'utilisateur imprime lui-même (Ctrl+P / impression navigateur), en papier ou en PDF via le dialogue d'impression natif
- Contenu de la page :
  - QR Code grand format (centré, bien lisible à distance)
  - Nom de l'église
  - Texte d'invitation : *"Scannez pour visiter cette église"* (ou personnalisable)
  - Logo Visite+
- Mise en page gérée par CSS `@media print` — aucune génération côté backend
- Le QR Code est régénéré automatiquement si le slug change

---

### 1.6 Gestion des événements

✅ **Décision : Google Calendar comme source principale, Messe Info en option.**

#### Socle — Intégration Google Calendar

- Chaque église dispose d'un Google Calendar dédié (existant ou créé à l'onboarding)
- Visite+ se connecte via l'API Google Calendar et affiche les événements en temps réel
- Couvre tous les types d'événements : messes, confessions, concerts, expositions…
- La saisie se fait directement dans Google Calendar — l'équipe l'1visible ou la paroisse peut le gérer
- Bénéfice supplémentaire : les paroissiens peuvent s'abonner au Calendar depuis leur téléphone

**Configuration dans le BO (fiche église) :**
- Champ : ID du Google Calendar de l'église
- Le BO récupère les événements via l'API Google Calendar (lecture seule, clé API publique suffit pour les calendriers publics)

#### Option — Intégration Messe Info *(à chiffrer séparément)*

- Connexion à l'API Messe Info pour récupérer automatiquement les messes et offices
- Les événements Messe Info sont fusionnés avec ceux du Google Calendar dans l'affichage
- Utile si l'église est déjà référencée sur Messe Info et souhaite éviter la double saisie des messes
- **Prérequis à vérifier** : l'église doit être référencée sur Messe Info

---

### 1.7 Gestion des utilisateurs *(super_admin uniquement)*

- Liste des utilisateurs : email, rôle, église associée
- Créer / modifier / désactiver un utilisateur
- Réinitialiser le mot de passe

---

### 1.8 Gestion du contenu "Comprendre la religion" *(super_admin uniquement)*

- 4 questions / réponses éditables
- Modifications appliquées à toutes les églises simultanément

---

## 2. Statistiques

Objectif principal : **mesurer l'affluence** — combien de visiteurs ont utilisé l'application dans une église donnée.

### Indicateurs retenus

| Indicateur | Granularité | Description |
|---|---|---|
| Vues de l'église | Par église / par jour | Nombre d'ouvertures de l'écran d'accueil d'une église |
| Vues par POI | Par POI / par jour | Nombre d'ouvertures de la fiche complète d'un POI |

### Implémentation technique

Comptage léger côté backend — pas d'outil tiers :
- À chaque ouverture d'une église ou d'une fiche POI, l'app envoie un événement `POST /stats/view` (fire-and-forget, non bloquant)
- Le backend incrémente un compteur en BDD (`stats_vues` : entité, date, count)
- Pas de tracking individuel, pas de cookies — conforme RGPD sans bandeau de consentement

### Consultation

- **super_admin / editeur_1visible** : stats de toutes les églises
- **Clients finaux (paroisses)** : stats de leurs propres églises — les paroisses seront demandeuses de cette information

Dashboard dans le BO :
- Courbe de fréquentation fine — granularité **15 min ou 1h** (à valider avec le client)
- Vues agrégées par jour / semaine / mois (navigation temporelle)
- Classement des POI les plus vus

> **Points en attente** — voir question 16 dans [questions-client.md](questions-client.md) : granularité (15 min ou 1h), export CSV, choix de l'outil de stockage.

---

## 3. Points en attente de validation client

> Voir [questions-client.md](questions-client.md)

**Résolus :**
- ✅ Qui saisit le contenu des fiches POI → l'équipe de l'1visible
- ✅ Qui positionne les POI sur le plan → l'équipe de l'1visible
- ✅ Les éditeurs du BO sont exclusivement des membres de l'1visible (v1)
- ✅ Application native Flutter confirmée (App Store + Google Play) — deep link via Universal Links / App Links

**En attente :**
- Format du plan fourni par les églises (photo, scan, OSM auto ?)
- Intégration Messe Info (oui / non) par église — les cibles sont-elles déjà référencées ?
- Volumétrie cible (10 / 100 / 1 000 églises) et nombre de visiteurs attendus par église
- **i18n : nombre de langues au lancement ?**
- **i18n : traduction manuelle ou automatique (DeepL / Google Translate) pour les fiches POI ?**
