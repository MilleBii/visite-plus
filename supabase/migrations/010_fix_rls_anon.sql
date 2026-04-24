-- Migration 010 — Correctif RLS : anon ne peut pas lire la table clients
-- Problème : eglises_select_public, pois_select_public et evenements_select_public
-- font un subquery sur clients. Comme anon n'a aucune policy sur clients,
-- le subquery retourne 0 rows → l'app Flutter ne voit rien.
-- Fix : fonctions security definer qui bypassen le RLS sur clients.

-- ==============================================================================
-- FONCTIONS HELPER security definer
-- ==============================================================================

create or replace function public.client_est_actif(p_client_id integer)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from clients where id = p_client_id and statut = 'actif'
  )
$$;

create or replace function public.eglise_est_visible(p_eglise_id integer)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from eglises e
    join clients c on c.id = e.client_id
    where e.id = p_eglise_id
      and e.statut = 'publié'
      and c.statut = 'actif'
  )
$$;

-- ==============================================================================
-- RECRÉER LES POLICIES PUBLIQUES (anon) sans subquery direct sur clients
-- ==============================================================================

drop policy if exists "eglises_select_public" on public.eglises;
create policy "eglises_select_public" on public.eglises
  for select to anon
  using (statut = 'publié' and client_est_actif(client_id));

drop policy if exists "pois_select_public" on public.pois;
create policy "pois_select_public" on public.pois
  for select to anon
  using (eglise_est_visible(eglise_id));

drop policy if exists "evenements_select_public" on public.evenements;
create policy "evenements_select_public" on public.evenements
  for select to anon
  using (eglise_est_visible(eglise_id));
