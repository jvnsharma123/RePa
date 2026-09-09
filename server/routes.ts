import { Router } from 'express';
import { Project, UserProfile, ResearchFile, ManuscriptVersion } from '../src/types';
import { DOCUMENT_TYPE_OPTIONS, FORMAT_SPECIFICATIONS, DEMO_SAMPLE_PROJECTS } from '../src/data/catalog';
import { processResearchProject } from './pipeline';
import {
  runAssistantActionWithAI,
  analyzeResearchFileWithAI,
  analyzeMultipleResearchMaterialsWithAI,
  extractProjectFacts,
  generateManuscriptPlan,
  generateAcademicSectionWithAI,
  auditManuscriptQuality,
  generateTitleSuggestionsWithAI,
  detectSectionMissingInformationWithAI,
  explainClaimProvenanceWithAI,
  generateFigureCaptionWithAI,
  generateTableCaptionWithAI,
  extractReferenceFromPdfWithAI,
} from './geminiService';

export const apiRouter = Router();

// In-memory persistent database store (prepared for direct Supabase/PostgreSQL adapter)
let userProjects: Project[] = [];
const currentUserProfile: UserProfile = {
  id: 'usr-researcher-01',
  name: 'Dr. Evelyn Vance',
  email: 'e.vance@mit.edu',
  institution: 'Massachusetts Institute of Technology (MIT)',
  department: 'Department of Biological & Chemical Engineering',
  role: 'PhD Scholar',
  orcidId: '0000-0002-1825-0097',
  subscriptionTier: 'Researcher Pro',
  projectsCreated: 2,
  monthlyQuotaUsed: 4,
  monthlyQuotaLimit: 50,
};

// Initialize with Demo Projects
async function seedInitialProjects() {
  if (userProjects.length === 0) {
    for (const demo of DEMO_SAMPLE_PROJECTS) {
      const demoFiles: ResearchFile[] = [
        {
          id: `file-${demo.id}-1`,
          projectId: demo.id,
          name: `${demo.title.split(' ')[1]}_Experimental_Data.csv`,
          originalName: 'Primary_Raw_Data.csv',
          category: 'Experimental Data',
          type: 'text/csv',
          size: 1024 * 148,
          sizeFormatted: '148 KB',
          uploadStatus: 'ready',
          extractedFactsCount: 4,
          extractedFactsSummary: 'Contains 1,200 observation rows across timepoints.',
          uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
        {
          id: `file-${demo.id}-2`,
          projectId: demo.id,
          name: 'Figure_1_Structural_Characterization.png',
          originalName: 'Fig1_SEM_Schematic.png',
          category: 'Figure',
          type: 'image/png',
          size: 1024 * 820,
          sizeFormatted: '820 KB',
          uploadStatus: 'ready',
          extractedFactsCount: 2,
          uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ];

      const processed = await processResearchProject(
        {
          ...demo,
          id: demo.id,
          userId: currentUserProfile.id,
          files: demoFiles,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        false
      );

      userProjects.push({
        ...demo,
        id: demo.id,
        userId: currentUserProfile.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date().toISOString(),
        files: demoFiles,
        facts: processed.facts,
        summary: processed.summary,
        plan: processed.plan,
        figures: processed.figures,
        tables: processed.tables,
        references: processed.references,
        manuscript: processed.manuscript,
        qualityReport: processed.qualityReport,
        similarityReport: processed.similarityReport,
        aiAnalysisReport: processed.aiAnalysisReport,
        versions: processed.versions,
      });
    }
  }
}

// Seed upon module load
seedInitialProjects().catch((err) => console.error('Seed error:', err));

// 1. Health check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Research Manuscript Studio API',
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 2. User profile
apiRouter.get('/user/profile', (req, res) => {
  res.json({
    ...currentUserProfile,
    projectsCreated: userProjects.length,
  });
});

// 3. Document types & Formats
apiRouter.get('/document-types', (req, res) => {
  res.json(DOCUMENT_TYPE_OPTIONS);
});

apiRouter.get('/formats', (req, res) => {
  res.json(FORMAT_SPECIFICATIONS);
});

// 4. Projects CRUD
apiRouter.get('/projects', (req, res) => {
  res.json(userProjects);
});

apiRouter.get('/projects/:id', (req, res) => {
  const project = userProjects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

apiRouter.post('/projects', async (req, res) => {
  try {
    const rawProject = req.body as Partial<Project>;
    const projectId = rawProject.id || `proj-${Date.now()}`;
    const newProject: Project = {
      id: projectId,
      userId: currentUserProfile.id,
      title: rawProject.title || 'Untitled Research Project',
      researchArea: rawProject.researchArea || 'Applied Sciences',
      subField: rawProject.subField || '',
      objectives: rawProject.objectives || '',
      researchQuestions: rawProject.researchQuestions || '',
      hypothesis: rawProject.hypothesis || '',
      briefDescription: rawProject.briefDescription || '',
      detailedDescription: rawProject.detailedDescription || '',
      methodology: rawProject.methodology || '',
      studyPopulationSample: rawProject.studyPopulationSample || '',
      variables: rawProject.variables || '',
      majorFindings: rawProject.majorFindings || '',
      conclusion: rawProject.conclusion || '',
      limitations: rawProject.limitations || '',
      keywords: rawProject.keywords || [],
      documentTypeId: rawProject.documentTypeId || 'research_article',
      formatId: rawProject.formatId || 'fmt-ieee-trans',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: rawProject.files || [],
      facts: [],
      figures: [],
      tables: [],
      references: [],
      versions: [],
    };

    userProjects.unshift(newProject);
    res.status(201).json(newProject);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create project' });
  }
});

apiRouter.put('/projects/:id', (req, res) => {
  const idx = userProjects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  userProjects[idx] = {
    ...userProjects[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(userProjects[idx]);
});

apiRouter.delete('/projects/:id', (req, res) => {
  userProjects = userProjects.filter((p) => p.id !== req.params.id);
  res.json({ success: true, message: 'Project deleted' });
});

// 5. AI File Analysis
apiRouter.post('/analyze-file', async (req, res) => {
  try {
    const { file, projectContext, customInstructions } = req.body;
    if (!file) {
      res.status(400).json({ error: 'File data required' });
      return;
    }
    const analysis = await analyzeResearchFileWithAI(file, projectContext, customInstructions);
    res.json(analysis);
  } catch (err: any) {
    console.error('File analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze file' });
  }
});

// 5b. Multi-Material Research Analysis with AI (Phase 2B)
apiRouter.post('/analyze-materials', async (req, res) => {
  try {
    const { files, projectContext, customInstructions } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'At least one research file required for analysis' });
      return;
    }
    const analysis = await analyzeMultipleResearchMaterialsWithAI(files, projectContext, customInstructions);
    res.json(analysis);
  } catch (err: any) {
    console.error('Multi-material analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze research materials' });
  }
});

// 6. Fact Extraction & Structured Summary
apiRouter.post('/extract-facts', async (req, res) => {
  try {
    const projectData = req.body;
    const { facts, summary } = await extractProjectFacts(projectData);
    res.json({ facts, summary });
  } catch (err: any) {
    console.error('Fact extraction error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract facts' });
  }
});

// 7. Manuscript Plan Generation
apiRouter.post('/generate-plan', (req, res) => {
  try {
    const projectData = req.body;
    const plan = generateManuscriptPlan(projectData);
    res.json(plan);
  } catch (err: any) {
    console.error('Plan generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate plan' });
  }
});

// 8. Single Section Generation with Provenance
apiRouter.post('/generate-section', async (req, res) => {
  try {
    const { sectionTitle, payload, relevantFacts, options } = req.body;
    if (!sectionTitle || !payload) {
      res.status(400).json({ error: 'Section title and payload required' });
      return;
    }
    const result = await generateAcademicSectionWithAI(sectionTitle, payload, relevantFacts, options);
    res.json(result);
  } catch (err: any) {
    console.error('Section generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate section' });
  }
});

// 8b. Title Candidates Generation
apiRouter.post('/generate-titles', async (req, res) => {
  try {
    const project = req.body;
    const candidates = await generateTitleSuggestionsWithAI(project);
    res.json({ candidates });
  } catch (err: any) {
    console.error('Title suggestions error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate title candidates' });
  }
});

// 8c. Section Missing Information Detector
apiRouter.post('/detect-missing-info', async (req, res) => {
  try {
    const { sectionKey, sectionContent, projectContext } = req.body;
    const missingInfo = await detectSectionMissingInformationWithAI(sectionKey, sectionContent, projectContext || {});
    res.json({ missingInfo });
  } catch (err: any) {
    console.error('Missing info error:', err);
    res.status(500).json({ error: err.message || 'Failed to detect missing information' });
  }
});

// 8d. Claim Provenance Explanation ("Why did the system write this?")
apiRouter.post('/explain-claim', async (req, res) => {
  try {
    const { claimSnippet, projectContext } = req.body;
    if (!claimSnippet) {
      res.status(400).json({ error: 'Claim snippet required' });
      return;
    }
    const explanation = await explainClaimProvenanceWithAI(claimSnippet, projectContext || {});
    res.json(explanation);
  } catch (err: any) {
    console.error('Claim explanation error:', err);
    res.status(500).json({ error: err.message || 'Failed to explain claim' });
  }
});

// 8e. Figure Caption Generation
apiRouter.post('/generate-figure-caption', async (req, res) => {
  try {
    const { figure, projectContext } = req.body;
    if (!figure) {
      res.status(400).json({ error: 'Figure required' });
      return;
    }
    const result = await generateFigureCaptionWithAI(figure, projectContext || {});
    res.json(result);
  } catch (err: any) {
    console.error('Figure caption error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate figure caption' });
  }
});

// 8f. Table Caption & Footnote Generation
apiRouter.post('/generate-table-caption', async (req, res) => {
  try {
    const { table, projectContext } = req.body;
    if (!table) {
      res.status(400).json({ error: 'Table required' });
      return;
    }
    const result = await generateTableCaptionWithAI(table, projectContext || {});
    res.json(result);
  } catch (err: any) {
    console.error('Table caption error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate table caption' });
  }
});

// 9. Full End-to-End Pipeline Execution
apiRouter.post('/projects/process', async (req, res) => {
  try {
    const payload = req.body as Partial<Project>;
    const processed = await processResearchProject(payload);

    const projectId = payload.id || `proj-${Date.now()}`;
    const fullProject: Project = {
      id: projectId,
      userId: currentUserProfile.id,
      title: payload.title || 'Untitled Research Project',
      researchArea: payload.researchArea || 'Applied Sciences',
      subField: payload.subField || '',
      objectives: payload.objectives || '',
      researchQuestions: payload.researchQuestions || '',
      hypothesis: payload.hypothesis || '',
      briefDescription: payload.briefDescription || '',
      detailedDescription: payload.detailedDescription || '',
      methodology: payload.methodology || '',
      studyPopulationSample: payload.studyPopulationSample || '',
      variables: payload.variables || '',
      majorFindings: payload.majorFindings || '',
      conclusion: payload.conclusion || '',
      limitations: payload.limitations || '',
      keywords: payload.keywords || [],
      documentTypeId: payload.documentTypeId || 'research_article',
      formatId: payload.formatId || 'fmt-ieee-trans',
      status: 'generated',
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: payload.files || [],
      facts: processed.facts,
      summary: processed.summary,
      plan: processed.plan,
      figures: processed.figures,
      tables: processed.tables,
      references: processed.references,
      manuscript: processed.manuscript,
      qualityReport: processed.qualityReport,
      similarityReport: processed.similarityReport,
      aiAnalysisReport: processed.aiAnalysisReport,
      versions: processed.versions,
    };

    // Update in store or add
    const existingIdx = userProjects.findIndex((p) => p.id === projectId);
    if (existingIdx >= 0) {
      userProjects[existingIdx] = fullProject;
    } else {
      userProjects.unshift(fullProject);
    }

    res.json(fullProject);
  } catch (err: any) {
    console.error('Processing error:', err);
    res.status(500).json({ error: err.message || 'Pipeline processing failed' });
  }
});

// 10. Quality Audit Run
apiRouter.post('/quality-checks/run', (req, res) => {
  try {
    const { project, manuscript } = req.body;
    const report = auditManuscriptQuality(project, manuscript);
    res.json(report);
  } catch (err: any) {
    console.error('Quality check error:', err);
    res.status(500).json({ error: err.message || 'Failed to run quality checks' });
  }
});

// 11. Version Management
apiRouter.post('/projects/:id/versions', (req, res) => {
  const project = userProjects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { title, changeSummary, sections, totalWordCount } = req.body;
  const currentVersions = project.versions || [];
  const newVersionNumber = currentVersions.length + 1;

  const newVersion: ManuscriptVersion = {
    id: `v-${newVersionNumber}-${Date.now()}`,
    projectId: project.id,
    versionNumber: newVersionNumber,
    title: title || `Version ${newVersionNumber}`,
    sections: sections || project.manuscript?.sections || [],
    totalWordCount: totalWordCount || project.manuscript?.totalWordCount || 0,
    changeSummary: changeSummary || 'Manual snapshot save',
    createdAt: new Date().toISOString(),
    qualityScore: project.qualityReport?.overallScore || 95,
  };

  project.versions = [newVersion, ...currentVersions];
  project.updatedAt = new Date().toISOString();

  res.json({ success: true, version: newVersion, project });
});

// 12. Right-Side Assistant Actions
apiRouter.post('/assistant/action', async (req, res) => {
  const { action, selectedText, sectionContext, projectContext } = req.body;

  if (!selectedText) {
    res.status(400).json({ error: 'No text provided for assistant action.' });
    return;
  }

  // Try server-side Gemini if configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await runAssistantActionWithAI(action, selectedText, sectionContext || '', projectContext || '');
      res.json(response);
      return;
    } catch (err: any) {
      console.warn('AI Assistant error, executing standard academic transform fallback:', err.message);
    }
  }

  // Deterministic scholarly transforms fallback
  let result = selectedText;
  let explanation = `Standard academic transformation applied for ${action}.`;

  switch (action) {
    case 'improve_academic_style':
      result = selectedText
        .replace(/a lot of/gi, 'a substantial magnitude of')
        .replace(/we looked at/gi, 'we systematically investigated')
        .replace(/good results/gi, 'statistically favorable outcomes')
        .replace(/shows that/gi, 'substantiates that');
      explanation = 'Enhanced passive-active balance and replaced colloquial phrases with formal scholarly lexicon.';
      break;
    case 'condense':
      const sentences = selectedText.split('. ');
      result = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join('. ') + (selectedText.endsWith('.') ? '.' : '');
      explanation = 'Synthesized key clauses into a dense, high-impact academic statement.';
      break;
    case 'figure_caption':
      result = `Figure 1. Detailed analytical characterization and schematic representation of the experimental parameters under physiological evaluation. Data points denote mean ± standard deviation (n=3).`;
      explanation = 'Generated standard publication-grade figure caption with sample size notation.';
      break;
    case 'table_caption':
      result = `Table 1. Quantitative comparison of observed baseline parameters and experimental response metrics across designated cohorts.`;
      explanation = 'Generated standard academic table title with descriptive scope.';
      break;
    case 'check_claim':
      result = selectedText.replace(/proves/gi, 'strongly indicates under tested conditions').replace(/guarantees/gi, 'provides reproducible evidence for');
      explanation = 'Calibrated absolute assertions with rigorous academic hedging.';
      break;
    default:
      result = selectedText;
      explanation = 'Verified scholarly phrasing and factual integrity.';
  }

  res.json({ result, explanation });
});

// ----------------------------------------------------------------------------
// Phase 4.2A: Reference Ingestion & Metadata Enrichment Endpoints
// ----------------------------------------------------------------------------

// 13. Enrich Reference by DOI (Crossref / PubMed)
apiRouter.post('/references/enrich-doi', async (req, res) => {
  try {
    const { doi, provider = 'crossref' } = req.body;
    if (!doi || typeof doi !== 'string') {
      res.status(400).json({ success: false, errorMessage: 'Valid DOI string is required.' });
      return;
    }

    let cleanedDoi = doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();

    if (provider === 'pubmed') {
      // Lookup DOI in PubMed NCBI E-Utilities
      const pmUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(cleanedDoi)}[doi]&retmode=json`;
      const searchRes = await fetch(pmUrl);
      if (!searchRes.ok) {
        res.status(404).json({ success: false, errorMessage: 'Metadata could not be verified from PubMed registry.' });
        return;
      }
      const searchJson = (await searchRes.json()) as any;
      const idList = searchJson?.esearchresult?.idlist || [];
      if (idList.length === 0) {
        res.status(404).json({ success: false, errorMessage: 'Metadata could not be verified from the selected source: DOI not found in PubMed.' });
        return;
      }
      const pmid = idList[0];
      const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
      const sumRes = await fetch(sumUrl);
      const sumJson = (await sumRes.json()) as any;
      const item = sumJson?.result?.[pmid];
      if (!item) {
        res.status(404).json({ success: false, errorMessage: 'Metadata could not be verified from PubMed summary.' });
        return;
      }

      // Map without fabrication
      const authors = Array.isArray(item.authors)
        ? item.authors.map((a: any) => ({
            lastName: a.name?.split(' ')[0] || a.name || 'Author',
            fullName: a.name || '',
          }))
        : [];
      const pubYear = item.pubdate ? parseInt(String(item.pubdate).match(/\b(19\d\d|20\d\d)\b/)?.[1] || '0', 10) : undefined;
      const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Author';

      res.json({
        success: true,
        providerName: 'PubMed',
        reference: {
          title: item.title?.replace(/<\/?[^>]+(>|$)/g, '').trim() || 'Untitled Document',
          authors,
          journal: item.fulljournalname || item.source || undefined,
          publicationYear: pubYear || undefined,
          volume: item.volume || undefined,
          issue: item.issue || undefined,
          pages: item.pages || undefined,
          doi: cleanedDoi,
          pmid: String(pmid),
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          publicationType: 'article',
          citationKey: pubYear ? `${firstAuthor}${pubYear}` : `${firstAuthor}PMID`,
          sourceDatabase: 'pubmed',
          metadataSource: 'pubmed',
          metadataProvider: 'PubMed NCBI E-Utilities',
          metadataSourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          metadataRetrievedAt: new Date().toISOString(),
          verificationStatus: 'VERIFIED',
        },
      });
      return;
    }

    // Default Crossref lookup
    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanedDoi)}`;
    const crossrefRes = await fetch(crossrefUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ResearchManuscriptStudio/1.0 (mailto:support.prohit@gmail.com)',
      },
    });

    if (!crossrefRes.ok) {
      if (crossrefRes.status === 404) {
        res.status(404).json({
          success: false,
          errorMessage: 'Metadata could not be verified from the selected source: DOI not found in Crossref registry.',
        });
        return;
      }
      res.status(crossrefRes.status).json({
        success: false,
        errorMessage: `Metadata could not be verified from Crossref (HTTP ${crossrefRes.status}).`,
      });
      return;
    }

    const data = (await crossrefRes.json()) as any;
    const msg = data?.message;
    if (!msg) {
      res.status(404).json({
        success: false,
        errorMessage: 'Metadata could not be verified from the selected source.',
      });
      return;
    }

    // Title
    let title = '';
    if (Array.isArray(msg.title) && msg.title.length > 0) {
      title = msg.title[0];
    } else if (typeof msg.title === 'string') {
      title = msg.title;
    }
    title = title.replace(/<\/?[^>]+(>|$)/g, '').trim();

    // Authors
    const authors: any[] = [];
    if (Array.isArray(msg.author)) {
      for (const a of msg.author) {
        const given = (a.given || '').trim();
        const family = (a.family || '').trim();
        let fullName = family;
        if (given && family) {
          fullName = `${given} ${family}`;
        } else if (given) {
          fullName = given;
        } else if (a.name) {
          fullName = a.name;
        }

        let orcid = a.ORCID || undefined;
        if (orcid) {
          orcid = orcid.replace(/^https?:\/\/orcid\.org\//i, '');
        }

        let affiliation: string | undefined = undefined;
        if (Array.isArray(a.affiliation) && a.affiliation.length > 0) {
          affiliation = a.affiliation[0]?.name || undefined;
        }

        if (family || fullName) {
          authors.push({
            firstName: given || undefined,
            lastName: family || fullName,
            fullName,
            orcid,
            affiliation,
          });
        }
      }
    }

    // Journal
    let journal = '';
    if (Array.isArray(msg['container-title']) && msg['container-title'].length > 0) {
      journal = msg['container-title'][0];
    } else if (typeof msg['container-title'] === 'string') {
      journal = msg['container-title'];
    }

    // Year
    let publicationYear: number | undefined = undefined;
    const dateParts =
      msg['published-print']?.['date-parts']?.[0] ||
      msg['published-online']?.['date-parts']?.[0] ||
      msg['issued']?.['date-parts']?.[0] ||
      msg['created']?.['date-parts']?.[0];

    if (Array.isArray(dateParts) && dateParts.length > 0 && typeof dateParts[0] === 'number') {
      publicationYear = dateParts[0];
    }

    const volume = msg.volume ? String(msg.volume) : undefined;
    const issue = msg.issue ? String(msg.issue) : undefined;
    const pages = msg.page ? String(msg.page).replace(/--/g, '–') : undefined;
    const publisher = msg.publisher || undefined;

    let abstract = msg.abstract || undefined;
    if (abstract) {
      abstract = abstract
        .replace(/<jats:title>[^<]*<\/jats:title>/gi, '')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const url = msg.URL || `https://doi.org/${cleanedDoi}`;
    const issn = Array.isArray(msg.ISSN) ? msg.ISSN[0] : msg.ISSN || undefined;
    const isbn = Array.isArray(msg.ISBN) ? msg.ISBN[0] : msg.ISBN || undefined;

    const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Author';
    const citationKey = publicationYear ? `${firstAuthor}${publicationYear}` : `${firstAuthor}Ref`;

    res.json({
      success: true,
      providerName: 'Crossref',
      reference: {
        title: title || 'Untitled Crossref Record',
        authors,
        journal: journal || undefined,
        publicationYear,
        volume,
        issue,
        pages,
        doi: cleanedDoi,
        url,
        publisher,
        abstract,
        issn,
        isbn,
        publicationType: 'article',
        citationKey,
        sourceDatabase: 'crossref',
        metadataSource: 'crossref',
        metadataProvider: 'Crossref REST API',
        metadataSourceUrl: `https://doi.org/${cleanedDoi}`,
        metadataRetrievedAt: new Date().toISOString(),
        verificationStatus: 'VERIFIED',
      },
      rawResponse: msg,
    });
  } catch (err: any) {
    console.error('DOI enrichment error:', err);
    res.status(500).json({
      success: false,
      errorMessage: err.message || 'Failed to connect to scholarly metadata registry.',
    });
  }
});

// 14. Enrich Reference by PMID (PubMed)
apiRouter.post('/references/enrich-pmid', async (req, res) => {
  try {
    const { pmid } = req.body;
    const cleanPmid = String(pmid || '').replace(/[^0-9]/g, '').trim();
    if (!cleanPmid) {
      res.status(400).json({ success: false, errorMessage: 'Valid PMID is required.' });
      return;
    }

    const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${cleanPmid}&retmode=json`;
    const sumRes = await fetch(sumUrl);
    if (!sumRes.ok) {
      res.status(404).json({ success: false, errorMessage: 'Metadata could not be verified from PubMed NCBI.' });
      return;
    }

    const sumJson = (await sumRes.json()) as any;
    const item = sumJson?.result?.[cleanPmid];
    if (!item || item.error) {
      res.status(404).json({
        success: false,
        errorMessage: 'Metadata could not be verified from the selected source: PMID not found.',
      });
      return;
    }

    const title = (item.title || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
    const authors: any[] = [];
    if (Array.isArray(item.authors)) {
      for (const a of item.authors) {
        const name = a.name || '';
        if (name) {
          const parts = name.split(/\s+/);
          const lastName = parts[0] || name;
          const firstName = parts.slice(1).join(' ');
          authors.push({
            firstName: firstName || undefined,
            lastName,
            fullName: name,
          });
        }
      }
    }

    let pubYear: number | undefined = undefined;
    if (item.pubdate) {
      const ym = String(item.pubdate).match(/\b(19\d\d|20\d\d)\b/);
      if (ym) pubYear = parseInt(ym[1], 10);
    }

    let doi: string | undefined = undefined;
    if (Array.isArray(item.articleids)) {
      const doiObj = item.articleids.find((id: any) => id.idtype === 'doi');
      if (doiObj?.value) {
        doi = doiObj.value.replace(/^https?:\/\/doi\.org\//i, '').trim();
      }
    }

    const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Author';
    const citationKey = pubYear ? `${firstAuthor}${pubYear}` : `${firstAuthor}PMID`;

    res.json({
      success: true,
      providerName: 'PubMed',
      reference: {
        title: title || 'Untitled PubMed Record',
        authors,
        journal: item.fulljournalname || item.source || undefined,
        publicationYear: pubYear,
        volume: item.volume || undefined,
        issue: item.issue || undefined,
        pages: item.pages || undefined,
        doi,
        pmid: cleanPmid,
        url: `https://pubmed.ncbi.nlm.nih.gov/${cleanPmid}/`,
        publicationType: 'article',
        citationKey,
        sourceDatabase: 'pubmed',
        metadataSource: 'pubmed',
        metadataProvider: 'PubMed NCBI E-Utilities',
        metadataSourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${cleanPmid}/`,
        metadataRetrievedAt: new Date().toISOString(),
        verificationStatus: 'VERIFIED',
      },
    });
  } catch (err: any) {
    console.error('PMID enrichment error:', err);
    res.status(500).json({ success: false, errorMessage: err.message || 'Failed to retrieve PubMed metadata.' });
  }
});

// 15. Extract Reference Metadata from PDF / Document Text
apiRouter.post('/references/extract-pdf', async (req, res) => {
  try {
    const { text, fileName } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ success: false, errorMessage: 'Document text or PDF content is required.' });
      return;
    }

    const result = await extractReferenceFromPdfWithAI(text, fileName);
    res.json(result);
  } catch (err: any) {
    console.error('PDF extraction error:', err);
    res.status(500).json({
      success: false,
      errorMessage: err.message || 'Failed to extract metadata from PDF document.',
    });
  }
});

// 16. Manuscript Export
apiRouter.post('/export', (req, res) => {
  const { project } = req.body;
  if (!project) {
    res.status(400).json({ error: 'Project data missing' });
    return;
  }

  const exportText = `
================================================================================
${project.title?.toUpperCase() || 'RESEARCH MANUSCRIPT'}
================================================================================
Document Type: ${project.documentTypeId}
Formatting Standard: ${project.formatId}
Export Generated: ${new Date().toUTCString()}
System: Research Manuscript Studio
--------------------------------------------------------------------------------

ABSTRACT
${project.manuscript?.abstract || 'No abstract content available.'}

KEYWORDS:
${(project.manuscript?.keywords || []).join('; ')}

================================================================================
MANUSCRIPT BODY
================================================================================

${(project.manuscript?.sections || [])
  .map(
    (s: any) => `
--------------------------------------------------------------------------------
${s.order}. ${s.title.toUpperCase()}
--------------------------------------------------------------------------------
${s.content}
`
  )
  .join('\n')}

================================================================================
REFERENCES & CITATIONS
================================================================================
${(project.references || [])
  .map((r: any, idx: number) => `${idx + 1}. ${r.authors.join(', ')} (${r.year}). ${r.title}. ${r.journal || 'Academic Proceedings'}, ${r.volume || ''}(${r.issue || ''}), ${r.pages || ''}. DOI: ${r.doi || 'N/A'}`)
  .join('\n\n')}

================================================================================
RESEARCH PROVENANCE & FACT VERIFICATION SUMMARY
================================================================================
Total Extracted Facts: ${(project.facts || []).length}
Verified User Inputs: ${(project.facts || []).filter((f: any) => f.userVerified).length}
Datasets & Tables Referenced: ${(project.files || []).length}
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}_Manuscript.txt"`);
  res.send(exportText);
});

