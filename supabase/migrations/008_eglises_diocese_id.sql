-- Migration 008 — Ajouter diocese_id sur eglises
-- Rattachement direct d'une église à son diocèse (référence descriptive).

alter table public.eglises
  add column diocese_id integer references public.dioceses(id);

create index idx_eglises_diocese_id on public.eglises (diocese_id);
