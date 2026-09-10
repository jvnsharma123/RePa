import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Bookmark,
  AlertTriangle,
  Sparkles,
  Layers,
  ArrowUpDown,
  FileCode,
  Upload,
  RefreshCw,
  HelpCircle,
  Database
} from 'lucide-react';
import {
  Project,
  ProjectReference,
  ReferenceVerificationStatus,
  ReferenceAuthor,
  ReferenceImportBatchResult,
  PublicationType,
  SupportedCitationStyle
} from '../types';
import { ManualReferenceModal } from './ManualReferenceModal';
import { DoiLookupModal } from './DoiLookupModal';
import { ReferenceFileImportModal } from './ReferenceFileImportModal';
import { PdfReferenceExtractorModal } from './PdfReferenceExtractorModal';
import { ReferenceImportPreviewModal } from './ReferenceImportPreviewModal';
import { ReferenceVerificationModal } from './ReferenceVerificationModal';
import { CitationStyleSelector } from './CitationStyleSelector';
import { ManuscriptReferencesSection } from './ManuscriptReferencesSection';
import { CrossrefProvider } from '../services/referenceProviders';
import {
  determineTrustLevel,
  evaluateMetadataCompleteness
} from '../services/referenceVerificationService';
import {
  formatInTextCitation,
  formatReferenceEntry,
  extractCitedReferences
} from '../services/citationFormatter';
import {
  deleteProjectReference,
  updateReferenceVerificationStatus,
  saveProjectReference,
  normalizeDoi,
  detectDuplicateReference
} from '../services/supabaseData';
import { PlanTier, PLAN_CONFIGS } from '../types/subscription';
import { UpgradeModal } from './UpgradeModal';

interface ReferenceLibraryWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  userId?: string;
  onInsertReferenceToEditor?: (citationKey: string) => void;
  onInsertCitation?: (selectedReferences: ProjectReference[]) => void;
  currentPlan?: PlanTier;
  onPlanUpgraded?: (plan: PlanTier) => void;
  onNavigateToPricing?: () => void;
}

export const ReferenceLibraryWorkspace: React.FC<ReferenceLibraryWorkspaceProps> = ({
  project,
  onUpdateProject,
  userId = 'default_user',
  onInsertReferenceToEditor,
  onInsertCitation,
  currentPlan = 'FREE',
  onPlanUpgraded,
  onNavigateToPricing,
}) => {
  const references = project.references || [];
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const checkCanAddReference = (): boolean => {
    const maxRefs = PLAN_CONFIGS[currentPlan].maxReferencesPerProject;
    if (references.length >= maxRefs) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  // Multi-selection state for basic citation insertion
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReferenceVerificationStatus>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'year_desc' | 'year_asc' | 'title_asc' | 'status'>('year_desc');

  // Modal states
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<ProjectReference | null>(null);

  const [isDoiModalOpen, setIsDoiModalOpen] = useState(false);
  const [isFileImportModalOpen, setIsFileImportModalOpen] = useState(false);
  const [fileImportFormat, setFileImportFormat] = useState<'bibtex' | 'ris'>('bibtex');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Verification & Audit Modal
  const [verifyingReference, setVerifyingReference] = useState<ProjectReference | null>(null);

  // Batch Import Preview
  const [batchResult, setBatchResult] = useState<ReferenceImportBatchResult | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Inline action feedback states
  const [expandedRefId, setExpandedRefId] = useState<string | null>(null);
  const [copiedDoiId, setCopiedDoiId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);
  const [enrichingRefId, setEnrichingRefId] = useState<string | null>(null);

  // Close add dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Statistics
  const totalCount = references.length;
  const verifiedCount = references.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const pendingCount = references.filter((r) => r.verificationStatus === 'PENDING').length;
  const underReviewCount = references.filter((r) => r.verificationStatus === 'UNDER_REVIEW').length;
  const needsCorrectionCount = references.filter((r) => r.verificationStatus === 'NEEDS_CORRECTION').length;
  const conflictCount = references.filter((r) => r.verificationStatus === 'CONFLICT').length;
  const incompleteCount = references.filter((r) => r.verificationStatus === 'METADATA_INCOMPLETE').length;
  const rejectedCount = references.filter((r) => r.verificationStatus === 'REJECTED').length;

  // Citation Style (Vancouver, APA, IEEE)
  const activeCitationStyle: SupportedCitationStyle =
    (project.citationStyle as SupportedCitationStyle) ||
    (project.manuscript?.citationStyle as SupportedCitationStyle) ||
    'APA';

  const handleCitationStyleChange = (newStyle: SupportedCitationStyle) => {
    onUpdateProject({
      ...project,
      citationStyle: newStyle,
      manuscript: project.manuscript
        ? {
            ...project.manuscript,
            citationStyle: newStyle,
            lastSaved: new Date().toISOString(),
          }
        : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const { refToOrderMap } = useMemo(
    () => extractCitedReferences(project),
    [project]
  );

  // Filter & Sort references
  const filteredReferences = useMemo(() => {
    return references
      .filter((ref) => {
        // Status filter
        if (statusFilter !== 'ALL' && ref.verificationStatus !== statusFilter) {
          return false;
        }

        // Source filter
        if (sourceFilter !== 'ALL') {
          const src = ref.metadataSource || ref.sourceDatabase;
          if (src !== sourceFilter) return false;
        }

        // Publication Type filter
        if (typeFilter !== 'ALL') {
          if ((ref.publicationType || 'article') !== typeFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = ref.title.toLowerCase().includes(q);
          const journalMatch = (ref.journal || '').toLowerCase().includes(q);
          const doiMatch = (ref.doi || '').toLowerCase().includes(q);
          const pmidMatch = (ref.pmid || '').toLowerCase().includes(q);
          const keyMatch = (ref.citationKey || '').toLowerCase().includes(q);
          const notesMatch = (ref.userNotes || '').toLowerCase().includes(q);
          const authorMatch = (ref.authors || []).some(
            (a) =>
              (a.fullName || '').toLowerCase().includes(q) ||
              (a.lastName || '').toLowerCase().includes(q)
          );

          if (!titleMatch && !journalMatch && !doiMatch && !pmidMatch && !keyMatch && !notesMatch && !authorMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'year_desc') {
          return (b.publicationYear || 0) - (a.publicationYear || 0);
        }
        if (sortBy === 'year_asc') {
          return (a.publicationYear || 0) - (b.publicationYear || 0);
        }
        if (sortBy === 'title_asc') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'status') {
          const order: Record<ReferenceVerificationStatus, number> = {
            VERIFIED: 1,
            UNDER_REVIEW: 2,
            PENDING: 3,
            NEEDS_CORRECTION: 4,
            CONFLICT: 5,
            METADATA_INCOMPLETE: 6,
            REJECTED: 7,
          };
          return (order[a.verificationStatus] || 8) - (order[b.verificationStatus] || 8);
        }
        return 0;
      });
  }, [references, statusFilter, sourceFilter, typeFilter, searchQuery, sortBy]);

  // Format author string
  const formatAuthors = (authors?: ReferenceAuthor[]) => {
    if (!authors || authors.length === 0) return 'Unknown authors';
    if (authors.length === 1) return authors[0].fullName || authors[0].lastName;
    if (authors.length === 2) {
      return `${authors[0].lastName || authors[0].fullName} & ${authors[1].lastName || authors[1].fullName}`;
    }
    if (authors.length <= 4) {
      return authors.map((a) => a.lastName || a.fullName).join(', ');
    }
    return `${authors[0].lastName || authors[0].fullName}, ${authors[1].lastName || authors[1].fullName}, et al.`;
  };

  // Status Badge UI helper
  const renderStatusBadge = (status: ReferenceVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            Under Review
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Verification
          </span>
        );
      case 'NEEDS_CORRECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            Needs Correction
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Metadata Conflict
          </span>
        );
      case 'METADATA_INCOMPLETE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            Needs Metadata
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  // Source Provenance Badge
  const renderSourceBadge = (ref: ProjectReference) => {
    const src = ref.metadataSource || ref.sourceDatabase;
    switch (src) {
      case 'crossref':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-semibold uppercase">
            Crossref
          </span>
        );
      case 'pubmed':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold uppercase">
            PubMed
          </span>
        );
      case 'bibtex':
        return (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[10px] font-semibold uppercase">
            BibTeX
          </span>
        );
      case 'ris':
        return (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-[10px] font-semibold uppercase">
            RIS
          </span>
        );
      case 'pdf_extract':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold uppercase">
            PDF Draft
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[10px] font-semibold uppercase">
            Manual
          </span>
        );
    }
  };

  // Handlers
  const handleSaveReference = async (savedRef: ProjectReference) => {
    const exists = references.some((r) => r.id === savedRef.id);
    let updatedList: ProjectReference[];

    if (exists) {
      updatedList = references.map((r) => (r.id === savedRef.id ? savedRef : r));
    } else {
      updatedList = [savedRef, ...references];
    }

    const updatedProject: Project = {
      ...project,
      references: updatedList,
      updatedAt: new Date().toISOString(),
    };

    onUpdateProject(updatedProject);

    if (!project.isDemoProject && userId) {
      await saveProjectReference(savedRef, userId).catch((err) =>
        console.warn('Supabase reference save warning:', err)
      );
    }
  };

  const handleBatchImportConfirm = async (
    toImport: ProjectReference[],
    toUpdate: ProjectReference[] = []
  ) => {
    let updatedList = [...references];

    // Apply updates to existing references
    for (const item of toUpdate) {
      updatedList = updatedList.map((r) => (r.id === item.id ? item : r));
      if (!project.isDemoProject && userId) {
        await saveProjectReference(item, userId).catch((err) =>
          console.warn('Supabase update reference warning:', err)
        );
      }
    }

    // Append new references
    for (const item of toImport) {
      updatedList = [item, ...updatedList];
      if (!project.isDemoProject && userId) {
        await saveProjectReference(item, userId).catch((err) =>
          console.warn('Supabase insert reference warning:', err)
        );
      }
    }

    const updatedProject: Project = {
      ...project,
      references: updatedList,
      updatedAt: new Date().toISOString(),
    };

    onUpdateProject(updatedProject);
  };

  const handleEnrichViaDoi = async (ref: ProjectReference) => {
    if (!ref.doi) return;
    setEnrichingRefId(ref.id);
    try {
      const provider = new CrossrefProvider();
      const result = await provider.fetchByDoi(ref.doi);
      if (result.success && result.reference) {
        const enriched: ProjectReference = {
          ...ref,
          ...result.reference,
          id: ref.id,
          projectId: ref.projectId,
          verificationStatus: 'VERIFIED',
          updatedAt: new Date().toISOString(),
        };
        await handleSaveReference(enriched);
      } else {
        alert(result.errorMessage || 'Metadata could not be verified from the selected source.');
      }
    } catch (err: any) {
      alert('Failed to connect to Crossref registry.');
    } finally {
      setEnrichingRefId(null);
    }
  };

  const handleUpdateStatus = async (
    referenceId: string,
    newStatus: ReferenceVerificationStatus
  ) => {
    const updatedList = references.map((r) =>
      r.id === referenceId
        ? { ...r, verificationStatus: newStatus, updatedAt: new Date().toISOString() }
        : r
    );

    const updatedProject: Project = {
      ...project,
      references: updatedList,
      updatedAt: new Date().toISOString(),
    };

    onUpdateProject(updatedProject);

    if (!project.isDemoProject && userId) {
      await updateReferenceVerificationStatus(referenceId, newStatus, userId).catch((err) =>
        console.warn('Supabase status update warning:', err)
      );
    }
  };

  const handleDeleteReference = async (referenceId: string) => {
    if (!window.confirm('Are you sure you want to remove this reference from the project library?')) {
      return;
    }

    setDeletingRefId(referenceId);
    try {
      const updatedList = references.filter((r) => r.id !== referenceId);
      const updatedProject: Project = {
        ...project,
        references: updatedList,
        updatedAt: new Date().toISOString(),
      };

      onUpdateProject(updatedProject);

      if (!project.isDemoProject && userId) {
        await deleteProjectReference(referenceId, userId).catch((err) =>
          console.warn('Supabase delete reference warning:', err)
        );
      }
    } finally {
      setDeletingRefId(null);
    }
  };

  const handleCopyDoi = (doiText: string, id: string) => {
    navigator.clipboard.writeText(doiText);
    setCopiedDoiId(id);
    setTimeout(() => setCopiedDoiId(null), 2000);
  };

  const handleCopyKey = (keyText: string, id: string) => {
    navigator.clipboard.writeText(`\\cite{${keyText}}`);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Selection & Citation Insertion Handlers
  // --------------------------------------------------------------------------
  const handleToggleSelectRef = (refId: string) => {
    setSelectedRefIds((prev) =>
      prev.includes(refId) ? prev.filter((id) => id !== refId) : [...prev, refId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRefIds.length === filteredReferences.length && filteredReferences.length > 0) {
      setSelectedRefIds([]);
    } else {
      setSelectedRefIds(filteredReferences.map((r) => r.id));
    }
  };

  const handleInsertSelectedCitations = () => {
    const selectedRefs = references.filter((r) => selectedRefIds.includes(r.id));
    if (selectedRefs.length === 0) return;

    if (onInsertCitation) {
      onInsertCitation(selectedRefs);
    } else if (onInsertReferenceToEditor) {
      const keys = selectedRefs.map((r) => r.citationKey || r.id).join('; ');
      onInsertReferenceToEditor(keys);
    }
    setSelectedRefIds([]);
  };

  const handleSingleCite = (ref: ProjectReference) => {
    if (onInsertCitation) {
      onInsertCitation([ref]);
    } else if (onInsertReferenceToEditor) {
      onInsertReferenceToEditor(ref.citationKey || ref.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Header Card - High Density */}
      <div className="bg-white border border-[#141414] p-4 shadow-[4px_4px_0px_rgba(20,20,20,0.06)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#141414] text-white flex items-center justify-center font-bold text-xs font-mono">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-[#141414] font-serif-academic">
                Project Reference Library
              </h2>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#141414] text-white font-mono">
                Ingestion & Citations
              </span>
            </div>
            <p className="text-xs text-[#555] max-w-2xl font-sans-ui">
              Authoritative, project-scoped literature library. Ingest references via DOI enrichment, BibTeX, RIS, or PDF extraction with strict zero-hallucination standards.
            </p>
          </div>

          {/* Ingestion Actions & Style Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <CitationStyleSelector
              currentStyle={activeCitationStyle}
              onStyleChange={handleCitationStyleChange}
            />

            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-bold transition-colors cursor-pointer font-mono"
              >
                <Plus className="w-4 h-4" /> Ingest Reference
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

            {isAddMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-[#141414] py-1 z-30 shadow-[4px_4px_0px_rgba(20,20,20,0.15)]">
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (!checkCanAddReference()) return;
                    setIsDoiModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#141414] hover:bg-[#E9E8E5] flex items-center gap-2.5 transition-colors border-b border-[#141414]/10"
                >
                  <div className="w-6 h-6 bg-[#141414] text-white flex items-center justify-center shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold">Lookup by DOI / PMID</div>
                    <div className="text-[10px] text-[#666]">Auto-enrich from Crossref / PubMed</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (!checkCanAddReference()) return;
                    setFileImportFormat('bibtex');
                    setIsFileImportModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#141414] hover:bg-[#E9E8E5] flex items-center gap-2.5 transition-colors border-b border-[#141414]/10"
                >
                  <div className="w-6 h-6 bg-[#141414] text-white flex items-center justify-center shrink-0">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold">Import BibTeX (.bib)</div>
                    <div className="text-[10px] text-[#666]">Batch parse from LaTeX / Overleaf</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (!checkCanAddReference()) return;
                    setFileImportFormat('ris');
                    setIsFileImportModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#141414] hover:bg-[#E9E8E5] flex items-center gap-2.5 transition-colors border-b border-[#141414]/10"
                >
                  <div className="w-6 h-6 bg-[#141414] text-white flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold">Import RIS (.ris)</div>
                    <div className="text-[10px] text-[#666]">Zotero, Mendeley, EndNote files</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (!checkCanAddReference()) return;
                    setIsPdfModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#141414] hover:bg-[#E9E8E5] flex items-center gap-2.5 transition-colors border-b border-[#141414]/10"
                >
                  <div className="w-6 h-6 bg-[#141414] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold">Extract from PDF</div>
                    <div className="text-[10px] text-[#666]">Extract draft metadata from paper</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    if (!checkCanAddReference()) return;
                    setEditingReference(null);
                    setIsManualModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#141414] hover:bg-[#E9E8E5] flex items-center gap-2.5 transition-colors"
                >
                  <div className="w-6 h-6 bg-[#141414] text-white flex items-center justify-center shrink-0">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold">Manual Reference Entry</div>
                    <div className="text-[10px] text-[#666]">Fill in full bibliographic fields</div>
                  </div>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Statistics Pills - High Density Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-[#141414]">
          <div className="bg-[#FAF9F7] border border-[#141414] p-2.5">
            <div className="text-[10px] font-bold text-[#555] uppercase tracking-wide font-mono">
              Total
            </div>
            <div className="text-lg font-bold text-[#141414] mt-0.5 font-mono">{totalCount}</div>
          </div>

          <div className="bg-emerald-50 border border-emerald-800 p-2.5">
            <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Verified (L1)
            </div>
            <div className="text-lg font-bold text-emerald-950 mt-0.5 font-mono">{verifiedCount}</div>
          </div>

          <div className="bg-blue-50 border border-blue-800 p-2.5">
            <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1 font-mono">
              <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
              Review / Pending
            </div>
            <div className="text-lg font-bold text-blue-950 mt-0.5 font-mono">{underReviewCount + pendingCount}</div>
          </div>

          <div className="bg-rose-50 border border-rose-800 p-2.5">
            <div className="text-[10px] font-bold text-rose-900 uppercase tracking-wide flex items-center gap-1 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
              Conflicts
            </div>
            <div className="text-lg font-bold text-rose-950 mt-0.5 font-mono">{conflictCount}</div>
          </div>

          <div className="bg-amber-50 border border-amber-800 p-2.5">
            <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1 font-mono">
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              Needs Review
            </div>
            <div className="text-lg font-bold text-amber-950 mt-0.5 font-mono">{needsCorrectionCount + incompleteCount}</div>
          </div>

          <div className="bg-[#FAF9F7] border border-[#141414] p-2.5 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold text-[#555] uppercase tracking-wide flex items-center gap-1 font-mono">
              <XCircle className="w-3.5 h-3.5 text-[#555]" />
              Rejected
            </div>
            <div className="text-lg font-bold text-[#141414] mt-0.5 font-mono">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sort - High Density */}
      <div className="bg-[#F0EFED] border border-[#141414] p-3 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, journal, DOI, citation key, notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#141414] text-[#141414] placeholder-[#777] focus:outline-none"
            />
          </div>

          {/* Controls: Source, Type, Sort */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Source Provenance Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#141414] text-[#141414] focus:outline-none font-mono"
            >
              <option value="ALL">All Sources</option>
              <option value="crossref">Crossref</option>
              <option value="pubmed">PubMed</option>
              <option value="bibtex">BibTeX Import</option>
              <option value="ris">RIS Import</option>
              <option value="pdf_extract">PDF Drafts</option>
              <option value="manual">Manual Entry</option>
            </select>

            {/* Publication Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#141414] text-[#141414] focus:outline-none font-mono"
            >
              <option value="ALL">All Types</option>
              <option value="article">Journal Article</option>
              <option value="book">Book</option>
              <option value="chapter">Book Chapter</option>
              <option value="conference">Conference Paper</option>
              <option value="preprint">Preprint</option>
              <option value="thesis">Thesis</option>
              <option value="report">Report</option>
              <option value="dataset">Dataset</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#141414] text-[#141414] focus:outline-none font-mono"
            >
              <option value="year_desc">Year: Newest First</option>
              <option value="year_asc">Year: Oldest First</option>
              <option value="title_asc">Title: A to Z</option>
              <option value="status">Status Priority</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-[#141414]/20">
          {(
            [
              { key: 'ALL', label: 'All References', count: totalCount },
              { key: 'VERIFIED', label: 'Verified', count: verifiedCount },
              { key: 'PENDING', label: 'Pending', count: pendingCount },
              { key: 'UNDER_REVIEW', label: 'Under Review', count: underReviewCount },
              { key: 'CONFLICT', label: 'Conflicts', count: conflictCount },
              { key: 'NEEDS_CORRECTION', label: 'Needs Correction', count: needsCorrectionCount },
              { key: 'METADATA_INCOMPLETE', label: 'Needs Metadata', count: incompleteCount },
              { key: 'REJECTED', label: 'Rejected', count: rejectedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer font-mono ${
                statusFilter === tab.key
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] border border-[#141414]/30 hover:bg-[#E9E8E5]'
              }`}
            >
              {tab.label}
              <span
                className={`text-[9px] px-1 py-0.2 font-mono ${
                  statusFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E4E3E0] text-[#141414]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Items Citation Banner - High Density */}
      {selectedRefIds.length > 0 && (
        <div className="bg-[#141414] border border-[#141414] p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white text-[#141414] flex items-center justify-center font-bold text-xs font-mono shrink-0">
              {selectedRefIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white font-mono">
                {selectedRefIds.length} Reference{selectedRefIds.length > 1 ? 's' : ''} Selected
              </p>
              <p className="text-[11px] text-gray-300">
                Click &quot;Insert Citation&quot; to place standard in-text reference citations at your active manuscript cursor position.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setSelectedRefIds([])}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white border border-gray-600 hover:bg-[#2A2A2A] transition-colors cursor-pointer font-mono"
            >
              Deselect All
            </button>

            {(onInsertCitation || onInsertReferenceToEditor) && (
              <button
                id="btn-insert-selected-citations"
                onClick={handleInsertSelectedCitations}
                className="px-3 py-1.5 bg-white hover:bg-[#E9E8E5] text-[#141414] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Insert Citation ({selectedRefIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Select All Bar when references exist */}
      {filteredReferences.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-[#141414] font-mono">
          <label className="flex items-center gap-2 cursor-pointer select-none font-bold hover:text-black transition-colors">
            <input
              type="checkbox"
              checked={
                filteredReferences.length > 0 &&
                selectedRefIds.length >= filteredReferences.length &&
                filteredReferences.every((r) => selectedRefIds.includes(r.id))
              }
              onChange={handleSelectAll}
              className="w-4 h-4 text-[#141414] rounded-none border-[#141414] focus:ring-0 cursor-pointer"
            />
            <span>
              Select All ({filteredReferences.length} reference{filteredReferences.length > 1 ? 's' : ''})
            </span>
          </label>
          {selectedRefIds.length > 0 && (
            <span className="text-[10px] font-bold text-[#141414] bg-white border border-[#141414] px-1.5 py-0.5">
              {selectedRefIds.length} chosen
            </span>
          )}
        </div>
      )}

      {/* References List */}
      <div className="space-y-3">
        {filteredReferences.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              {references.length === 0
                ? 'No references in project library'
                : 'No references match your active filter'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4 font-sans">
              {references.length === 0
                ? 'Build an authoritative collection of peer-reviewed articles, books, and conference proceedings for your manuscript.'
                : 'Try adjusting your search query or switching verification status filters.'}
            </p>
            {references.length === 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setIsDoiModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Lookup by DOI / PMID
                </button>
                <button
                  onClick={() => {
                    setFileImportFormat('bibtex');
                    setIsFileImportModalOpen(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" /> Import BibTeX
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setSourceFilter('ALL');
                  setTypeFilter('ALL');
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          filteredReferences.map((ref) => {
            const isExpanded = expandedRefId === ref.id;
            const isSelected = selectedRefIds.includes(ref.id);
            const duplicateCheck = detectDuplicateReference(ref, references, ref.id);
            const trustInfo = determineTrustLevel(ref);

            return (
              <div
                key={ref.id}
                className={`bg-white rounded-xl border transition-all p-5 shadow-xs space-y-3 ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                    : ref.verificationStatus === 'CONFLICT'
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : ref.verificationStatus === 'NEEDS_CORRECTION'
                    ? 'border-amber-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Duplicate Alert Banner on Card */}
                {duplicateCheck.isDuplicate && duplicateCheck.duplicateOf && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Duplicate notice:</strong> Shares {duplicateCheck.matchReason} with another entry in this project.
                      </span>
                    </div>
                  </div>
                )}

                {/* Conflict Alert Banner on Card */}
                {ref.verificationStatus === 'CONFLICT' && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>Metadata Conflict Detected:</strong> Discrepancies found between local reference and external authority.
                      </span>
                    </div>
                    <button
                      onClick={() => setVerifyingReference(ref)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Resolve Conflicts
                    </button>
                  </div>
                )}

                {/* Needs Correction Notice on Card */}
                {ref.verificationStatus === 'NEEDS_CORRECTION' && ref.correctionNotes && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Correction Note:</strong> {ref.correctionNotes}
                      </span>
                    </div>
                    <button
                      onClick={() => setVerifyingReference(ref)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Review & Fix
                    </button>
                  </div>
                )}

                {/* Main Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox for selecting reference */}
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRef(ref.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                        title="Select reference for manuscript citation insertion"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {/* Authors & Year & Source Badges & Trust Badge */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 font-sans">
                        <span className="font-semibold text-gray-900">
                          {formatAuthors(ref.authors)}
                        </span>
                        {ref.publicationYear && (
                          <span className="text-gray-500 font-mono">
                            ({ref.publicationYear})
                          </span>
                        )}
                        {renderSourceBadge(ref)}
                        
                        {/* Trust Hierarchy Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${trustInfo.badgeColor}`}
                          title={trustInfo.description}
                        >
                          L{trustInfo.level}: {trustInfo.label}
                        </span>

                        {/* Live In-Text Citation Badge for selected Style */}
                        {(() => {
                          const orderNum = refToOrderMap.get(ref.id) || 1;
                          const inTextPreview = formatInTextCitation([ref], activeCitationStyle, refToOrderMap);
                          return (
                            <span
                              className="px-2 py-0.5 bg-[#141414] text-white text-[10px] font-mono font-bold"
                              title={`Formatted in-text citation in ${activeCitationStyle} style`}
                            >
                              Cite: {inTextPreview}
                            </span>
                          );
                        })()}

                        {ref.publicationType && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-mono">
                            {ref.publicationType}
                          </span>
                        )}
                      </div>

                      {/* Paper Title */}
                      <h3 className="text-base font-bold text-gray-950 font-serif-academic leading-snug">
                        {ref.title}
                      </h3>

                      {/* Journal / Venue details */}
                      {(ref.journal || ref.volume || ref.pages || ref.publisher) && (
                        <p className="text-xs text-gray-600 font-serif-academic italic">
                          {ref.journal}
                          {ref.volume && <span className="font-semibold not-italic"> {ref.volume}</span>}
                          {ref.issue && <span>({ref.issue})</span>}
                          {ref.pages && <span>: {ref.pages}</span>}
                          {ref.publisher && !ref.journal && <span>{ref.publisher}</span>}
                        </p>
                      )}

                      {/* Formatted Reference Entry Preview ({activeCitationStyle}) */}
                      <div className="bg-[#F8F7F5] border border-[#141414]/15 p-2 text-xs text-[#222] font-serif-academic leading-relaxed mt-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#666] block mb-0.5">
                          {activeCitationStyle} Formatted Bibliography Entry:
                        </span>
                        <p className="italic text-[#141414]">
                          {formatReferenceEntry(
                            ref,
                            activeCitationStyle,
                            refToOrderMap.get(ref.id) || 1
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Status & Action Pill */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    {renderStatusBadge(ref.verificationStatus)}

                    {/* Primary Verify & Audit Workflow Button */}
                    <button
                      onClick={() => setVerifyingReference(ref)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        ref.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-black hover:bg-gray-800 text-white'
                      }`}
                      title="Open Side-by-Side Verification Engine & Audit Diff"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {ref.verificationStatus === 'VERIFIED' ? 'Audit Details' : 'Verify & Audit'}
                    </button>

                    {(onInsertCitation || onInsertReferenceToEditor) && (
                      <button
                        onClick={() => handleSingleCite(ref)}
                        className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title="Insert Citation into active draft at cursor position"
                      >
                        <Bookmark className="w-3.5 h-3.5" /> Cite
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingReference(ref);
                        setIsManualModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit Reference Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteReference(ref.id)}
                      disabled={deletingRefId === ref.id}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Reference"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata Identifiers Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                  {/* DOI */}
                  {ref.doi && (
                    <div className="flex items-center gap-1 font-mono text-[11px] text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <span className="text-gray-400 font-sans">DOI:</span>
                      <a
                        href={ref.url || `https://doi.org/${normalizeDoi(ref.doi)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        {ref.doi}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleCopyDoi(ref.doi || '', ref.id)}
                        className="text-gray-400 hover:text-gray-700 ml-1 cursor-pointer"
                        title="Copy DOI"
                      >
                        {copiedDoiId === ref.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Verification CTA if pending or incomplete */}
                  {ref.doi && ref.verificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => setVerifyingReference(ref)}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Compare against Crossref / PubMed authority in verification modal"
                    >
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      Diff vs Crossref
                    </button>
                  )}

                  {/* PMID */}
                  {ref.pmid && (
                    <div className="flex items-center gap-1 font-mono text-[11px] text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <span className="text-gray-400 font-sans">PMID:</span>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1"
                      >
                        {ref.pmid}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Citation Key */}
                  {ref.citationKey && (
                    <div className="flex items-center gap-1 font-mono text-[11px] text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      <span className="text-gray-400 font-sans">Key:</span>
                      <span>{ref.citationKey}</span>
                      <button
                        onClick={() => handleCopyKey(ref.citationKey || '', ref.id)}
                        className="text-gray-400 hover:text-gray-700 ml-1 cursor-pointer"
                        title="Copy LaTeX \\cite command"
                      >
                        {copiedKeyId === ref.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Expand Details Button */}
                  <button
                    onClick={() => setExpandedRefId(isExpanded ? null : ref.id)}
                    className="ml-auto text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        Less info <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Abstract & Notes <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Expandable Drawer: Abstract, Notes & Verification Toggles */}
                {isExpanded && (
                  <div className="pt-3 border-t border-gray-100 space-y-3 bg-gray-50/60 -mx-5 -mb-5 p-5 rounded-b-xl animate-in fade-in duration-150">
                    {/* Abstract */}
                    {ref.abstract && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                          Abstract
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed font-serif-academic bg-white p-3 rounded-lg border border-gray-200">
                          {ref.abstract}
                        </p>
                      </div>
                    )}

                    {/* Researcher Notes */}
                    {ref.userNotes && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                          Researcher Notes & Context
                        </div>
                        <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                          {ref.userNotes}
                        </p>
                      </div>
                    )}

                    {/* Metadata Source Details */}
                    {ref.metadataProvider && (
                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        <span>Provider: <strong>{ref.metadataProvider}</strong></span>
                        {ref.metadataRetrievedAt && (
                          <span>(Retrieved: {new Date(ref.metadataRetrievedAt).toLocaleDateString()})</span>
                        )}
                      </div>
                    )}

                    {/* Quick Verification Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-600">
                          Provenance & Verification:
                        </span>
                        <button
                          onClick={() => setVerifyingReference(ref)}
                          className="px-2.5 py-1 text-xs font-semibold bg-black hover:bg-gray-800 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Open Full Audit Modal
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ref.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => handleUpdateStatus(ref.id, 'VERIFIED')}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Mark Verified
                          </button>
                        )}
                        {ref.verificationStatus !== 'METADATA_INCOMPLETE' && (
                          <button
                            onClick={() => handleUpdateStatus(ref.id, 'METADATA_INCOMPLETE')}
                            className="px-2.5 py-1 text-xs font-semibold bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Flag Incomplete
                          </button>
                        )}
                        {ref.verificationStatus !== 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(ref.id, 'PENDING')}
                            className="px-2.5 py-1 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" /> Set Pending
                          </button>
                        )}
                        {ref.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateStatus(ref.id, 'REJECTED')}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manuscript References & Bibliography Section */}
      <div className="pt-2">
        <ManuscriptReferencesSection
          project={project}
          citationStyle={activeCitationStyle}
          onCitationStyleChange={handleCitationStyleChange}
          onNavigateToLiteratureLibrary={() => {}}
        />
      </div>

      {/* Reference Verification & Provenance Engine Modal */}
      {verifyingReference && (
        <ReferenceVerificationModal
          isOpen={!!verifyingReference}
          onClose={() => setVerifyingReference(null)}
          reference={verifyingReference}
          onSaveReference={handleSaveReference}
          projectId={project.id}
        />
      )}

      {/* Manual Reference Modal */}
      {isManualModalOpen && (
        <ManualReferenceModal
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setEditingReference(null);
          }}
          onSave={handleSaveReference}
          existingReferences={references}
          initialReference={editingReference}
          projectId={project.id}
        />
      )}

      {/* DOI / Identifier Lookup Modal */}
      {isDoiModalOpen && (
        <DoiLookupModal
          isOpen={isDoiModalOpen}
          onClose={() => setIsDoiModalOpen(false)}
          onSave={handleSaveReference}
          existingReferences={references}
          projectId={project.id}
        />
      )}

      {/* BibTeX / RIS File Import Modal */}
      {isFileImportModalOpen && (
        <ReferenceFileImportModal
          isOpen={isFileImportModalOpen}
          onClose={() => setIsFileImportModalOpen(false)}
          onParsedResult={(result) => {
            setBatchResult(result);
            setIsPreviewModalOpen(true);
          }}
          existingReferences={references}
          projectId={project.id}
          defaultFormat={fileImportFormat}
        />
      )}

      {/* PDF Reference Extractor Modal */}
      {isPdfModalOpen && (
        <PdfReferenceExtractorModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          onSave={handleSaveReference}
          existingReferences={references}
          projectId={project.id}
        />
      )}

      {/* Batch Import Review / Preview Modal */}
      {isPreviewModalOpen && batchResult && (
        <ReferenceImportPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setBatchResult(null);
          }}
          batchResult={batchResult}
          onConfirmImport={handleBatchImportConfirm}
          existingReferences={references}
          projectId={project.id}
        />
      )}

      {/* Upgrade Modal for Reference Limit */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonTitle="Reference Library Limit Reached"
        reasonDescription={`The Free plan allows up to 20 literature references per project (you currently have ${references.length}). Upgrade to Researcher (₹299/mo) for unlimited references, automatic BibTeX/RIS ingestion, and full citation styling.`}
        targetPlan="RESEARCHER"
        currentPlan={currentPlan}
        userId={userId}
        onPlanUpgraded={(newPlan) => {
          if (onPlanUpgraded) onPlanUpgraded(newPlan);
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
};

