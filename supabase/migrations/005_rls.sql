-- Migration 005 — Row Level Security v2 (modèle client unifié)
-- Remplace toutes les politiques existantes.
-- Dépend de : 001, 002, 003, 004

-- ==============================================================================
-- SUPPRIMER LES ANCIENNES POLITIQUES
-- ==============================================================================

drop policy if exists "eglises_select_public"   on public.eglises;
drop policy if exists "eglises_select_bo"        on public.eglises;
drop policy if exists "eglises_insert_bo"        on public.eglises;
drop policy if exists "eglises_update_bo"        on public.eglises;
drop policy if exists "pois_select_public"       on public.pois;
drop policy if exists "pois_bo"                  on public.pois;
drop policy if exists "evenements_select_public" on public.evenements;
drop policy if exists "evenements_bo"            on public.evenements;
drop policy if exists "questions_select_public"  on public.questions;
drop policy if exists "questions_bo"             on public.questions;
drop policy if exists "stats_vues_select_public" on public.stats_vues;
drop policy if exists "stats_vues_select"        on public.stats_vues;

-- ==============================================================================
-- ACTIVER RLS SUR LES NOUVELLES TABLES
-- ==============================================================================

alter table public.dioceses      enable row level security;
alter table public.clients       enable row level security;
alter table public.user_profiles enable row level security;
alter table public.contrats      enable row level security;

-- ==============================================================================
-- FONCTIONS HELPER (security definer — utilisées dans les politiques RLS)
-- ==============================================================================

create or replace function public.my_role()
returns text language sql stable security definer
set search_path = public as $$
  select role from user_profiles
  where user_id = auth.uid() and actif = true
$$;

create or replace function public.my_client_id()
returns integer language sql stable security definer
set search_path = public as $$
  select client_id from user_profiles
  where user_id = auth.uid() and actif = true
$$;

-- ==============================================================================
-- TABLE : dioceses (référence — lecture publique, pas d'écriture via BO)
-- ==============================================================================

create policy "dioceses_select_all" on public.dioceses
  for select using (true);

-- ==============================================================================
-- TABLE : clients
-- ==============================================================================

-- Lecture : super_admin/editeur_1visible voient tout ; les rôles client voient leur client
create policy "clients_select" on public.clients
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or id = my_client_id()
  );

-- Création : super_admin uniquement
create policy "clients_insert" on public.clients
  for insert to authenticated
  with check (my_role() = 'super_admin');

-- Modification : super_admin/editeur_1visible global ; admin_client son propre client
create policy "clients_update" on public.clients
  for update to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_client' and id = my_client_id())
  );

-- ==============================================================================
-- TABLE : user_profiles
-- ==============================================================================

-- Chacun voit son propre profil
create policy "user_profiles_select_own" on public.user_profiles
  for select to authenticated
  using (user_id = auth.uid());

-- super_admin voit tous les profils
create policy "user_profiles_select_super" on public.user_profiles
  for select to authenticated
  using (my_role() = 'super_admin');

-- admin_client voit les profils de son client
create policy "user_profiles_select_client" on public.user_profiles
  for select to authenticated
  using (
    my_role() = 'admin_client'
    and client_id = my_client_id()
  );

-- INSERT/UPDATE passent par la Edge Function invite-user (service role key)
-- Pas de politique INSERT/UPDATE directe pour les utilisateurs authentifiés.

-- ==============================================================================
-- TABLE : eglises
-- ==============================================================================

-- Visiteurs anonymes : publiée + client actif
create policy "eglises_select_public" on public.eglises
  for select to anon
  using (
    statut = 'publié'
    and exists (
      select 1 from clients
      where clients.id = eglises.client_id
        and clients.statut = 'actif'
    )
  );

-- BO — lecture : rôles globaux voient tout ; rôles client voient leur périmètre
create policy "eglises_select_bo" on public.eglises
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or client_id = my_client_id()
  );

-- BO — insertion : super_admin, editeur_1visible, admin_client (pas editeur_client)
create policy "eglises_insert_bo" on public.eglises
  for insert to authenticated
  with check (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_client' and client_id = my_client_id())
  );

-- BO — mise à jour : le trigger statut gère les restrictions par rôle
create policy "eglises_update_bo" on public.eglises
  for update to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or client_id = my_client_id()
  )
  with check (
    my_role() in ('super_admin', 'editeur_1visible')
    or client_id = my_client_id()
  );

-- Pas de DELETE direct — archivage via set_eglise_statut('archivé')

-- ==============================================================================
-- TABLE : pois
-- ==============================================================================

create policy "pois_select_public" on public.pois
  for select to anon
  using (
    exists (
      select 1 from eglises e
      join clients c on c.id = e.client_id
      where e.id = pois.eglise_id
        and e.statut = 'publié'
        and c.statut = 'actif'
    )
  );

create policy "pois_bo" on public.pois
  for all to authenticated
  using (
    exists (
      select 1 from eglises e
      where e.id = pois.eglise_id
        and (
          my_role() in ('super_admin', 'editeur_1visible')
          or e.client_id = my_client_id()
        )
    )
  );

-- ==============================================================================
-- TABLE : evenements
-- ==============================================================================

create policy "evenements_select_public" on public.evenements
  for select to anon
  using (
    exists (
      select 1 from eglises e
      join clients c on c.id = e.client_id
      where e.id = evenements.eglise_id
        and e.statut = 'publié'
        and c.statut = 'actif'
    )
  );

create policy "evenements_bo" on public.evenements
  for all to authenticated
  using (
    exists (
      select 1 from eglises e
      where e.id = evenements.eglise_id
        and (
          my_role() in ('super_admin', 'editeur_1visible')
          or e.client_id = my_client_id()
        )
    )
  );

-- ==============================================================================
-- TABLE : questions
-- ==============================================================================

create policy "questions_select_public" on public.questions
  for select to anon
  using (true);

create policy "questions_bo" on public.questions
  for all to authenticated
  using (my_role() in ('super_admin', 'editeur_1visible'));

-- ==============================================================================
-- TABLE : stats_vues
-- ==============================================================================

create policy "stats_vues_select" on public.stats_vues
  for select using (true);

-- ==============================================================================
-- TABLE : contrats (super_admin uniquement — pas d'interface BO en v1)
-- ==============================================================================

create policy "contrats_select" on public.contrats
  for select to authenticated
  using (my_role() = 'super_admin');

create policy "contrats_write" on public.contrats
  for all to authenticated
  using (my_role() = 'super_admin')
  with check (my_role() = 'super_admin');
