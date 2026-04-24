-- Migration 004 — Table contrats
-- Pas d'interface BO en v1 : table créée en BDD, saisie directe par 1visible.
-- Dépend de : 001_clients.sql (clients, set_updated_at)

create table public.contrats (
  id          serial       primary key,
  client_id   integer      not null references public.clients(id),
  montant     numeric(10,2),
  date_debut  date,
  date_fin    date,
  statut      text         not null default 'actif'
                check (statut in ('actif', 'echu', 'resilie')),
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

comment on table public.contrats is
  'Contrats commerciaux clients. Géré hors BO en v1 (saisie directe par 1visible). Interface prévue en v2.';

create index idx_contrats_client_id on public.contrats (client_id);

create trigger tg_contrats_updated_at
  before update on public.contrats
  for each row execute function public.set_updated_at();
