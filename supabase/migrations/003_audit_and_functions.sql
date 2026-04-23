-- Migration 003 — Audit log + fonctions helper + fonctions SECURITY DEFINER
-- Contexte : specs-roles-autorisations §4.3 (statuts), §4.4 (soft-delete), §6.3 (journalisation)

-- ==============================================================================
-- AUDIT LOG
-- ==============================================================================

create table public.audit_log (
  id          bigserial   primary key,
  user_id     uuid        references auth.users(id),
  user_role   text,                           -- rôle au moment de l'action
  action      text        not null,           -- ex: 'archive', 'publish', 'create_user', 'pause'
  entity_type text        not null,           -- 'eglise' | 'paroisse' | 'diocese' | 'user_profile'
  entity_id   integer     not null,
  motif       text,                           -- obligatoire pour action 'pause'
  details     jsonb,                          -- données supplémentaires (ancien statut, nouveau statut…)
  created_at  timestamptz not null default now()
);

comment on table public.audit_log is 'Journal immuable de toutes les actions de gestion. Cf. spec §6.3.';

create index idx_audit_log_entity    on public.audit_log (entity_type, entity_id);
create index idx_audit_log_user_id   on public.audit_log (user_id);
create index idx_audit_log_created   on public.audit_log (created_at desc);

-- ==============================================================================
-- FONCTIONS HELPER (stables, security definer — appelées dans les politiques RLS)
-- ==============================================================================

-- Rôle de l'utilisateur courant (NULL si non authentifié ou inactif)
create or replace function public.my_role()
returns text language sql stable security definer
set search_path = public as $$
  select role from user_profiles
  where user_id = auth.uid() and actif = true
$$;

-- diocese_id de l'utilisateur courant
create or replace function public.my_diocese_id()
returns integer language sql stable security definer
set search_path = public as $$
  select diocese_id from user_profiles
  where user_id = auth.uid() and actif = true
$$;

-- paroisse_id de l'utilisateur courant
create or replace function public.my_paroisse_id()
returns integer language sql stable security definer
set search_path = public as $$
  select paroisse_id from user_profiles
  where user_id = auth.uid() and actif = true
$$;

-- ==============================================================================
-- FONCTION : archivage en cascade (SECURITY DEFINER)
-- Gère les effets de bord décrits en §4.4 selon le type d'entité.
-- ==============================================================================

create or replace function public.archive_entity(
  p_entity_type text,     -- 'eglise' | 'paroisse' | 'diocese'
  p_entity_id   integer,
  p_motif       text default null
)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  v_role    text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  select role into v_role
  from user_profiles
  where user_id = v_user_id and actif = true;

  if v_role is null then
    raise exception 'Utilisateur non authentifié ou inactif';
  end if;

  case p_entity_type

    when 'eglise' then
      -- Vérifier périmètre
      if v_role not in ('super_admin', 'editeur_1visible') then
        if v_role in ('admin_diocese', 'editeur_diocese') then
          if not exists (
            select 1 from eglises e
            where e.id = p_entity_id
              and (
                e.diocese_id = my_diocese_id()
                or e.paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())
              )
          ) then
            raise exception 'Hors périmètre : cette église n''appartient pas à votre diocèse';
          end if;
        elsif v_role = 'admin_paroisse' then
          if not exists (
            select 1 from eglises where id = p_entity_id and paroisse_id = my_paroisse_id()
          ) then
            raise exception 'Hors périmètre : cette église n''appartient pas à votre paroisse';
          end if;
        else
          raise exception 'Rôle non autorisé à archiver une église : %', v_role;
        end if;
      end if;

      update eglises set statut = 'archivé' where id = p_entity_id;

    when 'paroisse' then
      if v_role not in ('super_admin') then
        if v_role = 'admin_diocese' then
          if not exists (
            select 1 from paroisses where id = p_entity_id and diocese_id = my_diocese_id()
          ) then
            raise exception 'Hors périmètre : cette paroisse n''appartient pas à votre diocèse';
          end if;
        else
          raise exception 'Rôle non autorisé à archiver une paroisse : %', v_role;
        end if;
      end if;

      -- Archiver les églises de la paroisse
      update eglises set statut = 'archivé'
      where paroisse_id = p_entity_id and statut != 'archivé';

      update paroisses set statut = 'archivé' where id = p_entity_id;

    when 'diocese' then
      if v_role != 'super_admin' then
        raise exception 'Seul le super_admin peut archiver un diocèse';
      end if;

      -- Détacher les paroisses (orphelines) — ne pas les archiver
      update paroisses set diocese_id = null
      where diocese_id = p_entity_id and statut != 'archivé';

      -- Détacher les églises directement rattachées au diocèse
      update eglises set diocese_id = null
      where diocese_id = p_entity_id and statut != 'archivé';

      update dioceses set statut = 'archivé' where id = p_entity_id;

    else
      raise exception 'Type d''entité inconnu : %', p_entity_type;
  end case;

  -- Journaliser
  insert into audit_log (user_id, user_role, action, entity_type, entity_id, motif)
  values (v_user_id, v_role, 'archive', p_entity_type, p_entity_id, p_motif);

end;
$$;

-- ==============================================================================
-- FONCTION : mise en pause en cascade (super_admin uniquement)
-- Spec §4.3 : pause diocèse → masque paroisses + églises côté visiteur
-- L'implémentation est visuelle (via les politiques RLS publiques), pas de changement
-- de statut individuel sur les enfants.
-- ==============================================================================

create or replace function public.set_pause_cascade(
  p_entity_type text,     -- 'eglise' | 'paroisse' | 'diocese'
  p_entity_id   integer,
  p_pause       boolean,  -- true = mettre en pause, false = réactiver
  p_motif       text default null
)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  v_role    text;
  v_user_id uuid;
  v_action  text;
begin
  v_user_id := auth.uid();

  select role into v_role
  from user_profiles
  where user_id = v_user_id and actif = true;

  if v_role is distinct from 'super_admin' then
    raise exception 'Seul le super_admin peut mettre en pause ou réactiver (rôle: %)', v_role;
  end if;

  v_action := case when p_pause then 'pause' else 'unpause' end;

  case p_entity_type
    when 'eglise' then
      update eglises set statut = case when p_pause then 'pause' else 'publié' end
      where id = p_entity_id;

    when 'paroisse' then
      -- La pause paroisse se lit via jointure dans RLS public (pas de changement statut enfants)
      update paroisses set statut = case when p_pause then 'pause' else 'actif' end
      where id = p_entity_id;

    when 'diocese' then
      update dioceses set statut = case when p_pause then 'pause' else 'actif' end
      where id = p_entity_id;

    else
      raise exception 'Type d''entité inconnu : %', p_entity_type;
  end case;

  insert into audit_log (user_id, user_role, action, entity_type, entity_id, motif)
  values (v_user_id, v_role, v_action, p_entity_type, p_entity_id, p_motif);

end;
$$;

-- ==============================================================================
-- FONCTION : invitation utilisateur (super_admin ou admin délégant)
-- Crée le profil en attente — Supabase Auth envoie l'email via inviteUserByEmail.
-- À appeler depuis le BO React après supabase.auth.admin.inviteUserByEmail().
-- ==============================================================================

create or replace function public.create_user_profile(
  p_user_id    uuid,
  p_prenom     text,
  p_nom        text,
  p_role       text,
  p_diocese_id  integer default null,
  p_paroisse_id integer default null
)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  v_caller_role       text;
  v_caller_diocese_id integer;
  v_caller_paroisse_id integer;
begin
  select role, diocese_id, paroisse_id
  into v_caller_role, v_caller_diocese_id, v_caller_paroisse_id
  from user_profiles
  where user_id = auth.uid() and actif = true;

  if v_caller_role is null then
    raise exception 'Utilisateur appelant non authentifié ou inactif';
  end if;

  -- Vérifier que l'appelant a le droit de créer ce rôle (spec §3.1)
  case p_role
    when 'admin_diocese' then
      if v_caller_role != 'super_admin' then
        raise exception 'Seul le super_admin peut créer un admin_diocese';
      end if;

    when 'editeur_diocese' then
      if v_caller_role not in ('super_admin', 'admin_diocese') then
        raise exception 'Rôle non autorisé à créer un editeur_diocese';
      end if;
      -- admin_diocese ne peut créer que pour son diocèse
      if v_caller_role = 'admin_diocese' and p_diocese_id != v_caller_diocese_id then
        raise exception 'Un admin_diocese ne peut créer des éditeurs que dans son diocèse';
      end if;

    when 'admin_paroisse' then
      if v_caller_role not in ('super_admin', 'admin_diocese') then
        raise exception 'Rôle non autorisé à créer un admin_paroisse';
      end if;
      if v_caller_role = 'admin_diocese' then
        -- La paroisse doit appartenir au diocèse de l'admin
        if not exists (
          select 1 from paroisses where id = p_paroisse_id and diocese_id = v_caller_diocese_id
        ) then
          raise exception 'Cette paroisse n''appartient pas à votre diocèse';
        end if;
      end if;

    when 'editeur_paroisse' then
      if v_caller_role not in ('super_admin', 'admin_diocese', 'admin_paroisse') then
        raise exception 'Rôle non autorisé à créer un editeur_paroisse';
      end if;
      if v_caller_role = 'admin_paroisse' and p_paroisse_id != v_caller_paroisse_id then
        raise exception 'Un admin_paroisse ne peut créer des éditeurs que dans sa paroisse';
      end if;

    else
      raise exception 'Rôle inconnu ou non créable via cette fonction : %', p_role;
  end case;

  insert into user_profiles (user_id, prenom, nom, role, diocese_id, paroisse_id)
  values (p_user_id, p_prenom, p_nom, p_role, p_diocese_id, p_paroisse_id);

  insert into audit_log (user_id, user_role, action, entity_type, entity_id)
  values (auth.uid(), v_caller_role, 'create_user', 'user_profile',
          currval('user_profiles_id_seq')::integer);

end;
$$;

-- Autoriser les utilisateurs authentifiés à appeler ces fonctions
-- (les vérifications de rôle sont dans les fonctions elles-mêmes)
grant execute on function public.archive_entity(text, integer, text)      to authenticated;
grant execute on function public.set_pause_cascade(text, integer, boolean, text) to authenticated;
grant execute on function public.create_user_profile(uuid, text, text, text, integer, integer) to authenticated;
