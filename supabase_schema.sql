create table public.eglises (
  id serial primary key,
  nom text not null,
  ville text not null,
  type text not null,
  position float8[] not null,
  photo_facade text,
  message_bienvenue text,
  osm_rotation_angle float8 not null default 0, -- angle de rotation du polygone OSM (°), validé dans le BO
  osm_footprint_json text,                      -- polygone GPS brut (JSON) récupéré via Overpass API
  plan_image text,                               -- URL Cloudinary si plan photo custom (override OSM)
  google_calendar_id text,                      -- ID du Google Calendar de l'église
  slug text,                                    -- identifiant URL (ex: eglise-saint-victor-saone)
  statut text not null default 'brouillon'      -- 'brouillon' | 'publié'
);

create table public.pois (
  id serial primary key,
  type text not null,
  titre text not null,
  position float8[] not null,
  photo text,
  texte_resume text,
  texte_comprendre text,
  texte_historique text,
  texte_bible text,
  eglise_id integer references public.eglises(id)
);

create table public.evenements (
  id serial primary key,
  type text not null,
  titre text not null,
  date date not null,
  heure text,
  description text,
  eglise_id integer references public.eglises(id)
);

create table public.questions (
  id serial primary key,
  question text not null,
  reponse text not null
);

-- ── Statistiques de vues ──────────────────────────────────────────────────────
-- Chaque ligne = un slot horaire pour une entité (église ou POI).
-- Le count est incrémenté atomiquement via la fonction RPC `track_view`.

create table public.stats_vues (
  id          bigserial primary key,
  entite_type text      not null,  -- 'eglise' | 'poi'
  entite_id   integer   not null,
  slot        timestamptz not null, -- tronqué à l'heure (date_trunc('hour', now()))
  count       integer   not null default 0,
  constraint stats_vues_unique unique (entite_type, entite_id, slot)
);

create index idx_stats_vues_lookup on public.stats_vues (entite_type, entite_id, slot);

-- RLS : lecture autorisée pour tous (dashboard BO), écriture via la fonction seulement
alter table public.stats_vues enable row level security;

create policy "stats_vues_select" on public.stats_vues
  for select using (true);

-- Fonction RPC appelée par l'app Flutter (ou le BO) pour incrémenter le compteur.
-- Définie SECURITY DEFINER pour contourner RLS en écriture — l'app n'a pas besoin
-- de droits INSERT/UPDATE directs sur la table.
create or replace function public.track_view(
  p_entite_type text,
  p_entite_id   integer,
  p_slot        timestamptz default date_trunc('hour', now())
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into stats_vues (entite_type, entite_id, slot, count)
  values (p_entite_type, p_entite_id, p_slot, 1)
  on conflict (entite_type, entite_id, slot)
  do update set count = stats_vues.count + 1;
end;
$$;

-- Autoriser les utilisateurs anonymes à appeler la fonction
grant execute on function public.track_view(text, integer, timestamptz) to anon, authenticated;
