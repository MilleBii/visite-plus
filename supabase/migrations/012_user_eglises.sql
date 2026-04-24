-- Migration 012 — Affectation éditeurs → églises
-- Un admin_client peut restreindre un editeur_client à un sous-ensemble d'églises.
-- Si aucune affectation : l'éditeur voit toutes les églises de son client (rétrocompat).

-- ==============================================================================
-- TABLE user_eglises
-- ==============================================================================

create table public.user_eglises (
  user_id   uuid    not null references auth.users(id)    on delete cascade,
  eglise_id integer not null references public.eglises(id) on delete cascade,
  primary key (user_id, eglise_id)
);

create index idx_user_eglises_user_id   on public.user_eglises (user_id);
create index idx_user_eglises_eglise_id on public.user_eglises (eglise_id);

alter table public.user_eglises enable row level security;

-- Lecture : chacun voit ses propres affectations ; admin_client voit celles de ses éditeurs
create policy "user_eglises_select" on public.user_eglises
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or user_id = auth.uid()
    or (
      my_role() = 'admin_client'
      and exists (
        select 1 from user_profiles up
        where up.user_id = user_eglises.user_id
          and up.client_id = my_client_id()
      )
    )
  );

-- Insertion : admin_client peut affecter ses éditeurs à ses propres églises
create policy "user_eglises_insert" on public.user_eglises
  for insert to authenticated
  with check (
    my_role() = 'super_admin'
    or (
      my_role() = 'admin_client'
      and exists (
        select 1 from user_profiles up
        where up.user_id = user_eglises.user_id
          and up.client_id = my_client_id()
          and up.role = 'editeur_client'
      )
      and exists (
        select 1 from eglises e
        where e.id = user_eglises.eglise_id
          and e.client_id = my_client_id()
      )
    )
  );

-- Suppression : même périmètre
create policy "user_eglises_delete" on public.user_eglises
  for delete to authenticated
  using (
    my_role() = 'super_admin'
    or (
      my_role() = 'admin_client'
      and exists (
        select 1 from user_profiles up
        where up.user_id = user_eglises.user_id
          and up.client_id = my_client_id()
      )
    )
  );

-- ==============================================================================
-- MISE À JOUR DES POLICIES EGLISES
-- Editeur_client sans affectation → toutes les églises du client (comportement actuel)
-- Editeur_client avec affectations → uniquement les églises affectées
-- ==============================================================================

drop policy if exists "eglises_select_bo" on public.eglises;
create policy "eglises_select_bo" on public.eglises
  for select to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_client' and client_id = my_client_id())
    or (
      my_role() = 'editeur_client'
      and client_id = my_client_id()
      and (
        not exists (select 1 from user_eglises ue where ue.user_id = auth.uid())
        or exists (select 1 from user_eglises ue where ue.user_id = auth.uid() and ue.eglise_id = eglises.id)
      )
    )
  );

drop policy if exists "eglises_update_bo" on public.eglises;
create policy "eglises_update_bo" on public.eglises
  for update to authenticated
  using (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_client' and client_id = my_client_id())
    or (
      my_role() = 'editeur_client'
      and client_id = my_client_id()
      and (
        not exists (select 1 from user_eglises ue where ue.user_id = auth.uid())
        or exists (select 1 from user_eglises ue where ue.user_id = auth.uid() and ue.eglise_id = eglises.id)
      )
    )
  )
  with check (
    my_role() in ('super_admin', 'editeur_1visible')
    or (my_role() = 'admin_client' and client_id = my_client_id())
    or (
      my_role() = 'editeur_client'
      and client_id = my_client_id()
      and (
        not exists (select 1 from user_eglises ue where ue.user_id = auth.uid())
        or exists (select 1 from user_eglises ue where ue.user_id = auth.uid() and ue.eglise_id = eglises.id)
      )
    )
  );
