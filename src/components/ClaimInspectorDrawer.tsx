import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HelpCircle,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Tag,
  Link,
  Unlink,
  Sparkles,
  Layers
} from 'lucide-react';
import { Project, ManuscriptSection, ResearchFact, ClaimTraceabilityItem, EvidenceTier } from '../types';
import { explainClaim } from '../services/api';

interface ClaimInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText?: string;
  claimSnippet?: string;
  activeSection?: ManuscriptSection;
  project: Project;
  onLinkFactToSection: (factId: string) => void;
  onUnlinkFactFromSection: (factId: string) => void;
}

export const ClaimInspectorDrawer: React.FC<ClaimInspectorDrawerProps> = ({
  isOpen,
  onClose,
  selectedText,
  claimSnippet,
  activeSection,
  project,
  onLinkFactToSection,
  onUnlinkFactFromSection,
}) => {
  const initialText = claimSnippet || selectedText || '';
  const [loading, setLoading] = useState<boolean>(false);
  const [traceability, setTraceability] = useState<ClaimTraceabilityItem | null>(null);
  const [inputText, setInputText] = useState<string>(initialText);

  useEffect(() => {
    const text = claimSnippet || selectedText || '';
    if (text) {
      setInputText(text);
      handleInspect(text);
    }
  }, [claimSnippet, selectedText]);

  if (!isOpen) return null;

  const handleInspect = async (textToInspect: string) => {
    if (!textToInspect.trim()) return;
    setLoading(true);
    try {
      const result = await explainClaim(textToInspect, project);
      setTraceability(result);
    } catch (err: any) {
      console.error('Claim inspection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadge = (tier: EvidenceTier) => {
    switch (tier) {
      case 'TIER_1_VERIFIED_FACT':
        return { label: 'Tier 1: Verified Fact', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700' };
      case 'TIER_2_RESEARCHER_INPUT':
        return { label: 'Tier 2: Author Direct Input', bg: 'bg-blue-950/80 text-blue-300 border-blue-700' };
      case 'TIER_3_SOURCE_OBSERVATION':
        return { label: 'Tier 3: Source Observation', bg: 'bg-indigo-950/80 text-indigo-300 border-indigo-700' };
      case 'TIER_4_AI_INTERPRETATION':
        return { label: 'Tier 4: AI Scholarly Synthesis', bg: 'bg-purple-950/80 text-purple-300 border-purple-700' };
      default:
        return { label: 'Tier 5: Theoretical / Hypothesized', bg: 'bg-amber-950/80 text-amber-300 border-amber-700' };
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-serif-academic">Claim Evidence Inspector</h3>
            <p className="text-[11px] text-slate-400">Why did the system write this statement?</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-300">
        {/* Input/Selected Claim */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Evaluated Claim / Sentence:
          </label>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              placeholder="Highlight text in the editor or paste a claim here to inspect provenance..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-serif-academic focus:outline-none focus:border-indigo-500 resize-none"
            />
            <button
              onClick={() => handleInspect(inputText)}
              disabled={loading || !inputText.trim()}
              className="mt-1.5 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-1.5 rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              {loading ? 'Tracing Evidence Hierarchy...' : 'Trace Claim Evidence'}
            </button>
          </div>
        </div>

        {/* Traceability Result */}
        {traceability && (
          <div className="space-y-3.5 pt-2 border-t border-slate-800 animate-in fade-in duration-150">
            {/* Tier Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Evidence Classification:</span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${getTierBadge(traceability.tier).bg}`}>
                {getTierBadge(traceability.tier).label}
              </span>
            </div>

            {/* AI Explanation of Why */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Epistemic Rationale:
              </div>
              <p className="text-slate-300 text-xs leading-relaxed font-serif-academic">
                {traceability.explanation}
              </p>
            </div>

            {/* Supporting Research Fact */}
            {traceability.supportingFactStatement && (
              <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-lg p-3 space-y-1.5">
                <div className="text-[11px] font-medium text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Underlying Empirical Fact:
                  </span>
                  {traceability.supportingFactId && (
                    <span className="font-mono text-[10px] text-slate-400">{traceability.supportingFactId}</span>
                  )}
                </div>
                <p className="text-slate-200 text-xs font-serif-academic italic">
                  "{traceability.supportingFactStatement}"
                </p>
                {traceability.sourceFile && (
                  <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" />
                    Source: <span className="text-slate-300">{traceability.sourceFile}</span>
                  </div>
                )}
              </div>
            )}

            {/* Confidence & Hedging Notice */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Scientific Confidence:</span>
              <span className="font-medium text-indigo-300">{traceability.confidence}% Verified Concordance</span>
            </div>
          </div>
        )}

        {/* Section Linked Facts */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Facts Linked to {activeSection.title}
            </span>
            <span className="text-[10px] text-slate-500">{(activeSection.linkedFactIds || []).length} linked</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(project.facts || []).map((fact) => {
              const isLinked = (activeSection.linkedFactIds || []).includes(fact.id);
              return (
                <div
                  key={fact.id}
                  className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                    isLinked
                      ? 'bg-indigo-950/40 border-indigo-700/80 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="truncate flex-1">
                    <span className="font-medium text-slate-300 block truncate">{fact.statement}</span>
                    <span className="text-[10px] text-slate-500">{fact.category} • {fact.userVerified ? 'Verified' : 'Extracted'}</span>
                  </div>
                  <button
                    onClick={() => (isLinked ? onUnlinkFactFromSection(fact.id) : onLinkFactToSection(fact.id))}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      isLinked
                        ? 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/60'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                    title={isLinked ? 'Unlink Fact' : 'Link Fact'}
                  >
                    {isLinked ? <Unlink className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
