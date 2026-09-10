import React, { useState } from 'react';
import {
  Project,
  SupportedCitationStyle,
  ProjectReference
} from '../types';
import {
  generateReferencesList,
  extractCitedReferences,
  generateFormattedBibliographyText,
  FormattedReferenceItem
} from '../services/citationFormatter';
import { CitationStyleSelector } from './CitationStyleSelector';
import {
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  FileText,
  BookmarkCheck,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ManuscriptReferencesSectionProps {
  project: Project;
  citationStyle: SupportedCitationStyle;
  onCitationStyleChange: (style: SupportedCitationStyle) => void;
  onNavigateToLiteratureLibrary?: () => void;
  onAppendReferencesToManuscript?: (formattedText: string) => void;
}

export const ManuscriptReferencesSection: React.FC<ManuscriptReferencesSectionProps> = ({
  project,
  citationStyle,
  onCitationStyleChange,
  onNavigateToLiteratureLibrary,
  onAppendReferencesToManuscript
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [showAllLibraryRefs, setShowAllLibraryRefs] = useState(false);

  const { citedReferences, uncitedReferences } = extractCitedReferences(project);
  const formattedItems = generateReferencesList(project, citationStyle, showAllLibraryRefs);
  const citedOnlyItems = formattedItems.filter((i) => i.isCitedInManuscript);

  const handleCopyAll = () => {
    const fullText = generateFormattedBibliographyText(project, citationStyle);
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (item: FormattedReferenceItem) => {
    navigator.clipboard.writeText(item.formattedText);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 1800);
  };

  const handleAppendToManuscript = () => {
    if (!onAppendReferencesToManuscript) return;
    const fullText = generateFormattedBibliographyText(project, citationStyle);
    onAppendReferencesToManuscript(fullText);
  };

  return (
    <div className="bg-white border border-[#141414] p-5 space-y-4 shadow-[4px_4px_0px_rgba(20,20,20,0.06)]">
      {/* Header & Style Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141414] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-serif-academic font-bold text-[#141414] uppercase tracking-tight flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#141414]" />
              Manuscript References & Bibliography
            </h3>
            <span className="text-[10px] font-mono font-bold bg-[#141414] text-white px-2 py-0.5 border border-[#141414]">
              {citedOnlyItems.length} CITED
            </span>
          </div>
          <p className="text-xs text-[#141414]/70 mt-0.5 font-sans-ui">
            Auto-compiled in real time from references cited in manuscript sections. Formatted according to {citationStyle}.
          </p>
        </div>

        {/* Style Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <CitationStyleSelector
            currentStyle={citationStyle}
            onStyleChange={onCitationStyleChange}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono bg-[#FAF9F7] p-2.5 border border-[#141414]/20">
        <div className="flex items-center gap-3">
          <span className="text-[#141414] font-bold">
            {citedOnlyItems.length} of {(project.references || []).length} references cited
          </span>
          {uncitedReferences.length > 0 && (
            <label className="flex items-center gap-1.5 text-[#141414]/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllLibraryRefs}
                onChange={(e) => setShowAllLibraryRefs(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#141414]"
              />
              <span>Include uncited library items ({uncitedReferences.length})</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            disabled={citedOnlyItems.length === 0}
            className="px-2.5 py-1 bg-white hover:bg-[#E9E8E5] disabled:opacity-40 text-[#141414] border border-[#141414] font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedAll ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedAll ? 'Copied All!' : 'Copy Formatted Bibliography'}</span>
          </button>

          {onAppendReferencesToManuscript && (
            <button
              onClick={handleAppendToManuscript}
              disabled={citedOnlyItems.length === 0}
              className="px-2.5 py-1 bg-[#141414] hover:bg-[#2A2A2A] disabled:opacity-40 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer border border-[#141414]"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Update Manuscript References Section</span>
            </button>
          )}
        </div>
      </div>

      {/* Reference Entries List */}
      {formattedItems.length === 0 ? (
        <div className="p-8 text-center bg-[#FAF9F7] border border-dashed border-[#141414]/40 space-y-3">
          <BookmarkCheck className="w-8 h-8 text-[#141414]/40 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold font-mono uppercase text-[#141414]">No References Cited in Manuscript Yet</h4>
            <p className="text-xs text-[#141414]/70 max-w-md mx-auto">
              Insert citations into any manuscript section from the Literature References library. References will be automatically compiled and formatted here in {citationStyle} style.
            </p>
          </div>
          {onNavigateToLiteratureLibrary && (
            <button
              onClick={onNavigateToLiteratureLibrary}
              className="px-3.5 py-1.5 bg-[#141414] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase tracking-wider font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-[#141414]"
            >
              <span>Go to Literature Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {formattedItems.map((item, index) => {
            const isCopied = copiedItemId === item.id;
            return (
              <div
                key={item.id}
                className={`p-3 border text-xs transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  item.isCitedInManuscript
                    ? 'bg-white border-[#141414]'
                    : 'bg-[#F9F8F6] border-[#141414]/20 opacity-80'
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {/* Style-specific index indicator */}
                  {citationStyle === 'IEEE' && (
                    <span className="font-mono font-bold text-[#141414] bg-[#E4E3E0] px-1.5 py-0.5 border border-[#141414]/30 shrink-0 text-[11px]">
                      [{item.orderNumber || index + 1}]
                    </span>
                  )}
                  {citationStyle === 'Vancouver' && (
                    <span className="font-mono font-bold text-[#141414] bg-[#E4E3E0] px-1.5 py-0.5 border border-[#141414]/30 shrink-0 text-[11px]">
                      {item.orderNumber || index + 1}.
                    </span>
                  )}
                  {citationStyle === 'APA' && (
                    <span className="font-mono text-[10px] text-[#666] bg-[#FAF9F7] px-1.5 py-0.5 border border-[#141414]/20 shrink-0">
                      APA
                    </span>
                  )}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-[#141414] font-serif-academic leading-relaxed text-xs select-text">
                      {item.formattedText}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                      <span className="text-[#666] bg-[#FAF9F7] px-1.5 py-0.2 border border-[#141414]/20">
                        In-Text: <strong className="text-[#141414]">{item.inTextPreview}</strong>
                      </span>

                      {item.isCitedInManuscript ? (
                        <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300 font-bold">
                          Cited {item.citationCount > 1 ? `${item.citationCount}x` : 'in manuscript'}
                        </span>
                      ) : (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 border border-amber-300">
                          Uncited in text
                        </span>
                      )}

                      {item.reference.doi && (
                        <a
                          href={
                            item.reference.doi.startsWith('http')
                              ? item.reference.doi
                              : `https://doi.org/${item.reference.doi}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#141414] hover:underline flex items-center gap-0.5"
                        >
                          <span>DOI</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                  <button
                    onClick={() => handleCopySingle(item)}
                    className="p-1.5 bg-white hover:bg-[#E4E3E0] text-[#141414] border border-[#141414] transition-colors cursor-pointer"
                    title="Copy this reference entry"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
