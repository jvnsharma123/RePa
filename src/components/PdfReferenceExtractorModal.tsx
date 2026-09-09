import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Search,
  Check,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Info
} from 'lucide-react';
import {
  ProjectReference,
  ReferenceAuthor,
  PublicationType
} from '../types';
import { normalizeDoi, detectDuplicateReference } from '../services/supabaseData';
import { CrossrefProvider } from '../services/referenceProviders';

interface PdfReferenceExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reference: ProjectReference) => void;
  existingReferences: ProjectReference[];
  projectId: string;
}

export const PdfReferenceExtractorModal: React.FC<PdfReferenceExtractorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingReferences,
  projectId,
}) => {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEnrichingDoi, setIsEnrichingDoi] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Extracted Fields for User Review & Editing
  const [extractedRef, setExtractedRef] = useState<Partial<ProjectReference> | null>(null);
  const [confidence, setConfidence] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState<ReferenceAuthor[]>([]);
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [doi, setDoi] = useState('');
  const [pmid, setPmid] = useState('');
  const [abstract, setAbstract] = useState('');
  const [publicationType, setPublicationType] = useState<PublicationType>('article');
  const [citationKey, setCitationKey] = useState('');
  const [userNotes, setUserNotes] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setExtractionError(null);
    }
  };

  const handleExtract = async () => {
    setExtractionError(null);
    setWarningMessage(null);
    setExtractedRef(null);

    let textToAnalyze = '';
    let fileName = '';

    if (inputMode === 'upload') {
      if (!selectedFile) {
        setExtractionError('Please select a PDF document to extract.');
        return;
      }
      fileName = selectedFile.name;
      // Read file text content
      try {
        textToAnalyze = await selectedFile.text();
      } catch {
        textToAnalyze = `Uploaded PDF file: ${selectedFile.name} (Size: ${selectedFile.size} bytes)`;
      }
    } else {
      if (!pastedText.trim()) {
        setExtractionError('Please paste paper text or header excerpt.');
        return;
      }
      textToAnalyze = pastedText;
      fileName = 'Pasted Paper Excerpt';
    }

    setIsExtracting(true);
    try {
      const res = await fetch('/api/references/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze, fileName }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !data.reference) {
        setExtractionError(data.errorMessage || 'Failed to extract metadata from document.');
        setIsExtracting(false);
        return;
      }

      const ref = data.reference;
      setExtractedRef(ref);
      setConfidence(data.confidence);
      setWarningMessage(data.unverifiedWarning || 'Extracted from PDF draft. Please review all bibliographic fields before saving.');

      setTitle(ref.title || '');
      setAuthors(ref.authors || []);
      setJournal(ref.journal || '');
      setYear(ref.publicationYear ? String(ref.publicationYear) : '');
      setVolume(ref.volume || '');
      setIssue(ref.issue || '');
      setPages(ref.pages || '');
      setDoi(ref.doi || '');
      setPmid(ref.pmid || '');
      setAbstract(ref.abstract || '');
      setPublicationType(ref.publicationType || 'article');
      setCitationKey(ref.citationKey || '');
    } catch (err: any) {
      setExtractionError(err.message || 'Failed to extract reference metadata.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Option to enrich with official Crossref record if DOI exists
  const handleEnrichViaDoi = async () => {
    const cleanDoi = normalizeDoi(doi);
    if (!cleanDoi) {
      setExtractionError('No valid DOI found to query Crossref.');
      return;
    }

    setIsEnrichingDoi(true);
    try {
      const provider = new CrossrefProvider();
      const result = await provider.fetchByDoi(cleanDoi);

      if (result.success && result.reference) {
        const enriched = result.reference;
        setTitle(enriched.title || title);
        if (enriched.authors && enriched.authors.length > 0) setAuthors(enriched.authors);
        if (enriched.journal) setJournal(enriched.journal);
        if (enriched.publicationYear) setYear(String(enriched.publicationYear));
        if (enriched.volume) setVolume(enriched.volume);
        if (enriched.issue) setIssue(enriched.issue);
        if (enriched.pages) setPages(enriched.pages);
        if (enriched.abstract) setAbstract(enriched.abstract);
        setWarningMessage('Successfully enriched with verified official record from Crossref.');
      } else {
        setWarningMessage('Crossref lookup was inconclusive. Using extracted PDF metadata.');
      }
    } catch (err: any) {
      setWarningMessage('Crossref lookup failed. Preserving extracted PDF metadata.');
    } finally {
      setIsEnrichingDoi(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setExtractionError('Document title is required.');
      return;
    }

    const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Doc';
    const key = citationKey.trim() || (year ? `${firstAuthor}${year}` : `${firstAuthor}PDF`);

    const newReference: ProjectReference = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      title: title.trim(),
      authors: authors.length > 0 ? authors : [{ lastName: 'Unknown', fullName: 'Unknown' }],
      journal: journal.trim() || undefined,
      publicationYear: year ? parseInt(year, 10) : undefined,
      volume: volume.trim() || undefined,
      issue: issue.trim() || undefined,
      pages: pages.trim() || undefined,
      doi: normalizeDoi(doi) || undefined,
      pmid: pmid.trim() || undefined,
      abstract: abstract.trim() || undefined,
      publicationType,
      citationKey: key,
      sourceDatabase: 'pdf_extract',
      metadataSource: 'pdf_extract',
      metadataProvider: 'PDF Extraction Engine',
      metadataRetrievedAt: new Date().toISOString(),
      verificationStatus: 'PENDING', // PDF extractions default to PENDING for user verification
      extractionConfidence: confidence,
      userNotes: userNotes.trim() || undefined,
      relevanceScore: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newReference);
    onClose();
  };

  const dupCheck = detectDuplicateReference(
    {
      doi: normalizeDoi(doi) || undefined,
      title: title || undefined,
      publicationYear: year ? parseInt(year, 10) : undefined,
    },
    existingReferences
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif-academic">
                Extract Reference Metadata from PDF
              </h3>
              <p className="text-xs text-gray-500">
                Extract bibliographic metadata from a PDF document or text header. Unverified drafts require researcher review.
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

        {/* Input Method Switcher */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            <button
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                inputMode === 'upload'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload PDF File
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                inputMode === 'paste'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Paste Document Text / Header
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-8 h-8 text-indigo-500" />
                <span className="text-xs font-semibold text-gray-800">
                  {selectedFile ? selectedFile.name : 'Click to select PDF or drag & drop here'}
                </span>
                <span className="text-[11px] text-gray-400">Supported files: .pdf, .txt</span>
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Paste Header, Title Page, or Citation Excerpt:
              </label>
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the title, author list, journal line, abstract, and DOI from the paper..."
                className="w-full text-xs p-3 rounded-lg border border-gray-300 font-mono bg-white"
              />
            </div>
          )}

          {/* Extract Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExtract}
              disabled={isExtracting || (inputMode === 'upload' ? !selectedFile : !pastedText.trim())}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting Metadata...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze & Extract
                </>
              )}
            </button>
          </div>

          {/* Extraction Error */}
          {extractionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{extractionError}</div>
            </div>
          )}

          {/* Duplicate Warning */}
          {dupCheck.isDuplicate && dupCheck.duplicateOf && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Duplicate Warning: </strong> Matches &quot;{dupCheck.duplicateOf.title}&quot; in your library.
              </div>
            </div>
          )}

          {/* Extracted Metadata Review Form */}
          {extractedRef && (
            <div className="border border-indigo-200 bg-indigo-50/20 rounded-xl p-5 space-y-4">
              {/* Draft Banner */}
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Extracted Draft (Unverified):</strong> Please review bibliographic details before saving.
                  </span>
                </div>
                {confidence?.overall && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-100 rounded text-amber-800">
                    Confidence: {Math.round(confidence.overall * 100)}%
                  </span>
                )}
              </div>

              {/* DOI Enrichment Option */}
              {doi && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>DOI detected: <strong className="font-mono">{doi}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnrichViaDoi}
                    disabled={isEnrichingDoi}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isEnrichingDoi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Enrich via Crossref
                  </button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white font-medium"
                />
              </div>

              {/* Authors */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Authors ({authors.length})
                </label>
                <div className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700">
                  {authors.length > 0
                    ? authors.map((a) => a.fullName || a.lastName).join(', ')
                    : 'No authors parsed (please check text)'}
                </div>
              </div>

              {/* Journal, Year, DOI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Journal / Proceedings</label>
                  <input
                    type="text"
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              </div>

              {/* Volume, Issue, Pages, Citation Key */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Volume</label>
                  <input
                    type="text"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Issue</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pages</label>
                  <input
                    type="text"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Citation Key</label>
                  <input
                    type="text"
                    value={citationKey}
                    onChange={(e) => setCitationKey(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Optional context or extraction notes..."
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!extractedRef || !title.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Add Extracted Reference
          </button>
        </div>
      </div>
    </div>
  );
};
