# Plan d'implémentation — Rôles & Autorisations

**Référence spec** : [specs-roles-autorisations-v2.md](specs-roles-autorisations-v2.md)  
**Date de mise à jour** : 2026-04-23  
**Branche** : main

> **Refonte v2** : Le modèle hiérarchique diocèse/paroisse est abandonné. La v1 n'a jamais été appliquée en BDD — les fichiers `001–004` dans `supabase/migrations/` sont à remplacer intégralement.

---

## 1. Situation actuelle (baseline)

| Élément | État |
|---------|------|
| Authentification | ❌ Aucune — accès anonyme uniquement |
| Back Office | ❌ Non sécurisé — toute mutation possible |
| Table `clients` | ❌ Inexistante |
| Table `user_profiles` | ❌ Inexistante |
| Migrations v1 (`001–004`) | ⚠️ Fichiers écrits, jamais appliqués — à supprimer |
| RLS | ⚠️ Lecture publique uniquement (5 politiques SELECT) |
| Statut `eglises` | `brouillon \| publié` — manquent `pause` et `archivé` |
| Routing React | ⚠️ `useState` uniquement — pas d'URL routing |
| Flutter | ✅ Pas impacté (visibilité déjà sur `statut = 'publié'`) |

---

## 2. Analyse d'impact par couche

### 2.1 Supabase / Base de données — Impact MAJEUR

**Nouvelles tables :**

| Table | Colonnes clés | Notes |
| ----- | ------------- | ----- |
| `clients` | `id`, `nom`, `type`, `statut`, `adresse`, `email_contact`, `logo_url` | type : `diocese \| paroisse \| sanctuaire \| autre` ; statut : `actif \| pause \| archivé` |
| `user_profiles` | `user_id → auth.users`, `role`, `client_id` (nullable), `prenom`, `nom`, `actif` | `client_id = NULL` pour rôles 1visible |
| `contrats` | `id`, `client_id`, `montant`, `date_debut`, `date_fin`, `statut` | statut : `actif \| echu \| resilie` |
| `audit_log` | `id`, `user_id`, `action`, `entity_type`, `entity_id`, `motif`, `metadata JSONB` | append-only |

**Table `eglises` modifiée :**
- Supprimer `paroisse_id` et `diocese_id` (jamais appliqués)
- `+ client_id integer references clients(id) NOT NULL`
- `statut` : ajouter valeurs `pause` et `archivé`
- Trigger `check_eglise_statut_transition` — machine à états BDD

**RLS — radicalement simplifié :**
- 2 helpers : `my_role()` et `my_client_id()`
- 2 politiques pour `eglises` (contre ~18 en v1) : lecture publique + écriture BO
- Politiques `clients` et `user_profiles` par rôle

### 2.2 React BO — Impact MAJEUR (greenfield)

**Ce qui existe :** `TableauDeBord.jsx`, `EditeurEglise.jsx`, `OngletPlan.jsx` (non sécurisés)

**Ce qui manque :**

| Élément | Complexité |
|---------|-----------|
| Page login + flow invitation (lien 7 jours, CGU) | Moyenne |
| `AuthContext` avec `role` et `clientId` | Faible |
| Passage de `useState` à React Router v6 | Moyenne |
| 4 dashboards différenciés par rôle | Moyenne |
| UI gestion utilisateurs (invitation, désactivation) | Élevée |
| Section "Mon équipe" pour `admin_client` | Moyenne |
| Contrôles de permission inline (boutons conditionnels) | Moyenne |
| Machine à états église (boutons publier/archiver/pause) | Moyenne |
| Badge "En pause — contactez 1visible" + blocage édition | Faible |
| Module facturation (lecture seule v1) | Faible |

### 2.3 Flutter — Impact FAIBLE

- Ajouter la page "Cette visite est temporairement indisponible" (`statut = 'pause'`)
- La cascade pause client → églises masquées est gérée par RLS — rien à changer en app

---

## 3. Zones de risque

| Risque | Sévérité | Mitigation |
|--------|----------|-----------|
| Données de test `eglises` sans `client_id` | Faible | Créer un client de test, rattacher les données existantes via `UPDATE` |
| Edge Function `invite-user` avec service role key | Élevée | Ne jamais exposer côté client — passer par Edge Function. À créer avant Phase 4 |
| Trigger statut — conflit avec mutations directes | Moyenne | Le BO React ne change jamais `statut` directement, toujours via RPC |
| Dernier `admin_client` d'un client (spec §4.5) | Faible | Guard côté React + message explicite, pas bloqué en BDD en v1 |
| SMTP custom obligatoire (spec §4.1) | Moyenne | Configurer Resend/Postmark avant Phase 4 — sinon les invitations ne partent pas |

---

## 4. Plan d'implémentation

### Phase 0 — Nettoyage migrations v1 (≈ 1h)

- [ ] Supprimer les fichiers `001_hierarchy_tables.sql`, `002_alter_eglises.sql`, `003_audit_and_functions.sql`, `004_rls_complete.sql`
- [ ] Vérifier en SQL Editor Supabase qu'aucune de ces migrations n'a été appliquée (tables `dioceses`, `paroisses` absentes)

---

### Phase 1 — BDD v2 (≈ 6h)

| Fichier | Contenu |
|---------|---------|
| `001_clients.sql` | Table `clients` + trigger `updated_at` |
| `002_user_profiles.sql` | Table `user_profiles` + contraintes CHECK (`client_id NULL` ↔ rôles 1visible) |
| `003_alter_eglises.sql` | Ajouter `client_id NOT NULL`, ajouter valeurs statut `pause`/`archivé`, trigger machine à états |
| `004_contrats_audit.sql` | Tables `contrats` et `audit_log` |
| `005_rls.sql` | Helpers `my_role()` / `my_client_id()`, réécriture RLS complet (public + BO) |

**Politiques RLS cibles pour `eglises` (extraites des specs §6.2) :**
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

-- Écriture BO : super_admin / editeur_1visible globalement, ou utilisateur du même client
create policy "eglises_edit" on eglises for all
using (
  my_role() in ('super_admin', 'editeur_1visible')
  or eglises.client_id = my_client_id()
);
```

**À exécuter dans l'ordre dans le SQL Editor Supabase.** Vérifier après chaque fichier avant de passer au suivant.

---

### Phase 2 — Auth React (≈ 5h)

- [ ] Installer `@supabase/auth-ui-react` (ou page login custom)
- [ ] Créer `AuthContext` : expose `user`, `role`, `clientId` via `user_profiles`
- [ ] `PrivateRoute` : redirect vers `/login` si non authentifié
- [ ] Page `/bo/login` : formulaire email/password Supabase
- [ ] Page `/bo/invite` : paramètre `token_hash` → "Définir mon mot de passe" → accepter CGU
- [ ] Passer le routing de `useState` à `react-router-dom` v6

**Routes cibles BO :**
```
/bo/login
/bo/invite
/bo/dashboard          ← redirige vers vue par rôle
/bo/clients            ← super_admin / editeur_1visible uniquement
/bo/clients/:id
/bo/eglises
/bo/eglises/:id
/bo/utilisateurs       ← super_admin uniquement
/bo/equipe             ← admin_client : gestion de ses editeur_client
```

---

### Phase 3 — Dashboards par rôle (≈ 6h)

Un composant `DashboardRouter` lit le rôle depuis `AuthContext` et rend la vue appropriée (spec §5.1) :

| Rôle | Vue par défaut |
|------|---------------|
| `super_admin` | Tableau de bord global : tous les clients + alertes + stats |
| `editeur_1visible` | Tableau de bord global : tous les clients + toutes les églises |
| `admin_client` | Tableau de bord de son client : ses églises + son équipe |
| `editeur_client` | Liste simple : les églises qu'il peut éditer (pas de dashboard) |

Menu conditionnel par rôle (spec §5.2) :
- **super_admin** : Clients · Églises · Utilisateurs · Audit · Facturation
- **editeur_1visible** : Clients · Églises
- **admin_client** : Mon espace · Mes églises · Mon équipe · Facturation
- **editeur_client** : Mes églises (liste directe, sans menu)

---

### Phase 4 — Gestion utilisateurs (≈ 8h)

**Prérequis** : Edge Function `invite-user` + SMTP custom (Resend/Postmark) configurés.

- [ ] Vue `super_admin` : tableau utilisateurs global avec filtres (rôle, client, statut)
- [ ] Vue `admin_client` : section "Mon équipe" — liste de ses `editeur_client`
- [ ] Formulaire invitation :
  - `super_admin` → crée `admin_client` (prénom, nom, email, client de rattachement)
  - `admin_client` → crée `editeur_client` de son client (prénom, nom, email)
  - Appelle Edge Function `invite-user` → `supabase.auth.admin.inviteUserByEmail()` + `create_user_profile()` RPC
- [ ] Action "Désactiver" → `UPDATE user_profiles SET actif = false`
- [ ] Action "Relancer invitation"
- [ ] Guard "dernier admin_client" : alerte avant désactivation (requête React)
- [ ] Blocage auto-désactivation (spec §4.5 : un user ne peut pas désactiver son propre compte)

**Deux templates emails à créer** (spec §4.1) :
- Onboarding client (super_admin invite un admin_client)
- Invitation bénévole (admin_client invite un editeur_client)

---

### Phase 5 — Machine à états église & audit (≈ 5h)

- [ ] Boutons conditionnels selon rôle + statut :
  - `brouillon` → [Publier] pour `admin_client` et au-dessus
  - `publié` → [Dépublier] / [Archiver] pour `admin_client` et au-dessus
  - `archivé` → [Restaurer] pour `admin_client` et au-dessus
  - `pause` → badge "En pause — contactez 1visible" + blocage édition (non-super_admin)
- [ ] `editeur_client` : aucun bouton de changement de statut (spec §3.3 note 3)
- [ ] Toutes les transitions passent par RPC — jamais un UPDATE direct sur `statut`
- [ ] Gestion statut client : pause/réactivation d'un client masque/démasque toutes ses églises sans modifier leurs statuts individuels (spec §4.3)
- [ ] Vue historique audit pour `super_admin` (`audit_log`)

---

### Phase 6 — Flutter (≈ 2h)

- [ ] Détecter `statut = 'pause'` sur `AccueilScreen`
- [ ] Afficher page "Cette visite est temporairement indisponible" avec retour carte
- [ ] La cascade client en `pause` est transparente (RLS serveur) — aucune autre modif

---

### Phase 7 — Recette (≈ 4h)

Créer 4 comptes de test (un par rôle), rattachés à un client de test avec 2-3 églises :

- [ ] Vérifier chaque rôle voit exactement ce que la spec dit (§5.1)
- [ ] Tester les cas limites §4.5 (dernier admin_client, auto-désactivation, changement d'email)
- [ ] Valider la cascade pause client → toutes ses églises invisibles côté Flutter
- [ ] Valider archivage client → ses églises archivées, ses utilisateurs désactivés
- [ ] Vérifier que `editeur_client` ne peut pas publier (bouton absent)
- [ ] Vérifier que `admin_client` ne peut pas voir les autres clients

---

## 5. Estimation

| Phase | Effort estimé |
|-------|--------------|
| 0 — Nettoyage migrations v1 | 1h |
| 1 — BDD v2 | 6h |
| 2 — Auth React | 5h |
| 3 — Dashboards | 6h |
| 4 — Gestion users | 8h |
| 5 — Statuts & audit | 5h |
| 6 — Flutter | 2h |
| 7 — Recette | 4h |
| **Total** | **37h** |

Avec l'IA sur les phases 1-3 (migrations, boilerplate auth, composants) → **~26h réelles**.

---

## 6. Points ouverts (à valider client — spec §7)

1. **Workflow de publication** : l'`editeur_client` prépare, l'`admin_client` publie — confirmé en spec §3.3 note 3. À valider avec le client.
2. **Qui fait la saisie initiale** : 1visible (modèle actuel) ou le client directement ? Impact fort sur l'UX de l'onboarding.
3. **Durée maximale de la pause** : bascule automatique vers `archivé` après X jours, ou pause indéfinie avec alerte dashboard ?
4. **Export RGPD** : un client qui résilie peut-il récupérer ses données ?
5. **Durée de conservation des archives** : purge définitive après combien de temps ?
6. **Upload mobile** : interface responsive suffisante ou app dédiée pour les photos de bénévoles ?
7. **Plusieurs `admin_client`** : limite ou pas ? Hypothèse retenue : pas de limite, seul le super_admin peut en désactiver un.
