-- Migration 004 — RLS complet
-- Remplace les politiques publiques existantes et ajoute les politiques BO.
-- Dépend de : 001 (tables), 002 (eglises modifiée), 003 (my_role() etc.)

-- ==============================================================================
-- SUPPRIMER LES ANCIENNES POLITIQUES (remplacées ci-dessous)
-- ==============================================================================

drop policy if exists "eglises_select_public"       on public.eglises;
drop policy if exists "pois_select_public"           on public.pois;
drop policy if exists "evenements_select_public"     on public.evenements;
drop policy if exists "questions_select_public"      on public.questions;
drop policy if exists "stats_vues_select_public"     on public.stats_vues;
drop policy if exists "stats_vues_select"            on public.stats_vues;

-- ==============================================================================
-- ACTIVER RLS SUR LES NOUVELLES TABLES
-- ==============================================================================

alter table public.dioceses      enable row level security;
alter table public.paroisses     enable row level security;
alter table public.user_profiles enable row level security;
alter table public.audit_log     enable row level security;

-- ==============================================================================
-- TABLE : eglises
-- ==============================================================================

-- Visiteurs anonymes : uniquement les églises publiées, sans cascade pause
-- (la cascade pause diocèse/paroisse est gérée : si paroisse ou diocèse parent en pause,
--  l'église n'est pas visible)
create policy "eglises_select_public" on public.eglises
  for select to anon
  using (
    statut = 'publié'
    -- Cascade pause paroisse
    and (
      paroisse_id is null
      or not exists (
        select 1 from paroisses p
        where p.id = eglises.paroisse_id and p.statut = 'pause'
      )
    )
    -- Cascade pause diocèse (direct ou via paroisse)
    and not exists (
      select 1 from dioceses d
      where d.statut = 'pause'
        and (
          d.id = eglises.diocese_id
          or d.id in (select diocese_id from paroisses where id = eglises.paroisse_id)
        )
    )
  );

-- BO — lecture
create policy "eglises_select_bo" on public.eglises
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (
      my_role() in ('admin_diocese', 'editeur_diocese')
      and (
        diocese_id = my_diocese_id()
        or paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())
      )
    )
    or (
      my_role() in ('admin_paroisse', 'editeur_paroisse')
      and paroisse_id = my_paroisse_id()
    )
  );

-- BO — insertion (editeurs exclus, spec §3.4)
create policy "eglises_insert_bo" on public.eglises
  for insert to authenticated
  with check (
    my_role() in ('super_admin', 'editeur_1visible')
    or (
      my_role() = 'admin_diocese'
      and (
        diocese_id = my_diocese_id()
        or paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())
      )
    )
    or (
      my_role() = 'admin_paroisse'
      and paroisse_id = my_paroisse_id()
    )
  );

-- BO — mise à jour (tous les rôles qui peuvent voir, le trigger statut gère les restrictions)
create policy "eglises_update_bo" on public.eglises
  for update to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (
      my_role() in ('admin_diocese', 'editeur_diocese')
      and (
        diocese_id = my_diocese_id()
        or paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())
      )
    )
    or (
      my_role() in ('admin_paroisse', 'editeur_paroisse')
      and paroisse_id = my_paroisse_id()
    )
  )
  -- Les églises en pause ne sont pas éditables (sauf super_admin)
  with check (
    my_role() = 'super_admin'
    or (select statut from eglises where id = eglises.id) != 'pause'
  );

-- Pas de DELETE direct — tout passe par archive_entity()

-- ==============================================================================
-- TABLE : pois
-- ==============================================================================

-- Visiteurs anonymes : POIs de l'église publiée (avec cascade pause)
create policy "pois_select_public" on public.pois
  for select to anon
  using (
    exists (
      select 1 from eglises e
      where e.id = pois.eglise_id
        and e.statut = 'publié'
        and (e.paroisse_id is null or not exists (
          select 1 from paroisses p where p.id = e.paroisse_id and p.statut = 'pause'
        ))
        and not exists (
          select 1 from dioceses d where d.statut = 'pause'
            and (d.id = e.diocese_id or d.id in (select diocese_id from paroisses where id = e.paroisse_id))
        )
    )
  );

-- BO — lecture/écriture : même périmètre que l'église parente
create policy "pois_bo" on public.pois
  for all to authenticated
  using (
    exists (
      select 1 from eglises e
      where e.id = pois.eglise_id
        and (
          my_role() in ('super_admin', 'editeur_1visible')
          or (my_role() in ('admin_diocese', 'editeur_diocese')
              and (e.diocese_id = my_diocese_id()
                   or e.paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())))
          or (my_role() in ('admin_paroisse', 'editeur_paroisse')
              and e.paroisse_id = my_paroisse_id())
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
      where e.id = evenements.eglise_id
        and e.statut = 'publié'
        and (e.paroisse_id is null or not exists (
          select 1 from paroisses p where p.id = e.paroisse_id and p.statut = 'pause'
        ))
        and not exists (
          select 1 from dioceses d where d.statut = 'pause'
            and (d.id = e.diocese_id or d.id in (select diocese_id from paroisses where id = e.paroisse_id))
        )
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
          or (my_role() in ('admin_diocese', 'editeur_diocese')
              and (e.diocese_id = my_diocese_id()
                   or e.paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())))
          or (my_role() in ('admin_paroisse', 'editeur_paroisse')
              and e.paroisse_id = my_paroisse_id())
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

create policy "stats_vues_select_public" on public.stats_vues
  for select using (true);

-- ==============================================================================
-- TABLE : dioceses
-- ==============================================================================

create policy "dioceses_select_bo" on public.dioceses
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() in ('admin_diocese', 'editeur_diocese') and id = my_diocese_id())
  );

create policy "dioceses_insert_bo" on public.dioceses
  for insert to authenticated
  with check (my_role() = 'super_admin');

create policy "dioceses_update_bo" on public.dioceses
  for update to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() in ('admin_diocese') and id = my_diocese_id())
  );

-- ==============================================================================
-- TABLE : paroisses
-- ==============================================================================

create policy "paroisses_select_bo" on public.paroisses
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() in ('admin_diocese', 'editeur_diocese') and diocese_id = my_diocese_id())
    or (my_role() in ('admin_paroisse', 'editeur_paroisse') and id = my_paroisse_id())
  );

create policy "paroisses_insert_bo" on public.paroisses
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (my_role() = 'admin_diocese' and diocese_id = my_diocese_id())
  );

create policy "paroisses_update_bo" on public.paroisses
  for update to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_diocese' and diocese_id = my_diocese_id())
    or (my_role() = 'admin_paroisse' and id = my_paroisse_id())
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

-- admin_diocese voit les profils de son diocèse
create policy "user_profiles_select_diocese" on public.user_profiles
  for select to authenticated
  using (
    my_role() = 'admin_diocese'
    and (
      diocese_id = my_diocese_id()
      or paroisse_id in (select id from paroisses where diocese_id = my_diocese_id())
    )
  );

-- admin_paroisse voit les éditeurs de sa paroisse
create policy "user_profiles_select_paroisse" on public.user_profiles
  for select to authenticated
  using (
    my_role() = 'admin_paroisse'
    and paroisse_id = my_paroisse_id()
    and role = 'editeur_paroisse'
  );

-- INSERT/UPDATE uniquement via create_user_profile() (SECURITY DEFINER)

-- ==============================================================================
-- TABLE : audit_log
-- ==============================================================================

-- Lecture : super_admin voit tout, les admins voient leur périmètre
create policy "audit_log_select_super" on public.audit_log
  for select to authenticated
  using (my_role() = 'super_admin');

create policy "audit_log_select_own" on public.audit_log
  for select to authenticated
  using (user_id = auth.uid());

-- Pas d'INSERT/UPDATE/DELETE direct — tout passe par les fonctions SECURITY DEFINER
