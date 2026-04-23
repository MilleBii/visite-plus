# Spécifications — Rôles & Autorisations · Visite+

**Version** : 1.0 · draft
**Périmètre** : Back Office web (React) et API Supabase
**Contexte** : Cahier des charges #2 — ouverture du BO aux clients finaux (diocèses, paroisses), en remplacement du modèle "1visible gère tout" des specs précédentes.

---

## 1. Principes directeurs

### 1.1 Hiérarchie à 3 niveaux

```
                         ┌─────────────────────┐
                         │   1visible (N0)     │  ← éditeur du service
                         │   super_admin       │
                         └──┬────────────┬─────┘
              crée & admin. │            │ gère directement
                            │            │ (sanctuaire autonome)
                  ┌─────────┴─────┐      │
                  │  Diocèse (N1) │      │
                  │ admin_diocese │      │
                  └──┬─────────┬──┘      │
         crée & admin│         │ gère    │
                     │         │ (sanctuaire diocésain)
              ┌──────┴─────┐   │         │
              │ Paroisse   │   │         │
              │ (N2)       │   │         │
              │admin_paroi.│   │         │
              └──────┬─────┘   │         │
                     │ admin.  │         │
                     ▼         ▼         ▼
                  ┌──────────────────────────┐
                  │  Église / Clocher        │  ← contenu visiteur
                  │  (paroissial | diocésain │
                  │   | autonome)            │
                  └──────────────────────────┘
```

**Trois voies de rattachement possibles pour une église** :
- **Paroissiale** : cas nominal, une église de village rattachée à sa paroisse
- **Diocésaine** : sanctuaire diocésain géré directement par le diocèse, hors périmètre paroissial
- **Autonome** : sanctuaire géré par une communauté ou ordre religieux (ex. Cté Emmanuel), rattaché directement à 1visible

### 1.2 Règles fondamentales

1. **Un utilisateur = un rôle = un périmètre** (v1). Le multi-rattachement est renvoyé en v2.
2. **Délégation complète descendante** : un admin de niveau N peut créer les admins de niveau N-1 dans son périmètre.
3. **Visibilité descendante** : un admin voit tout ce qui est sous lui (lecture + écriture selon droits).
4. **Pas de visibilité ascendante ni latérale** : un admin paroisse ne voit ni son diocèse, ni les autres paroisses.
5. **Soft-delete uniquement** : aucune suppression dure. Toute entité "supprimée" est archivée, ses enfants préservés, réassignables par le niveau supérieur.
6. **Rattachement flexible** : une paroisse peut exister sans diocèse ; une église peut être rattachée à une paroisse OU directement à un diocèse (cas des sanctuaires diocésains) OU directement à 1visible (cas d'un sanctuaire autonome géré par une communauté, ex. Emmanuel). Règle unique : une église est rattachée à **exactement un** parent parmi {paroisse, diocèse, 1visible}.

---

## 2. Modèle de rôles

### 2.1 Catalogue des rôles (v1)

| Rôle                | Niveau | Créé par                       | Périmètre                                   |
|---------------------|--------|--------------------------------|---------------------------------------------|
| `super_admin`       | N0     | bootstrap / super_admin        | global                                      |
| `editeur_1visible`  | N0     | super_admin                    | global (pas de gestion users)               |
| `admin_diocese`     | N1     | super_admin                    | 1 diocèse + ses paroisses + leurs églises   |
| `editeur_diocese`   | N1     | admin_diocese OU super_admin   | 1 diocèse : édite toutes les églises de ses paroisses, sans gestion users |
| `admin_paroisse`    | N2     | admin_diocese OU super_admin   | 1 paroisse + ses églises                    |
| `editeur_paroisse`  | N2     | admin_paroisse, admin_diocese OU super_admin | 1 paroisse (édition seule)    |

**Cas d'usage `editeur_diocese`** : certains diocèses centralisent la gestion au niveau diocésain — un chargé de communication ou un bénévole diocésain prend en charge la saisie de contenu pour toutes les paroisses du diocèse, sans que les curés aient à intervenir. Il édite sans administrer.

### 2.2 Rôles réservés pour v2

- Multi-rattachement : un user pouvant cumuler plusieurs rôles/périmètres

---

## 3. Matrice des autorisations

### 3.1 Gestion des utilisateurs

| Action                                        | super_admin | editeur_1visible | admin_diocese | editeur_diocese | admin_paroisse | editeur_paroisse |
|-----------------------------------------------|:-----------:|:----------------:|:-------------:|:---------------:|:--------------:|:----------------:|
| Créer `admin_diocese`                         | ✅          | ❌               | ❌            | ❌              | ❌             | ❌               |
| Créer `editeur_diocese` (de son diocèse)      | ✅          | ❌               | ✅            | ❌              | ❌             | ❌               |
| Créer `admin_paroisse` (rattachée directement)| ✅          | ❌               | ❌            | ❌              | ❌             | ❌               |
| Créer `admin_paroisse` (de son diocèse)       | ✅          | ❌               | ✅            | ❌              | ❌             | ❌               |
| Créer `editeur_paroisse` (de sa paroisse)     | ✅          | ❌               | ✅            | ❌              | ✅             | ❌               |
| Modifier un user de son périmètre             | ✅          | ❌               | ✅            | ❌              | ✅¹            | ❌               |
| Désactiver / réactiver un user                | ✅          | ❌               | ✅²           | ❌              | ✅¹            | ❌               |
| Réinitialiser son propre mot de passe         | ✅          | ✅               | ✅            | ✅              | ✅             | ✅               |

¹ Uniquement les `editeur_paroisse` de sa paroisse.
² Uniquement les `editeur_diocese`, `admin_paroisse` et `editeur_paroisse` de son diocèse.

### 3.2 Gestion des diocèses

| Action                              | super_admin | editeur_1visible | admin_diocese | admin_paroisse |
|-------------------------------------|:-----------:|:----------------:|:-------------:|:--------------:|
| Voir tous les diocèses              | ✅          | ✅               | ❌            | ❌             |
| Créer un diocèse                    | ✅          | ❌               | ❌            | ❌             |
| Modifier son diocèse                | ✅          | ✅               | ✅            | ❌             |
| Archiver un diocèse                 | ✅          | ❌               | ❌            | ❌             |
| Rattacher une paroisse à un diocèse | ✅          | ✅               | ✅³           | ❌             |

³ Uniquement depuis une paroisse déjà non-rattachée (orpheline ou rattachée à lui).

### 3.3 Gestion des paroisses

| Action                              | super_admin | editeur_1visible | admin_diocese | editeur_diocese | admin_paroisse |
|-------------------------------------|:-----------:|:----------------:|:-------------:|:---------------:|:--------------:|
| Voir toutes les paroisses           | ✅          | ✅               | ❌            | ❌              | ❌             |
| Créer une paroisse (indépendante)   | ✅          | ❌               | ❌            | ❌              | ❌             |
| Créer une paroisse dans un diocèse  | ✅          | ❌               | ✅⁴           | ❌              | ❌             |
| Modifier une paroisse               | ✅          | ✅               | ✅⁴           | ❌              | ✅             |
| Archiver une paroisse               | ✅          | ❌               | ✅⁴           | ❌              | ❌             |
| Détacher une paroisse du diocèse    | ✅          | ❌               | ❌            | ❌              | ❌             |

⁴ Uniquement les paroisses de son diocèse.

### 3.4 Gestion des églises (clochers et sanctuaires)

**Périmètre par rôle** :
- `admin_diocese` / `editeur_diocese` voit et gère : les églises rattachées **directement** à son diocèse + les églises des paroisses de son diocèse
- `admin_paroisse` / `editeur_paroisse` voit et gère : les églises rattachées à **sa paroisse uniquement**
- Les sanctuaires **autonomes** (rattachés à 1visible) ne sont visibles que par `super_admin` et `editeur_1visible`

| Action                      | super_admin | editeur_1visible | admin_diocese⁵ | editeur_diocese⁵ | admin_paroisse | editeur_paroisse |
|-----------------------------|:-----------:|:----------------:|:-------------:|:----------------:|:--------------:|:----------------:|
| Créer une église            | ✅          | ✅               | ✅            | ❌               | ✅             | ❌               |
| Modifier une église         | ✅          | ✅               | ✅            | ✅               | ✅             | ✅               |
| Publier / dépublier         | ✅          | ✅               | ✅            | ❌⁶              | ✅             | ❌⁶              |
| Mettre en pause / réactiver | ✅          | ❌               | ❌            | ❌               | ❌             | ❌               |
| Archiver une église         | ✅          | ✅               | ✅            | ❌               | ✅             | ❌               |
| Transférer une église à une autre paroisse du diocèse | ✅ | ✅ | ✅    | ❌               | ❌             | ❌               |
| Gérer POI (CRUD)            | ✅          | ✅               | ✅            | ✅               | ✅             | ✅               |
| Upload photos / plan        | ✅          | ✅               | ✅            | ✅               | ✅             | ✅               |

⁵ Dans son périmètre : églises directement rattachées à son diocèse + églises des paroisses de son diocèse.
⁶ L'éditeur prépare le contenu, l'admin (paroisse ou diocèse) valide la publication.

### 3.5 Gestion de la facturation / abonnement

| Action                         | super_admin | admin_diocese | admin_paroisse |
|--------------------------------|:-----------:|:-------------:|:--------------:|
| Voir statut abonnement         | ✅          | ✅            | ✅             |
| Générer une facture            | ✅          | ❌            | ❌             |
| Marquer une facture comme payée | ✅         | ❌            | ❌             |
| Voir l'historique de facturation | ✅        | ✅⁷           | ✅             |

⁷ Uniquement les paroisses de son diocèse.

---

## 4. Règles métier détaillées

### 4.1 Création des comptes

**Principe** : tout compte est créé par un admin, jamais en self-service. À la création :

1. L'admin saisit les infos du nouvel utilisateur (prénom, nom, email, rôle implicite selon contexte).
2. Un mail d'invitation avec lien de définition du mot de passe est envoyé.
3. Le lien expire après 7 jours — passé ce délai, l'admin peut relancer l'invitation.
4. À la première connexion, l'utilisateur accepte les CGU.

**Champs obligatoires du compte paroisse** (cf. cahier des charges #2) :
- Prénom, Nom
- Nom de la paroisse
- Logo (facultatif)
- Adresse, téléphone
- Email (= identifiant)
- Mot de passe (défini à la première connexion)

### 4.2 Hiérarchie et rattachement

- Une **paroisse** peut être :
  - rattachée à un diocèse (cas nominal quand un diocèse est client)
  - autonome (rattachée directement à 1visible, cas d'une paroisse qui souscrit seule)
- Une **église** (clocher ou sanctuaire) peut être rattachée :
  - à une **paroisse** — cas nominal pour une église de village ou de quartier
  - directement à un **diocèse** — cas d'un sanctuaire diocésain (ex. basilique diocésaine hors paroisse)
  - directement à **1visible** — cas d'un sanctuaire autonome géré par une communauté ou un ordre religieux (ex. sanctuaires de la Communauté Emmanuel)
- Une paroisse peut regrouper plusieurs clochers (rappel : jusqu'à 20-40 en zone rurale).
- Le type de l'église (`église` / `sanctuaire` / `cathédrale`) est **indépendant** du mode de rattachement : un sanctuaire peut être rattaché à une paroisse, et une église paroissiale peut être directement rattachée à un diocèse si le contexte le justifie.

### 4.3 Statuts d'une église

Une église peut prendre **4 statuts** distincts, chacun avec un impact précis sur la visibilité côté visiteur (front public) et la visibilité côté BO (éditeurs).

| Statut      | Visible côté visiteur ? | Visible côté BO ?              | Qui peut le positionner                                 |
|-------------|:-----------------------:|--------------------------------|---------------------------------------------------------|
| `brouillon` | ❌                      | ✅ (badge "En cours de saisie") | Créateur de l'église (par défaut à la création)         |
| `publié`    | ✅                      | ✅ (badge vert "En ligne")      | admin (paroisse / diocèse / super_admin)                |
| `pause`     | ❌                      | ✅ (badge orange "En pause")    | **`super_admin` uniquement**                            |
| `archivé`   | ❌                      | ⚠️ Visible sous filtre "Archives" | admin (paroisse / diocèse / super_admin) — cf. § 4.4   |

**Transitions autorisées** :

```
    brouillon ──publier──▶ publié ──dépublier──▶ brouillon
                               │
                               │ super_admin uniquement
                               ▼
                             pause ──réactiver──▶ publié
                               │
                               │ super_admin uniquement
                               ▼
                             publié

    [tout statut] ──archiver──▶ archivé ──restaurer──▶ brouillon
```

**Sémantique du statut `pause`** :
- Réservé au `super_admin`. Aucun autre rôle ne peut mettre en pause ou sortir de pause.
- Cas d'usage : paiement non reçu, litige commercial, demande explicite du client, mise en conformité juridique temporaire, bug bloquant côté contenu.
- L'église devient invisible côté visiteur (le QR code renvoie une page "Cette visite est temporairement indisponible"), **mais toutes les données sont conservées** (POI, photos, traductions, stats historiques).
- Les admins du périmètre (diocèse, paroisse) continuent de voir leur église dans leur BO avec un badge explicite "En pause — contactez 1visible", mais **ne peuvent plus la modifier** tant qu'elle est en pause.
- Un historique des mises en pause est tracé dans l'audit log (qui, quand, motif).

**Différence `pause` vs `archivé`** :
- `pause` = suspension temporaire décidée par 1visible, réversible par 1visible uniquement
- `archivé` = décision de fin de vie prise par le client ou 1visible, réversible mais suppose une réactivation volontaire

**Propagation de la pause (diocèse / paroisse)** :
- Mettre un **diocèse** en `pause` masque automatiquement toutes ses paroisses et toutes leurs églises côté visiteur (cascade visuelle sans altérer le statut individuel de chaque église).
- Mettre une **paroisse** en `pause` masque automatiquement toutes ses églises côté visiteur.
- À la réactivation : chaque église retrouve son statut individuel (une église qui était en `brouillon` avant la mise en pause reste en `brouillon`, une qui était en `publié` redevient `publié`).
- Une église en statut `pause` individuel reste en pause même si son diocèse/paroisse est réactivé — le statut individuel prime.

### 4.4 Soft-delete et archivage

**Aucune suppression dure en v1.** Toute entité supprimée passe en statut `archivé` :

| Entité archivée | Conséquence sur ses enfants | Qui peut restaurer |
|-----------------|-----------------------------|--------------------|
| Diocèse         | Paroisses rattachées → détachées (`diocese_id = null`), restent actives, visibles uniquement par super_admin. Églises rattachées **directement** au diocèse → détachées (`diocese_id = null`) et donc autonomes (visibles uniquement par 1visible). | super_admin |
| Paroisse        | Églises rattachées → archivées automatiquement | super_admin OU admin_diocese du diocèse d'origine |
| Église          | POI conservés, masquée du front public | niveau N-1 ou au-dessus |
| Utilisateur     | Compte désactivé (login bloqué), données conservées | Créateur du compte ou au-dessus |

**Réassignation** : le super_admin peut réassigner une entité orpheline (paroisse détachée) à un nouveau diocèse, ou laisser une paroisse en mode autonome.

### 4.5 Cas limites

- **Rétrogradation d'un admin** : impossible directement. Procédure = créer un nouveau compte au rôle cible, archiver l'ancien.
- **Changement de diocèse pour une paroisse** : action super_admin uniquement. Les églises suivent automatiquement.
- **Dernier admin d'un périmètre** : avant de désactiver le dernier `admin_paroisse` d'une paroisse, le système demande à l'admin parent (diocèse ou super_admin) d'en désigner un autre, ou confirme l'archivage de la paroisse.
- **Auto-désactivation** : un admin ne peut pas désactiver son propre compte. Procédure = demander à un admin de niveau supérieur.

---

## 5. Vues et navigation

### 5.1 Ce que chaque rôle voit après login

| Rôle              | Vue par défaut                                              |
|-------------------|-------------------------------------------------------------|
| super_admin       | Tableau de bord global : diocèses + paroisses indépendantes + stats globales |
| editeur_1visible  | Tableau de bord global : diocèses + paroisses + toutes les églises (sans gestion users ni création diocèse/paroisse) |
| admin_diocese     | Tableau de bord diocèse : ses paroisses + carte de ses églises |
| editeur_diocese   | Liste de toutes les églises de son diocèse (édition directe) |
| admin_paroisse    | Tableau de bord paroisse : ses églises + carte              |
| editeur_paroisse  | Liste des églises de sa paroisse (édition directe)          |

### 5.2 Menu gestion utilisateurs

Affiché uniquement si le rôle a au moins un droit de création :

- super_admin : onglet "Utilisateurs" global avec filtres (diocèse, paroisse, rôle)
- admin_diocese : onglet "Utilisateurs" filtré sur son diocèse (ses `editeur_diocese`, `admin_paroisse`, `editeur_paroisse`)
- admin_paroisse : onglet "Mon équipe" limité aux éditeurs de sa paroisse
- editeur_* : pas de menu utilisateurs

---

## 6. Implémentation — directions techniques

> Cette section cadre les choix, sans descendre au code.

### 6.1 Modèle de données (indications)

```
auth.users               (table Supabase native)
  └─ user_profiles       (FK auth.users.id)
       ├─ role           ('super_admin' | 'editeur_1visible' | 'admin_diocese' | 'editeur_diocese' | 'admin_paroisse' | 'editeur_paroisse')
       ├─ diocese_id     (nullable)
       ├─ paroisse_id    (nullable)
       └─ actif          (boolean, pour soft-delete)

dioceses
  ├─ id, nom, adresse, contact
  └─ statut              ('actif' | 'pause' | 'archivé')

paroisses
  ├─ id, nom, logo_url, adresse, téléphone, email
  ├─ diocese_id          (nullable → paroisse autonome)
  └─ statut              ('actif' | 'pause' | 'archivé')

eglises
  ├─ id, nom, type       ('église' | 'sanctuaire' | 'cathédrale')
  ├─ paroisse_id         (nullable)
  ├─ diocese_id          (nullable)
  └─ statut              ('brouillon' | 'publié' | 'pause' | 'archivé')
```

**Invariants** :
- Un `admin_diocese` ou `editeur_diocese` doit avoir `diocese_id NOT NULL` et `paroisse_id NULL`.
- Un `admin_paroisse` / `editeur_paroisse` doit avoir `paroisse_id NOT NULL`. `diocese_id` est facultatif (dérivable via la paroisse).
- Un `super_admin` / `editeur_1visible` a les deux à `NULL`.
- **Rattachement d'une église** : contrainte CHECK garantissant qu'**au plus une** des deux FK `paroisse_id` / `diocese_id` est renseignée. Si les deux sont `NULL`, l'église est "autonome" et visible uniquement par 1visible (super_admin / editeur_1visible).
- **Cohérence descendante** : si `paroisse_id` est renseigné et que la paroisse a un `diocese_id`, alors `eglises.diocese_id` doit rester `NULL` (on ne duplique pas l'info, elle se lit par jointure). Cette règle est appliquée via trigger ou contrainte fonctionnelle.

### 6.2 Row Level Security (RLS) Supabase

Les règles d'accès doivent être **enforced au niveau BDD** via RLS — pas seulement côté client React. Principe :

- Politique `SELECT` sur `eglises` : l'utilisateur authentifié voit l'église si son rôle + périmètre correspond (jointure sur `user_profiles`).
- Politiques `INSERT` / `UPDATE` : vérifient que l'action est dans le périmètre du rôle.
- Fonctions `SECURITY DEFINER` pour les actions transversales (création user, archivage en cascade).

### 6.3 Journalisation

Toute action de gestion (création user, archivage, changement de rôle, rattachement) est tracée dans une table `audit_log` avec : qui, quand, quoi, sur quoi.

---

## 7. Points ouverts à valider avec le client

1. **Self-service onboarding diocèse ?** En v1 on pose le principe "super_admin crée les admin_diocese manuellement". Le client veut-il un formulaire de demande côté public (avec validation manuelle derrière) ?
2. **Notification des changements** : faut-il notifier le diocèse quand une de ses paroisses publie/dépublie une église ?
3. **Export / portabilité** : en cas de résiliation, une paroisse peut-elle récupérer ses contenus (RGPD) ?
4. **Durée de conservation des archives** : combien de temps garde-t-on les entités archivées avant purge définitive ?
5. **Durée maximale de la pause** : faut-il une bascule automatique en `archivé` au-delà d'un seuil (ex. 90 jours) ou laisser indéfiniment avec alerte dashboard ?

---

## Annexe A — Glossaire

| Terme              | Définition                                                      |
|--------------------|-----------------------------------------------------------------|
| **Diocèse**        | Circonscription ecclésiastique, regroupe des paroisses.          |
| **Paroisse**       | Unité pastorale, regroupe un ou plusieurs clochers.              |
| **Clocher**        | = Église physique. Une paroisse peut en avoir jusqu'à 20-40 en zone rurale. |
| **POI**            | Point d'intérêt (vitrail, statue, tableau…) positionné sur le plan d'une église. |
| **1visible**       | Éditeur du service Visite+. Cliente de l'agence. Détient le rôle super_admin. |
| **Soft-delete**    | Archivage logique : l'entité reste en BDD avec un statut `archivé`, réversible. |
