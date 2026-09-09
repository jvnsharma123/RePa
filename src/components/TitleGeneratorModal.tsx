import React, { useState } from 'react';
import { Sparkles, Check, RefreshCw, X, HelpCircle, FileText, ArrowRight, Info } from 'lucide-react';
import { Project, TitleCandidate } from '../types';
import { generateTitleCandidates } from '../services/api';

interface TitleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onApplyTitle?: (selectedTitle: string) => void;
  onSelectTitle?: (selectedTitle: string) => void;
  currentTitle?: string;
}

export const TitleGeneratorModal: React.FC<TitleGeneratorModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyTitle,
  onSelectTitle,
  currentTitle,
}) => {
  const [candidates, setCandidates] = useState<TitleCandidate[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>(currentTitle || project.title || '');
  const [customTitle, setCustomTitle] = useState<string>(currentTitle || project.title || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const results = await generateTitleCandidates(project);
      setCandidates(results);
      setHasGenerated(true);
      if (results.length > 0) {
        setSelectedTitle(results[0].title);
        setCustomTitle(results[0].title);
      }
    } catch (err: any) {
      alert(`Title generation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCandidate = (cand: TitleCandidate) => {
    setSelectedTitle(cand.title);
    setCustomTitle(cand.title);
  };

  const handleApply = () => {
    const finalTitle = customTitle.trim() || selectedTitle.trim() || project.title;
    if (finalTitle) {
      if (onApplyTitle) onApplyTitle(finalTitle);
      if (onSelectTitle) onSelectTitle(finalTitle);
      onClose();
    }
  };

  const verifiedFactsCount = (project.facts || []).filter((f) => f.userVerified).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white font-serif-academic">Academic Title Formulation Engine</h2>
              <p className="text-xs text-slate-400">Generate publication-grade titles grounded in verified research evidence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-300">
          {/* Context Badge */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="text-slate-200 font-medium">Research Grounding Context:</div>
              <div className="text-slate-400">
                Area: <strong className="text-slate-300">{project.researchArea || 'Unspecified'}</strong> • Verified Facts: <strong className="text-emerald-400">{verifiedFactsCount}</strong> • Current: <span className="italic text-slate-300">"{project.title}"</span>
              </div>
            </div>
          </div>

          {!hasGenerated && (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Generate 4 distinct academic title styles (Descriptive, Declarative, Methodological, and Concise High-Impact) adhering strictly to peer-review conventions without promotional hype words.
              </p>
              <button
                id="btn-generate-titles-initial"
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Formulating Academic Titles...' : 'Generate 4 Publication Titles'}
              </button>
            </div>
          )}

          {hasGenerated && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Candidate Titles</span>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Regenerate Candidates
                </button>
              </div>

              <div className="space-y-2.5">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedTitle === cand.title;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectCandidate(cand)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-800/50 border-slate-700/70 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-slate-800 text-indigo-300 border border-slate-700">
                              {cand.style}
                            </span>
                            <span className="text-[11px] text-slate-500">{cand.wordCount} words</span>
                          </div>
                          <p className="font-serif-academic font-medium text-sm leading-snug">{cand.title}</p>
                          <p className="text-[11px] text-slate-400 pt-0.5">{cand.rationale}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-600 text-transparent'
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Editable Field */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Selected / Customized Title:</span>
                  <span className="text-[11px] text-slate-400">{customTitle.split(/\s+/).filter(Boolean).length} words</span>
                </label>
                <textarea
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-serif-academic resize-none"
                  placeholder="Refine selected title..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!customTitle.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Title to Manuscript
          </button>
        </div>
      </div>
    </div>
  );
};
