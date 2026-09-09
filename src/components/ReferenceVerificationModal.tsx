import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  AlertTriangle,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Check,
  Copy,
  Edit3,
  ArrowRight,
  Sparkles,
  Search,
  Database,
  History,
  FileText,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  Save,
  CheckCheck
} from 'lucide-react';
import {
  ProjectReference,
  ReferenceAuthor,
  ReferenceVerificationStatus,
  BibliographicFieldKey,
  ReferenceVerificationEvent,
  ReferenceFieldChange,
  ProvenanceSourceType
} from '../types';
import {
  compareReferenceWithSource,
  detectReferenceConflicts,
  evaluateMetadataCompleteness,
  generateVerificationReport,
  determineTrustLevel,
  createVerificationEvent,
  initializeFieldProvenance,
  ReferenceFieldComparison
} from '../services/referenceVerificationService';
import { normalizeDoi } from '../services/supabaseData';

interface ReferenceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: ProjectReference;
  onSaveReference: (updatedReference: ProjectReference) => void;
  userId?: string;
  projectId: string;
}

export const ReferenceVerificationModal: React.FC<ReferenceVerificationModalProps> = ({
  isOpen,
  onClose,
  reference,
  onSaveReference,
  userId = 'default_user',
  projectId,
}) => {
  // Working copy of reference
  const [workingRef, setWorkingRef] = useState<ProjectReference>({ ...reference });

  // Tab navigation: 'diff' | 'authors' | 'report' | 'history'
  const [activeTab, setActiveTab] = useState<'diff' | 'authors' | 'report' | 'history'>('diff');

  // External source metadata for comparison
  const [sourceProvider, setSourceProvider] = useState<'crossref' | 'pubmed' | 'stored'>('crossref');
  const [sourceReference, setSourceReference] = useState<Partial<ProjectReference> | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [sourceErrorMessage, setSourceErrorMessage] = useState<string | null>(null);

  // Quick DOI/PMID inputs for live query
  const [queryDoi, setQueryDoi] = useState(reference.doi || '');
  const [queryPmid, setQueryPmid] = useState(reference.pmid || '');

  // Sub-modal prompt states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Unreliable metadata');
  const [rejectionCustomNotes, setRejectionCustomNotes] = useState('');

  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionNotesInput, setCorrectionNotesInput] = useState(reference.correctionNotes || '');

  const [isCompletenessWarningOpen, setIsCompletenessWarningOpen] = useState(false);

  // Field inline edit modal / tracker
  const [editingField, setEditingField] = useState<BibliographicFieldKey | null>(null);
  const [editFieldValue, setEditFieldValue] = useState<string>('');

  // Synchronize on reference prop change
  useEffect(() => {
    setWorkingRef({ ...reference });
    setQueryDoi(reference.doi || '');
    setQueryPmid(reference.pmid || '');
    setCorrectionNotesInput(reference.correctionNotes || '');
  }, [reference]);

  // Initial source fetch
  useEffect(() => {
    if (!isOpen) return;

    // If reference already has a DOI, automatically fetch Crossref metadata for side-by-side verification
    if (reference.doi) {
      fetchExternalSource('crossref', reference.doi);
    } else if (reference.pmid) {
      setSourceProvider('pubmed');
      fetchExternalSource('pubmed', reference.pmid);
    } else if (reference.rawSourceData) {
      try {
        const parsed = JSON.parse(reference.rawSourceData);
        setSourceReference(parsed);
        setSourceProvider('stored');
      } catch {
        setSourceReference(null);
      }
    }
  }, [isOpen, reference.id]);

  // Fetch external authoritative source metadata
  const fetchExternalSource = async (provider: 'crossref' | 'pubmed', queryIdentifier: string) => {
    setIsLoadingSource(true);
    setSourceErrorMessage(null);

    try {
      if (provider === 'crossref') {
        const cleanDoi = normalizeDoi(queryIdentifier);
        if (!cleanDoi) {
          setSourceErrorMessage('Please enter a valid DOI to query Crossref.');
          setIsLoadingSource(false);
          return;
        }

        const res = await fetch('/api/references/enrich-doi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doi: cleanDoi }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.reference) {
          setSourceReference(data.reference);
        } else {
          setSourceErrorMessage(data.errorMessage || 'Crossref lookup did not return matching record.');
        }
      } else if (provider === 'pubmed') {
        const cleanPmid = queryIdentifier.replace(/[^0-9]/g, '');
        if (!cleanPmid) {
          setSourceErrorMessage('Please enter a valid numeric PMID.');
          setIsLoadingSource(false);
          return;
        }

        const res = await fetch('/api/references/enrich-pmid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pmid: cleanPmid }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.reference) {
          setSourceReference(data.reference);
        } else {
          setSourceErrorMessage(data.errorMessage || 'PubMed lookup did not return matching record.');
        }
      }
    } catch (err: any) {
      setSourceErrorMessage(err.message || 'Failed to connect to scholarly registry.');
    } finally {
      setIsLoadingSource(false);
    }
  };

  // Field comparisons
  const comparisons = useMemo(() => {
    return compareReferenceWithSource(workingRef, sourceReference || {});
  }, [workingRef, sourceReference]);

  const conflicts = useMemo(() => {
    return detectReferenceConflicts(workingRef, sourceReference || {});
  }, [workingRef, sourceReference]);

  const completeness = useMemo(() => {
    return evaluateMetadataCompleteness(workingRef);
  }, [workingRef]);

  const verificationReport = useMemo(() => {
    return generateVerificationReport(workingRef, comparisons);
  }, [workingRef, comparisons]);

  const trustInfo = useMemo(() => {
    return determineTrustLevel(workingRef);
  }, [workingRef]);

  // Track field changes for verification audit history
  const computeFieldChanges = (
    original: ProjectReference,
    updated: ProjectReference,
    sourceName: string
  ): ReferenceFieldChange[] => {
    const changes: ReferenceFieldChange[] = [];
    const fieldsToCheck: BibliographicFieldKey[] = [
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
    ];

    for (const f of fieldsToCheck) {
      const oldVal = (original as any)[f];
      const newVal = (updated as any)[f];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: f,
          fieldLabel: f.toUpperCase(),
          oldValue: oldVal,
          newValue: newVal,
          source: sourceName,
        });
      }
    }
    return changes;
  };

  // Apply single field from source
  const handleApplySourceField = (field: BibliographicFieldKey) => {
    if (!sourceReference) return;
    const sourceVal = (sourceReference as any)[field];
    if (sourceVal === undefined) return;

    const updated = {
      ...workingRef,
      [field]: sourceVal,
    };

    // Update field provenance
    const updatedProv = {
      ...(updated.fieldProvenance || {}),
      [field]: {
        field,
        value: sourceVal,
        source: sourceProvider === 'crossref' ? 'CROSSREF' : (sourceProvider === 'pubmed' ? 'PUBMED' : 'FILE_IMPORT'),
        confidence: 'HIGH' as const,
        verified: false,
        previousValue: (workingRef as any)[field],
        updatedAt: new Date().toISOString(),
      },
    };

    updated.fieldProvenance = updatedProv;
    setWorkingRef(updated);
  };

  // Accept all differences from source
  const handleAcceptAllSourceDifferences = () => {
    if (!sourceReference) return;

    const updated = {
      ...workingRef,
      title: sourceReference.title || workingRef.title,
      authors: sourceReference.authors && sourceReference.authors.length > 0 ? sourceReference.authors : workingRef.authors,
      journal: sourceReference.journal || workingRef.journal,
      publicationYear: sourceReference.publicationYear || workingRef.publicationYear,
      volume: sourceReference.volume || workingRef.volume,
      issue: sourceReference.issue || workingRef.issue,
      pages: sourceReference.pages || workingRef.pages,
      doi: sourceReference.doi || workingRef.doi,
      pmid: sourceReference.pmid || workingRef.pmid,
      url: sourceReference.url || workingRef.url,
      publisher: sourceReference.publisher || workingRef.publisher,
      abstract: sourceReference.abstract || workingRef.abstract,
      metadataProvider: sourceReference.metadataProvider || workingRef.metadataProvider,
      metadataSourceUrl: sourceReference.metadataSourceUrl || workingRef.metadataSourceUrl,
      metadataRetrievedAt: sourceReference.metadataRetrievedAt || new Date().toISOString(),
    };

    setWorkingRef(updated);
  };

  // Action: Mark as Verified
  const handleConfirmVerify = () => {
    if (!completeness.isComplete && completeness.warnings.length > 0 && !isCompletenessWarningOpen) {
      setIsCompletenessWarningOpen(true);
      return;
    }

    setIsCompletenessWarningOpen(false);

    const now = new Date().toISOString();
    const fieldChanges = computeFieldChanges(reference, workingRef, sourceProvider.toUpperCase());

    const event = createVerificationEvent({
      referenceId: workingRef.id,
      projectId,
      action: 'VERIFIED',
      previousStatus: workingRef.verificationStatus,
      newStatus: 'VERIFIED',
      fieldChanges,
      source: sourceProvider.toUpperCase(),
      performedBy: 'Researcher',
      notes: 'Explicitly verified by researcher following metadata audit.',
    });

    const updated: ProjectReference = {
      ...workingRef,
      verificationStatus: 'VERIFIED',
      lastVerifiedAt: now,
      verifiedBy: 'Researcher',
      rejectionReason: undefined,
      verificationHistory: [event, ...(workingRef.verificationHistory || [])],
      updatedAt: now,
    };

    setWorkingRef(updated);
    onSaveReference(updated);
    onClose();
  };

  // Action: Mark Under Review
  const handleSetUnderReview = () => {
    const now = new Date().toISOString();
    const event = createVerificationEvent({
      referenceId: workingRef.id,
      projectId,
      action: 'REVIEW_STARTED',
      previousStatus: workingRef.verificationStatus,
      newStatus: 'UNDER_REVIEW',
      performedBy: 'Researcher',
      notes: 'Researcher actively reviewing metadata differences.',
    });

    const updated: ProjectReference = {
      ...workingRef,
      verificationStatus: 'UNDER_REVIEW',
      verificationHistory: [event, ...(workingRef.verificationHistory || [])],
      updatedAt: now,
    };

    setWorkingRef(updated);
    onSaveReference(updated);
  };

  // Action: Needs Correction
  const handleSaveNeedsCorrection = () => {
    const now = new Date().toISOString();
    const event = createVerificationEvent({
      referenceId: workingRef.id,
      projectId,
      action: 'MARKED_NEEDS_CORRECTION',
      previousStatus: workingRef.verificationStatus,
      newStatus: 'NEEDS_CORRECTION',
      performedBy: 'Researcher',
      reason: correctionNotesInput || 'Metadata requires researcher correction',
      notes: correctionNotesInput,
    });

    const updated: ProjectReference = {
      ...workingRef,
      verificationStatus: 'NEEDS_CORRECTION',
      correctionNotes: correctionNotesInput,
      verificationHistory: [event, ...(workingRef.verificationHistory || [])],
      updatedAt: now,
    };

    setWorkingRef(updated);
    onSaveReference(updated);
    setIsCorrectionModalOpen(false);
    onClose();
  };

  // Action: Reject Reference
  const handleSaveReject = () => {
    const now = new Date().toISOString();
    const event = createVerificationEvent({
      referenceId: workingRef.id,
      projectId,
      action: 'REJECTED',
      previousStatus: workingRef.verificationStatus,
      newStatus: 'REJECTED',
      performedBy: 'Researcher',
      reason: rejectionReason,
      notes: rejectionCustomNotes || undefined,
    });

    const updated: ProjectReference = {
      ...workingRef,
      verificationStatus: 'REJECTED',
      rejectionReason: `${rejectionReason}${rejectionCustomNotes ? `: ${rejectionCustomNotes}` : ''}`,
      verificationHistory: [event, ...(workingRef.verificationHistory || [])],
      updatedAt: now,
    };

    setWorkingRef(updated);
    onSaveReference(updated);
    setIsRejectModalOpen(false);
    onClose();
  };

  // Action: Save Field Modifications
  const handleSaveFieldChanges = () => {
    const now = new Date().toISOString();
    const fieldChanges = computeFieldChanges(reference, workingRef, 'MANUAL_EDIT');

    let action: ReferenceVerificationEvent['action'] = 'FIELD_UPDATED';
    if (workingRef.verificationStatus === 'CONFLICT' && !conflicts.hasConflicts) {
      action = 'CONFLICT_RESOLVED';
    }

    const event = createVerificationEvent({
      referenceId: workingRef.id,
      projectId,
      action,
      previousStatus: reference.verificationStatus,
      newStatus: workingRef.verificationStatus,
      fieldChanges,
      performedBy: 'Researcher',
      notes: `Updated ${fieldChanges.length} bibliographic field(s).`,
    });

    const updated: ProjectReference = {
      ...workingRef,
      verificationHistory: [event, ...(workingRef.verificationHistory || [])],
      updatedAt: now,
    };

    onSaveReference(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="reference-verification-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4 bg-gray-50/70 shrink-0">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-gray-700" />
                Reference Verification & Provenance Engine
              </span>

              {/* Status Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border flex items-center gap-1 ${
                  workingRef.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : workingRef.verificationStatus === 'CONFLICT'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : workingRef.verificationStatus === 'NEEDS_CORRECTION'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : workingRef.verificationStatus === 'UNDER_REVIEW'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : workingRef.verificationStatus === 'REJECTED'
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                {workingRef.verificationStatus}
              </span>

              {/* Trust Hierarchy Level */}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${trustInfo.badgeColor}`}
                title={trustInfo.description}
              >
                {trustInfo.label}
              </span>

              {/* Citation Key */}
              {workingRef.citationKey && (
                <span className="font-mono text-xs text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded">
                  @{workingRef.citationKey}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-gray-950 font-serif-academic truncate leading-snug">
              {workingRef.title || 'Untitled Reference'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-gray-200 flex items-center gap-1 bg-white shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'diff'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Side-by-Side Verification
            {conflicts.hasConflicts && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                {conflicts.severeConflictCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('authors')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'authors'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Author Roster ({workingRef.authors?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Verification Report
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Audit History ({workingRef.verificationHistory?.length || 0})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SIDE-BY-SIDE DIFF */}
          {activeTab === 'diff' && (
            <div className="space-y-5">
              {/* Conflict Alert Banner if any conflicts exist */}
              {conflicts.hasConflicts && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs flex items-start gap-3 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="font-bold text-rose-900">
                      Metadata Conflict Detected ({conflicts.severeConflictCount} field discrepancy)
                    </div>
                    <p className="text-rose-800 leading-relaxed font-sans">
                      Discrepancies found between your project reference and the authoritative source in{' '}
                      <strong>{conflicts.conflictingFields.join(', ')}</strong>. You must resolve these differences before marking as verified.
                    </p>
                    <button
                      onClick={handleAcceptAllSourceDifferences}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold transition-colors mt-1 cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Accept All Source Values
                    </button>
                  </div>
                </div>
              )}

              {/* Source Selector & Live Query Bar */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">Authoritative Source:</span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-300 text-xs">
                    <button
                      onClick={() => {
                        setSourceProvider('crossref');
                        if (queryDoi) fetchExternalSource('crossref', queryDoi);
                      }}
                      className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        sourceProvider === 'crossref'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Crossref (DOI)
                    </button>
                    <button
                      onClick={() => {
                        setSourceProvider('pubmed');
                        if (queryPmid) fetchExternalSource('pubmed', queryPmid);
                      }}
                      className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                        sourceProvider === 'pubmed'
                          ? 'bg-emerald-700 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      PubMed (PMID)
                    </button>
                  </div>
                </div>

                {/* Query Input */}
                <div className="flex items-center gap-2">
                  {sourceProvider === 'crossref' ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={queryDoi}
                        onChange={(e) => setQueryDoi(e.target.value)}
                        placeholder="10.1016/j.cell.2021.05.012"
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white font-mono w-52 focus:outline-hidden focus:ring-1 focus:ring-black"
                      />
                      <button
                        onClick={() => fetchExternalSource('crossref', queryDoi)}
                        disabled={isLoadingSource}
                        className="px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingSource ? 'animate-spin' : ''}`} />
                        Query
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={queryPmid}
                        onChange={(e) => setQueryPmid(e.target.value)}
                        placeholder="e.g. 34043940"
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white font-mono w-36 focus:outline-hidden focus:ring-1 focus:ring-black"
                      />
                      <button
                        onClick={() => fetchExternalSource('pubmed', queryPmid)}
                        disabled={isLoadingSource}
                        className="px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingSource ? 'animate-spin' : ''}`} />
                        Query
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {sourceErrorMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{sourceErrorMessage}</span>
                </div>
              )}

              {/* Side-by-Side Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                      <th className="py-2.5 px-4 w-1/4">Field</th>
                      <th className="py-2.5 px-4 w-1/3 bg-blue-50/40 border-r border-gray-200">
                        Current Project Value
                      </th>
                      <th className="py-2.5 px-4 w-1/3 bg-emerald-50/40">
                        {sourceProvider === 'crossref' ? 'Crossref Metadata' : 'PubMed Metadata'}
                      </th>
                      <th className="py-2.5 px-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comparisons.map((c) => {
                      const isConflicting = c.isConflict && c.conflictSeverity !== 'NONE';
                      const rowBg = isConflicting
                        ? 'bg-rose-50/60'
                        : c.isMatch
                        ? 'bg-white'
                        : 'bg-gray-50/40';

                      return (
                        <tr key={c.field} className={`${rowBg} transition-colors`}>
                          <td className="py-3 px-4 font-semibold text-gray-800 align-top">
                            <div className="flex items-center gap-1.5">
                              {isConflicting && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              {c.isMatch && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                              <span>{c.fieldLabel}</span>
                            </div>
                            {c.differenceDescription && (
                              <div className="text-[10px] text-rose-700 font-sans mt-0.5">
                                {c.differenceDescription}
                              </div>
                            )}
                          </td>

                          {/* Left: Project Value */}
                          <td className="py-3 px-4 border-r border-gray-200 text-gray-900 align-top font-serif-academic leading-relaxed">
                            {c.field === 'authors' ? (
                              <div className="space-y-0.5">
                                {(workingRef.authors || []).map((a, i) => (
                                  <div key={i} className="text-xs">
                                    {i + 1}. <strong>{a.lastName}</strong>
                                    {a.firstName && <span>, {a.firstName}</span>}
                                    {a.orcid && (
                                      <span className="text-[10px] text-emerald-700 font-mono ml-1">
                                        ({a.orcid})
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {(!workingRef.authors || workingRef.authors.length === 0) && (
                                  <span className="text-gray-400 italic">No authors recorded</span>
                                )}
                              </div>
                            ) : c.field === 'doi' && c.projectValue ? (
                              <a
                                href={`https://doi.org/${normalizeDoi(c.projectValue)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-mono text-[11px]"
                              >
                                {c.projectValue}
                              </a>
                            ) : (
                              c.projectValue || (
                                <span className="text-gray-400 italic font-sans">— Empty —</span>
                              )
                            )}
                          </td>

                          {/* Right: Source Value */}
                          <td className="py-3 px-4 text-gray-900 align-top font-serif-academic leading-relaxed bg-emerald-50/20">
                            {c.field === 'authors' ? (
                              <div className="space-y-0.5">
                                {(sourceReference?.authors || []).map((a, i) => (
                                  <div key={i} className="text-xs">
                                    {i + 1}. <strong>{a.lastName}</strong>
                                    {a.firstName && <span>, {a.firstName}</span>}
                                    {a.orcid && (
                                      <span className="text-[10px] text-emerald-700 font-mono ml-1">
                                        ({a.orcid})
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {(!sourceReference?.authors || sourceReference.authors.length === 0) && (
                                  <span className="text-gray-400 italic font-sans">
                                    {isLoadingSource ? 'Querying registry...' : 'Not available in source'}
                                  </span>
                                )}
                              </div>
                            ) : c.field === 'doi' && c.sourceValue ? (
                              <a
                                href={`https://doi.org/${normalizeDoi(c.sourceValue)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-mono text-[11px]"
                              >
                                {c.sourceValue}
                              </a>
                            ) : (
                              c.sourceValue || (
                                <span className="text-gray-400 italic font-sans">
                                  {isLoadingSource ? 'Loading...' : '— Empty —'}
                                </span>
                              )
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-3 align-top text-center">
                            {c.sourceValue && !c.isMatch && (
                              <button
                                onClick={() => handleApplySourceField(c.field)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 mx-auto"
                                title="Copy source value to project"
                              >
                                <ArrowRight className="w-3 h-3" /> Use Source
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: AUTHOR ROSTER INSPECTOR */}
          {activeTab === 'authors' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  Author Order & Identity Verification
                </h4>
                <p className="text-gray-600 leading-relaxed font-sans">
                  Citation indexes and journal styles require strict preservation of author ordering, family names, and verified ORCID identifiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Authors Column */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Project Authors ({workingRef.authors?.length || 0})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(workingRef.authors || []).map((a, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {a.lastName}
                              {a.firstName && <span className="font-normal text-gray-600">, {a.firstName}</span>}
                            </div>
                            {a.orcid && (
                              <div className="text-[10px] text-emerald-700 font-mono">
                                ORCID: {a.orcid}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Authors Column */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Registry Authors ({sourceReference?.authors?.length || 0})
                    </span>

                    {sourceReference?.authors && sourceReference.authors.length > 0 && (
                      <button
                        onClick={() => handleApplySourceField('authors')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Sync Roster
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(sourceReference?.authors || []).map((a, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {a.lastName}
                              {a.firstName && <span className="font-normal text-gray-600">, {a.firstName}</span>}
                            </div>
                            {a.orcid && (
                              <div className="text-[10px] text-emerald-700 font-mono">
                                ORCID: {a.orcid}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!sourceReference?.authors || sourceReference.authors.length === 0) && (
                      <div className="text-center py-8 text-xs text-gray-400 italic">
                        {isLoadingSource ? 'Querying registry...' : 'No registry authors returned.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFICATION REPORT SCORECARD */}
          {activeTab === 'report' && (
            <div className="space-y-5">
              {/* Scorecard Overview */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Reference Verification Scorecard
                    </h4>
                    <div className="text-xs text-gray-500 font-sans mt-0.5">
                      Primary source: <strong>{verificationReport.primarySource}</strong>
                      {verificationReport.lastVerifiedAt && (
                        <span> • Last verified: {new Date(verificationReport.lastVerifiedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-600">Completeness</div>
                      <div className="text-lg font-bold text-gray-900">{completeness.completenessScore}%</div>
                    </div>
                  </div>
                </div>

                {/* Scorecard Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {verificationReport.items.map((item) => (
                    <div
                      key={item.key}
                      className="p-3 bg-white border border-gray-200 rounded-lg flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{item.label}</div>
                        <div className="text-gray-600 text-[11px] truncate font-serif-academic">
                          {item.details}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                          item.status === 'VERIFIED' || item.status === 'MATCH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'MISMATCH'
                            ? 'bg-rose-100 text-rose-800'
                            : item.status === 'MISSING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.status === 'MATCH' || item.status === 'VERIFIED' ? '✓ Verified' : item.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {completeness.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Completeness Advisory
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                      {completeness.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT HISTORY TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
                <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-gray-700" />
                  Auditable Verification History
                </h4>
                <p className="text-gray-600 leading-relaxed font-sans">
                  Chronological record of every status transition, external enrichment, and bibliographic field alteration.
                </p>
              </div>

              {(!workingRef.verificationHistory || workingRef.verificationHistory.length === 0) ? (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500">
                  No prior verification events recorded for this reference.
                </div>
              ) : (
                <div className="space-y-3">
                  {workingRef.verificationHistory.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              evt.action === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : evt.action === 'REJECTED'
                                ? 'bg-slate-200 text-slate-800'
                                : evt.action === 'MARKED_NEEDS_CORRECTION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {evt.action}
                          </span>
                          <span className="font-semibold text-gray-800">
                            By {evt.performedBy || 'Researcher'}
                          </span>
                        </div>

                        <span className="text-[11px] text-gray-400 font-mono">
                          {new Date(evt.performedAt).toLocaleString()}
                        </span>
                      </div>

                      {evt.reason && (
                        <div className="text-xs text-gray-700">
                          <strong>Reason:</strong> {evt.reason}
                        </div>
                      )}

                      {evt.notes && (
                        <div className="text-xs text-gray-600 italic">
                          "{evt.notes}"
                        </div>
                      )}

                      {evt.fieldChanges && evt.fieldChanges.length > 0 && (
                        <div className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                          <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                            Field Modifications:
                          </div>
                          {evt.fieldChanges.map((fc, i) => (
                            <div key={i} className="text-xs flex items-center gap-1.5 text-gray-700">
                              <span className="font-semibold">{fc.field}:</span>
                              <span className="text-gray-400 line-through truncate max-w-xs font-serif-academic">
                                {typeof fc.oldValue === 'object' ? JSON.stringify(fc.oldValue) : String(fc.oldValue || 'none')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-emerald-700 font-serif-academic font-medium truncate max-w-xs">
                                {typeof fc.newValue === 'object' ? JSON.stringify(fc.newValue) : String(fc.newValue || 'none')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCorrectionModalOpen(true)}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Needs Correction
            </button>

            <button
              onClick={() => setIsRejectModalOpen(true)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-600" /> Reject
            </button>
          </div>

          <div className="flex items-center gap-2">
            {workingRef.verificationStatus !== 'UNDER_REVIEW' && (
              <button
                onClick={handleSetUnderReview}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Mark Under Review
              </button>
            )}

            <button
              onClick={handleSaveFieldChanges}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> Save Edits
            </button>

            <button
              onClick={handleConfirmVerify}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" /> Mark as Verified
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL 1: REJECT REFERENCE PROMPT */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" /> Reject Reference
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Rejecting this reference marks it as ineligible evidence for manuscript generation. Please provide an auditable reason:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-black"
                >
                  <option value="Incorrect reference">Incorrect reference</option>
                  <option value="Duplicate">Duplicate record</option>
                  <option value="Wrong article">Wrong article / mismatched metadata</option>
                  <option value="Unreliable metadata">Unreliable metadata source</option>
                  <option value="Irrelevant reference">Irrelevant to manuscript scope</option>
                  <option value="Researcher decision">Researcher decision</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={rejectionCustomNotes}
                  onChange={(e) => setRejectionCustomNotes(e.target.value)}
                  placeholder="Explain why this reference is being rejected..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: NEEDS CORRECTION PROMPT */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Flag Needs Correction
              </h3>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Specify what bibliographic details require correction before this reference can be verified:
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Correction Instructions / Notes *
              </label>
              <textarea
                rows={3}
                value={correctionNotesInput}
                onChange={(e) => setCorrectionNotesInput(e.target.value)}
                placeholder="e.g. Missing page numbers, incorrect 3rd author name spelling, check DOI link..."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNeedsCorrection}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Set Needs Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: INCOMPLETE METADATA WARNING DIALOG */}
      {isCompletenessWarningOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-md w-full p-5 space-y-4 text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Incomplete Metadata Advisory
              </h3>
              <button
                onClick={() => setIsCompletenessWarningOpen(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed font-sans">
              This reference has incomplete metadata. You may still verify it, but the missing fields should be reviewed:
            </p>

            <ul className="list-disc list-inside text-xs text-amber-900 space-y-1 bg-amber-50 p-3 rounded-lg border border-amber-200">
              {completeness.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsCompletenessWarningOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Back to Review
              </button>
              <button
                onClick={handleConfirmVerify}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Verify Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
