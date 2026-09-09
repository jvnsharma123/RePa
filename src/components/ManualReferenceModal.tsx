import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  AlertCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import {
  ProjectReference,
  ReferenceAuthor,
  ReferenceVerificationStatus,
  ReferenceSourceDatabase,
  PublicationType
} from '../types';
import { normalizeDoi, detectDuplicateReference } from '../services/supabaseData';

interface ManualReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reference: ProjectReference) => void;
  existingReferences: ProjectReference[];
  initialReference?: ProjectReference | null;
  projectId: string;
}

export const ManualReferenceModal: React.FC<ManualReferenceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingReferences,
  initialReference,
  projectId,
}) => {
  const isEditing = Boolean(initialReference);

  // Form Fields
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState<ReferenceAuthor[]>([
    { firstName: '', lastName: '', fullName: '' }
  ]);
  const [authorsRawText, setAuthorsRawText] = useState('');
  const [useRawAuthors, setUseRawAuthors] = useState(false);
  const [publicationType, setPublicationType] = useState<PublicationType>('article');
  const [journal, setJournal] = useState('');
  const [publicationYear, setPublicationYear] = useState<string>('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [doi, setDoi] = useState('');
  const [pmid, setPmid] = useState('');
  const [url, setUrl] = useState('');
  const [publisher, setPublisher] = useState('');
  const [issn, setIssn] = useState('');
  const [isbn, setIsbn] = useState('');
  const [abstract, setAbstract] = useState('');
  const [citationKey, setCitationKey] = useState('');
  const [autoKeyModified, setAutoKeyModified] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<ReferenceVerificationStatus>('VERIFIED');
  const [userNotes, setUserNotes] = useState('');
  const [sourceDatabase, setSourceDatabase] =
    useState<ReferenceSourceDatabase>('manual');

  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Populate form if editing
  useEffect(() => {
    if (initialReference) {
      setTitle(initialReference.title || '');
      setAuthors(
        initialReference.authors?.length > 0
          ? initialReference.authors
          : [{ firstName: '', lastName: '', fullName: '' }]
      );
      setPublicationType(initialReference.publicationType || 'article');
      setJournal(initialReference.journal || '');
      setPublicationYear(
        initialReference.publicationYear
          ? String(initialReference.publicationYear)
          : ''
      );
      setVolume(initialReference.volume || '');
      setIssue(initialReference.issue || '');
      setPages(initialReference.pages || '');
      setDoi(initialReference.doi || '');
      setPmid(initialReference.pmid || '');
      setUrl(initialReference.url || '');
      setPublisher(initialReference.publisher || '');
      setIssn(initialReference.issn || '');
      setIsbn(initialReference.isbn || '');
      setAbstract(initialReference.abstract || '');
      setCitationKey(initialReference.citationKey || '');
      setAutoKeyModified(Boolean(initialReference.citationKey));
      setVerificationStatus(initialReference.verificationStatus || 'VERIFIED');
      setUserNotes(initialReference.userNotes || '');
      setSourceDatabase(initialReference.sourceDatabase || 'manual');
      setUseRawAuthors(false);
    } else {
      // Reset form
      setTitle('');
      setAuthors([{ firstName: '', lastName: '', fullName: '' }]);
      setAuthorsRawText('');
      setUseRawAuthors(false);
      setPublicationType('article');
      setJournal('');
      setPublicationYear(String(new Date().getFullYear()));
      setVolume('');
      setIssue('');
      setPages('');
      setDoi('');
      setPmid('');
      setUrl('');
      setPublisher('');
      setIssn('');
      setIsbn('');
      setAbstract('');
      setCitationKey('');
      setAutoKeyModified(false);
      setVerificationStatus('VERIFIED');
      setUserNotes('');
      setSourceDatabase('manual');
    }
    setFormErrors([]);
  }, [initialReference, isOpen]);

  // Auto-generate citation key if not manually edited
  useEffect(() => {
    if (!autoKeyModified) {
      const primaryAuthor = authors[0]?.lastName?.trim() || (useRawAuthors ? authorsRawText.split(',')[0]?.trim() : '');
      const year = publicationYear.trim() || '';
      if (primaryAuthor && year) {
        const cleanAuthor = primaryAuthor.replace(/[^a-zA-Z]/g, '');
        setCitationKey(`${cleanAuthor}${year}`);
      }
    }
  }, [authors, authorsRawText, useRawAuthors, publicationYear, autoKeyModified]);

  // Real-time duplicate check
  const duplicateCheck = detectDuplicateReference(
    {
      title: title.trim(),
      doi: normalizeDoi(doi),
      publicationYear: publicationYear ? parseInt(publicationYear, 10) : undefined,
    },
    existingReferences,
    initialReference?.id
  );

  if (!isOpen) return null;

  const handleAddAuthor = () => {
    setAuthors([...authors, { firstName: '', lastName: '', fullName: '' }]);
  };

  const handleRemoveAuthor = (index: number) => {
    if (authors.length <= 1) {
      setAuthors([{ firstName: '', lastName: '', fullName: '' }]);
      return;
    }
    setAuthors(authors.filter((_, idx) => idx !== index));
  };

  const handleAuthorChange = (
    index: number,
    field: keyof ReferenceAuthor,
    val: string
  ) => {
    const updated = [...authors];
    updated[index] = { ...updated[index], [field]: val };
    const first = updated[index].firstName?.trim() || '';
    const last = updated[index].lastName?.trim() || '';
    updated[index].fullName = first ? `${first} ${last}` : last;
    setAuthors(updated);
  };

  const handleParseRawAuthors = () => {
    if (!authorsRawText.trim()) return;
    // Parses comma/semicolon delimited authors like "Smith, John; Doe, Jane" or "John Smith, Jane Doe"
    const parts = authorsRawText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
    const parsed: ReferenceAuthor[] = parts.map((part) => {
      if (part.includes(',')) {
        const [last, first] = part.split(',').map((s) => s.trim());
        return { firstName: first, lastName: last, fullName: `${first} ${last}` };
      } else {
        const names = part.split(' ').filter(Boolean);
        const last = names.pop() || '';
        const first = names.join(' ');
        return { firstName: first, lastName: last, fullName: part };
      }
    });
    if (parsed.length > 0) {
      setAuthors(parsed);
      setUseRawAuthors(false);
    }
  };

  const handleDoiBlur = () => {
    if (doi.trim()) {
      const normalized = normalizeDoi(doi);
      setDoi(normalized);
      if (!url.trim()) {
        setUrl(`https://doi.org/${normalized}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!title.trim()) {
      errors.push('Reference Title is required.');
    }

    let finalAuthors: ReferenceAuthor[] = [];
    if (useRawAuthors && authorsRawText.trim()) {
      const parts = authorsRawText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
      finalAuthors = parts.map((p) => ({ lastName: p, fullName: p }));
    } else {
      finalAuthors = authors
        .filter((a) => a.lastName?.trim() || a.fullName?.trim())
        .map((a) => ({
          ...a,
          lastName: a.lastName.trim() || a.fullName.trim(),
          fullName: a.fullName.trim() || `${a.firstName || ''} ${a.lastName || ''}`.trim()
        }));
    }

    if (finalAuthors.length === 0) {
      errors.push('At least one author last name or full name is required.');
    }

    if (publicationYear && isNaN(parseInt(publicationYear, 10))) {
      errors.push('Publication Year must be a valid 4-digit number (e.g. 2024).');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const cleanedDoi = normalizeDoi(doi);
    const parsedYear = publicationYear ? parseInt(publicationYear, 10) : undefined;

    const refId = initialReference?.id || `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const savedRef: ProjectReference = {
      id: refId,
      projectId,
      title: title.trim(),
      authors: finalAuthors,
      journal: journal.trim() || undefined,
      publicationYear: parsedYear,
      volume: volume.trim() || undefined,
      issue: issue.trim() || undefined,
      pages: pages.trim() || undefined,
      doi: cleanedDoi || undefined,
      pmid: pmid.trim() || undefined,
      url: url.trim() || undefined,
      publisher: publisher.trim() || undefined,
      issn: issn.trim() || undefined,
      isbn: isbn.trim() || undefined,
      abstract: abstract.trim() || undefined,
      citationKey: citationKey.trim() || undefined,
      verificationStatus,
      userNotes: userNotes.trim() || '',
      sourceDatabase,
      publicationType,
      metadataSource: initialReference?.metadataSource || 'manual',
      metadataProvider: initialReference?.metadataProvider || 'Manual Entry',
      relevanceScore: initialReference?.relevanceScore || 1.0,
      createdAt: initialReference?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-gray-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 font-serif-academic">
                {isEditing ? 'Edit Project Reference' : 'Add Scholarly Reference'}
              </h2>
              <p className="text-xs text-gray-500">
                Project-scoped literature source verified by researcher
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error notifications */}
          {formErrors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Please address the following required fields:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {formErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicate Reference Warning */}
          {duplicateCheck.isDuplicate && duplicateCheck.duplicateOf && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-950">
                  Potential Duplicate Detected:
                </span>{' '}
                {duplicateCheck.matchReason}. An existing reference titled{' '}
                <strong className="text-amber-950 font-serif-academic">
                  "{duplicateCheck.duplicateOf.title}"
                </strong>{' '}
                ({duplicateCheck.duplicateOf.publicationYear || 'n.d.'}) is already in your library.
                You may still save if this is an intentional variant.
              </div>
            </div>
          )}

          {/* Section 1: Title & Verification */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Publication / Paper Title <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Attention Is All You Need"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-serif-academic text-gray-900 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Publication Type
                </label>
                <select
                  value={publicationType}
                  onChange={(e) => setPublicationType(e.target.value as PublicationType)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white text-gray-900 font-medium"
                >
                  <option value="article">Journal Article</option>
                  <option value="book">Book</option>
                  <option value="chapter">Book Chapter</option>
                  <option value="conference">Conference Paper</option>
                  <option value="preprint">Preprint (arXiv / bioRxiv)</option>
                  <option value="thesis">Thesis / Dissertation</option>
                  <option value="report">Technical Report / Standard</option>
                  <option value="dataset">Dataset / Benchmark</option>
                  <option value="patent">Patent</option>
                  <option value="other">Other Academic Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Verification Status
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) =>
                    setVerificationStatus(e.target.value as ReferenceVerificationStatus)
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white text-gray-900 font-medium"
                >
                  <option value="VERIFIED">Verified (Ready for Citation & Claims)</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="METADATA_INCOMPLETE">Metadata Incomplete (Needs review)</option>
                  <option value="REJECTED">Rejected (Excluded from manuscript)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Citation Key (BibTeX label)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={citationKey}
                    onChange={(e) => {
                      setAutoKeyModified(true);
                      setCitationKey(e.target.value);
                    }}
                    placeholder="e.g. Vaswani2017"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-mono text-gray-900 bg-white"
                  />
                  {!autoKeyModified && (
                    <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-sans">
                      Auto
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Authors */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                Authors <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setUseRawAuthors(!useRawAuthors)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {useRawAuthors ? 'Switch to structured author fields' : 'Paste comma-separated author string'}
              </button>
            </div>

            {useRawAuthors ? (
              <div className="space-y-2">
                <textarea
                  value={authorsRawText}
                  onChange={(e) => setAuthorsRawText(e.target.value)}
                  placeholder="e.g. Vaswani, Ashish; Shazeer, Noam; Parmar, Niki; Uszkoreit, Jakob"
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 bg-white"
                />
                <button
                  type="button"
                  onClick={handleParseRawAuthors}
                  className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 cursor-pointer"
                >
                  Parse into structured authors
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {authors.map((author, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-6 text-[11px] font-mono text-gray-400 text-center">
                      {index + 1}.
                    </div>
                    <input
                      type="text"
                      value={author.firstName || ''}
                      onChange={(e) => handleAuthorChange(index, 'firstName', e.target.value)}
                      placeholder="First name / initials"
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                    />
                    <input
                      type="text"
                      value={author.lastName}
                      onChange={(e) => handleAuthorChange(index, 'lastName', e.target.value)}
                      placeholder="Last name *"
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-semibold bg-white"
                      required
                    />
                    <input
                      type="text"
                      value={author.orcid || ''}
                      onChange={(e) => handleAuthorChange(index, 'orcid', e.target.value)}
                      placeholder="ORCID (opt)"
                      className="w-32 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-mono text-[11px] bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAuthor(index)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove Author"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddAuthor}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-black font-semibold mt-1 px-2.5 py-1 rounded border border-dashed border-gray-300 hover:border-gray-400 bg-gray-50/50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Author
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Publication Venue & Date */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Journal / Conference / Book Title
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="e.g. Advances in Neural Information Processing Systems (NeurIPS)"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-serif-academic text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Publication Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max="2099"
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(e.target.value)}
                  placeholder="e.g. 2017"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Volume
                </label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Issue / Number
                </label>
                <input
                  type="text"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pages
                </label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="e.g. 5998-6008"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Identifiers (DOI, PMID, URL) */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  DOI (Digital Object Identifier)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    onBlur={handleDoiBlur}
                    placeholder="e.g. 10.48550/arXiv.1706.03762"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-mono text-gray-900 bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Prefixes like 'https://doi.org/' are automatically normalized.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  PubMed ID (PMID)
                </label>
                <input
                  type="text"
                  value={pmid}
                  onChange={(e) => setPmid(e.target.value)}
                  placeholder="e.g. 33452140"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-mono text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Publication URL / Repository Link
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://arxiv.org/abs/1706.03762"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Publisher / Academic Press
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. IEEE, Springer, Elsevier"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Abstract & Researcher Notes */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Abstract / Executive Summary
              </label>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Paste publication abstract here..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black font-sans text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Researcher Notes & Manuscript Relevance
              </label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Notes on methodology, findings to cite, or contextual notes for your manuscript sections..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 bg-white"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">Authoritative:</span> All references are researcher verified before being cited in draft prose.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {isEditing ? 'Save Changes' : 'Add to Reference Library'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
