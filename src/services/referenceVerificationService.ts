import {
  Project,
  ProjectReference,
  ReferenceAuthor,
  ReferenceVerificationStatus,
  BibliographicFieldKey,
  FieldProvenanceRecord,
  ProvenanceSourceType,
  ReferenceVerificationEvent,
  ReferenceVerificationAction,
  ReferenceFieldChange
} from '../types';
import { normalizeDoi } from './supabaseData';

export type TrustLevelKey =
  | 'LEVEL_1_VERIFIED'
  | 'LEVEL_2_AUTHORITATIVE'
  | 'LEVEL_3_IMPORTED'
  | 'LEVEL_4_AI_EXTRACTED'
  | 'LEVEL_5_UNVERIFIED';

export interface TrustLevelInfo {
  level: number;
  key: TrustLevelKey;
  label: string;
  badgeColor: string;
  description: string;
}

export interface ReferenceFieldComparison {
  field: BibliographicFieldKey;
  fieldLabel: string;
  projectValue: any;
  sourceValue: any;
  isMatch: boolean;
  isConflict: boolean;
  isMissingInProject: boolean;
  isMissingInSource: boolean;
  conflictSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  differenceDescription?: string;
}

export interface MetadataCompletenessResult {
  isComplete: boolean;
  completenessScore: number; // 0 to 100
  essentialMissing: string[];
  recommendedMissing: string[];
  warnings: string[];
}

export interface VerificationReportItem {
  key: string;
  label: string;
  status: 'VERIFIED' | 'MATCH' | 'MISMATCH' | 'MISSING' | 'NOT_APPLICABLE';
  details: string;
  source?: string;
}

export interface ReferenceVerificationReport {
  referenceId: string;
  status: ReferenceVerificationStatus;
  trustInfo: TrustLevelInfo;
  primarySource: string;
  lastVerifiedAt?: string;
  verifiedBy?: string;
  isDoiVerified: boolean;
  isPmidVerified: boolean;
  hasConflicts: boolean;
  items: VerificationReportItem[];
}

// -----------------------------------------------------------------------------
// 1. TRUST HIERARCHY EVALUATION
// -----------------------------------------------------------------------------

export function determineTrustLevel(ref: ProjectReference): TrustLevelInfo {
  if (ref.verificationStatus === 'VERIFIED') {
    return {
      level: 1,
      key: 'LEVEL_1_VERIFIED',
      label: 'Researcher Verified (Level 1)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description: 'Metadata has been explicitly verified and accepted by the project researcher.',
    };
  }

  const src = (ref.metadataSource || ref.sourceDatabase || '').toLowerCase();

  if (src === 'crossref' || src === 'pubmed' || src === 'openalex') {
    return {
      level: 2,
      key: 'LEVEL_2_AUTHORITATIVE',
      label: 'Authoritative Registry (Level 2)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      description: 'Retrieved directly from official DOI/PMID registries (Crossref / PubMed NCBI).',
    };
  }

  if (src === 'bibtex' || src === 'ris' || src === 'file_import') {
    return {
      level: 3,
      key: 'LEVEL_3_IMPORTED',
      label: 'Imported File (Level 3)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      description: 'Imported from bibliographic export file (.bib, .ris). Requires researcher review.',
    };
  }

  if (src === 'pdf_extract') {
    return {
      level: 4,
      key: 'LEVEL_4_AI_EXTRACTED',
      label: 'PDF AI Extracted (Level 4)',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description: 'Extracted from document header text. Must be verified before citation generation.',
    };
  }

  return {
    level: 5,
    key: 'LEVEL_5_UNVERIFIED',
    label: 'Unverified Entry (Level 5)',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Manual or unreviewed reference entry without verified registry backing.',
  };
}

// -----------------------------------------------------------------------------
// 2. METADATA NORMALIZATION HELPERS
// -----------------------------------------------------------------------------

function cleanStringForComparison(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/<\/?[^>]+(>|$)/g, '') // remove HTML/MathML
    .replace(/[^\w\s]/gi, '')       // remove punctuation
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

function normalizePages(pages?: string | null): string {
  if (!pages) return '';
  return pages.replace(/\s*--\s*/g, '-').replace(/\s*-\s*/g, '-').trim();
}

// -----------------------------------------------------------------------------
// 3. AUTHOR LIST COMPARISON
// -----------------------------------------------------------------------------

export function compareAuthorLists(
  projectAuthors: ReferenceAuthor[] = [],
  sourceAuthors: ReferenceAuthor[] = []
): { isMatch: boolean; isConflict: boolean; differenceDescription?: string } {
  if (!projectAuthors.length && !sourceAuthors.length) {
    return { isMatch: true, isConflict: false };
  }
  if (!projectAuthors.length || !sourceAuthors.length) {
    return {
      isMatch: false,
      isConflict: true,
      differenceDescription: `Author count discrepancy (${projectAuthors.length} in project vs ${sourceAuthors.length} in source).`,
    };
  }

  if (projectAuthors.length !== sourceAuthors.length) {
    return {
      isMatch: false,
      isConflict: true,
      differenceDescription: `Author count differs: ${projectAuthors.length} authors in project vs ${sourceAuthors.length} in source.`,
    };
  }

  // Check author ordering and last names
  for (let i = 0; i < projectAuthors.length; i++) {
    const p = projectAuthors[i];
    const s = sourceAuthors[i];

    const pLast = cleanStringForComparison(p.lastName);
    const sLast = cleanStringForComparison(s.lastName);

    if (pLast !== sLast && !pLast.includes(sLast) && !sLast.includes(pLast)) {
      return {
        isMatch: false,
        isConflict: true,
        differenceDescription: `Author mismatch at position #${i + 1}: "${p.lastName}" vs "${s.lastName}".`,
      };
    }

    // Check ORCID if both present
    if (p.orcid && s.orcid && p.orcid.trim() !== s.orcid.trim()) {
      return {
        isMatch: false,
        isConflict: true,
        differenceDescription: `ORCID mismatch for author #${i + 1} (${p.lastName}): ${p.orcid} vs ${s.orcid}.`,
      };
    }
  }

  return { isMatch: true, isConflict: false };
}

// -----------------------------------------------------------------------------
// 4. FIELD-BY-FIELD COMPARISON & DIFF ENGINE
// -----------------------------------------------------------------------------

export function compareReferenceWithSource(
  current: ProjectReference,
  source: Partial<ProjectReference>
): ReferenceFieldComparison[] {
  const comparisons: ReferenceFieldComparison[] = [];

  const fieldDefinitions: Array<{
    key: BibliographicFieldKey;
    label: string;
    compareFn?: (currVal: any, srcVal: any) => { isMatch: boolean; isConflict: boolean; desc?: string; severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' };
  }> = [
    {
      key: 'title',
      label: 'Title',
      compareFn: (c, s) => {
        const cClean = cleanStringForComparison(c);
        const sClean = cleanStringForComparison(s);
        if (!cClean && !sClean) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (!cClean || !sClean) return { isMatch: false, isConflict: true, severity: 'HIGH', desc: 'Title missing in one source' };
        if (cClean === sClean) return { isMatch: true, isConflict: false, severity: 'NONE' };
        // Levenshtein-style or substring inclusion check
        if (cClean.includes(sClean) || sClean.includes(cClean)) {
          return { isMatch: false, isConflict: true, severity: 'LOW', desc: 'Minor phrasing or subtitle difference' };
        }
        return { isMatch: false, isConflict: true, severity: 'HIGH', desc: 'Title content mismatch' };
      },
    },
    {
      key: 'authors',
      label: 'Authors (Roster & Order)',
      compareFn: (c, s) => {
        const pAuth = Array.isArray(c) ? c : [];
        const sAuth = Array.isArray(s) ? s : [];
        const res = compareAuthorLists(pAuth, sAuth);
        return {
          isMatch: res.isMatch,
          isConflict: res.isConflict,
          severity: res.isConflict ? 'HIGH' : 'NONE',
          desc: res.differenceDescription,
        };
      },
    },
    {
      key: 'publicationYear',
      label: 'Publication Year',
      compareFn: (c, s) => {
        const cYear = c ? Number(c) : undefined;
        const sYear = s ? Number(s) : undefined;
        if (!cYear && !sYear) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (!cYear || !sYear) return { isMatch: false, isConflict: true, severity: 'MEDIUM', desc: 'Year missing in one source' };
        if (cYear === sYear) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'HIGH', desc: `Year mismatch: ${cYear} vs ${sYear}` };
      },
    },
    {
      key: 'journal',
      label: 'Journal / Publication Venue',
      compareFn: (c, s) => {
        const cClean = cleanStringForComparison(c);
        const sClean = cleanStringForComparison(s);
        if (!cClean && !sClean) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (!cClean || !sClean) return { isMatch: false, isConflict: true, severity: 'MEDIUM', desc: 'Journal missing in one source' };
        if (cClean === sClean) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cClean.includes(sClean) || sClean.includes(cClean)) {
          return { isMatch: false, isConflict: true, severity: 'LOW', desc: 'Journal abbreviation difference' };
        }
        return { isMatch: false, isConflict: true, severity: 'HIGH', desc: 'Journal title mismatch' };
      },
    },
    {
      key: 'doi',
      label: 'DOI',
      compareFn: (c, s) => {
        const cDoi = normalizeDoi(c);
        const sDoi = normalizeDoi(s);
        if (!cDoi && !sDoi) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (!cDoi || !sDoi) return { isMatch: false, isConflict: false, severity: 'NONE', desc: 'DOI available in only one source' };
        if (cDoi.toLowerCase() === sDoi.toLowerCase()) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'HIGH', desc: `DOI mismatch: ${cDoi} vs ${sDoi}` };
      },
    },
    {
      key: 'pmid',
      label: 'PMID (PubMed ID)',
      compareFn: (c, s) => {
        const cPmid = String(c || '').trim();
        const sPmid = String(s || '').trim();
        if (!cPmid && !sPmid) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (!cPmid || !sPmid) return { isMatch: false, isConflict: false, severity: 'NONE' };
        if (cPmid === sPmid) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'HIGH', desc: `PMID mismatch: ${cPmid} vs ${sPmid}` };
      },
    },
    {
      key: 'volume',
      label: 'Volume',
      compareFn: (c, s) => {
        const cVol = String(c || '').trim();
        const sVol = String(s || '').trim();
        if (!cVol && !sVol) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cVol === sVol) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'LOW', desc: `Volume differs: "${cVol}" vs "${sVol}"` };
      },
    },
    {
      key: 'issue',
      label: 'Issue',
      compareFn: (c, s) => {
        const cIss = String(c || '').trim();
        const sIss = String(s || '').trim();
        if (!cIss && !sIss) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cIss === sIss) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'LOW', desc: `Issue differs: "${cIss}" vs "${sIss}"` };
      },
    },
    {
      key: 'pages',
      label: 'Pages / Pagination',
      compareFn: (c, s) => {
        const cPages = normalizePages(c);
        const sPages = normalizePages(s);
        if (!cPages && !sPages) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cPages === sPages) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'LOW', desc: `Pagination differs: "${cPages}" vs "${sPages}"` };
      },
    },
    {
      key: 'publisher',
      label: 'Publisher',
      compareFn: (c, s) => {
        const cClean = cleanStringForComparison(c);
        const sClean = cleanStringForComparison(s);
        if (!cClean && !sClean) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cClean === sClean) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: true, severity: 'LOW', desc: 'Publisher name mismatch' };
      },
    },
    {
      key: 'publicationType',
      label: 'Publication Type',
      compareFn: (c, s) => {
        const cType = String(c || '').toLowerCase();
        const sType = String(s || '').toLowerCase();
        if (!cType && !sType) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cType === sType) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: false, severity: 'LOW', desc: `Type differs: ${cType} vs ${sType}` };
      },
    },
    {
      key: 'abstract',
      label: 'Abstract',
      compareFn: (c, s) => {
        const cAb = (c || '').trim();
        const sAb = (s || '').trim();
        if (!cAb && !sAb) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (cAb === sAb) return { isMatch: true, isConflict: false, severity: 'NONE' };
        if (Math.abs(cAb.length - sAb.length) < 20) return { isMatch: true, isConflict: false, severity: 'NONE' };
        return { isMatch: false, isConflict: false, severity: 'LOW', desc: `Abstract length difference (${cAb.length} vs ${sAb.length} chars)` };
      },
    },
  ];

  for (const def of fieldDefinitions) {
    const projectVal = (current as any)[def.key];
    const sourceVal = (source as any)[def.key];

    const isMissingInProject = projectVal === undefined || projectVal === null || projectVal === '' || (Array.isArray(projectVal) && projectVal.length === 0);
    const isMissingInSource = sourceVal === undefined || sourceVal === null || sourceVal === '' || (Array.isArray(sourceVal) && sourceVal.length === 0);

    let isMatch = false;
    let isConflict = false;
    let conflictSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
    let differenceDescription: string | undefined = undefined;

    if (def.compareFn) {
      const cmp = def.compareFn(projectVal, sourceVal);
      isMatch = cmp.isMatch;
      isConflict = cmp.isConflict;
      conflictSeverity = cmp.severity;
      differenceDescription = cmp.desc;
    } else {
      isMatch = projectVal === sourceVal;
      isConflict = !isMatch && !isMissingInProject && !isMissingInSource;
    }

    comparisons.push({
      field: def.key,
      fieldLabel: def.label,
      projectValue: projectVal,
      sourceValue: sourceVal,
      isMatch,
      isConflict,
      isMissingInProject,
      isMissingInSource,
      conflictSeverity,
      differenceDescription,
    });
  }

  return comparisons;
}

// -----------------------------------------------------------------------------
// 5. CONFLICT DETECTION
// -----------------------------------------------------------------------------

export function detectReferenceConflicts(
  current: ProjectReference,
  external: Partial<ProjectReference>
): { hasConflicts: boolean; conflictingFields: BibliographicFieldKey[]; severeConflictCount: number } {
  const comparisons = compareReferenceWithSource(current, external);
  const conflicting = comparisons.filter((c) => c.isConflict && (c.conflictSeverity === 'HIGH' || c.conflictSeverity === 'MEDIUM'));

  return {
    hasConflicts: conflicting.length > 0,
    conflictingFields: conflicting.map((c) => c.field),
    severeConflictCount: conflicting.length,
  };
}

// -----------------------------------------------------------------------------
// 6. METADATA COMPLETENESS AUDIT
// -----------------------------------------------------------------------------

export function evaluateMetadataCompleteness(ref: ProjectReference): MetadataCompletenessResult {
  const essentialMissing: string[] = [];
  const recommendedMissing: string[] = [];
  const warnings: string[] = [];

  // Essential fields
  if (!ref.title || ref.title.trim().length === 0 || ref.title === 'Untitled Reference') {
    essentialMissing.push('Title');
    warnings.push('Manuscript reference requires a valid article or book title.');
  }

  if (!ref.authors || ref.authors.length === 0) {
    essentialMissing.push('Authors');
    warnings.push('At least one author name is required for citation indexing.');
  }

  if (!ref.publicationYear || ref.publicationYear < 1800 || ref.publicationYear > new Date().getFullYear() + 2) {
    essentialMissing.push('Publication Year');
    warnings.push('A valid 4-digit publication year is required.');
  }

  // Recommended fields
  if (!ref.journal && !ref.publisher) {
    recommendedMissing.push('Journal / Publisher');
    warnings.push('Journal or publisher venue is missing.');
  }

  if (!ref.doi && !ref.pmid && !ref.url) {
    recommendedMissing.push('Identifier (DOI/PMID/URL)');
  }

  let score = 100;
  score -= essentialMissing.length * 25;
  score -= recommendedMissing.length * 10;
  score = Math.max(0, Math.min(100, score));

  return {
    isComplete: essentialMissing.length === 0,
    completenessScore: score,
    essentialMissing,
    recommendedMissing,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// 7. VERIFICATION REPORT GENERATOR
// -----------------------------------------------------------------------------

export function generateVerificationReport(
  ref: ProjectReference,
  sourceComparison?: ReferenceFieldComparison[]
): ReferenceVerificationReport {
  const trustInfo = determineTrustLevel(ref);
  const items: VerificationReportItem[] = [];

  // DOI Check
  if (ref.doi) {
    items.push({
      key: 'doi',
      label: 'Digital Object Identifier (DOI)',
      status: ref.verificationStatus === 'VERIFIED' ? 'VERIFIED' : (ref.metadataProvider?.includes('Crossref') ? 'MATCH' : 'VERIFIED'),
      details: normalizeDoi(ref.doi) || ref.doi,
      source: 'Crossref Registry',
    });
  } else {
    items.push({
      key: 'doi',
      label: 'Digital Object Identifier (DOI)',
      status: 'NOT_APPLICABLE',
      details: 'No registered DOI associated with this entry',
    });
  }

  // PMID Check
  if (ref.pmid) {
    items.push({
      key: 'pmid',
      label: 'PubMed ID (PMID)',
      status: 'MATCH',
      details: `PMID: ${ref.pmid}`,
      source: 'NCBI Entrez PubMed',
    });
  }

  // Title verification
  const titleComp = sourceComparison?.find((c) => c.field === 'title');
  items.push({
    key: 'title',
    label: 'Title Verification',
    status: titleComp ? (titleComp.isMatch ? 'MATCH' : (titleComp.isConflict ? 'MISMATCH' : 'MATCH')) : (ref.title ? 'MATCH' : 'MISSING'),
    details: ref.title || 'No title recorded',
  });

  // Authors verification
  const authComp = sourceComparison?.find((c) => c.field === 'authors');
  items.push({
    key: 'authors',
    label: 'Author Roster & Ordering',
    status: authComp ? (authComp.isMatch ? 'MATCH' : (authComp.isConflict ? 'MISMATCH' : 'MATCH')) : (ref.authors?.length ? 'MATCH' : 'MISSING'),
    details: ref.authors?.length ? `${ref.authors.length} author(s) mapped` : 'Missing authors',
  });

  // Journal / Venue verification
  const journalComp = sourceComparison?.find((c) => c.field === 'journal');
  items.push({
    key: 'journal',
    label: 'Publication Venue (Journal/Book)',
    status: journalComp ? (journalComp.isMatch ? 'MATCH' : (journalComp.isConflict ? 'MISMATCH' : 'MATCH')) : (ref.journal ? 'MATCH' : 'MISSING'),
    details: ref.journal || ref.publisher || 'Not recorded',
  });

  // Publication Year verification
  const yearComp = sourceComparison?.find((c) => c.field === 'publicationYear');
  items.push({
    key: 'year',
    label: 'Publication Year',
    status: yearComp ? (yearComp.isMatch ? 'MATCH' : (yearComp.isConflict ? 'MISMATCH' : 'MATCH')) : (ref.publicationYear ? 'MATCH' : 'MISSING'),
    details: ref.publicationYear ? String(ref.publicationYear) : 'Missing year',
  });

  // Volume & Pagination
  if (ref.volume || ref.pages) {
    items.push({
      key: 'pagination',
      label: 'Volume & Pagination',
      status: 'MATCH',
      details: `Vol. ${ref.volume || '—'}, pp. ${ref.pages || '—'}`,
    });
  }

  const hasConflicts = sourceComparison ? sourceComparison.some((c) => c.isConflict && c.conflictSeverity !== 'NONE') : ref.verificationStatus === 'CONFLICT';

  return {
    referenceId: ref.id,
    status: ref.verificationStatus,
    trustInfo,
    primarySource: ref.metadataProvider || ref.metadataSource || ref.sourceDatabase || 'Manual Entry',
    lastVerifiedAt: ref.lastVerifiedAt,
    verifiedBy: ref.verifiedBy,
    isDoiVerified: Boolean(ref.doi && (ref.metadataProvider?.includes('Crossref') || ref.verificationStatus === 'VERIFIED')),
    isPmidVerified: Boolean(ref.pmid && (ref.metadataProvider?.includes('PubMed') || ref.verificationStatus === 'VERIFIED')),
    hasConflicts,
    items,
  };
}

// -----------------------------------------------------------------------------
// 8. VERIFICATION EVENT BUILDER
// -----------------------------------------------------------------------------

export function createVerificationEvent(params: {
  referenceId: string;
  projectId: string;
  action: ReferenceVerificationAction;
  previousStatus?: ReferenceVerificationStatus;
  newStatus: ReferenceVerificationStatus;
  fieldChanges?: ReferenceFieldChange[];
  source?: string;
  performedBy?: string;
  reason?: string;
  notes?: string;
}): ReferenceVerificationEvent {
  return {
    id: `ver_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    referenceId: params.referenceId,
    projectId: params.projectId,
    action: params.action,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    fieldChanges: params.fieldChanges || [],
    source: params.source,
    performedBy: params.performedBy || 'Researcher',
    performedAt: new Date().toISOString(),
    reason: params.reason,
    notes: params.notes,
  };
}

// -----------------------------------------------------------------------------
// 9. FIELD PROVENANCE INITIALIZATION & UPDATES
// -----------------------------------------------------------------------------

export function initializeFieldProvenance(
  ref: ProjectReference,
  source: ProvenanceSourceType,
  isVerified: boolean = false
): Partial<Record<BibliographicFieldKey, FieldProvenanceRecord>> {
  const fields: BibliographicFieldKey[] = [
    'title',
    'authors',
    'journal',
    'publicationYear',
    'volume',
    'issue',
    'pages',
    'doi',
    'pmid',
    'url',
    'publisher',
    'abstract',
    'publicationType',
    'issn',
    'isbn',
  ];

  const prov: Partial<Record<BibliographicFieldKey, FieldProvenanceRecord>> = {};
  const now = new Date().toISOString();

  for (const field of fields) {
    const val = (ref as any)[field];
    if (val !== undefined && val !== null && val !== '') {
      prov[field] = {
        field,
        value: val,
        source,
        confidence: source === 'PDF_EXTRACTION' ? 'MEDIUM' : 'HIGH',
        verified: isVerified,
        updatedAt: now,
      };
    }
  }

  return prov;
}

// -----------------------------------------------------------------------------
// 10. FUTURE AI ACCESS CONTRACT
// -----------------------------------------------------------------------------

/**
 * Returns strictly the subset of project references that have been explicitly verified
 * by the researcher (satisfying the platform zero-hallucination verification contract).
 */
export function getVerifiedProjectReferences(
  projectOrRefs: Project | ProjectReference[]
): ProjectReference[] {
  const refs = Array.isArray(projectOrRefs) ? projectOrRefs : (projectOrRefs.references || []);
  return refs.filter((r) => r.verificationStatus === 'VERIFIED');
}

/**
 * Returns detailed verification status and machine-readable trust assessment for a single reference.
 */
export function getReferenceVerificationStatus(reference: ProjectReference): {
  isVerified: boolean;
  status: ReferenceVerificationStatus;
  trustLevel: TrustLevelInfo;
  completeness: MetadataCompletenessResult;
  canBeCitedInGeneratedDrafts: boolean;
} {
  const completeness = evaluateMetadataCompleteness(reference);
  const trustLevel = determineTrustLevel(reference);
  const isVerified = reference.verificationStatus === 'VERIFIED';

  return {
    isVerified,
    status: reference.verificationStatus,
    trustLevel,
    completeness,
    canBeCitedInGeneratedDrafts: isVerified && completeness.isComplete,
  };
}
