import {
  Project,
  UserProfile,
  FormatSpecification,
  DocumentTypeOption,
  QualityReport,
  TitleCandidate,
  MissingInfoItem,
  ClaimTraceabilityItem,
  ResearchFigure,
  ResearchTable
} from '../types';

export async function fetchHealth(): Promise<{ status: string; service: string; aiConfigured: boolean }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch('/api/user/profile');
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function fetchDocumentTypes(): Promise<DocumentTypeOption[]> {
  const res = await fetch('/api/document-types');
  if (!res.ok) throw new Error('Failed to load document types');
  return res.json();
}

export async function fetchFormats(): Promise<FormatSpecification[]> {
  const res = await fetch('/api/formats');
  if (!res.ok) throw new Error('Failed to load formats');
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to load projects');
  return res.json();
}

export async function fetchProjectById(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to load project');
  return res.json();
}

export async function createProject(project: Partial<Project>): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function runProcessingPipeline(project: Partial<Project>): Promise<Project> {
  const res = await fetch('/api/projects/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Pipeline processing failed');
  }
  return res.json();
}

export async function runAssistantAction(
  action: string,
  selectedText: string,
  sectionContext?: string,
  projectContext?: string
): Promise<{ result: string; explanation?: string }> {
  const res = await fetch('/api/assistant/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, selectedText, sectionContext, projectContext }),
  });
  if (!res.ok) throw new Error('Assistant action failed');
  return res.json();
}

export async function runQualityChecks(manuscript: any, facts: any[], formatId: string): Promise<QualityReport> {
  const res = await fetch('/api/quality-checks/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manuscript, facts, formatId }),
  });
  if (!res.ok) throw new Error('Quality check failed');
  return res.json();
}

export async function analyzeResearchFile(file: any, projectContext: any, customInstructions?: string): Promise<any> {
  const res = await fetch('/api/analyze-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, projectContext, customInstructions }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to analyze research file');
  }
  return res.json();
}

export async function analyzeResearchMaterials(files: any[], projectContext: any, customInstructions?: string): Promise<any> {
  const res = await fetch('/api/analyze-materials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, projectContext, customInstructions }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to analyze research materials');
  }
  return res.json();
}

export async function extractProjectFacts(projectData: Partial<Project>): Promise<{ facts: any[]; summary: any }> {
  const res = await fetch('/api/extract-facts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to extract facts');
  }
  return res.json();
}

export async function generateManuscriptPlan(projectData: Partial<Project>): Promise<any> {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate manuscript plan');
  }
  return res.json();
}

export async function generateAcademicSection(
  sectionTitle: string,
  payload: any,
  relevantFacts: any[],
  options?: any
): Promise<any> {
  const res = await fetch('/api/generate-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionTitle, payload, relevantFacts, options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate academic section');
  }
  return res.json();
}

export async function generateTitleCandidates(project: Partial<Project>): Promise<TitleCandidate[]> {
  const res = await fetch('/api/generate-titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate title candidates');
  }
  const data = await res.json();
  return data.candidates || [];
}

export async function detectMissingInformation(
  sectionKey: string,
  sectionContent: string,
  projectContext: Partial<Project>
): Promise<MissingInfoItem[]> {
  const res = await fetch('/api/detect-missing-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionKey, sectionContent, projectContext }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to detect missing information');
  }
  const data = await res.json();
  return data.missingInfo || [];
}

export async function explainClaim(
  claimSnippet: string,
  projectContext: Partial<Project>
): Promise<ClaimTraceabilityItem> {
  const res = await fetch('/api/explain-claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimSnippet, projectContext }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to explain claim');
  }
  return res.json();
}

export async function generateFigureCaption(
  figure: ResearchFigure,
  projectContext: Partial<Project>
): Promise<{ caption: string; notes?: string }> {
  const res = await fetch('/api/generate-figure-caption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ figure, projectContext }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate figure caption');
  }
  return res.json();
}

export async function generateTableCaption(
  table: ResearchTable,
  projectContext: Partial<Project>
): Promise<{ caption: string; footnotes?: string }> {
  const res = await fetch('/api/generate-table-caption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, projectContext }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate table caption');
  }
  return res.json();
}

export async function createManuscriptVersion(projectId: string, versionData: any): Promise<any> {
  const res = await fetch(`/api/projects/${projectId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(versionData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create snapshot version');
  }
  return res.json();
}

export async function exportManuscript(project: Project): Promise<void> {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project }),
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)}_Manuscript.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
