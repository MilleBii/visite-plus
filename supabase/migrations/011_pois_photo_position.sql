-- Migration 011 — Point de focus de la photo POI
alter table public.pois
  add column photo_x smallint not null default 50,
  add column photo_y smallint not null default 50;
