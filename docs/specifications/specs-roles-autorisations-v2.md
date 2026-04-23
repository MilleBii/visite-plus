# Spécifications — Rôles & Autorisations · Visite+

**Version** : 2.0 · draft
**Date** : 23 avril 2026
**Périmètre** : Back Office web (React) et API Supabase
**Contexte** : Refonte complète du modèle de rôles après simplification. Remplace la v1.0 qui modélisait la hiérarchie ecclésiastique (diocèse → paroisse → clocher) dans le système de droits — approche abandonnée au profit d'un modèle SaaS B2B classique.

---

## 1. Principes directeurs

### 1.1 Le concept central : le "client"

Un **client** est l'unité de rattachement contractuelle et fonctionnelle. Un client peut être de n'importe quel type :

- un **diocèse** (qui signe un contrat global couvrant ses paroisses)
- une **paroisse** (qui souscrit seule, pour ses 1 à N clochers)
- un **sanctuaire** autonome (géré par une communauté ou un ordre religieux)
- une **autre entité** (association, collectivité, établissement scolaire...)

**Le type du client est une simple étiquette**. Il n'impacte ni les droits, ni la structure technique, ni le modèle de permissions.

### 1.2 Architecture des rôles

```
         ┌─────────────────────────────────┐
         │   1visible (éditeur du service) │
         │   super_admin                   │
         │   editeur_1visible              │
         └──────────────┬──────────────────┘
                        │ gère
         ┌──────────────┴──────────────────┐
         │        Client (N clients)       │
         │   admin_client                  │
         │   editeur_client                │
         └──────────────┬──────────────────┘
                        │ édite
         ┌──────────────┴──────────────────┐
         │   Églises (N églises/client)    │
         └─────────────────────────────────┘
```

Un client a :
- un ou plusieurs `admin_client` (gèrent utilisateurs + éditent contenu)
- zéro ou plusieurs `editeur_client` (éditent contenu uniquement)
- une ou plusieurs églises (clochers, sanctuaires, cathédrales)

### 1.3 Règles fondamentales

1. **Un utilisateur = un rôle = un client**. Pas de multi-rattachement en v1.
2. **Pas de hiérarchie entre clients**. Chaque client est indépendant. Si un diocèse regroupe plusieurs paroisses, c'est un choix **contractuel** : le diocèse est un client unique avec beaucoup d'églises. Les paroisses ne sont pas des "sous-clients".
3. **Création d'admin_client réservée au super_admin**. Seul 1visible désigne les admins des clients (onboarding contractuel). **L'admin_client peut ensuite créer ses propres editeur_client** sans intervention de 1visible.
4. **Soft-delete uniquement**. Pas de suppression dure — tout est archivable et restaurable.
5. **Statut `pause` réservé au super_admin**. Cas commercial (arrêt de paiement, suspension).

---

## 2. Catalogue des rôles

| Rôle              | Qui                    | Créé par       | Périmètre              |
|-------------------|------------------------|----------------|------------------------|
| `super_admin`     | 1visible               | bootstrap      | Global                 |
| `editeur_1visible`| 1visible               | super_admin    | Global (pas de users)  |
| `admin_client`    | Client (responsable)   | super_admin    | Son client             |
| `editeur_client`  | Client (ex: bénévole)  | admin_client¹  | Son client             |

¹ Le super_admin peut aussi créer directement des editeur_client lors de l'onboarding, mais le cas nominal est l'auto-gestion par l'admin_client.

### 2.1 Cas d'usage typiques

| Situation                              | Configuration                                                            |
|----------------------------------------|--------------------------------------------------------------------------|
| Diocèse de Lyon signe pour 8 paroisses | 1 client "Diocèse de Lyon" (type: diocese), ~25 églises, 1 admin_client + 3-5 editeur_client |
| Paroisse Saint-Jean souscrit seule     | 1 client "Paroisse St-Jean" (type: paroisse), 3 clochers, 1 admin_client + 1 editeur_client |
| Sanctuaire de Paray (Cté Emmanuel)     | 1 client "Sanctuaire de Paray" (type: sanctuaire), 1 église, 1-2 editeur_client |
| Basilique de Fourvière (diocèse Lyon)  | Rattachée au client "Diocèse de Lyon" avec les autres églises diocésaines |
| Curé muté dans une autre paroisse      | Changement de l'email du compte admin_client OU création d'un nouveau compte et désactivation de l'ancien |

---

## 3. Matrice des autorisations

### 3.1 Gestion des utilisateurs

| Action                             | super_admin | editeur_1visible | admin_client | editeur_client |
|------------------------------------|:-----------:|:----------------:|:------------:|:--------------:|
| Créer `admin_client`               | ✅          | ❌               | ❌           | ❌             |
| Créer `editeur_client` (de son client) | ✅      | ❌               | ✅           | ❌             |
| Modifier un user de son client     | ✅          | ❌               | ✅¹          | ❌             |
| Désactiver/réactiver un user       | ✅          | ❌               | ✅¹          | ❌             |
| Réinitialiser son propre mot de passe | ✅       | ✅               | ✅           | ✅             |

¹ L'admin_client peut modifier/désactiver les `editeur_client` de son client, mais pas les autres `admin_client` (si plusieurs admins cohabitent, seul le super_admin peut les désactiver) ni son propre compte.

### 3.2 Gestion des clients

| Action                   | super_admin | editeur_1visible | admin_client | editeur_client |
|--------------------------|:-----------:|:----------------:|:------------:|:--------------:|
| Voir tous les clients    | ✅          | ✅               | ❌           | ❌             |
| Créer un client          | ✅          | ❌               | ❌           | ❌             |
| Modifier son client      | ✅          | ✅               | ✅           | ❌             |
| Archiver un client       | ✅          | ❌               | ❌           | ❌             |
| Mettre un client en pause | ✅         | ❌               | ❌           | ❌             |

### 3.3 Gestion des églises

| Action                | super_admin | editeur_1visible | admin_client | editeur_client |
|-----------------------|:-----------:|:----------------:|:------------:|:--------------:|
| Voir toutes les églises | ✅        | ✅               | ❌           | ❌             |
| Voir les églises de son client | ✅ | ✅               | ✅           | ✅             |
| Créer une église      | ✅          | ✅               | ✅           | ❌             |
| Modifier une église   | ✅          | ✅               | ✅           | ✅             |
| Publier/dépublier     | ✅          | ✅               | ✅           | ❌³            |
| Mettre en pause/réactiver | ✅      | ❌               | ❌           | ❌             |
| Archiver une église   | ✅          | ✅               | ✅           | ❌             |
| Gérer POI (CRUD)      | ✅          | ✅               | ✅           | ✅             |
| Upload photos/plan    | ✅          | ✅               | ✅           | ✅             |

³ L'editeur_client prépare le contenu, l'admin_client valide la publication.

### 3.4 Gestion de la facturation

| Action                     | super_admin | editeur_1visible | admin_client | editeur_client |
|----------------------------|:-----------:|:----------------:|:------------:|:--------------:|
| Voir statut abonnement     | ✅          | ❌               | ✅           | ❌             |
| Générer une facture        | ✅          | ❌               | ❌           | ❌             |
| Voir historique facturation | ✅         | ❌               | ✅           | ❌             |

---

## 4. Règles métier détaillées

### 4.1 Création des comptes

**Deux parcours de création coexistent** :

**Parcours 1 — Onboarding d'un nouveau client** (super_admin) :
1. Le super_admin crée le client (nom, type, contact, adresse).
2. Le super_admin crée le(s) compte(s) `admin_client` — désigné(s) contractuellement par le client.
3. Un email d'invitation est envoyé avec un lien de définition de mot de passe (expire à 7 jours).
4. À la première connexion, l'admin_client accepte les CGU.

**Parcours 2 — Invitation d'un bénévole par l'admin_client** (auto-gestion) :
1. L'admin_client se connecte au BO et va dans "Mon équipe".
2. Il saisit prénom, nom, email du futur `editeur_client`.
3. Le système envoie l'email d'invitation.
4. Le nouvel utilisateur définit son mot de passe, accepte les CGU et accède à son BO.
5. L'admin_client n'a jamais besoin de contacter 1visible pour gérer son équipe.

**Gestion des mots de passe — déléguée à Supabase Auth** :

Visite+ ne stocke jamais de mots de passe en clair et ne développe pas de mécanique de reset custom.

- **Invitation** : `supabase.auth.admin.inviteUserByEmail()` via Edge Function (service role key sécurisée serveur)
- **Mot de passe oublié** : `supabase.auth.resetPasswordForEmail()` — déclenchable par l'utilisateur lui-même ou par un admin
- **SMTP custom** obligatoire (Resend, Postmark) pour domaine expéditeur `noreply@visite-plus.fr` et quotas adaptés au volume
- **Templates emails** personnalisés en français et anglais, différenciés selon le parcours (onboarding vs invitation bénévole)

### 4.2 Statuts d'une église

4 statuts possibles. La visibilité côté visiteur dépend **à la fois** du statut de l'église et du statut de son client.

| Statut      | Visible côté visiteur ?                | Qui positionne          |
|-------------|:--------------------------------------:|-------------------------|
| `brouillon` | ❌                                     | Par défaut à la création |
| `publié`    | ✅ (si client `actif`)                 | admin_client, admin_1visible, super_admin |
| `pause`     | ❌                                     | super_admin uniquement  |
| `archivé`   | ❌                                     | admin_client, admin_1visible, super_admin |

**Transitions autorisées** :

```
brouillon ──publier──▶ publié ──dépublier──▶ brouillon
                           │
                           │ super_admin
                           ▼
                         pause ──réactiver──▶ publié

[tout statut] ──archiver──▶ archivé ──restaurer──▶ brouillon
```

### 4.3 Statuts d'un client

| Statut    | Conséquence                                                           |
|-----------|----------------------------------------------------------------------|
| `actif`   | Églises visibles selon leur statut individuel                        |
| `pause`   | **Toutes les églises du client sont masquées côté visiteur**, quel que soit leur statut individuel. Les utilisateurs du client ne peuvent plus rien modifier. |
| `archivé` | Client fermé. Églises archivées automatiquement. Utilisateurs désactivés. |

**Propagation de la pause** :
- Un client en `pause` masque toutes ses églises, sans modifier leur statut individuel.
- À la réactivation, chaque église retrouve son statut (brouillon reste brouillon, publié redevient visible).
- Une église individuellement en `pause` reste en pause même si son client est réactivé — le statut individuel prime.

### 4.4 Soft-delete

Aucune suppression dure. Tout est archivable.

| Entité archivée | Conséquence                                              | Restaurable par |
|-----------------|----------------------------------------------------------|-----------------|
| Client          | Toutes ses églises → archivées. Utilisateurs → désactivés | super_admin     |
| Église          | POI conservés, masquée du front public                   | admin_client ou au-dessus |
| Utilisateur     | Compte désactivé (login bloqué), données conservées      | super_admin ou créateur |

### 4.5 Cas limites

- **Rétrogradation d'un admin_client en editeur_client** : impossible directement. Procédure = créer un nouveau compte editeur_client, désactiver l'ancien.
- **Dernier admin_client d'un client** : avant désactivation du dernier admin_client d'un client, le super_admin doit désigner un remplaçant ou archiver le client.
- **Auto-désactivation** : un utilisateur ne peut pas désactiver son propre compte.
- **Changement de client pour une église** : action super_admin uniquement (cas de réorganisation contractuelle, ex. une paroisse qui rejoint un diocèse).
- **Changement d'email d'un utilisateur** : possible sans recréer le compte (utile en cas de mutation d'un curé qui conserve son rôle sur un même client).

---

## 5. Vues et navigation

### 5.1 Vue par défaut après login

| Rôle              | Vue par défaut                                              |
|-------------------|-------------------------------------------------------------|
| super_admin       | Tableau de bord global : tous les clients + alertes + stats |
| editeur_1visible  | Tableau de bord global : tous les clients + toutes les églises |
| admin_client      | Tableau de bord de son client : ses églises + son équipe    |
| editeur_client    | Liste simple : les églises qu'il peut éditer                |

### 5.2 Menu de navigation

Affiché selon les droits du rôle :

- **super_admin** : Clients · Églises · Utilisateurs · Audit · Facturation
- **editeur_1visible** : Clients · Églises
- **admin_client** : Mon espace · Mes églises · Mon équipe · Facturation
- **editeur_client** : Mes églises (pas de menu, juste la liste)

### 5.3 Interface de l'editeur_client

Pensée pour un bénévole responsable com — profil attendu : retraité à l'aise avec un ordinateur mais pas technophile, qui se connecte occasionnellement.

Principe : **le moins d'options possible**. Pas de dashboard, pas de stats, pas de onglets multiples. Une liste d'églises, un bouton "Modifier" par église.

---

## 6. Implémentation — directions techniques

### 6.1 Modèle de données

```
auth.users                  (table Supabase native)
  └─ user_profiles          (FK auth.users.id)
       ├─ role              ('super_admin' | 'editeur_1visible' | 'admin_client' | 'editeur_client')
       ├─ client_id         (FK clients.id — NULL pour rôles 1visible)
       ├─ prenom, nom
       └─ actif             (boolean — soft-delete)

clients
  ├─ id, nom
  ├─ type                   ('diocese' | 'paroisse' | 'sanctuaire' | 'autre')
  ├─ adresse, telephone, email_contact, logo_url
  └─ statut                 ('actif' | 'pause' | 'archivé')

eglises
  ├─ id, nom
  ├─ type                   ('église' | 'sanctuaire' | 'cathédrale')
  ├─ client_id              (FK clients.id — NOT NULL)
  ├─ adresse, latitude, longitude, photo_facade, plan_image
  └─ statut                 ('brouillon' | 'publié' | 'pause' | 'archivé')

pois
  └─ eglise_id              (FK eglises.id — NOT NULL)

contrats
  ├─ id, client_id (FK)
  ├─ montant, date_debut, date_fin
  └─ statut                 ('actif' | 'echu' | 'resilie')

audit_log
  ├─ id, user_id, action
  ├─ entity_type, entity_id
  ├─ motif, created_at
  └─ metadata JSONB
```

**Invariants** :
- `super_admin` et `editeur_1visible` : `client_id = NULL`
- `admin_client` et `editeur_client` : `client_id NOT NULL`
- Une église appartient toujours à exactement un client (`client_id NOT NULL`)

### 6.2 Row Level Security (RLS) Supabase

Radicalement plus simple que la v1 grâce à l'abstraction `client` :

**Helper functions** :
```sql
create function my_role() returns text ...
create function my_client_id() returns integer ...
```

**Politique type pour `eglises`** :
```sql
-- Lecture publique : église publiée ET client actif
create policy "eglises_select_public" on eglises for select
using (
  statut = 'publié'
  and exists (
    select 1 from clients
    where clients.id = eglises.client_id and clients.statut = 'actif'
  )
);

-- Écriture : super_admin OU utilisateur du client
create policy "eglises_edit" on eglises for all
using (
  my_role() in ('super_admin', 'editeur_1visible')
  or eglises.client_id = my_client_id()
);
```

C'est **une seule règle de jointure**, contre ~18 politiques dans la v1.

### 6.3 Journalisation

Toute action structurante est tracée dans `audit_log` : création/désactivation user, mise en pause, archivage, transfert d'église, publication.

---

## 7. Points ouverts à valider avec le client

1. **Workflow de publication** : l'editeur_client peut-il publier directement, ou il soumet à l'admin_client pour validation ? Hypothèse retenue : validation par l'admin_client (cf. note 3 dans § 3.3).

2. **Qui fait la saisie initiale** ? Si c'est 1visible (modèle actuel), les editeur_client interviennent uniquement pour enrichir/maintenir. Si c'est le client directement, il faut des outils de saisie beaucoup plus guidés et un parcours d'onboarding.

3. **Durée maximale de la pause** : bascule automatique vers `archivé` après X jours, ou pause indéfinie avec alerte dashboard ?

4. **Export RGPD** : un client qui résilie peut-il récupérer ses données ?

5. **Durée de conservation des archives** : combien de temps avant purge définitive ?

6. **Upload mobile** : un bénévole qui fait le tour de son église doit pouvoir uploader des photos depuis son smartphone. Interface responsive suffisante ou app dédiée nécessaire ?

7. **Plusieurs admin_client possibles pour un même client** : utile si un diocèse veut désigner 2-3 admins pour redondance, mais complique le cas "dernier admin". Hypothèse retenue : oui, plusieurs admin_client cohabitent (pas de limite), seul le super_admin peut en désactiver.

---

## Annexe A — Glossaire

| Terme            | Définition                                                             |
|------------------|-----------------------------------------------------------------------|
| **Client**       | Entité contractuelle (diocèse, paroisse, sanctuaire...) qui souscrit au service. Unité de rattachement des utilisateurs et des églises. |
| **Église**       | Bâtiment (clocher, sanctuaire, cathédrale) visitable. Toujours rattaché à exactement un client. |
| **POI**          | Point d'intérêt (vitrail, statue, tableau...) positionné sur le plan d'une église. |
| **1visible**     | Éditeur du service Visite+. Détient les rôles `super_admin` et `editeur_1visible`. |
| **Soft-delete**  | Archivage logique : l'entité reste en BDD avec un statut `archivé`, réversible. |

---

## Annexe B — Migration depuis la v1

Pour information, principales différences avec la v1 :

| v1 | v2 |
|----|----|
| Tables `dioceses`, `paroisses` séparées | Table `clients` unifiée avec champ `type` |
| 6 rôles (`admin_diocese`, `editeur_diocese`, `admin_paroisse`, `editeur_paroisse`...) | 4 rôles (`admin_client`, `editeur_client` + les 2 rôles 1visible) |
| 3 voies de rattachement d'une église (paroisse/diocèse/1visible) | 1 seule voie : `client_id` |
| Hiérarchie descendante (N crée N-1) | Pas de hiérarchie, création centralisée par super_admin en v1 |
| Contraintes CHECK + triggers de cohérence | FK simples |
| ~18 politiques RLS pour les églises | 2 politiques RLS pour les églises |

Le modèle v1 n'a pas été implémenté — la refonte intervient avant tout développement.
