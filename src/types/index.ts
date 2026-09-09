export type DocumentTypeKey =
  | 'research_article'
  | 'original_research_paper'
  | 'review_article'
  | 'systematic_review'
  | 'meta_analysis'
  | 'case_report'
  | 'case_study'
  | 'conference_paper'
  | 'technical_paper'
  | 'masters_thesis'
  | 'masters_dissertation'
  | 'phd_thesis'
  | 'phd_dissertation'
  | 'project_report'
  | 'technical_report'
  | 'custom_academic_document';

export type FormatCategory = 'journal' | 'university' | 'institute' | 'department' | 'custom';
export type CitationStyleKey = 'APA' | 'Vancouver' | 'Harvard' | 'MLA' | 'Chicago' | 'IEEE' | 'AMA' | 'Custom';

export type FileCategory =
  | 'Research Document'
  | 'Experimental Data'
  | 'Statistical Data'
  | 'Figure'
  | 'Graph'
  | 'Table'
  | 'Image'
  | 'Supplementary Material'
  | 'Other';

export type FactType =
  | 'OBSERVATION'
  | 'MEASUREMENT'
  | 'RESEARCHER_INPUT'
  | 'AI_INTERPRETATION'
  | 'HYPOTHESIS';

export type VerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'INTERPRETATION'
  | 'HYPOTHESIS';

export type FactCategory =
  | 'Objective'
  | 'Research Question'
  | 'Hypothesis'
  | 'Methodology'
  | 'Sample'
  | 'Variable'
  | 'Experimental Condition'
  | 'Observation'
  | 'Numerical Result'
  | 'Statistical Result'
  | 'Figure Finding'
  | 'Table Finding'
  | 'Conclusion'
  | 'Limitation'
  | 'Other';

export type FactConfidence = 'High' | 'Medium' | 'Low' | 'verified_user' | 'extracted_high' | 'extracted_review';

export type ProvenanceType =
  | 'user_fact'
  | 'literature_derived'
  | 'explanatory_prose'
  | 'ai_suggestion_unverified';

export type QualityStatus = 'Passed' | 'Warning' | 'Needs Review';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  institution: string;
  department: string;
  role: 'PhD Scholar' | 'Postgraduate Student' | 'Faculty / Professor' | 'Independent Researcher' | 'Postdoc Fellow';
  orcidId?: string;
  subscriptionTier: 'Academic Free' | 'Researcher Pro' | 'Institutional Lab';
  projectsCreated: number;
  monthlyQuotaUsed: number;
  monthlyQuotaLimit: number;
}

export interface DirectObservation {
  text: string;
  location?: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface QuantitativeMetric {
  label: string;
  value: string;
  unit?: string;
  pValue?: string;
  location?: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface AIInterpretationItem {
  text: string;
  reasoning?: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface DetectedConflict {
  id?: string;
  description: string;
  sourceA: string;
  sourceB: string;
  factA?: string;
  factB?: string;
  resolutionRecommendation?: string;
  resolved?: boolean;
}

export type ConflictItem = DetectedConflict;

export interface DataValueItem {
  label: string;
  value: string;
  unit?: string;
  pValue?: string;
}

export interface StructuredAIAnalysis {
  summary: string;
  directObservations: DirectObservation[];
  quantitativeData: QuantitativeMetric[];
  researcherProvided: Array<{ text: string; context?: string }>;
  aiInterpretations: AIInterpretationItem[];
  limitationsAndUncertainties: string[];
  candidateFacts: ResearchFact[];
  conflictsDetected?: DetectedConflict[];
  analyzedAt: string;
  promptInstructionsUsed?: string;
}

export interface ResearchFile {
  id: string;
  projectId: string;
  name: string;
  originalName: string;
  storagePath?: string;
  category: FileCategory;
  type: string;
  size: number;
  sizeFormatted: string;
  uploadStatus: 'uploaded' | 'analyzing' | 'ready' | 'error';
  dataPreviewUrl?: string;
  textContent?: string;
  aiAnalysisSummary?: string;
  extractedFactsSummary?: string;
  extractedFactsCount: number;
  observedFactsCount?: number;
  interpretationsCount?: number;
  aiAnalysis?: StructuredAIAnalysis;
  uploadedAt: string;
}

export interface SourceRef {
  type?: 'user_description' | 'user_input_form' | 'uploaded_document' | 'uploaded_image' | 'uploaded_table' | 'uploaded_dataset' | 'literature_source';
  sourceType?: string;
  sourceName: string;
  pageOrIndex?: string;
  fileId?: string;
  locationDetails?: string;
  timestamp?: string;
}

export interface ResearchFact {
  id: string;
  projectId?: string;
  fact?: string; // Key factual statement
  keyStatement?: string;
  statement?: string; // Compatibility alias
  factType?: FactType;
  category: FactCategory;
  source?: string; // Human-readable source descriptor
  sourceFile?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  sourceLocation?: string; // Table 1, Row 3, Cell B4, Figure 1 Y-axis, Page 4, etc.
  supportingObservation?: string;
  aiInterpretation?: string;
  confidence: FactConfidence;
  verificationStatus?: VerificationStatus;
  userVerified: boolean;
  notes?: string;
  isInterpretation?: boolean; // AI interpretation vs strictly observed empirical fact
  isObserved?: boolean;
  originalAiStatement?: string; // Auditable original wording produced by AI
  verifiedStatement?: string; // Verified/edited wording
  verifiedBy?: string; // User ID or email of verifying researcher
  verifiedAt?: string; // ISO timestamp when verified
  conflictDetails?: string;
  conflictWithFactId?: string;
  sourceRef?: SourceRef;
  tags?: string[];
  isUserModified?: boolean;
  provenanceType?: ProvenanceType;
  value?: string;
  unit?: string;
  dataValues?: Array<{
    label: string;
    value: string;
    unit?: string;
    pValue?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResearchSummary {
  id: string;
  projectId: string;
  objectives: string;
  researchQuestions: string;
  hypothesis: string;
  methodology: string;
  sampleInfo: string;
  variables: string;
  majorObservations: string[];
  results: string[];
  statisticalFindings: string[];
  conclusion: string;
  limitations: string;
  provenanceBreakdown: {
    userProvidedCount: number;
    aiExtractedCount: number;
    aiInterpretationCount: number;
    unverifiedCount: number;
  };
  generatedAt: string;
}

export interface PlanSectionItem {
  id: string;
  sectionKey: string;
  title: string;
  order: number;
  targetWordCount: number;
  description: string;
  required: boolean;
  enabled: boolean;
  associatedFactCategories: FactCategory[];
  proposedFigures: string[];
  proposedTables: string[];
}

export interface ManuscriptPlan {
  id: string;
  projectId: string;
  documentTypeId: DocumentTypeKey;
  formatId: string;
  sections: PlanSectionItem[];
  estimatedTotalWords: number;
  notes?: string;
  isCustomized: boolean;
  createdAt: string;
}

export interface ResearchFigure {
  id: string;
  projectId: string;
  figureNumber: number;
  title: string;
  caption: string;
  sourceFileId?: string;
  sourceFileName: string;
  imageUrl?: string;
  description?: string;
  aiObservations?: string;
  userNotes?: string;
  proposedPlacement?: string;
  manuscriptReferences?: string[];
}

export interface ResearchTable {
  id: string;
  projectId: string;
  tableNumber: number;
  title: string;
  caption: string;
  sourceFileId?: string;
  sourceFileName: string;
  headers: string[];
  rows: string[][];
  notes?: string;
  footnotes?: string;
  proposedPlacement?: string;
  manuscriptReferences?: string[];
}

export interface FormatSpecification {
  id: string;
  name: string;
  category: FormatCategory;
  organization: string;
  publisher?: string;
  documentTypeSupport: DocumentTypeKey[];
  citationStyle: CitationStyleKey;
  referenceStyleRules: string;
  wordLimit: { min: number; max: number; recommended: number };
  abstractLimit: { min: number; max: number };
  fontRules: { family: string; sizePt: number; lineSpacing: string };
  marginRules: { top: string; bottom: string; left: string; right: string };
  headingRules: string;
  figureRequirements: string;
  tableRequirements: string;
  supplementaryMaterialRequirements: string;
  submissionRequirements: string;
  isPlaceholder: boolean;
  disclaimer: string;
}

export interface DocumentTypeOption {
  key: DocumentTypeKey;
  title: string;
  category: 'Journal Articles' | 'Theses & Dissertations' | 'Technical & Reports' | 'Custom';
  description: string;
  defaultSections: string[];
  recommendedWordRange: string;
}

export type SectionStatus = 'draft' | 'ai_generated' | 'researcher_edited' | 'researcher_approved';

export type EvidenceTier =
  | 'Tier 1: Verified Fact'
  | 'Tier 2: Researcher Input'
  | 'Tier 3: Source Observation'
  | 'Tier 4: AI Interpretation'
  | 'Tier 5: General Academic Framing'
  | 'TIER_1_VERIFIED_FACT'
  | 'TIER_2_RESEARCHER_INPUT'
  | 'TIER_3_SOURCE_OBSERVATION'
  | 'TIER_4_AI_INTERPRETATION'
  | 'TIER_5_THEORETICAL';

export interface MissingInfoItem {
  id: string;
  category: 'Sample Size' | 'Replicates' | 'Statistical Test' | 'Instrument/Model' | 'Dosage/Duration' | 'Control Baseline' | 'Units/Margins' | 'Protocol Parameter' | 'Other';
  parameter?: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  suggestedPrompt: string;
  targetField?: string;
  resolved?: boolean;
  resolvedValue?: string;
}

export interface TitleCandidate {
  title: string;
  style: 'Descriptive' | 'Declarative' | 'Methodological' | 'Concise High-Impact';
  rationale: string;
  wordCount: number;
}

export interface ClaimTraceabilityItem {
  claimSnippet: string;
  evidenceTier: EvidenceTier;
  supportingFactId?: string;
  supportingFactStatement?: string;
  sourceName?: string;
  sourceLocation?: string;
  confidence: string;
  explanation: string;
}

export interface ParagraphProvenance {
  paragraphId: string;
  paragraphIndex: number;
  textSnippet: string;
  provenanceType: ProvenanceType;
  factIds: string[];
  referenceIds?: string[];
  sourceLabels: string[];
  userVerified: boolean;
  notes?: string;
  traceability?: ClaimTraceabilityItem[];
}

export interface ManuscriptSection {
  id: string;
  sectionKey: string;
  title: string;
  order: number;
  content: string;
  wordCount: number;
  lastModified: string;
  provenanceList: ParagraphProvenance[];
  isRequired: boolean;
  status?: SectionStatus;
  missingInfo?: MissingInfoItem[];
  sourceFactIds?: string[];
  linkedFactIds?: string[];
  sourceFigures?: string[];
  sourceTables?: string[];
  lastRegeneratedAt?: string;
}

export interface ManuscriptVersion {
  id?: string;
  projectId?: string;
  version?: number;
  versionNumber?: number;
  savedAt?: string;
  createdAt?: string;
  label?: string;
  title?: string;
  changeSummary?: string;
  qualityScore?: number;
  totalWordCount: number;
  sections: ManuscriptSection[];
}

export type ReferenceVerificationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION'
  | 'CONFLICT'
  | 'METADATA_INCOMPLETE';

export type ReferenceSourceDatabase =
  | 'manual'
  | 'crossref'
  | 'openalex'
  | 'pubmed'
  | 'europe_pmc'
  | 'semantic_scholar'
  | 'bibtex'
  | 'ris'
  | 'pdf_extract'
  | 'file_import';

export type PublicationType =
  | 'article'
  | 'book'
  | 'chapter'
  | 'conference'
  | 'preprint'
  | 'report'
  | 'thesis'
  | 'patent'
  | 'dataset'
  | 'other';

export type ReferenceMetadataSource =
  | 'manual'
  | 'crossref'
  | 'pubmed'
  | 'openalex'
  | 'bibtex'
  | 'ris'
  | 'pdf_extract'
  | 'file_import';

export type ProvenanceSourceType =
  | 'MANUAL'
  | 'CROSSREF'
  | 'PUBMED'
  | 'BIBTEX'
  | 'RIS'
  | 'PDF_EXTRACTION'
  | 'FILE_IMPORT'
  | 'OPENALEX';

export type BibliographicFieldKey =
  | 'title'
  | 'authors'
  | 'journal'
  | 'publicationYear'
  | 'volume'
  | 'issue'
  | 'pages'
  | 'doi'
  | 'pmid'
  | 'url'
  | 'publisher'
  | 'abstract'
  | 'publicationType'
  | 'issn'
  | 'isbn';

export interface FieldProvenanceRecord {
  field: BibliographicFieldKey;
  value?: any;
  source: ProvenanceSourceType | string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | number;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  previousValue?: any;
  updatedAt?: string;
}

export type ReferenceVerificationAction =
  | 'IMPORTED'
  | 'ENRICHED'
  | 'REVIEW_STARTED'
  | 'FIELD_UPDATED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'MARKED_NEEDS_CORRECTION'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_RESOLVED'
  | 'STATUS_CHANGED';

export interface ReferenceFieldChange {
  field: BibliographicFieldKey | string;
  fieldLabel?: string;
  oldValue?: any;
  newValue?: any;
  source?: string;
}

export interface ReferenceVerificationEvent {
  id: string;
  referenceId: string;
  projectId: string;
  action: ReferenceVerificationAction;
  previousStatus?: ReferenceVerificationStatus;
  newStatus: ReferenceVerificationStatus;
  fieldChanges?: ReferenceFieldChange[];
  source?: string;
  performedBy?: string;
  performedAt: string;
  reason?: string;
  notes?: string;
}

export interface ReferenceAuthor {
  firstName?: string;
  lastName: string;
  fullName: string;
  affiliation?: string;
  orcid?: string;
}

export interface ProjectReference {
  id: string;
  projectId: string;
  userId?: string;
  title: string;
  authors: ReferenceAuthor[];
  journal?: string;
  publicationYear?: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  url?: string;
  abstract?: string;
  publisher?: string;
  sourceDatabase?: ReferenceSourceDatabase;
  citationKey?: string;
  verificationStatus: ReferenceVerificationStatus;
  userNotes?: string;
  relevanceScore?: number;
  publicationType?: PublicationType;
  metadataSource?: ReferenceMetadataSource;
  metadataSourceUrl?: string;
  metadataRetrievedAt?: string;
  metadataProvider?: string;
  rawSourceData?: string;
  issn?: string;
  isbn?: string;
  createdFrom?: string;
  lastVerifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  correctionNotes?: string;
  fieldProvenance?: Partial<Record<BibliographicFieldKey, FieldProvenanceRecord>>;
  verificationHistory?: ReferenceVerificationEvent[];
  extractionConfidence?: {
    title?: number;
    authors?: number;
    doi?: number;
    journal?: number;
    year?: number;
    overall?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedReferenceEntry {
  tempId: string;
  reference: Partial<ProjectReference>;
  rawText?: string;
  issues: string[];
  isValid: boolean;
  isDuplicate?: boolean;
  duplicateOf?: ProjectReference;
  duplicateReason?: string;
  statusCategory: 'NEW' | 'DUPLICATE' | 'INCOMPLETE' | 'ERROR';
  selectedForImport: boolean;
}

export interface ReferenceImportBatchResult {
  entries: ParsedReferenceEntry[];
  summary: {
    totalParsed: number;
    newCount: number;
    duplicateCount: number;
    incompleteCount: number;
    errorCount: number;
  };
  sourceFormat: 'bibtex' | 'ris' | 'pdf' | 'doi_batch';
  sourceFileName?: string;
}

export interface ReferenceMetadataProviderResult {
  success: boolean;
  reference?: Partial<ProjectReference>;
  errorMessage?: string;
  providerName: string;
  sourceUrl?: string;
  rawResponse?: unknown;
}

export interface ManuscriptCitation {
  id: string;
  projectId: string;
  manuscriptId: string;
  sectionId: string;
  referenceId: string;
  claimText?: string;
  citationOrder: number;
  inTextTag?: string;
  userId?: string;
  createdAt?: string;
}

export interface LiteratureSource {
  id: string;
  projectId: string;
  authors: string[];
  year: number;
  title: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  citationKey: string;
  citationCountInText: number;
  isVerifiedUserSource: boolean;
}

export interface QualityCheckItem {
  id: string;
  name: string;
  category: 'facts' | 'citations' | 'structure' | 'word_count' | 'formatting' | 'claims' | 'figures_tables';
  status: QualityStatus;
  message: string;
  recommendation?: string;
  location?: string;
}

export interface QualityReport {
  id: string;
  projectId: string;
  manuscriptId: string;
  overallScore: number;
  passedCount: number;
  warningCount: number;
  reviewCount: number;
  checks: QualityCheckItem[];
  generatedAt: string;
}

export interface SimilarityMatchedPassage {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  excerpt: string;
  matchedPercentage: number;
  potentialSourceDomain: string;
  note: string;
  isExemptQuotation: boolean;
}

export interface SimilarityReport {
  id: string;
  projectId: string;
  manuscriptId: string;
  overallSimilarityPercentage: number;
  quotationsExemptedPercentage: number;
  methodologyOverlapPercentage: number;
  disclaimer: string;
  matchedPassages: SimilarityMatchedPassage[];
  generatedAt: string;
}

export interface AIAnalysisPassage {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  excerpt: string;
  probabilityScore: number; // 0 to 100
  confidence: 'Low' | 'Medium' | 'High';
  explanation: string;
  requiresHumanReview: boolean;
}

export interface AIAnalysisReport {
  id: string;
  projectId: string;
  manuscriptId: string;
  overallScore: number;
  disclaimer: string;
  summary: string;
  passages: AIAnalysisPassage[];
  generatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  researchArea: string;
  subField: string;
  
  // Structured Research Information fields
  objectives: string;
  researchQuestions: string;
  hypothesis: string;
  background?: string;
  researchProblem?: string;
  methodology: string;
  studyPopulationSample?: string;
  experimentalDesign?: string;
  variables?: string; // Independent, Dependent, Controlled variables
  majorFindings: string;
  conclusion: string;
  limitations?: string;
  futureWork?: string;
  keywords: string[];
  briefDescription: string;
  detailedDescription: string;
  
  documentTypeId: DocumentTypeKey;
  formatId: string;
  status: 'draft' | 'analyzing' | 'plan_ready' | 'generated' | 'reviewing' | 'completed';
  createdAt: string;
  updatedAt: string;
  
  // Workflow Entities
  files: ResearchFile[];
  facts: ResearchFact[];
  summary?: ResearchSummary;
  plan?: ManuscriptPlan;
  figures: ResearchFigure[];
  tables: ResearchTable[];
  references: ProjectReference[];
  projectReferences?: ProjectReference[];
  citations?: ManuscriptCitation[];
  manuscript?: Manuscript;
  qualityReport?: QualityReport;
  similarityReport?: SimilarityReport;
  aiAnalysisReport?: AIAnalysisReport;
  versions?: ManuscriptVersion[];
  isDemoProject?: boolean;
}

export interface ProcessingStage {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progressPercent: number;
  details?: string;
}

export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  documentTypeId: DocumentTypeKey;
  formatId: string;
  abstract: string;
  keywords: string[];
  sections: ManuscriptSection[];
  totalWordCount: number;
  version: number;
  status: 'draft' | 'in_review' | 'completed';
  lastSaved: string;
  history?: ManuscriptVersion[];
}

export interface GenerationStepProgress {
  stepId: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  details?: string;
}

