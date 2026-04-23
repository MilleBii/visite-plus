-- Migration 001 — Tables hiérarchie : dioceses, paroisses, user_profiles
-- Contexte : specs-roles-autorisations v1.0 — modèle 3 niveaux (N0/N1/N2)
-- Ces tables n'existaient pas. Les données eglises existantes ne sont pas affectées.

-- ==============================================================================
-- DIOCESES
-- ==============================================================================

create table public.dioceses (
  id         serial primary key,
  nom        text        not null,
  adresse    text,
  contact    text,                                -- email ou téléphone référent
  statut     text        not null default 'actif'
               check (statut in ('actif', 'pause', 'archivé')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.dioceses is 'Circonscription ecclésiastique (N1). Regroupe des paroisses.';

create index idx_dioceses_statut on public.dioceses (statut);

-- ==============================================================================
-- PAROISSES
-- ==============================================================================

create table public.paroisses (
  id          serial primary key,
  nom         text        not null,
  logo_url    text,
  adresse     text,
  telephone   text,
  email       text,
  diocese_id  integer     references public.dioceses(id),  -- NULL = paroisse autonome
  statut      text        not null default 'actif'
                check (statut in ('actif', 'pause', 'archivé')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.paroisses is 'Unité pastorale (N2). diocese_id NULL = paroisse autonome rattachée à 1visible.';

create index idx_paroisses_diocese_id on public.paroisses (diocese_id);
create index idx_paroisses_statut     on public.paroisses (statut);

-- ==============================================================================
-- USER_PROFILES
-- ==============================================================================

create table public.user_profiles (
  id           serial      primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  prenom       text        not null,
  nom          text        not null,
  role         text        not null check (role in (
                             'super_admin',
                             'editeur_1visible',
                             'admin_diocese',
                             'editeur_diocese',
                             'admin_paroisse',
                             'editeur_paroisse'
                           )),
  diocese_id   integer     references public.dioceses(id),
  paroisse_id  integer     references public.paroisses(id),
  actif        boolean     not null default true,
  cgu_accepte  boolean     not null default false,   -- accepté à la 1ère connexion
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint uq_user_profiles_user unique (user_id),

  -- admin_diocese / editeur_diocese : diocese_id obligatoire, paroisse_id interdit
  constraint chk_roles_diocese check (
    role not in ('admin_diocese', 'editeur_diocese')
    or (diocese_id is not null and paroisse_id is null)
  ),
  -- admin_paroisse / editeur_paroisse : paroisse_id obligatoire
  constraint chk_roles_paroisse check (
    role not in ('admin_paroisse', 'editeur_paroisse')
    or paroisse_id is not null
  ),
  -- super_admin / editeur_1visible : aucun rattachement
  constraint chk_roles_global check (
    role not in ('super_admin', 'editeur_1visible')
    or (diocese_id is null and paroisse_id is null)
  )
);

comment on table public.user_profiles is 'Profil étendu des utilisateurs Supabase. Un user = un rôle = un périmètre (v1).';

create index idx_user_profiles_user_id    on public.user_profiles (user_id);
create index idx_user_profiles_diocese_id on public.user_profiles (diocese_id);
create index idx_user_profiles_paroisse_id on public.user_profiles (paroisse_id);

-- ==============================================================================
-- TRIGGER updated_at générique
-- ==============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger tg_dioceses_updated_at
  before update on public.dioceses
  for each row execute function public.set_updated_at();

create trigger tg_paroisses_updated_at
  before update on public.paroisses
  for each row execute function public.set_updated_at();

create trigger tg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();
