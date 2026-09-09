import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
  Edit3,
  Check,
  Database,
  Layers,
  Copy
} from 'lucide-react';
import {
  ProjectReference,
  ReferenceAuthor,
  PublicationType,
  ReferenceVerificationStatus
} from '../types';
import { normalizeDoi, detectDuplicateReference } from '../services/supabaseData';
import { CrossrefProvider, PubMedProvider } from '../services/referenceProviders';

interface DoiLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reference: ProjectReference) => void;
  existingReferences: ProjectReference[];
  projectId: string;
}

export const DoiLookupModal: React.FC<DoiLookupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingReferences,
  projectId,
}) => {
  if (!isOpen) return null;

  const [inputQuery, setInputQuery] = useState('');
  const [lookupType, setLookupType] = useState<'doi' | 'pmid'>('doi');
  const [selectedProvider, setSelectedProvider] = useState<'crossref' | 'pubmed'>('crossref');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retrievedRef, setRetrievedRef] = useState<Partial<ProjectReference> | null>(null);

  // Editable Form Fields once retrieved
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState<ReferenceAuthor[]>([]);
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [doi, setDoi] = useState('');
  const [pmid, setPmid] = useState('');
  const [url, setUrl] = useState('');
  const [publisher, setPublisher] = useState('');
  const [abstract, setAbstract] = useState('');
  const [publicationType, setPublicationType] = useState<PublicationType>('article');
  const [citationKey, setCitationKey] = useState('');
  const [userNotes, setUserNotes] = useState('');

  // Normalized preview
  const normalizedInputDoi = lookupType === 'doi' ? normalizeDoi(inputQuery) : '';
  const cleanInputPmid = lookupType === 'pmid' ? inputQuery.replace(/[^0-9]/g, '') : '';

  // Duplicate Check against project references
  const duplicateCheck = detectDuplicateReference(
    {
      doi: normalizedInputDoi || doi,
      title: title || undefined,
      publicationYear: year ? parseInt(year, 10) : undefined,
    },
    existingReferences
  );

  const handleFetch = async () => {
    setFetchError(null);
    setRetrievedRef(null);

    if (lookupType === 'doi') {
      const cleanDoi = normalizeDoi(inputQuery);
      if (!cleanDoi) {
        setFetchError('Please enter a valid DOI identifier (e.g., 10.1016/j.cell.2023.01.002 or https://doi.org/...)');
        return;
      }

      setIsLoading(true);
      try {
        const provider = selectedProvider === 'pubmed' ? new PubMedProvider() : new CrossrefProvider();
        const result = await provider.fetchByDoi(cleanDoi);

        if (!result.success || !result.reference) {
          setFetchError(result.errorMessage || 'Metadata could not be verified from the selected source.');
          setIsLoading(false);
          return;
        }

        const ref = result.reference;
        setRetrievedRef(ref);
        setTitle(ref.title || '');
        setAuthors(ref.authors || []);
        setJournal(ref.journal || '');
        setYear(ref.publicationYear ? String(ref.publicationYear) : '');
        setVolume(ref.volume || '');
        setIssue(ref.issue || '');
        setPages(ref.pages || '');
        setDoi(ref.doi || cleanDoi);
        setPmid(ref.pmid || '');
        setUrl(ref.url || `https://doi.org/${cleanDoi}`);
        setPublisher(ref.publisher || '');
        setAbstract(ref.abstract || '');
        setPublicationType(ref.publicationType || 'article');
        setCitationKey(ref.citationKey || '');
      } catch (err: any) {
        setFetchError(err.message || 'Metadata could not be verified from the selected source.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // PMID lookup
      const cleanPmid = inputQuery.replace(/[^0-9]/g, '').trim();
      if (!cleanPmid) {
        setFetchError('Please enter a valid numerical PubMed ID (e.g. 36720182)');
        return;
      }

      setIsLoading(true);
      try {
        const provider = new PubMedProvider();
        const result = await provider.fetchByPmid(cleanPmid);

        if (!result.success || !result.reference) {
          setFetchError(result.errorMessage || 'Metadata could not be verified from PubMed registry.');
          setIsLoading(false);
          return;
        }

        const ref = result.reference;
        setRetrievedRef(ref);
        setTitle(ref.title || '');
        setAuthors(ref.authors || []);
        setJournal(ref.journal || '');
        setYear(ref.publicationYear ? String(ref.publicationYear) : '');
        setVolume(ref.volume || '');
        setIssue(ref.issue || '');
        setPages(ref.pages || '');
        setDoi(ref.doi || '');
        setPmid(ref.pmid || cleanPmid);
        setUrl(ref.url || `https://pubmed.ncbi.nlm.nih.gov/${cleanPmid}/`);
        setPublisher(ref.publisher || '');
        setAbstract(ref.abstract || '');
        setPublicationType('article');
        setCitationKey(ref.citationKey || '');
      } catch (err: any) {
        setFetchError(err.message || 'Metadata could not be verified from PubMed.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setFetchError('Publication title is required.');
      return;
    }

    const firstAuthor = authors[0]?.lastName?.replace(/[^a-zA-Z]/g, '') || 'Author';
    const key = citationKey.trim() || (year ? `${firstAuthor}${year}` : `${firstAuthor}Ref`);

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
      url: url.trim() || undefined,
      publisher: publisher.trim() || undefined,
      abstract: abstract.trim() || undefined,
      publicationType,
      citationKey: key,
      sourceDatabase: selectedProvider === 'pubmed' ? 'pubmed' : 'crossref',
      metadataSource: selectedProvider === 'pubmed' ? 'pubmed' : 'crossref',
      metadataProvider: selectedProvider === 'pubmed' ? 'PubMed NCBI E-Utilities' : 'Crossref REST API',
      metadataSourceUrl: doi ? `https://doi.org/${normalizeDoi(doi)}` : pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : undefined,
      metadataRetrievedAt: new Date().toISOString(),
      verificationStatus: 'VERIFIED',
      userNotes: userNotes.trim() || undefined,
      relevanceScore: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newReference);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 font-serif-academic">
                Ingest & Enrich Reference via DOI / Identifier
              </h3>
              <p className="text-xs text-gray-500">
                Retrieve verified bibliographic records directly from Crossref or PubMed registries.
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

        {/* Input & Provider Selection Form */}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Lookup by:</span>
              <div className="inline-flex rounded-md shadow-2xs">
                <button
                  type="button"
                  onClick={() => setLookupType('doi')}
                  className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                    lookupType === 'doi'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Digital Object Identifier (DOI)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLookupType('pmid');
                    setSelectedProvider('pubmed');
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-b border-r ${
                    lookupType === 'pmid'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  PubMed ID (PMID)
                </button>
              </div>
            </div>

            {lookupType === 'doi' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">Registry:</span>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as any)}
                  className="text-xs px-2.5 py-1 border border-gray-300 rounded-md bg-white text-gray-800"
                >
                  <option value="crossref">Crossref (150M+ Works)</option>
                  <option value="pubmed">PubMed (Biomedical)</option>
                </select>
              </div>
            )}
          </div>

          {/* Search Input Box */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFetch();
                  }
                }}
                placeholder={
                  lookupType === 'doi'
                    ? 'e.g. 10.1038/s41586-023-06747-5 or https://doi.org/10.1016/j.cell.2023.01.002'
                    : 'e.g. 36720182'
                }
                className="w-full pl-3 pr-4 py-2.5 text-xs font-mono rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleFetch}
              disabled={isLoading || !inputQuery.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Fetch Metadata
                </>
              )}
            </button>
          </div>

          {/* DOI Normalization indicator */}
          {lookupType === 'doi' && inputQuery.trim() && (
            <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5">
              <span>Normalized DOI:</span>
              <span className="font-semibold text-gray-800">{normalizedInputDoi || '(None)'}</span>
            </div>
          )}

          {/* Duplicate Warning if already exists */}
          {duplicateCheck.isDuplicate && duplicateCheck.duplicateOf && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Notice: Reference Already in Library.</span>{' '}
                This project already includes &quot;{duplicateCheck.duplicateOf.title}&quot; (Citation Key: [{duplicateCheck.duplicateOf.citationKey}]).
              </div>
            </div>
          )}

          {/* Error Banner */}
          {fetchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Retrieval Error: </span>
                {fetchError}
              </div>
            </div>
          )}

          {/* Retrieved Metadata Preview & Form */}
          {retrievedRef && (
            <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    Verified {selectedProvider.toUpperCase()} Record Retrieved
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Article / Work Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-900"
                />
              </div>

              {/* Authors List Preview */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Authors ({authors.length})
                </label>
                <div className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 space-y-1">
                  {authors.length > 0 ? (
                    authors.map((a, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>
                          {idx + 1}. <strong className="text-gray-900">{a.fullName || a.lastName}</strong>
                          {a.affiliation ? ` (${a.affiliation})` : ''}
                        </span>
                        {a.orcid && (
                          <span className="text-[10px] text-green-700 font-mono">
                            ORCID: {a.orcid}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">No structured authors</span>
                  )}
                </div>
              </div>

              {/* Journal, Year, Publication Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Journal / Container</label>
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

              {/* Abstract Preview */}
              {abstract && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Abstract</label>
                  <textarea
                    rows={3}
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 bg-white text-gray-700"
                  />
                </div>
              )}

              {/* Researcher Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Researcher Notes / Relevance to Project (Optional)
                </label>
                <input
                  type="text"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="e.g. Primary methodology reference for cohort normalization"
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            {retrievedRef ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4" /> Ready to commit verified reference
              </span>
            ) : (
              'Enter a valid DOI or PMID to fetch verified bibliographic record.'
            )}
          </div>

          <div className="flex items-center gap-3">
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
              disabled={!retrievedRef || !title.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Add Reference to Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
