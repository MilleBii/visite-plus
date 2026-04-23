-- Migration 002 — Altérer eglises : FK paroisse/diocèse, statuts étendus, contraintes
-- Contexte : données de test existantes → paroisse_id et diocese_id seront NULL
--            (sanctuaires autonomes, visibles uniquement par super_admin/editeur_1visible)

-- ==============================================================================
-- COLONNES FK
-- ==============================================================================

alter table public.eglises
  add column paroisse_id integer references public.paroisses(id),
  add column diocese_id  integer references public.dioceses(id);

-- Commentaire sur les nouvelles valeurs de statut acceptées
comment on column public.eglises.statut is
  'brouillon | publié | pause | archivé. '
  'pause = réservé super_admin (suspension commerciale). '
  'archivé = soft-delete.';

-- ==============================================================================
-- CONTRAINTE : au plus une FK renseignée (paroisse_id XOR diocese_id XOR aucun)
-- ==============================================================================

alter table public.eglises
  add constraint chk_eglise_rattachement check (
    (paroisse_id is null or diocese_id is null)
  );

-- Remarque : les deux à NULL = sanctuaire autonome rattaché à 1visible.

-- ==============================================================================
-- INDEX
-- ==============================================================================

create index idx_eglises_paroisse_id on public.eglises (paroisse_id);
create index idx_eglises_diocese_id  on public.eglises (diocese_id);
create index idx_eglises_statut      on public.eglises (statut);

-- ==============================================================================
-- TRIGGER : transitions de statut
-- Applique les règles de la spec §4.3 au niveau BDD.
-- ==============================================================================

create or replace function public.check_eglise_statut_transition()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Pas de changement de statut → laisser passer
  if OLD.statut = NEW.statut then
    return NEW;
  end if;

  select role into v_role
  from user_profiles
  where user_id = auth.uid() and actif = true;

  -- Seul super_admin peut mettre en pause ou sortir de pause
  if NEW.statut = 'pause' or OLD.statut = 'pause' then
    if v_role is distinct from 'super_admin' then
      raise exception
        'Seul le super_admin peut mettre en pause ou réactiver depuis pause (statut actuel: %, demandé: %)',
        OLD.statut, NEW.statut;
    end if;
  end if;

  -- Les éditeurs ne peuvent pas changer le statut
  if v_role in ('editeur_diocese', 'editeur_paroisse') then
    raise exception
      'Les éditeurs ne peuvent pas modifier le statut (rôle: %)', v_role;
  end if;

  -- Transitions autorisées (hors pause, déjà traitée ci-dessus)
  -- brouillon → publié ✅  |  publié → brouillon ✅
  -- [tout] → archivé ✅    |  archivé → brouillon ✅
  -- Tout autre transition interdite
  if not (
    (OLD.statut = 'brouillon' and NEW.statut = 'publié')  or
    (OLD.statut = 'publié'    and NEW.statut = 'brouillon') or
    (NEW.statut = 'archivé')                               or
    (OLD.statut = 'archivé'   and NEW.statut = 'brouillon') or
    (OLD.statut = 'pause'     and NEW.statut = 'publié')   -- géré super_admin ci-dessus
  ) then
    raise exception
      'Transition de statut non autorisée : % → %', OLD.statut, NEW.statut;
  end if;

  return NEW;
end;
$$;

create trigger tg_eglise_statut_transition
  before update of statut on public.eglises
  for each row execute function public.check_eglise_statut_transition();

-- ==============================================================================
-- TRIGGER : cohérence descendante
-- Si paroisse_id est renseigné, diocese_id doit rester NULL
-- (le diocèse se lit via la paroisse, on ne duplique pas)
-- ==============================================================================

create or replace function public.check_eglise_coherence()
returns trigger language plpgsql as $$
begin
  if NEW.paroisse_id is not null and NEW.diocese_id is not null then
    raise exception
      'Une église rattachée à une paroisse ne peut pas avoir diocese_id renseigné directement. '
      'Le diocèse se lit via la paroisse.';
  end if;
  return NEW;
end;
$$;

create trigger tg_eglise_coherence
  before insert or update of paroisse_id, diocese_id on public.eglises
  for each row execute function public.check_eglise_coherence();
