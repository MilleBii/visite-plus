-- Migration 003 — Altérer eglises : client_id + statuts étendus + machine à états
-- Dépend de : 001_clients.sql (clients, set_updated_at)
-- Données existantes : rattachées à un client de test créé ici.

-- ==============================================================================
-- 1. Ajouter client_id (nullable d'abord pour la migration des données existantes)
-- ==============================================================================

alter table public.eglises
  add column client_id integer references public.clients(id);

-- ==============================================================================
-- 2. Créer le client de test et rattacher les données existantes
-- ==============================================================================

do $$
declare
  v_client_id integer;
begin
  insert into public.clients (nom, type, statut)
  values ('1visible — données de test', 'autre', 'actif')
  returning id into v_client_id;

  update public.eglises set client_id = v_client_id where client_id is null;
end;
$$;

-- ==============================================================================
-- 3. Rendre client_id obligatoire
-- ==============================================================================

alter table public.eglises alter column client_id set not null;

-- ==============================================================================
-- 4. Étendre la contrainte statut (ajouter pause et archivé)
-- ==============================================================================

alter table public.eglises drop constraint if exists eglises_statut_check;
alter table public.eglises
  add constraint eglises_statut_check
  check (statut in ('brouillon', 'publié', 'pause', 'archivé'));

-- ==============================================================================
-- 5. Indexes
-- ==============================================================================

create index idx_eglises_client_id on public.eglises (client_id);
create index if not exists idx_eglises_statut on public.eglises (statut);

-- ==============================================================================
-- 6. Trigger : machine à états (transitions autorisées, spec §4.2)
-- ==============================================================================

create or replace function public.check_eglise_statut_transition()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_role text;
begin
  if OLD.statut = NEW.statut then return NEW; end if;

  select role into v_role
  from user_profiles
  where user_id = auth.uid() and actif = true;

  -- pause réservée super_admin (dans les deux sens)
  if NEW.statut = 'pause' or OLD.statut = 'pause' then
    if v_role is distinct from 'super_admin' then
      raise exception 'Seul le super_admin peut gérer la mise en pause (rôle actuel : %)', v_role;
    end if;
  end if;

  -- editeur_client : aucun changement de statut autorisé
  if v_role = 'editeur_client' then
    raise exception 'Les éditeurs ne peuvent pas modifier le statut d''une église';
  end if;

  -- Transitions valides (hors pause, déjà traitée)
  if not (
    (OLD.statut = 'brouillon' and NEW.statut = 'publié')   or
    (OLD.statut = 'publié'    and NEW.statut = 'brouillon') or
    (NEW.statut = 'archivé')                                or
    (OLD.statut = 'archivé'   and NEW.statut = 'brouillon') or
    (OLD.statut = 'pause'     and NEW.statut = 'publié')
  ) then
    raise exception 'Transition de statut non autorisée : % → %', OLD.statut, NEW.statut;
  end if;

  return NEW;
end;
$$;

create trigger tg_eglise_statut_transition
  before update of statut on public.eglises
  for each row execute function public.check_eglise_statut_transition();

-- ==============================================================================
-- 7. Fonction RPC : changer le statut d'une église (appelée depuis le BO React)
-- Toutes les transitions passent par ici — jamais un UPDATE direct sur statut.
-- ==============================================================================

create or replace function public.set_eglise_statut(
  p_eglise_id integer,
  p_statut    text,
  p_motif     text default null
)
returns void language plpgsql security definer
set search_path = public as $$
declare
  v_role      text;
  v_client_id integer;
begin
  select role, client_id into v_role, v_client_id
  from user_profiles
  where user_id = auth.uid() and actif = true;

  if v_role is null then
    raise exception 'Utilisateur non authentifié ou inactif';
  end if;

  -- Vérifier le périmètre (les rôles client ne peuvent agir que sur leur client)
  if v_role in ('admin_client', 'editeur_client') then
    if not exists (
      select 1 from eglises where id = p_eglise_id and client_id = v_client_id
    ) then
      raise exception 'Cette église n''appartient pas à votre client';
    end if;
  end if;

  -- Le trigger check_eglise_statut_transition valide les transitions et les droits pause
  update eglises set statut = p_statut where id = p_eglise_id;
end;
$$;

grant execute on function public.set_eglise_statut(integer, text, text) to authenticated;
