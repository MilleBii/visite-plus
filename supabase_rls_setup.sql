-- Configuration Row Level Security (RLS) pour Visite+
-- À exécuter dans le SQL Editor de Supabase (console.supabase.com)

-- ==============================================================================
-- POLITIQUES DE SÉCURITÉ POUR ACCÈS ANONYME PUBLIC
-- ==============================================================================

-- ── Table: eglises ──────────────────────────────────────────────────────────
-- Les utilisateurs anonymes peuvent lire uniquement les églises publiées

ALTER TABLE public.eglises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eglises_select_public" ON public.eglises
  FOR SELECT
  USING (statut = 'publié');

-- ── Table: pois ─────────────────────────────────────────────────────────────
-- Les POIs sont accessibles en lecture publique
-- (On suppose que les POIs d'églises publiées doivent être accessibles)

ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pois_select_public" ON public.pois
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.eglises
      WHERE eglises.id = pois.eglise_id
      AND eglises.statut = 'publié'
    )
  );

-- ── Table: questions ────────────────────────────────────────────────────────
-- Les questions sont publiques (pas de restriction)

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select_public" ON public.questions
  FOR SELECT
  USING (true);

-- ── Table: evenements ──────────────────────────────────────────────────────
-- Les événements sont accessibles en lecture si l'église est publiée

ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evenements_select_public" ON public.evenements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.eglises
      WHERE eglises.id = evenements.eglise_id
      AND eglises.statut = 'publié'
    )
  );

-- ── Table: stats_vues ──────────────────────────────────────────────────────
-- Stats visibles en lecture (déjà défini dans le schéma)
-- On redéfinit juste pour être explicite

ALTER TABLE public.stats_vues ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tous peuvent consulter les stats
CREATE POLICY "stats_vues_select_public" ON public.stats_vues
  FOR SELECT
  USING (true);

-- Écriture uniquement via la fonction RPC (SECURITY DEFINER)
-- → Les utilisateurs n'ont pas de droits INSERT/UPDATE directs

-- ==============================================================================
-- CONFIGURATION ACCÈS API ANONYME
-- ==============================================================================
-- Dans votre client Flutter, vous pouvez utiliser supabase_flutter sans signaler.
-- Les politiques RLS ci-dessus s'appliqueront automatiquement aux appels anonymes.

-- ==============================================================================
-- NOTES
-- ==============================================================================
-- 1. Les mutations (INSERT, UPDATE, DELETE) ne sont pas ouvertes publiquement.
--    Seules les Edge Functions (SECURITY DEFINER) peuvent écrire.
-- 2. Pour le BO (édition par les admins), créer des politiques additionnelles
--    qui vérificent auth.role() = 'authenticated' + vérifications custom.
-- 3. Les credentials Supabase (anonKey) exposées côté client n'ont accès QUE
--    aux requêtes SELECT autorisées par ces politiques.
