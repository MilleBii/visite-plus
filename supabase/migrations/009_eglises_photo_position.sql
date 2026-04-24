-- Migration 009 — Point de focus de la photo de façade
-- Stocke la position x/y (0-100) pour object-position dans l'app.

alter table public.eglises
  add column photo_facade_x smallint not null default 50,
  add column photo_facade_y smallint not null default 50;
