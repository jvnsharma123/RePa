-- ==============================================================================
-- Research Manuscript Studio - Phase 4.2B Migration
-- Reference Verification & Provenance Engine Data Layer
-- ==============================================================================

-- 1. ADD PROVENANCE AND AUDIT FIELDS TO PROJECT_REFERENCES
ALTER TABLE public.project_references
  ADD COLUMN IF NOT EXISTS created_from TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS correction_notes TEXT,
  ADD COLUMN IF NOT EXISTS field_provenance JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_history JSONB DEFAULT '[]'::jsonb;

-- 2. CREATE REFERENCE_VERIFICATION_EVENTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.reference_verification_events (
  id TEXT PRIMARY KEY,
  reference_id TEXT NOT NULL REFERENCES public.project_references(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  field_changes JSONB DEFAULT '[]'::jsonb,
  source TEXT,
  performed_by TEXT DEFAULT 'Researcher',
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  notes TEXT
);

-- Indices for reference_verification_events
CREATE INDEX IF NOT EXISTS idx_ref_ver_events_ref ON public.reference_verification_events(reference_id);
CREATE INDEX IF NOT EXISTS idx_ref_ver_events_proj ON public.reference_verification_events(project_id);
CREATE INDEX IF NOT EXISTS idx_ref_ver_events_user ON public.reference_verification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ref_ver_events_time ON public.reference_verification_events(performed_at DESC);

-- Enable RLS on reference_verification_events
ALTER TABLE public.reference_verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own reference verification events"
  ON public.reference_verification_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reference verification events"
  ON public.reference_verification_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reference verification events"
  ON public.reference_verification_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reference verification events"
  ON public.reference_verification_events FOR DELETE
  USING (auth.uid() = user_id);
