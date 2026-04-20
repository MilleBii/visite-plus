# Cahier des charges — VISITE+
**Pilotage : Ce projet est piloté par l'équipe de l'Invisible.**
**Distribution :** L'application sera publiée sur l'Apple Store et le Google Play Store (application mobile native ou hybride).
### Application mobile de visite d'église

---

## Objectif

Développer une application mobile simple permettant à tout visiteur de visiter une église facilement, avec option audio guide.

---

## Accès

### Accès n°1 — QR Code
En scannant le QR Code affiché sur un panneau à l'entrée de l'église.

L'application s'ouvre sur une belle photo de l'église avec un message de bienvenue :

> *« Croyant ou non, bienvenue dans cette église ! »*

---

## Structure de l'application

L'application propose toujours **3 parties** :

1. Comprendre la religion chrétienne
2. Visiter cette église
3. Au programme

---

### 1. Comprendre la religion chrétienne

- Composée de **4 questions/réponses** mises en forme
- **Identique pour toutes les églises**

---

### 2. Visiter cette église

**Plan interactif de l'église :**
- Le plan est zoomable et navigable
- Des **points d'intérêt** sont identifiés par un picto selon le type d'élément :
  - Tableau
  - Vitrail
  - Statue
  - Démarche
  - *(etc.)*

**Interaction avec un point d'intérêt :**

| Niveau | Affichage |
|--------|-----------|
| Clic sur le picto | Picto + titre + photo (moitié basse de l'écran) |
| Clic sur la fiche | Plein écran avec détail complet |

**Détail d'un point d'intérêt (plein écran) :**
- Résumé
- Comprendre l'œuvre
- Contexte historique
- Dans la Bible

> Une flèche en haut à gauche permet de revenir au plan à tout moment.

---

### 3. Au programme

Accès à trois types d'événements, avec **trois couleurs distinctes** :

- Messe
- Confession
- Événement

*(Présentation à définir)*

---

## Accès n°2 — Page d'accueil

Toutes les églises sont accessibles depuis la même application.

**Carte de France interactive :**
- Localisation de toutes les églises disposant d'une visite
- Géolocalisation de l'utilisateur possible
- Chaque église est identifiée par un picto selon son type :
  - Église
  - Sanctuaire
  - Cathédrale
- Clic sur le picto → affiche le nom de l'église
- Double clic → entre dans la visite de l'église

---

## Administration (Back-office)

Un **BO simple** avec niveaux de droits permettra d'administrer les contenus de l'application.
