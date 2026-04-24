-- Migration 007 — Activer RLS sur les tables existantes
-- Ces tables existaient avant les migrations v2 et n'avaient pas RLS activé.
-- Sans ce correctif, toutes les policies eglises/pois/etc. sont ignorées.

alter table public.eglises    enable row level security;
alter table public.pois       enable row level security;
alter table public.evenements enable row level security;
alter table public.questions  enable row level security;
alter table public.stats_vues enable row level security;

-- Supprimer l'ancienne policy v1 permissive (qual = true) qui écrase tout
drop policy if exists "Public read access" on public.eglises;
