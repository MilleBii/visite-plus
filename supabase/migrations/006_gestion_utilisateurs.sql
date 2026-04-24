-- Migration 006 — Gestion utilisateurs (désactivation, guard dernier admin)

-- ==============================================================================
-- RPC : desactiver_utilisateur
-- Passe user_profiles.actif = false.
-- Interdit si c'est le dernier admin_client actif du client.
-- ==============================================================================

create or replace function public.desactiver_utilisateur(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare
  v_appelant_role   text;
  v_appelant_client integer;
  v_cible_role      text;
  v_cible_client    integer;
  v_nb_admins       integer;
begin
  -- Rôle de l'appelant
  select role, client_id
    into v_appelant_role, v_appelant_client
    from user_profiles
   where user_id = auth.uid() and actif = true;

  if v_appelant_role is null then
    raise exception 'Non autorisé';
  end if;

  -- Profil de la cible
  select role, client_id
    into v_cible_role, v_cible_client
    from user_profiles
   where user_id = p_user_id;

  if v_cible_role is null then
    raise exception 'Utilisateur introuvable';
  end if;

  -- Permissions : super_admin peut tout ; admin_client peut désactiver son équipe
  if v_appelant_role = 'admin_client' then
    if v_cible_client is distinct from v_appelant_client then
      raise exception 'Droits insuffisants';
    end if;
    if v_cible_role in ('super_admin', 'editeur_1visible') then
      raise exception 'Droits insuffisants';
    end if;
  elsif v_appelant_role not in ('super_admin', 'editeur_1visible') then
    raise exception 'Droits insuffisants';
  end if;

  -- Guard : dernier admin_client actif du client
  if v_cible_role = 'admin_client' then
    select count(*)
      into v_nb_admins
      from user_profiles
     where role = 'admin_client'
       and client_id = v_cible_client
       and actif = true
       and user_id != p_user_id;

    if v_nb_admins = 0 then
      raise exception 'Impossible de désactiver le dernier administrateur du client';
    end if;
  end if;

  -- Désactiver
  update user_profiles
     set actif = false
   where user_id = p_user_id;
end;
$$;

-- Permission d'appel pour les utilisateurs authentifiés
grant execute on function public.desactiver_utilisateur(uuid) to authenticated;

-- ==============================================================================
-- Colonne prenom/nom sur user_profiles si absente
-- ==============================================================================

alter table public.user_profiles
  add column if not exists prenom text,
  add column if not exists nom    text;

-- ==============================================================================
-- RLS : clients — editeur_1visible peut aussi créer des clients
-- ==============================================================================

drop policy if exists "clients_insert" on public.clients;

create policy "clients_insert" on public.clients
  for insert to authenticated
  with check (my_role() in ('super_admin', 'editeur_1visible'));

-- ==============================================================================
-- RLS : user_profiles — lecture étendue pour l'équipe
-- ==============================================================================

-- super_admin et editeur_1visible voient tous les profils actifs
-- admin_client voit son équipe (déjà couvert par 005, on s'assure que la policy existe)

drop policy if exists "user_profiles_select" on public.user_profiles;

create policy "user_profiles_select" on public.user_profiles
  for select using (
    user_id = auth.uid()
    or my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_client' and client_id = my_client_id())
  );

-- L'utilisateur peut mettre à jour son propre profil (activation + CGU à l'invitation)
drop policy if exists "user_profiles_update_own" on public.user_profiles;

create policy "user_profiles_update_own" on public.user_profiles
  for update using (user_id = auth.uid());
