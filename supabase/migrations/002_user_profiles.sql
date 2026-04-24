-- Migration 002 — Table user_profiles (v2, modèle client unifié)
-- 4 rôles : super_admin, editeur_1visible, admin_client, editeur_client
-- Dépend de : 001_clients.sql (clients)

create table public.user_profiles (
  id          serial      primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  prenom      text        not null,
  nom         text        not null,
  role        text        not null check (role in (
                'super_admin',
                'editeur_1visible',
                'admin_client',
                'editeur_client'
              )),
  client_id   integer     references public.clients(id),
  actif       boolean     not null default true,
  cgu_accepte boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint uq_user_profiles_user unique (user_id),

  -- super_admin / editeur_1visible : pas de client (périmètre global)
  constraint chk_roles_global check (
    role not in ('super_admin', 'editeur_1visible')
    or client_id is null
  ),
  -- admin_client / editeur_client : client obligatoire
  constraint chk_roles_client check (
    role not in ('admin_client', 'editeur_client')
    or client_id is not null
  )
);

comment on table public.user_profiles is
  'Profil étendu des utilisateurs Supabase Auth. Un user = un rôle = un client (v1, pas de multi-rattachement).';

create index idx_user_profiles_user_id   on public.user_profiles (user_id);
create index idx_user_profiles_client_id on public.user_profiles (client_id);
create index idx_user_profiles_role      on public.user_profiles (role);

create trigger tg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();
