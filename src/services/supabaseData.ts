import { supabase, isSupabaseConfigured } from './supabase';
import {
  Project,
  ResearchFile,
  ResearchFact,
  ResearchFigure,
  ResearchTable,
  ResearchSummary,
  ManuscriptPlan,
  Manuscript,
  ManuscriptSection,
  ManuscriptVersion,
  QualityReport,
  SimilarityReport,
  AIAnalysisReport,
  ProjectReference,
  ReferenceAuthor,
  ReferenceVerificationStatus,
  ManuscriptCitation,
  ReferenceVerificationEvent,
  FieldProvenanceRecord,
  BibliographicFieldKey
} from '../types';

// ----------------------------------------------------------------------------
// Fetch Projects from Supabase
// ----------------------------------------------------------------------------

export async function fetchUserProjectsFromSupabase(userId: string): Promise<Project[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  try {
    const { data: projectsData, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (projError || !projectsData) {
      console.error('Error fetching user projects:', projError);
      return [];
    }

    const projects: Project[] = [];

    for (const p of projectsData) {
      const fullProject = await fetchSingleProjectFromSupabase(p.id, userId, p);
      if (fullProject) {
        projects.push(fullProject);
      }
    }

    return projects;
  } catch (err) {
    console.error('Failed to load user projects from Supabase:', err);
    return [];
  }
}

export async function fetchSingleProjectFromSupabase(
  projectId: string,
  userId: string,
  baseProjectRecord?: any
): Promise<Project | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    let projectRow = baseProjectRecord;
    if (!projectRow) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      projectRow = data;
    }

    // Parallel fetch related tables
    const [
      inputsRes,
      filesRes,
      factsRes,
      figuresRes,
      tablesRes,
      summaryRes,
      planRes,
      manuscriptRes,
      versionsRes,
      qualityRes,
      referencesRes,
      citationsRes
    ] = await Promise.all([
      supabase.from('research_inputs').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('research_files').select('*').eq('project_id', projectId).order('uploaded_at', { ascending: true }),
      supabase.from('research_facts').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('research_figures').select('*').eq('project_id', projectId).order('figure_number', { ascending: true }),
      supabase.from('research_tables').select('*').eq('project_id', projectId).order('table_number', { ascending: true }),
      supabase.from('research_summaries').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('manuscript_plans').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('manuscripts').select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from('manuscript_versions').select('*').eq('project_id', projectId).order('version_number', { ascending: false }),
      supabase.from('quality_checks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
      supabase.from('project_references').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('manuscript_citations').select('*').eq('project_id', projectId).order('citation_order', { ascending: true })
    ]);

    const inputs = inputsRes.data || {};

    // Map files
    const files: ResearchFile[] = (filesRes.data || []).map((f) => ({
      id: f.id,
      projectId: f.project_id,
      name: f.name,
      originalName: f.original_filename || f.name,
      storagePath: f.storage_path,
      type: f.mime_type,
      size: Number(f.file_size || 0),
      sizeFormatted: f.size_formatted || '0 KB',
      category: f.category || 'Other',
      uploadStatus: f.upload_status || 'ready',
      extractedFactsCount: f.extracted_facts_count || 0,
      extractedFactsSummary: f.extracted_facts_summary,
      aiAnalysis: f.ai_analysis,
      dataPreviewUrl: f.data_preview_url,
      textContent: f.text_content,
      uploadedAt: f.uploaded_at,
    }));

    // Map facts
    const facts: ResearchFact[] = (factsRes.data || []).map((ft) => {
      // Extract extended audit and classification info from data_values or top-level
      const meta = typeof ft.data_values === 'object' && ft.data_values && !Array.isArray(ft.data_values) ? ft.data_values : {};
      const dataValuesList = Array.isArray(ft.data_values) ? ft.data_values : (meta.dataValues || []);

      return {
        id: ft.id,
        projectId: ft.project_id,
        fact: ft.fact_statement,
        keyStatement: ft.fact_statement,
        category: ft.category,
        factType: meta.factType || (ft.is_interpretation ? 'AI_INTERPRETATION' : (ft.provenance_type === 'user_fact' ? 'RESEARCHER_INPUT' : 'OBSERVATION')),
        source: ft.source || '',
        sourceFile: ft.source_file_id,
        sourceFileId: ft.source_file_id,
        sourceFileName: meta.sourceFileName || '',
        sourceLocation: ft.source_location || 'Source location unavailable',
        supportingObservation: meta.supportingObservation || '',
        aiInterpretation: meta.aiInterpretation || '',
        confidence: ft.confidence || 'High',
        verificationStatus: (ft.verification_status as any) || (ft.user_verified ? 'VERIFIED' : 'PENDING'),
        isInterpretation: Boolean(ft.is_interpretation),
        isObserved: Boolean(ft.is_observed),
        originalAiStatement: meta.originalAiStatement || ft.fact_statement,
        verifiedStatement: meta.verifiedStatement || (ft.user_verified ? ft.fact_statement : undefined),
        verifiedBy: meta.verifiedBy,
        verifiedAt: meta.verifiedAt,
        conflictDetails: meta.conflictDetails,
        conflictWithFactId: meta.conflictWithFactId,
        dataValues: dataValuesList,
        notes: ft.user_notes || '',
        provenanceType: ft.provenance_type || 'user_fact',
        userVerified: Boolean(ft.user_verified),
        createdAt: ft.created_at,
        updatedAt: ft.updated_at,
      };
    });

    // Map figures
    const figures: ResearchFigure[] = (figuresRes.data || []).map((fig) => ({
      id: fig.id,
      projectId: projectRow.id,
      sourceFileId: fig.file_id || '',
      sourceFileName: fig.source_file_name || 'Figure source',
      figureNumber: fig.figure_number || 1,
      title: fig.title,
      caption: fig.caption || '',
      aiObservations: fig.ai_observations || '',
      imageUrl: fig.image_url,
      userNotes: fig.user_notes || '',
    }));

    // Map tables
    const tables: ResearchTable[] = (tablesRes.data || []).map((tbl) => ({
      id: tbl.id,
      projectId: projectRow.id,
      sourceFileId: tbl.file_id || '',
      sourceFileName: tbl.source_file_name || 'Table source',
      tableNumber: tbl.table_number || 1,
      title: tbl.title,
      headers: tbl.headers || [],
      rows: tbl.rows || [],
      caption: tbl.caption || '',
      notes: tbl.user_notes || '',
    }));

    // Map summary
    let summary: ResearchSummary | undefined = undefined;
    if (summaryRes.data) {
      summary = {
        id: summaryRes.data.id || `summary_${projectRow.id}`,
        projectId: projectRow.id,
        objectives: inputs.objectives || '',
        researchQuestions: inputs.research_questions || '',
        hypothesis: inputs.hypothesis || '',
        methodology: inputs.methodology || '',
        sampleInfo: inputs.study_population_sample || '',
        variables: inputs.variables || '',
        majorObservations: summaryRes.data.major_observations || [],
        results: summaryRes.data.results || [],
        statisticalFindings: summaryRes.data.statistical_findings || [],
        conclusion: inputs.conclusion || '',
        limitations: inputs.limitations || '',
        provenanceBreakdown: summaryRes.data.provenance_breakdown || {
          userProvidedCount: facts.filter(f => f.userVerified).length,
          aiExtractedCount: facts.length,
          aiInterpretationCount: 0,
          unverifiedCount: 0,
        },
        generatedAt: summaryRes.data.updated_at || projectRow.updated_at,
      };
    }

    // Map plan
    let plan: ManuscriptPlan | undefined = undefined;
    if (planRes.data) {
      plan = {
        id: planRes.data.id || `plan_${projectRow.id}`,
        projectId: projectRow.id,
        documentTypeId: projectRow.document_type_id || 'research_article',
        formatId: planRes.data.format_id || projectRow.format_id,
        estimatedTotalWords: planRes.data.total_target_word_count || 4000,
        sections: planRes.data.sections_data || [],
        isCustomized: Boolean(planRes.data.is_customized),
        createdAt: planRes.data.created_at || projectRow.created_at,
      };
    }

    // Map manuscript & manuscript_sections
    let manuscript: Manuscript | undefined = undefined;
    if (manuscriptRes.data) {
      const { data: sectionsData } = await supabase
        .from('manuscript_sections')
        .select('*')
        .eq('manuscript_id', manuscriptRes.data.id)
        .order('section_order', { ascending: true });

      const sections: ManuscriptSection[] = (sectionsData || []).map((sec, idx) => ({
        id: sec.id,
        sectionKey: sec.section_key,
        title: sec.title,
        order: sec.section_order || idx + 1,
        content: sec.content || '',
        wordCount: sec.word_count || 0,
        lastModified: sec.updated_at || projectRow.updated_at,
        provenanceList: sec.provenance_list || [],
        isRequired: Boolean(sec.is_required),
      }));

      manuscript = {
        id: manuscriptRes.data.id,
        projectId: manuscriptRes.data.project_id,
        documentTypeId: manuscriptRes.data.document_type_id || 'research_article',
        formatId: manuscriptRes.data.format_id || 'fmt-nature-springer',
        title: manuscriptRes.data.title || projectRow.title,
        abstract: manuscriptRes.data.abstract || '',
        keywords: inputs.keywords || [],
        sections,
        totalWordCount: manuscriptRes.data.total_word_count || 0,
        version: manuscriptRes.data.version || 1,
        status: manuscriptRes.data.status || 'draft',
        lastSaved: manuscriptRes.data.updated_at || projectRow.updated_at,
      };
    }

    // Map versions
    const versions: ManuscriptVersion[] = (versionsRes.data || []).map((ver) => ({
      id: ver.id,
      projectId: ver.project_id,
      version: ver.version_number,
      versionNumber: ver.version_number,
      title: ver.title,
      label: `v${ver.version_number}: ${ver.title}`,
      changeSummary: ver.change_summary || '',
      totalWordCount: ver.total_word_count || 0,
      qualityScore: ver.quality_score || 90,
      sections: ver.sections_data || [],
      savedAt: ver.created_at,
      createdAt: ver.created_at,
    }));

    // Map quality report
    let qualityReport: QualityReport | undefined = undefined;
    if (qualityRes.data && qualityRes.data.length > 0) {
      const q = qualityRes.data[0];
      const checks = q.checks_data || [];
      qualityReport = {
        id: q.id || `qr_${projectRow.id}`,
        projectId: projectRow.id,
        manuscriptId: manuscriptRes.data?.id || `ms_${projectRow.id}`,
        overallScore: q.overall_score || 92,
        passedCount: checks.filter((c: any) => c.status === 'Passed').length,
        warningCount: checks.filter((c: any) => c.status === 'Warning').length,
        reviewCount: checks.filter((c: any) => c.status === 'Needs Review').length,
        checks,
        generatedAt: q.created_at || projectRow.updated_at,
      };
    }

    // Map references
    const references: ProjectReference[] = (referencesRes.data || []).map((r) => {
      let authorsList: ReferenceAuthor[] = [];
      if (Array.isArray(r.authors)) {
        authorsList = r.authors;
      } else if (typeof r.authors === 'string') {
        try {
          authorsList = JSON.parse(r.authors);
        } catch {
          authorsList = [{ lastName: r.authors, fullName: r.authors }];
        }
      }

      return {
        id: r.id,
        projectId: r.project_id,
        userId: r.user_id,
        title: r.title || 'Untitled Reference',
        authors: authorsList,
        journal: r.journal || undefined,
        publicationYear: r.publication_year ? Number(r.publication_year) : undefined,
        volume: r.volume || undefined,
        issue: r.issue || undefined,
        pages: r.pages || undefined,
        doi: r.doi || undefined,
        pmid: r.pmid || undefined,
        url: r.url || undefined,
        abstract: r.abstract || undefined,
        publisher: r.publisher || undefined,
        sourceDatabase: r.source_database || 'manual',
        citationKey: r.citation_key || undefined,
        verificationStatus: r.verification_status || 'PENDING',
        userNotes: r.user_notes || '',
        relevanceScore: r.relevance_score ? Number(r.relevance_score) : 1.0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    // Map citations
    const citations: ManuscriptCitation[] = (citationsRes.data || []).map((c: any) => ({
      id: c.id,
      projectId: c.project_id,
      manuscriptId: c.manuscript_id,
      sectionId: c.section_id,
      referenceId: c.reference_id,
      claimText: c.claim_text || undefined,
      citationOrder: c.citation_order || 1,
      inTextTag: c.in_text_tag || undefined,
      userId: c.user_id,
      createdAt: c.created_at,
    }));

    return {
      id: projectRow.id,
      userId: projectRow.user_id,
      title: projectRow.title,
      researchArea: projectRow.research_area || inputs.research_area || 'Applied Sciences',
      subField: projectRow.sub_field || inputs.sub_field || '',
      objectives: inputs.objectives || '',
      researchQuestions: inputs.research_questions || '',
      hypothesis: inputs.hypothesis || '',
      background: inputs.background || '',
      researchProblem: inputs.research_problem || '',
      briefDescription: inputs.brief_description || '',
      detailedDescription: inputs.detailed_description || '',
      methodology: inputs.methodology || '',
      studyPopulationSample: inputs.study_population_sample || '',
      variables: inputs.variables || '',
      majorFindings: inputs.major_findings || '',
      conclusion: inputs.conclusion || '',
      limitations: inputs.limitations || '',
      futureWork: inputs.future_work || '',
      keywords: inputs.keywords || [],
      documentTypeId: projectRow.document_type_id || 'research_article',
      formatId: projectRow.format_id || 'fmt-nature-springer',
      status: projectRow.status || 'draft',
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      files,
      facts,
      figures,
      tables,
      references,
      citations,
      summary,
      plan,
      manuscript,
      versions,
      qualityReport,
      isDemoProject: false,
    };
  } catch (err) {
    console.error(`Error loading project ${projectId}:`, err);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Save / Upsert Project in Supabase
// ----------------------------------------------------------------------------

export async function saveProjectToSupabase(
  project: Project,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: new Error('Supabase is not configured') };
  }

  try {
    const now = new Date().toISOString();

    // 1. Upsert projects table
    const { error: projErr } = await supabase.from('projects').upsert({
      id: project.id,
      user_id: userId,
      title: project.title || 'Untitled Research Project',
      research_area: project.researchArea || 'Applied Sciences',
      sub_field: project.subField || '',
      document_type_id: project.documentTypeId || 'research_article',
      format_id: project.formatId || 'fmt-nature-springer',
      status: project.status || 'draft',
      created_at: project.createdAt || now,
      updated_at: now,
    });

    if (projErr) throw projErr;

    // 2. Upsert research_inputs table
    const { error: inputsErr } = await supabase.from('research_inputs').upsert(
      {
        project_id: project.id,
        user_id: userId,
        title: project.title || '',
        research_area: project.researchArea || '',
        sub_field: project.subField || '',
        objectives: project.objectives || '',
        research_questions: project.researchQuestions || '',
        hypothesis: project.hypothesis || '',
        background: project.background || '',
        research_problem: project.researchProblem || '',
        methodology: project.methodology || '',
        study_population_sample: project.studyPopulationSample || '',
        variables: project.variables || '',
        majorFindings: project.majorFindings || '',
        major_findings: project.majorFindings || '',
        conclusion: project.conclusion || '',
        limitations: project.limitations || '',
        future_work: project.futureWork || '',
        keywords: project.keywords || [],
        detailed_description: project.detailedDescription || '',
        brief_description: project.briefDescription || '',
        updated_at: now,
      },
      { onConflict: 'project_id' }
    );

    if (inputsErr) throw inputsErr;

    // 3. Upsert research_files
    if (project.files && project.files.length > 0) {
      const fileRows = project.files.map((f) => ({
        id: f.id,
        project_id: project.id,
        user_id: userId,
        name: f.name,
        original_filename: f.originalName || f.name,
        storage_path: (f as any).storagePath || null,
        mime_type: f.type,
        file_size: f.size || 0,
        size_formatted: f.sizeFormatted || '0 KB',
        category: f.category || 'Other',
        upload_status: f.uploadStatus || 'ready',
        extracted_facts_count: f.extractedFactsCount || 0,
        extracted_facts_summary: f.extractedFactsSummary || null,
        ai_analysis: f.aiAnalysis || {},
        data_preview_url: f.dataPreviewUrl || null,
        text_content: f.textContent || null,
        uploaded_at: f.uploadedAt || now,
      }));

      const { error: filesErr } = await supabase.from('research_files').upsert(fileRows);
      if (filesErr) console.warn('Files upsert warning:', filesErr);
    }

    // 4. Upsert research_facts
    if (project.facts && project.facts.length > 0) {
      const factRows = project.facts.map((ft) => {
        const metaEnvelope = {
          factType: ft.factType || (ft.isInterpretation ? 'AI_INTERPRETATION' : (ft.provenanceType === 'user_fact' ? 'RESEARCHER_INPUT' : 'OBSERVATION')),
          originalAiStatement: ft.originalAiStatement || ft.keyStatement || ft.fact || '',
          verifiedStatement: ft.verifiedStatement || (ft.userVerified ? (ft.keyStatement || ft.fact || '') : undefined),
          verifiedBy: ft.verifiedBy,
          verifiedAt: ft.verifiedAt,
          sourceFileName: ft.sourceFileName || ft.source || '',
          supportingObservation: ft.supportingObservation || '',
          aiInterpretation: ft.aiInterpretation || '',
          conflictDetails: ft.conflictDetails,
          conflictWithFactId: ft.conflictWithFactId,
          dataValues: ft.dataValues || [],
        };

        return {
          id: ft.id,
          project_id: project.id,
          user_id: userId,
          fact_statement: ft.verifiedStatement || ft.keyStatement || ft.fact || '',
          category: ft.category || 'Observation',
          source: ft.source || '',
          source_file_id: ft.sourceFileId || ft.sourceFile || null,
          source_location: ft.sourceLocation || 'Source location unavailable',
          confidence: ft.confidence || 'High',
          verification_status: ft.verificationStatus || (ft.userVerified ? 'VERIFIED' : 'PENDING'),
          is_interpretation: Boolean(ft.isInterpretation || ft.factType === 'AI_INTERPRETATION'),
          is_observed: ft.isObserved !== false && ft.factType !== 'AI_INTERPRETATION' && ft.factType !== 'HYPOTHESIS',
          data_values: metaEnvelope,
          user_notes: ft.notes || '',
          provenance_type: ft.provenanceType || 'user_fact',
          user_verified: Boolean(ft.userVerified),
          created_at: ft.createdAt || now,
          updated_at: now,
        };
      });

      const { error: factsErr } = await supabase.from('research_facts').upsert(factRows);
      if (factsErr) console.warn('Facts upsert warning:', factsErr);
    }

    // 5. Upsert research_figures
    if (project.figures && project.figures.length > 0) {
      const figRows = project.figures.map((fig) => ({
        id: fig.id,
        project_id: project.id,
        user_id: userId,
        file_id: fig.sourceFileId || null,
        source_file_name: fig.sourceFileName || 'Figure',
        figure_number: fig.figureNumber || 1,
        title: fig.title,
        caption: fig.caption || '',
        ai_observations: fig.aiObservations || '',
        image_url: fig.imageUrl || null,
        user_notes: fig.userNotes || '',
        created_at: now,
      }));

      await supabase.from('research_figures').upsert(figRows);
    }

    // 6. Upsert research_tables
    if (project.tables && project.tables.length > 0) {
      const tblRows = project.tables.map((tbl) => ({
        id: tbl.id,
        project_id: project.id,
        user_id: userId,
        file_id: tbl.sourceFileId || null,
        source_file_name: tbl.sourceFileName || 'Table',
        table_number: tbl.tableNumber || 1,
        title: tbl.title,
        headers: tbl.headers || [],
        rows: tbl.rows || [],
        caption: tbl.caption || '',
        data_reference: tbl.sourceFileName || '',
        user_notes: tbl.notes || '',
        created_at: now,
      }));

      await supabase.from('research_tables').upsert(tblRows);
    }

    // 7. Upsert research_summary
    if (project.summary) {
      await supabase.from('research_summaries').upsert(
        {
          project_id: project.id,
          user_id: userId,
          title: project.title,
          executive_summary: project.summary.objectives || '',
          empirical_core: project.summary.methodology || '',
          theoretical_implications: project.summary.conclusion || '',
          limitations_summary: project.summary.limitations || '',
          key_findings: project.summary.results || [],
          updated_at: now,
        },
        { onConflict: 'project_id' }
      );
    }

    // 8. Upsert manuscript_plan
    if (project.plan) {
      await supabase.from('manuscript_plans').upsert(
        {
          project_id: project.id,
          user_id: userId,
          title: project.title,
          format_id: project.plan.formatId || project.formatId,
          total_target_word_count: project.plan.estimatedTotalWords || 4000,
          sections_data: project.plan.sections || [],
          updated_at: now,
        },
        { onConflict: 'project_id' }
      );
    }

    // 9. Upsert manuscript & manuscript_sections
    if (project.manuscript) {
      const msId = project.manuscript.id || `ms_${project.id}`;
      await supabase.from('manuscripts').upsert(
        {
          id: msId,
          project_id: project.id,
          user_id: userId,
          document_type_id: project.manuscript.documentTypeId || project.documentTypeId,
          format_id: project.manuscript.formatId || project.formatId,
          title: project.manuscript.title || project.title,
          total_word_count: project.manuscript.totalWordCount || 0,
          status: project.manuscript.status || 'draft',
          updated_at: now,
        },
        { onConflict: 'project_id' }
      );

      if (project.manuscript.sections && project.manuscript.sections.length > 0) {
        const sectionRows = project.manuscript.sections.map((sec, idx) => ({
          id: sec.id || `sec_${msId}_${idx}`,
          manuscript_id: msId,
          project_id: project.id,
          user_id: userId,
          section_key: sec.sectionKey || `sec-${idx}`,
          section_order: idx + 1,
          title: sec.title,
          content: sec.content || '',
          word_count: sec.wordCount || 0,
          provenance_list: sec.provenanceList || [],
          is_required: sec.isRequired !== false,
          updated_at: now,
        }));

        await supabase.from('manuscript_sections').upsert(sectionRows);
      }
    }

    // 10. Upsert manuscript_versions
    if (project.versions && project.versions.length > 0) {
      const msId = project.manuscript?.id || `ms_${project.id}`;
      const versionRows = project.versions.map((ver, idx) => ({
        id: ver.id || `ver_${project.id}_${ver.version || idx + 1}`,
        manuscript_id: msId,
        project_id: project.id,
        user_id: userId,
        version_number: ver.version || ver.versionNumber || idx + 1,
        title: ver.title || `Version ${ver.version || idx + 1}`,
        change_summary: ver.changeSummary || ver.label || 'Revision snapshot',
        total_word_count: ver.totalWordCount || 0,
        quality_score: ver.qualityScore || 90,
        sections_data: ver.sections || [],
        created_at: ver.savedAt || ver.createdAt || now,
      }));

      await supabase.from('manuscript_versions').upsert(versionRows);
    }

    // 11. Upsert quality_checks
    if (project.qualityReport) {
      const msId = project.manuscript?.id || `ms_${project.id}`;
      await supabase.from('quality_checks').upsert({
        manuscript_id: msId,
        project_id: project.id,
        user_id: userId,
        overall_score: project.qualityReport.overallScore || 90,
        checks_data: project.qualityReport.checks || [],
        created_at: now,
      });
    }

    // 12. Upsert project_references
    if (project.references && project.references.length > 0) {
      const refRows = project.references.map((ref) => ({
        id: ref.id,
        project_id: project.id,
        user_id: userId,
        title: ref.title || 'Untitled Reference',
        authors: Array.isArray(ref.authors) ? ref.authors : [],
        journal: ref.journal || null,
        publication_year: ref.publicationYear || null,
        volume: ref.volume || null,
        issue: ref.issue || null,
        pages: ref.pages || null,
        doi: normalizeDoi(ref.doi) || null,
        pmid: ref.pmid || null,
        url: ref.url || null,
        abstract: ref.abstract || null,
        publisher: ref.publisher || null,
        source_database: ref.sourceDatabase || 'manual',
        citation_key: ref.citationKey || null,
        verification_status: ref.verificationStatus || 'PENDING',
        user_notes: ref.userNotes || '',
        relevance_score: ref.relevanceScore || 1.0,
        created_at: ref.createdAt || now,
        updated_at: now,
      }));

      const { error: refsErr } = await supabase.from('project_references').upsert(refRows);
      if (refsErr) console.warn('Project references upsert warning:', refsErr);
    }

    // 13. Upsert manuscript_citations
    if (project.citations && project.citations.length > 0) {
      const msId = project.manuscript?.id || `ms_${project.id}`;
      const citeRows = project.citations.map((c, idx) => ({
        id: c.id || `cite_${project.id}_${idx}`,
        project_id: project.id,
        manuscript_id: c.manuscriptId || msId,
        section_id: c.sectionId,
        reference_id: c.referenceId,
        claim_text: c.claimText || null,
        citation_order: c.citationOrder || (idx + 1),
        in_text_tag: c.inTextTag || null,
        user_id: userId,
        created_at: c.createdAt || now,
      }));

      const { error: citeErr } = await supabase.from('manuscript_citations').upsert(citeRows);
      if (citeErr) console.warn('Manuscript citations upsert warning:', citeErr);
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Failed to save project to Supabase:', err);
    return { success: false, error: err };
  }
}

// ----------------------------------------------------------------------------
// Delete Project from Supabase
// ----------------------------------------------------------------------------

export async function deleteProjectFromSupabase(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Failed to delete project from Supabase:', err);
    return { success: false, error: err };
  }
}

// ----------------------------------------------------------------------------
// Duplicate Project in Supabase
// ----------------------------------------------------------------------------

export async function duplicateProjectInSupabase(
  sourceProject: Project,
  userId: string
): Promise<Project | null> {
  const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cloned: Project = {
    ...sourceProject,
    id: newProjectId,
    userId,
    title: `${sourceProject.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDemoProject: false,
  };

  const { success, error } = await saveProjectToSupabase(cloned, userId);
  if (!success || error) {
    console.error('Failed to duplicate project:', error);
    return null;
  }

  return cloned;
}

// ----------------------------------------------------------------------------
// Save Individual Manuscript Section
// ----------------------------------------------------------------------------

export async function saveManuscriptSectionToSupabase(
  section: ManuscriptSection,
  manuscriptId: string,
  projectId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabase || !isSupabaseConfigured) return { success: false, error: null };

  try {
    const { error } = await supabase.from('manuscript_sections').upsert({
      id: section.id,
      manuscript_id: manuscriptId,
      project_id: projectId,
      user_id: userId,
      section_key: section.sectionKey,
      title: section.title,
      content: section.content,
      word_count: section.wordCount,
      provenance_list: section.provenanceList || [],
      updated_at: new Date().toISOString(),
    });

    return { success: !error, error };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

// ----------------------------------------------------------------------------
// Phase 4.1: Reference Normalization & Duplicate Detection
// ----------------------------------------------------------------------------

export function normalizeDoi(doi?: string): string {
  if (!doi) return '';
  let cleaned = doi.trim();
  // Strip URL prefixes and protocol
  cleaned = cleaned.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  cleaned = cleaned.replace(/^doi:\s*/i, '');
  // Strip trailing slashes, periods, spaces
  cleaned = cleaned.replace(/[.,;/\s]+$/, '');
  cleaned = cleaned.trim();
  return cleaned;
}

export function detectDuplicateReference(
  newRef: Partial<ProjectReference>,
  existingRefs: ProjectReference[],
  excludeId?: string
): { isDuplicate: boolean; duplicateOf?: ProjectReference; matchReason?: string } {
  if (!existingRefs || existingRefs.length === 0) {
    return { isDuplicate: false };
  }

  const normNewDoi = normalizeDoi(newRef.doi).toLowerCase();
  const normNewTitle = (newRef.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  for (const existing of existingRefs) {
    if (excludeId && existing.id === excludeId) continue;

    // 1. Check exact normalized DOI match
    if (normNewDoi && existing.doi) {
      const normExistingDoi = normalizeDoi(existing.doi).toLowerCase();
      if (normNewDoi === normExistingDoi) {
        return {
          isDuplicate: true,
          duplicateOf: existing,
          matchReason: `Matching DOI (${existing.doi})`
        };
      }
    }

    // 2. Check sanitized Title match
    if (normNewTitle && normNewTitle.length > 8 && existing.title) {
      const normExistingTitle = existing.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

      if (normNewTitle === normExistingTitle) {
        return {
          isDuplicate: true,
          duplicateOf: existing,
          matchReason: `Matching Title ("${existing.title}")`
        };
      }

      // Check title high similarity / substring match if same publication year
      if (
        newRef.publicationYear &&
        existing.publicationYear &&
        Number(newRef.publicationYear) === Number(existing.publicationYear) &&
        (normNewTitle.includes(normExistingTitle) || normExistingTitle.includes(normNewTitle)) &&
        Math.min(normNewTitle.length, normExistingTitle.length) > 15
      ) {
        return {
          isDuplicate: true,
          duplicateOf: existing,
          matchReason: `Matching Title & Publication Year (${existing.publicationYear})`
        };
      }
    }
  }

  return { isDuplicate: false };
}

// ----------------------------------------------------------------------------
// Phase 4.1: Project Reference CRUD Operations
// ----------------------------------------------------------------------------

export async function fetchProjectReferences(projectId: string): Promise<ProjectReference[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('project_references')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('Error fetching project references:', error);
      return [];
    }

    return data.map((r) => {
      let authorsList: ReferenceAuthor[] = [];
      if (Array.isArray(r.authors)) {
        authorsList = r.authors;
      } else if (typeof r.authors === 'string') {
        try {
          authorsList = JSON.parse(r.authors);
        } catch {
          authorsList = [{ lastName: r.authors, fullName: r.authors }];
        }
      }

        return {
        id: r.id,
        projectId: r.project_id,
        userId: r.user_id,
        title: r.title || 'Untitled Reference',
        authors: authorsList,
        journal: r.journal || undefined,
        publicationYear: r.publication_year ? Number(r.publication_year) : undefined,
        volume: r.volume || undefined,
        issue: r.issue || undefined,
        pages: r.pages || undefined,
        doi: r.doi || undefined,
        pmid: r.pmid || undefined,
        url: r.url || undefined,
        abstract: r.abstract || undefined,
        publisher: r.publisher || undefined,
        sourceDatabase: r.source_database || 'manual',
        citationKey: r.citation_key || undefined,
        verificationStatus: r.verification_status || 'PENDING',
        userNotes: r.user_notes || '',
        relevanceScore: r.relevance_score ? Number(r.relevance_score) : 1.0,
        publicationType: r.publication_type || undefined,
        metadataSource: r.metadata_source || (r.source_database as any) || 'manual',
        metadataSourceUrl: r.metadata_source_url || undefined,
        metadataRetrievedAt: r.metadata_retrieved_at || undefined,
        metadataProvider: r.metadata_provider || undefined,
        rawSourceData: r.raw_source_data || undefined,
        issn: r.issn || undefined,
        isbn: r.isbn || undefined,
        createdFrom: r.created_from || undefined,
        lastVerifiedAt: r.last_verified_at || undefined,
        verifiedBy: r.verified_by || undefined,
        rejectionReason: r.rejection_reason || undefined,
        correctionNotes: r.correction_notes || undefined,
        fieldProvenance: typeof r.field_provenance === 'string' ? JSON.parse(r.field_provenance) : r.field_provenance || undefined,
        verificationHistory: typeof r.verification_history === 'string' ? JSON.parse(r.verification_history) : r.verification_history || undefined,
        extractionConfidence: r.extraction_confidence || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  } catch (err) {
    console.error('Failed to fetch project references:', err);
    return [];
  }
}

export async function fetchSingleProjectReference(referenceId: string): Promise<ProjectReference | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('project_references')
      .select('*')
      .eq('id', referenceId)
      .single();

    if (error || !data) return null;

    let authorsList: ReferenceAuthor[] = [];
    if (Array.isArray(data.authors)) {
      authorsList = data.authors;
    } else if (typeof data.authors === 'string') {
      try {
        authorsList = JSON.parse(data.authors);
      } catch {
        authorsList = [{ lastName: data.authors, fullName: data.authors }];
      }
    }

    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      title: data.title || 'Untitled Reference',
      authors: authorsList,
      journal: data.journal || undefined,
      publicationYear: data.publication_year ? Number(data.publication_year) : undefined,
      volume: data.volume || undefined,
      issue: data.issue || undefined,
      pages: data.pages || undefined,
      doi: data.doi || undefined,
      pmid: data.pmid || undefined,
      url: data.url || undefined,
      abstract: data.abstract || undefined,
      publisher: data.publisher || undefined,
      sourceDatabase: data.source_database || 'manual',
      citationKey: data.citation_key || undefined,
      verificationStatus: data.verification_status || 'PENDING',
      userNotes: data.user_notes || '',
      relevanceScore: data.relevance_score ? Number(data.relevance_score) : 1.0,
      publicationType: data.publication_type || undefined,
      metadataSource: data.metadata_source || (data.source_database as any) || 'manual',
      metadataSourceUrl: data.metadata_source_url || undefined,
      metadataRetrievedAt: data.metadata_retrieved_at || undefined,
      metadataProvider: data.metadata_provider || undefined,
      rawSourceData: data.raw_source_data || undefined,
      issn: data.issn || undefined,
      isbn: data.isbn || undefined,
      createdFrom: data.created_from || undefined,
      lastVerifiedAt: data.last_verified_at || undefined,
      verifiedBy: data.verified_by || undefined,
      rejectionReason: data.rejection_reason || undefined,
      correctionNotes: data.correction_notes || undefined,
      fieldProvenance: typeof data.field_provenance === 'string' ? JSON.parse(data.field_provenance) : data.field_provenance || undefined,
      verificationHistory: typeof data.verification_history === 'string' ? JSON.parse(data.verification_history) : data.verification_history || undefined,
      extractionConfidence: data.extraction_confidence || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('Failed to fetch reference by ID:', err);
    return null;
  }
}

export async function saveProjectReference(
  reference: ProjectReference,
  userId: string
): Promise<{ success: boolean; data?: ProjectReference; error?: any }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: true, data: reference };
  }

  try {
    const now = new Date().toISOString();
    const row: any = {
      id: reference.id,
      project_id: reference.projectId,
      user_id: userId,
      title: reference.title || 'Untitled Reference',
      authors: Array.isArray(reference.authors) ? reference.authors : [],
      journal: reference.journal || null,
      publication_year: reference.publicationYear || null,
      volume: reference.volume || null,
      issue: reference.issue || null,
      pages: reference.pages || null,
      doi: normalizeDoi(reference.doi) || null,
      pmid: reference.pmid || null,
      url: reference.url || null,
      abstract: reference.abstract || null,
      publisher: reference.publisher || null,
      source_database: reference.sourceDatabase || reference.metadataSource || 'manual',
      citation_key: reference.citationKey || null,
      verification_status: reference.verificationStatus || 'PENDING',
      user_notes: reference.userNotes || '',
      relevance_score: reference.relevanceScore || 1.0,
      publication_type: reference.publicationType || null,
      metadata_source: reference.metadataSource || reference.sourceDatabase || 'manual',
      metadata_source_url: reference.metadataSourceUrl || null,
      metadata_retrieved_at: reference.metadataRetrievedAt || null,
      metadata_provider: reference.metadataProvider || null,
      raw_source_data: reference.rawSourceData || null,
      issn: reference.issn || null,
      isbn: reference.isbn || null,
      created_from: reference.createdFrom || null,
      last_verified_at: reference.lastVerifiedAt || null,
      verified_by: reference.verifiedBy || null,
      rejection_reason: reference.rejectionReason || null,
      correction_notes: reference.correctionNotes || null,
      field_provenance: reference.fieldProvenance || null,
      verification_history: reference.verificationHistory || null,
      extraction_confidence: reference.extractionConfidence || null,
      created_at: reference.createdAt || now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('project_references')
      .upsert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to save project reference:', error);
      return { success: false, error };
    }

    return {
      success: true,
      data: {
        ...reference,
        id: data?.id || reference.id,
        updatedAt: data?.updated_at || now,
      }
    };
  } catch (err: any) {
    console.error('Exception in saveProjectReference:', err);
    return { success: false, error: err };
  }
}

export async function deleteProjectReference(
  referenceId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  if (!supabase || !isSupabaseConfigured) return { success: true };

  try {
    const { error } = await supabase
      .from('project_references')
      .delete()
      .eq('id', referenceId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete project reference:', err);
    return { success: false, error: err };
  }
}

export async function updateReferenceVerificationStatus(
  referenceId: string,
  status: ReferenceVerificationStatus,
  userId: string,
  extra?: {
    lastVerifiedAt?: string;
    verifiedBy?: string;
    rejectionReason?: string;
    correctionNotes?: string;
  }
): Promise<{ success: boolean; error?: any }> {
  if (!supabase || !isSupabaseConfigured) return { success: true };

  try {
    const updatePayload: any = {
      verification_status: status,
      updated_at: new Date().toISOString(),
    };

    if (extra?.lastVerifiedAt !== undefined) updatePayload.last_verified_at = extra.lastVerifiedAt;
    if (extra?.verifiedBy !== undefined) updatePayload.verified_by = extra.verifiedBy;
    if (extra?.rejectionReason !== undefined) updatePayload.rejection_reason = extra.rejectionReason;
    if (extra?.correctionNotes !== undefined) updatePayload.correction_notes = extra.correctionNotes;

    const { error } = await supabase
      .from('project_references')
      .update(updatePayload)
      .eq('id', referenceId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update reference verification status:', err);
    return { success: false, error: err };
  }
}

export async function saveReferenceVerificationEvent(
  event: ReferenceVerificationEvent,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  if (!supabase || !isSupabaseConfigured) return { success: true };

  try {
    const row = {
      id: event.id,
      reference_id: event.referenceId,
      project_id: event.projectId,
      user_id: userId,
      action: event.action,
      previous_status: event.previousStatus || null,
      new_status: event.newStatus,
      field_changes: event.fieldChanges || [],
      source: event.source || null,
      performed_by: event.performedBy || 'Researcher',
      performed_at: event.performedAt || new Date().toISOString(),
      reason: event.reason || null,
      notes: event.notes || null,
    };

    const { error } = await supabase
      .from('reference_verification_events')
      .insert(row);

    if (error) {
      console.warn('Could not insert reference_verification_events (table may not exist yet):', error.message);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Error saving verification event:', err);
    return { success: false, error: err };
  }
}

export async function fetchReferenceVerificationEvents(
  referenceId: string
): Promise<ReferenceVerificationEvent[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('reference_verification_events')
      .select('*')
      .eq('reference_id', referenceId)
      .order('performed_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      referenceId: d.reference_id,
      projectId: d.project_id,
      action: d.action,
      previousStatus: d.previous_status,
      newStatus: d.new_status,
      fieldChanges: d.field_changes || [],
      source: d.source,
      performedBy: d.performed_by,
      performedAt: d.performed_at,
      reason: d.reason,
      notes: d.notes,
    }));
  } catch (err) {
    console.error('Failed to fetch reference verification events:', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Phase 4.1: Manuscript Citations CRUD Operations
// ----------------------------------------------------------------------------

export async function fetchManuscriptCitations(projectId: string): Promise<ManuscriptCitation[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('manuscript_citations')
      .select('*')
      .eq('project_id', projectId)
      .order('citation_order', { ascending: true });

    if (error || !data) return [];

    return data.map((c: any) => ({
      id: c.id,
      projectId: c.project_id,
      manuscriptId: c.manuscript_id,
      sectionId: c.section_id,
      referenceId: c.reference_id,
      claimText: c.claim_text || undefined,
      citationOrder: c.citation_order || 1,
      inTextTag: c.in_text_tag || undefined,
      userId: c.user_id,
      createdAt: c.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch manuscript citations:', err);
    return [];
  }
}

export async function saveManuscriptCitation(
  citation: ManuscriptCitation,
  userId: string
): Promise<{ success: boolean; data?: ManuscriptCitation; error?: any }> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: true, data: citation };
  }

  try {
    const row = {
      id: citation.id,
      project_id: citation.projectId,
      manuscript_id: citation.manuscriptId,
      section_id: citation.sectionId,
      reference_id: citation.referenceId,
      claim_text: citation.claimText || null,
      citation_order: citation.citationOrder || 1,
      in_text_tag: citation.inTextTag || null,
      user_id: userId,
      created_at: citation.createdAt || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('manuscript_citations')
      .upsert(row)
      .select()
      .single();

    if (error) {
      console.error('Failed to save manuscript citation:', error);
      return { success: false, error };
    }

    return {
      success: true,
      data: {
        ...citation,
        id: data?.id || citation.id,
      }
    };
  } catch (err: any) {
    console.error('Exception in saveManuscriptCitation:', err);
    return { success: false, error: err };
  }
}

export async function deleteManuscriptCitation(
  citationId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  if (!supabase || !isSupabaseConfigured) return { success: true };

  try {
    const { error } = await supabase
      .from('manuscript_citations')
      .delete()
      .eq('id', citationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete manuscript citation:', err);
    return { success: false, error: err };
  }
}


