import React, { useState } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import {
  ProjectReference,
  ParsedReferenceEntry,
  ReferenceImportBatchResult,
  ReferenceVerificationStatus
} from '../types';

interface ReferenceImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchResult: ReferenceImportBatchResult | null;
  onConfirmImport: (referencesToImport: ProjectReference[], referencesToUpdate?: ProjectReference[]) => void;
  existingReferences: ProjectReference[];
  projectId: string;
}

export const ReferenceImportPreviewModal: React.FC<ReferenceImportPreviewModalProps> = ({
  isOpen,
  onClose,
  batchResult,
  onConfirmImport,
  existingReferences,
  projectId,
}) => {
  if (!isOpen || !batchResult) return null;

  const [entries, setEntries] = useState<ParsedReferenceEntry[]>(batchResult.entries);
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'DUPLICATE' | 'INCOMPLETE' | 'ERROR'>('ALL');
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);
  const [expandedRawIndex, setExpandedRawIndex] = useState<number | null>(null);

  // Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editJournal, setEditJournal] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editDoi, setEditDoi] = useState('');
  const [editVolume, setEditVolume] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editPages, setEditPages] = useState('');

  // Duplicate resolution choice per duplicate entry: 'skip' | 'import_new' | 'update_existing'
  const [duplicateActions, setDuplicateActions] = useState<Record<string, 'skip' | 'import_new' | 'update_existing'>>({});

  const counts = {
    all: entries.length,
    new: entries.filter((e) => e.statusCategory === 'NEW').length,
    duplicate: entries.filter((e) => e.statusCategory === 'DUPLICATE').length,
    incomplete: entries.filter((e) => e.statusCategory === 'INCOMPLETE').length,
    error: entries.filter((e) => e.statusCategory === 'ERROR').length,
  };

  const filteredEntries = entries.filter((e) => {
    if (activeTab === 'ALL') return true;
    return e.statusCategory === activeTab;
  });

  const selectedCount = entries.filter((e) => {
    if (!e.isValid) return false;
    if (e.statusCategory === 'DUPLICATE') {
      const action = duplicateActions[e.tempId] || 'skip';
      return action !== 'skip';
    }
    return e.selectedForImport;
  }).length;

  const handleToggleSelect = (tempId: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, selectedForImport: !e.selectedForImport } : e))
    );
  };

  const handleSelectAllValid = () => {
    setEntries((prev) =>
      prev.map((e) => (e.isValid && e.statusCategory !== 'DUPLICATE' ? { ...e, selectedForImport: true } : e))
    );
  };

  const handleDeselectAll = () => {
    setEntries((prev) => prev.map((e) => ({ ...e, selectedForImport: false })));
  };

  const handleStartEdit = (entry: ParsedReferenceEntry, index: number) => {
    setEditingEntryIndex(index);
    setEditTitle(entry.reference.title || '');
    setEditJournal(entry.reference.journal || '');
    setEditYear(entry.reference.publicationYear ? String(entry.reference.publicationYear) : '');
    setEditDoi(entry.reference.doi || '');
    setEditVolume(entry.reference.volume || '');
    setEditIssue(entry.reference.issue || '');
    setEditPages(entry.reference.pages || '');
  };

  const handleSaveEdit = (tempId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.tempId !== tempId) return e;

        const yearNum = editYear ? parseInt(editYear, 10) : undefined;
        const updatedRef: Partial<ProjectReference> = {
          ...e.reference,
          title: editTitle.trim(),
          journal: editJournal.trim() || undefined,
          publicationYear: yearNum,
          doi: editDoi.trim() || undefined,
          volume: editVolume.trim() || undefined,
          issue: editIssue.trim() || undefined,
          pages: editPages.trim() || undefined,
        };

        const issues: string[] = [];
        if (!updatedRef.title) issues.push('Missing publication title');
        if (!updatedRef.authors || updatedRef.authors.length === 0) issues.push('Missing author information');
        if (!updatedRef.publicationYear) issues.push('Missing publication year');

        const newCategory =
          issues.length === 0
            ? ('NEW' as const)
            : updatedRef.title
            ? ('INCOMPLETE' as const)
            : ('ERROR' as const);

        return {
          ...e,
          reference: updatedRef,
          issues,
          isValid: Boolean(updatedRef.title),
          statusCategory: e.statusCategory === 'DUPLICATE' ? 'DUPLICATE' : newCategory,
          selectedForImport: Boolean(updatedRef.title),
        };
      })
    );
    setEditingEntryIndex(null);
  };

  const handleConfirm = () => {
    const toImport: ProjectReference[] = [];
    const toUpdate: ProjectReference[] = [];

    for (const entry of entries) {
      if (!entry.isValid || !entry.reference.title) continue;

      if (entry.statusCategory === 'DUPLICATE') {
        const action = duplicateActions[entry.tempId] || 'skip';
        if (action === 'skip') continue;

        if (action === 'update_existing' && entry.duplicateOf) {
          // Merge metadata into existing reference
          const merged: ProjectReference = {
            ...entry.duplicateOf,
            title: entry.reference.title || entry.duplicateOf.title,
            authors: entry.reference.authors && entry.reference.authors.length > 0 ? entry.reference.authors : entry.duplicateOf.authors,
            journal: entry.reference.journal || entry.duplicateOf.journal,
            publicationYear: entry.reference.publicationYear || entry.duplicateOf.publicationYear,
            volume: entry.reference.volume || entry.duplicateOf.volume,
            issue: entry.reference.issue || entry.duplicateOf.issue,
            pages: entry.reference.pages || entry.duplicateOf.pages,
            doi: entry.reference.doi || entry.duplicateOf.doi,
            pmid: entry.reference.pmid || entry.duplicateOf.pmid,
            url: entry.reference.url || entry.duplicateOf.url,
            abstract: entry.reference.abstract || entry.duplicateOf.abstract,
            publisher: entry.reference.publisher || entry.duplicateOf.publisher,
            issn: entry.reference.issn || entry.duplicateOf.issn,
            publicationType: entry.reference.publicationType || entry.duplicateOf.publicationType,
            updatedAt: new Date().toISOString(),
          };
          toUpdate.push(merged);
          continue;
        }
      } else if (!entry.selectedForImport) {
        continue;
      }

      // Format clean ProjectReference
      const newRef: ProjectReference = {
        id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        projectId,
        title: entry.reference.title,
        authors: entry.reference.authors || [],
        journal: entry.reference.journal,
        publicationYear: entry.reference.publicationYear,
        volume: entry.reference.volume,
        issue: entry.reference.issue,
        pages: entry.reference.pages,
        doi: entry.reference.doi,
        pmid: entry.reference.pmid,
        url: entry.reference.url,
        abstract: entry.reference.abstract,
        publisher: entry.reference.publisher,
        sourceDatabase: entry.reference.sourceDatabase || (batchResult.sourceFormat as any) || 'file_import',
        citationKey: entry.reference.citationKey || `Ref${Date.now().toString().slice(-4)}`,
        verificationStatus: entry.issues.length === 0 ? 'VERIFIED' : 'METADATA_INCOMPLETE',
        userNotes: '',
        relevanceScore: 1.0,
        publicationType: entry.reference.publicationType || 'article',
        metadataSource: entry.reference.metadataSource || (batchResult.sourceFormat as any) || 'file_import',
        metadataProvider: entry.reference.metadataProvider || `${batchResult.sourceFormat.toUpperCase()} Import`,
        rawSourceData: entry.rawText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      toImport.push(newRef);
    }

    onConfirmImport(toImport, toUpdate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 font-serif-academic">
                  Reference Import Preview
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase">
                  {batchResult.sourceFormat.toUpperCase()}
                </span>
                {batchResult.sourceFileName && (
                  <span className="text-xs text-gray-500 max-w-xs truncate">
                    ({batchResult.sourceFileName})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Review parsed literature items and resolve duplicates before adding to your project library.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filter & Batch Selection Controls */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'NEW'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready ({counts.new})
            </button>
            <button
              onClick={() => setActiveTab('DUPLICATE')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'DUPLICATE'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Duplicates ({counts.duplicate})
            </button>
            <button
              onClick={() => setActiveTab('INCOMPLETE')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'INCOMPLETE'
                  ? 'bg-orange-600 text-white shadow-xs font-semibold'
                  : 'text-orange-700 hover:bg-orange-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Needs Metadata ({counts.incomplete})
            </button>
            {counts.error > 0 && (
              <button
                onClick={() => setActiveTab('ERROR')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ERROR'
                    ? 'bg-rose-600 text-white shadow-xs font-semibold'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Errors ({counts.error})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllValid}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium px-2 py-1 hover:bg-blue-50 rounded"
            >
              Select All Ready
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 hover:bg-gray-100 rounded"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Entries List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No references in this category</p>
              <p className="text-xs text-gray-400">Switch tabs to view other imported items.</p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const isEditing = editingEntryIndex === index;
              const isRawExpanded = expandedRawIndex === index;
              const ref = entry.reference;
              const dupAction = duplicateActions[entry.tempId] || 'skip';

              return (
                <div
                  key={entry.tempId}
                  className={`bg-white rounded-xl border transition-all p-5 shadow-xs ${
                    entry.statusCategory === 'DUPLICATE'
                      ? 'border-amber-200 bg-amber-50/20'
                      : entry.statusCategory === 'ERROR'
                      ? 'border-rose-200 bg-rose-50/20'
                      : entry.statusCategory === 'INCOMPLETE'
                      ? 'border-orange-200'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Item Header / Status Bar */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      {entry.statusCategory !== 'ERROR' && (
                        <input
                          type="checkbox"
                          checked={
                            entry.statusCategory === 'DUPLICATE'
                              ? dupAction !== 'skip'
                              : entry.selectedForImport
                          }
                          onChange={() => handleToggleSelect(entry.tempId)}
                          disabled={entry.statusCategory === 'DUPLICATE'}
                          className="mt-1 w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      )}

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.statusCategory === 'NEW' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
                          {entry.statusCategory === 'DUPLICATE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" /> Duplicate Detected
                            </span>
                          )}
                          {entry.statusCategory === 'INCOMPLETE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800">
                              <AlertCircle className="w-3 h-3" /> Needs Metadata
                            </span>
                          )}
                          {entry.statusCategory === 'ERROR' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3" /> Parse Error
                            </span>
                          )}

                          {ref.citationKey && (
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              [{ref.citationKey}]
                            </span>
                          )}
                          {ref.publicationType && (
                            <span className="text-[10px] uppercase tracking-wider text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                              {ref.publicationType}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-semibold text-gray-900 font-serif-academic leading-snug">
                          {ref.title || 'Untitled Reference'}
                        </h4>

                        {/* Authors & Publication Metadata */}
                        <p className="text-xs text-gray-600">
                          {ref.authors && ref.authors.length > 0
                            ? ref.authors.map((a) => a.lastName || a.fullName).join(', ')
                            : 'No authors parsed'}
                          {ref.publicationYear ? ` (${ref.publicationYear})` : ''}
                          {ref.journal ? ` — ${ref.journal}` : ''}
                          {ref.volume ? `, Vol. ${ref.volume}` : ''}
                          {ref.issue ? `(${ref.issue})` : ''}
                          {ref.pages ? `, pp. ${ref.pages}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Quick Edit & Raw toggle buttons */}
                    <div className="flex items-center gap-1.5">
                      {entry.isValid && !isEditing && (
                        <button
                          onClick={() => handleStartEdit(entry, index)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {entry.rawText && (
                        <button
                          onClick={() => setExpandedRawIndex(isRawExpanded ? null : index)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1"
                        >
                          Raw {isRawExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Issues Warning Box */}
                  {entry.issues.length > 0 && (
                    <div className="mt-2 text-xs bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-2.5 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Notice: </span>
                        {entry.issues.join('; ')}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Side-by-Side Resolution Box */}
                  {entry.statusCategory === 'DUPLICATE' && entry.duplicateOf && (
                    <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between font-semibold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Match Reason: {entry.duplicateReason || 'Exact match with existing project reference'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-md border border-amber-200">
                        <div>
                          <div className="font-semibold text-gray-700 mb-1">Existing Project Reference:</div>
                          <p className="font-medium text-gray-900">{entry.duplicateOf.title}</p>
                          <p className="text-gray-500">
                            {entry.duplicateOf.authors.map((a) => a.lastName).join(', ')} (
                            {entry.duplicateOf.publicationYear || 'N/A'})
                          </p>
                          {entry.duplicateOf.doi && (
                            <p className="text-gray-500 font-mono text-[11px]">DOI: {entry.duplicateOf.doi}</p>
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-gray-700 mb-1">Incoming Import Entry:</div>
                          <p className="font-medium text-gray-900">{ref.title}</p>
                          <p className="text-gray-500">
                            {ref.authors?.map((a) => a.lastName).join(', ')} ({ref.publicationYear || 'N/A'})
                          </p>
                          {ref.doi && <p className="text-gray-500 font-mono text-[11px]">DOI: {ref.doi}</p>}
                        </div>
                      </div>

                      {/* Duplicate Resolution Options */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <span className="font-semibold text-gray-700">Action:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`dup-${entry.tempId}`}
                            value="skip"
                            checked={dupAction === 'skip'}
                            onChange={() =>
                              setDuplicateActions((prev) => ({ ...prev, [entry.tempId]: 'skip' }))
                            }
                            className="text-amber-600"
                          />
                          <span className="text-gray-700 font-medium">Keep Existing (Skip Import)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`dup-${entry.tempId}`}
                            value="update_existing"
                            checked={dupAction === 'update_existing'}
                            onChange={() =>
                              setDuplicateActions((prev) => ({ ...prev, [entry.tempId]: 'update_existing' }))
                            }
                            className="text-blue-600"
                          />
                          <span className="text-gray-700 font-medium">Update Existing Reference</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`dup-${entry.tempId}`}
                            value="import_new"
                            checked={dupAction === 'import_new'}
                            onChange={() =>
                              setDuplicateActions((prev) => ({ ...prev, [entry.tempId]: 'import_new' }))
                            }
                            className="text-purple-600"
                          />
                          <span className="text-gray-700 font-medium">Import as Separate Reference</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Inline Edit Form */}
                  {isEditing && (
                    <div className="mt-3 p-4 bg-slate-50 border border-blue-200 rounded-lg space-y-3">
                      <div className="font-semibold text-xs text-blue-900 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Edit Parsed Reference Metadata
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Journal</label>
                          <input
                            type="text"
                            value={editJournal}
                            onChange={(e) => setEditJournal(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                          <input
                            type="number"
                            value={editYear}
                            onChange={(e) => setEditYear(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">DOI</label>
                          <input
                            type="text"
                            value={editDoi}
                            onChange={(e) => setEditDoi(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Volume</label>
                          <input
                            type="text"
                            value={editVolume}
                            onChange={(e) => setEditVolume(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Issue</label>
                          <input
                            type="text"
                            value={editIssue}
                            onChange={(e) => setEditIssue(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Pages</label>
                          <input
                            type="text"
                            value={editPages}
                            onChange={(e) => setEditPages(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-gray-300 bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingEntryIndex(null)}
                          className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(entry.tempId)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
                        >
                          Apply Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Raw Source Text Toggle */}
                  {isRawExpanded && entry.rawText && (
                    <div className="mt-3 p-3 bg-gray-900 text-gray-200 rounded-lg text-xs font-mono overflow-x-auto">
                      <div className="text-gray-400 text-[10px] mb-1 font-sans uppercase tracking-wider">
                        Original Parsed Source Record:
                      </div>
                      <pre className="whitespace-pre-wrap">{entry.rawText}</pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-600">
            <span className="font-bold text-gray-900">{selectedCount}</span> of {entries.length} references selected for import.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
            >
              Cancel Import
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0 && Object.values(duplicateActions).filter((v) => v === 'update_existing').length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Commit Import ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
