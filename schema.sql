-- ==============================================================================
-- Research Manuscript Studio - Complete Supabase PostgreSQL Database Schema
-- Includes Authentication Triggers, Profiles, Projects, Research Inputs, Files,
-- Facts, Figures, Tables, Summaries, Plans, Manuscripts, Sections, Versions,
-- Quality Checks, Future Tables, Storage Buckets, and Row-Level Security (RLS).
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES TABLE (Linked with Supabase Auth auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  institution TEXT,
  department TEXT,
  academic_title TEXT DEFAULT 'Researcher',
  role TEXT DEFAULT 'Principal Investigator',
  orcid_id TEXT,
  subscription_tier TEXT DEFAULT 'Academic Free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to auto-create public.profiles upon auth.users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, institution, department, academic_title, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'institution', 'Academic Institution'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Department of Research'),
    COALESCE(NEW.raw_user_meta_data->>'academic_title', 'Researcher'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Principal Investigator')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. PROJECTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY DEFAULT ('proj_' || replace(uuid_generate_v4()::text, '-', '')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Research Project',
  research_area TEXT NOT NULL DEFAULT 'Applied Sciences',
  sub_field TEXT DEFAULT '',
  document_type_id TEXT NOT NULL DEFAULT 'research_article',
  format_id TEXT NOT NULL DEFAULT 'fmt-nature-springer',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. RESEARCH INPUTS TABLE (Persistent Research Information Form)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  research_area TEXT DEFAULT '',
  sub_field TEXT DEFAULT '',
  objectives TEXT DEFAULT '',
  research_questions TEXT DEFAULT '',
  hypothesis TEXT DEFAULT '',
  background TEXT DEFAULT '',
  research_problem TEXT DEFAULT '',
  methodology TEXT DEFAULT '',
  study_population_sample TEXT DEFAULT '',
  variables TEXT DEFAULT '',
  major_findings TEXT DEFAULT '',
  conclusion TEXT DEFAULT '',
  limitations TEXT DEFAULT '',
  future_work TEXT DEFAULT '',
  keywords TEXT[] DEFAULT '{}',
  detailed_description TEXT DEFAULT '',
  brief_description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_research_inputs UNIQUE (project_id)
);

ALTER TABLE public.research_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own research inputs"
  ON public.research_inputs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. RESEARCH FILES TABLE (Metadata for Uploaded Datasets, Figures & Docs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_files (
  id TEXT PRIMARY KEY DEFAULT ('file_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT DEFAULT 'application/octet-stream',
  file_size BIGINT DEFAULT 0,
  size_formatted TEXT DEFAULT '0 KB',
  category TEXT NOT NULL DEFAULT 'Other',
  upload_status TEXT NOT NULL DEFAULT 'ready',
  extracted_facts_count INT DEFAULT 0,
  extracted_facts_summary TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  data_preview_url TEXT,
  text_content TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.research_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own research files"
  ON public.research_files FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. RESEARCH FACTS TABLE (Empirical Traceable Facts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_facts (
  id TEXT PRIMARY KEY DEFAULT ('fact_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_statement TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Findings/Data',
  source TEXT DEFAULT '',
  source_file_id TEXT REFERENCES public.research_files(id) ON DELETE SET NULL,
  source_location TEXT DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'High',
  verification_status TEXT NOT NULL DEFAULT 'Verified',
  is_interpretation BOOLEAN DEFAULT FALSE,
  is_observed BOOLEAN DEFAULT TRUE,
  data_values JSONB DEFAULT '[]'::jsonb,
  user_notes TEXT DEFAULT '',
  provenance_type TEXT DEFAULT 'user_fact',
  user_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.research_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own research facts"
  ON public.research_facts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. RESEARCH FIGURES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_figures (
  id TEXT PRIMARY KEY DEFAULT ('fig_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES public.research_files(id) ON DELETE SET NULL,
  figure_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  ai_observations TEXT DEFAULT '',
  image_url TEXT,
  user_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.research_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own research figures"
  ON public.research_figures FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. RESEARCH TABLES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_tables (
  id TEXT PRIMARY KEY DEFAULT ('tbl_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES public.research_files(id) ON DELETE SET NULL,
  table_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  headers TEXT[] DEFAULT '{}',
  rows JSONB DEFAULT '[]'::jsonb,
  caption TEXT DEFAULT '',
  data_reference TEXT DEFAULT '',
  user_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.research_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own research tables"
  ON public.research_tables FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. RESEARCH SUMMARIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  executive_summary TEXT DEFAULT '',
  empirical_core TEXT DEFAULT '',
  theoretical_implications TEXT DEFAULT '',
  limitations_summary TEXT DEFAULT '',
  key_findings TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_summary UNIQUE (project_id)
);

ALTER TABLE public.research_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own research summaries"
  ON public.research_summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. MANUSCRIPT PLANS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manuscript_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  format_id TEXT NOT NULL DEFAULT 'fmt-nature-springer',
  total_target_word_count INT NOT NULL DEFAULT 4000,
  sections_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_plan UNIQUE (project_id)
);

ALTER TABLE public.manuscript_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own manuscript plans"
  ON public.manuscript_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. MANUSCRIPTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manuscripts (
  id TEXT PRIMARY KEY DEFAULT ('ms_' || replace(uuid_generate_v4()::text, '-', '')),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type_id TEXT NOT NULL DEFAULT 'research_article',
  format_id TEXT NOT NULL DEFAULT 'fmt-nature-springer',
  title TEXT NOT NULL DEFAULT '',
  total_word_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_manuscript UNIQUE (project_id)
);

ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own manuscripts"
  ON public.manuscripts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 12. MANUSCRIPT SECTIONS TABLE (Individual editable sections)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manuscript_sections (
  id TEXT PRIMARY KEY DEFAULT ('sec_' || replace(uuid_generate_v4()::text, '-', '')),
  manuscript_id TEXT NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_order INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  word_count INT DEFAULT 0,
  target_word_count INT DEFAULT 500,
  provenance_list JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manuscript_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own manuscript sections"
  ON public.manuscript_sections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 13. MANUSCRIPT VERSIONS TABLE (Point-in-time snapshots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manuscript_versions (
  id TEXT PRIMARY KEY DEFAULT ('ver_' || replace(uuid_generate_v4()::text, '-', '')),
  manuscript_id TEXT NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  change_summary TEXT DEFAULT '',
  total_word_count INT DEFAULT 0,
  quality_score INT DEFAULT 90,
  sections_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manuscript_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own manuscript versions"
  ON public.manuscript_versions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 14. QUALITY CHECKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quality_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id TEXT REFERENCES public.manuscripts(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INT NOT NULL DEFAULT 92,
  checks_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quality checks"
  ON public.quality_checks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 15. FUTURE PREPARED TABLES (Architecture Ready)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.literature_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  journal TEXT,
  year INT,
  doi TEXT,
  abstract TEXT,
  citation_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.literature_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own literature sources" ON public.literature_sources FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.literature_sources(id) ON DELETE SET NULL,
  section_id TEXT REFERENCES public.manuscript_sections(id) ON DELETE CASCADE,
  citation_tag TEXT NOT NULL,
  formatted_entry TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own citations" ON public.citations FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.document_formats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT,
  guidelines_url TEXT,
  rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  issn TEXT,
  publisher TEXT,
  impact_factor NUMERIC,
  format_id TEXT REFERENCES public.document_formats(id)
);

CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT,
  thesis_guidelines JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.similarity_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  similarity_score INT NOT NULL DEFAULT 0,
  findings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.similarity_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own similarity reports" ON public.similarity_reports FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ai_analysis_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai analysis reports" ON public.ai_analysis_reports FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE', -- 'FREE' | 'RESEARCHER' | 'PRO_RESEARCHER'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'authenticated' | 'cancelled' | 'expired' | 'halted' | 'pending'
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  razorpay_plan_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp_sub_id ON public.subscriptions(razorpay_subscription_id);

CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  token_usage INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage records" ON public.usage_records FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 16. SUPABASE STORAGE BUCKET & POLICIES (research-files)
-- ------------------------------------------------------------------------------
-- Inserts private bucket if not present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'research-files',
  'research-files',
  false,
  52428800, -- 50 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'text/csv', 'application/pdf', 'application/json', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies: Organize by user_id/project_id/filename
CREATE POLICY "Users can upload research files into their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'research-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view and download their own research files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'research-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own research files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'research-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own research files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'research-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
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
