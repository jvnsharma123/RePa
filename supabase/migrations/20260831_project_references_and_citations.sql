-- ==============================================================================
-- Research Manuscript Studio - Phase 4.1 Migration
-- Project Reference Library & Manuscript Citations Data Layer
-- ==============================================================================

-- 1. PROJECT REFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.project_references (
  id TEXT PRIMARY KEY DEFAULT ('ref_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal TEXT,
  publication_year INTEGER,
  volume TEXT,
  issue TEXT,
  pages TEXT,
  doi TEXT,
  pmid TEXT,
  url TEXT,
  abstract TEXT,
  publisher TEXT,
  source_database TEXT DEFAULT 'manual',
  citation_key TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  user_notes TEXT DEFAULT '',
  relevance_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for project_references
CREATE INDEX IF NOT EXISTS idx_project_references_project ON public.project_references(project_id);
CREATE INDEX IF NOT EXISTS idx_project_references_user ON public.project_references(user_id);
CREATE INDEX IF NOT EXISTS idx_project_references_doi ON public.project_references(project_id, doi);
CREATE INDEX IF NOT EXISTS idx_project_references_status ON public.project_references(project_id, verification_status);

-- Enable RLS on project_references
ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own project references"
  ON public.project_references FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project references"
  ON public.project_references FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project references"
  ON public.project_references FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project references"
  ON public.project_references FOR DELETE
  USING (auth.uid() = user_id);

-- 2. MANUSCRIPT CITATIONS TABLE (Claim-to-Reference Mappings Foundation)
CREATE TABLE IF NOT EXISTS public.manuscript_citations (
  id TEXT PRIMARY KEY DEFAULT ('cite_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  manuscript_id TEXT NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES public.manuscript_sections(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL REFERENCES public.project_references(id) ON DELETE CASCADE,
  claim_text TEXT,
  citation_order INT NOT NULL DEFAULT 1,
  in_text_tag TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for manuscript_citations
CREATE INDEX IF NOT EXISTS idx_manuscript_citations_project ON public.manuscript_citations(project_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_citations_manuscript ON public.manuscript_citations(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_citations_section ON public.manuscript_citations(section_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_citations_reference ON public.manuscript_citations(reference_id);

-- Enable RLS on manuscript_citations
ALTER TABLE public.manuscript_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own manuscript citations"
  ON public.manuscript_citations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manuscript citations"
  ON public.manuscript_citations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manuscript citations"
  ON public.manuscript_citations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manuscript citations"
  ON public.manuscript_citations FOR DELETE
  USING (auth.uid() = user_id);
