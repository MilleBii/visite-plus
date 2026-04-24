-- Migration 001 — Tables de référence : dioceses + clients
-- Modèle v2 : client unifié (diocèse/paroisse/sanctuaire/autre), hiérarchie abandonnée.

-- ==============================================================================
-- FONCTION updated_at (partagée par toutes les tables)
-- ==============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- ==============================================================================
-- DIOCESES (table de référence — étiquette descriptive sur clients)
-- ==============================================================================

create table public.dioceses (
  id     serial primary key,
  nom    text   not null,
  region text
);

comment on table public.dioceses is
  'Table de référence des diocèses français. Utilisée comme étiquette sur clients.diocese_id — aucun impact sur les droits.';

-- Seed : diocèses de France métropolitaine
insert into public.dioceses (nom, region) values
  -- Île-de-France
  ('Diocèse de Paris',                     'Île-de-France'),
  ('Diocèse de Créteil',                   'Île-de-France'),
  ('Diocèse d''Évry-Corbeil-Essonnes',     'Île-de-France'),
  ('Diocèse de Meaux',                     'Île-de-France'),
  ('Diocèse de Pontoise',                  'Île-de-France'),
  ('Diocèse de Saint-Denis',               'Île-de-France'),
  ('Diocèse de Versailles',                'Île-de-France'),
  -- Nord / Hauts-de-France
  ('Diocèse d''Arras',                     'Hauts-de-France'),
  ('Diocèse de Cambrai',                   'Hauts-de-France'),
  ('Diocèse de Lille',                     'Hauts-de-France'),
  ('Diocèse d''Amiens',                    'Hauts-de-France'),
  ('Diocèse de Beauvais',                  'Hauts-de-France'),
  -- Normandie
  ('Diocèse de Rouen',                     'Normandie'),
  ('Diocèse de Bayeux',                    'Normandie'),
  ('Diocèse de Coutances',                 'Normandie'),
  ('Diocèse d''Évreux',                    'Normandie'),
  ('Diocèse de Séez',                      'Normandie'),
  -- Grand Est
  ('Diocèse de Reims',                     'Grand Est'),
  ('Diocèse de Châlons-en-Champagne',      'Grand Est'),
  ('Diocèse de Langres',                   'Grand Est'),
  ('Diocèse de Soissons',                  'Grand Est'),
  ('Diocèse de Troyes',                    'Grand Est'),
  ('Diocèse de Strasbourg',                'Grand Est'),
  ('Diocèse de Metz',                      'Grand Est'),
  ('Diocèse de Nancy-Toul',                'Grand Est'),
  ('Diocèse de Saint-Dié',                 'Grand Est'),
  ('Diocèse de Verdun',                    'Grand Est'),
  ('Diocèse de Belfort-Montbéliard',       'Grand Est'),
  -- Bourgogne-Franche-Comté
  ('Diocèse de Besançon',                  'Bourgogne-Franche-Comté'),
  ('Diocèse de Dijon',                     'Bourgogne-Franche-Comté'),
  ('Diocèse d''Autun',                     'Bourgogne-Franche-Comté'),
  ('Diocèse de Nevers',                    'Bourgogne-Franche-Comté'),
  ('Diocèse de Sens-Auxerre',              'Bourgogne-Franche-Comté'),
  -- Bretagne
  ('Diocèse de Rennes',                    'Bretagne'),
  ('Diocèse de Quimper',                   'Bretagne'),
  ('Diocèse de Saint-Brieuc',              'Bretagne'),
  ('Diocèse de Vannes',                    'Bretagne'),
  -- Pays de la Loire
  ('Diocèse de Nantes',                    'Pays de la Loire'),
  ('Diocèse d''Angers',                    'Pays de la Loire'),
  ('Diocèse de Laval',                     'Pays de la Loire'),
  ('Diocèse du Mans',                      'Pays de la Loire'),
  -- Centre-Val de Loire
  ('Diocèse de Tours',                     'Centre-Val de Loire'),
  ('Diocèse de Blois',                     'Centre-Val de Loire'),
  ('Diocèse de Bourges',                   'Centre-Val de Loire'),
  ('Diocèse de Chartres',                  'Centre-Val de Loire'),
  ('Diocèse d''Orléans',                   'Centre-Val de Loire'),
  -- Auvergne-Rhône-Alpes
  ('Diocèse de Lyon',                      'Auvergne-Rhône-Alpes'),
  ('Diocèse de Belley-Ars',                'Auvergne-Rhône-Alpes'),
  ('Diocèse de Chambéry',                  'Auvergne-Rhône-Alpes'),
  ('Diocèse de Grenoble-Vienne',           'Auvergne-Rhône-Alpes'),
  ('Diocèse de Moutiers',                  'Auvergne-Rhône-Alpes'),
  ('Diocèse de Saint-Jean-de-Maurienne',   'Auvergne-Rhône-Alpes'),
  ('Diocèse de Viviers',                   'Auvergne-Rhône-Alpes'),
  ('Diocèse de Clermont',                  'Auvergne-Rhône-Alpes'),
  ('Diocèse du Puy-en-Velay',              'Auvergne-Rhône-Alpes'),
  ('Diocèse de Mende',                     'Auvergne-Rhône-Alpes'),
  ('Diocèse de Moulins',                   'Auvergne-Rhône-Alpes'),
  ('Diocèse de Saint-Flour',               'Auvergne-Rhône-Alpes'),
  -- Nouvelle-Aquitaine
  ('Diocèse de Bordeaux',                  'Nouvelle-Aquitaine'),
  ('Diocèse d''Agen',                      'Nouvelle-Aquitaine'),
  ('Diocèse d''Angoulême',                 'Nouvelle-Aquitaine'),
  ('Diocèse de La Rochelle-Saintes',       'Nouvelle-Aquitaine'),
  ('Diocèse de Périgueux-Sarlat',          'Nouvelle-Aquitaine'),
  ('Diocèse de Poitiers',                  'Nouvelle-Aquitaine'),
  ('Diocèse de Bayonne',                   'Nouvelle-Aquitaine'),
  ('Diocèse de Limoges',                   'Nouvelle-Aquitaine'),
  ('Diocèse de Tulle',                     'Nouvelle-Aquitaine'),
  -- Occitanie
  ('Diocèse de Toulouse',                  'Occitanie'),
  ('Diocèse d''Albi',                      'Occitanie'),
  ('Diocèse d''Auch',                      'Occitanie'),
  ('Diocèse de Cahors',                    'Occitanie'),
  ('Diocèse de Carcassonne-Narbonne',      'Occitanie'),
  ('Diocèse de Montauban',                 'Occitanie'),
  ('Diocèse de Rodez',                     'Occitanie'),
  ('Diocèse de Tarbes-Lourdes',            'Occitanie'),
  ('Diocèse de Montpellier',               'Occitanie'),
  ('Diocèse de Nîmes',                     'Occitanie'),
  ('Diocèse de Perpignan-Elne',            'Occitanie'),
  -- PACA / Corse
  ('Diocèse de Marseille',                 'Provence-Alpes-Côte d''Azur'),
  ('Diocèse d''Aix-en-Provence',           'Provence-Alpes-Côte d''Azur'),
  ('Diocèse de Digne',                     'Provence-Alpes-Côte d''Azur'),
  ('Diocèse de Fréjus-Toulon',             'Provence-Alpes-Côte d''Azur'),
  ('Diocèse de Gap-Embrun',                'Provence-Alpes-Côte d''Azur'),
  ('Diocèse de Nice',                      'Provence-Alpes-Côte d''Azur'),
  ('Diocèse d''Ajaccio',                   'Corse');

-- ==============================================================================
-- CLIENTS
-- ==============================================================================

create table public.clients (
  id            serial      primary key,
  nom           text        not null,
  type          text        not null default 'autre'
                              check (type in ('diocese', 'paroisse', 'sanctuaire', 'autre')),
  diocese_id    integer     references public.dioceses(id),
  statut        text        not null default 'actif'
                              check (statut in ('actif', 'pause', 'résilié')),
  adresse       text,
  telephone     text,
  email_contact text,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.clients is
  'Unité contractuelle et fonctionnelle. Un client = une entité qui souscrit au service (diocèse, paroisse, sanctuaire, autre).';

comment on column public.clients.diocese_id is
  'Étiquette descriptive uniquement — aucun impact sur les droits. Nullable : une association ou école n''appartient pas forcément à un diocèse.';

create index idx_clients_statut     on public.clients (statut);
create index idx_clients_diocese_id on public.clients (diocese_id);

create trigger tg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
