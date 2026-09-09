import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  RefreshCw,
  Plus,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Project, ManuscriptSection, ResearchFact, MissingInfoItem, ParagraphProvenance } from '../types';
import { generateAcademicSection } from '../services/api';

interface SectionRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: ManuscriptSection | null;
  project: Project;
  onAcceptDraft: (newContent: string, provenance: ParagraphProvenance[], missingInfo?: MissingInfoItem[], mode?: 'replace' | 'append') => void;
}

export const SectionRegenerationModal: React.FC<SectionRegenerationModalProps> = ({
  isOpen,
  onClose,
  section,
  project,
  onAcceptDraft,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [generatedProvenance, setGeneratedProvenance] = useState<ParagraphProvenance[]>([]);
  const [detectedMissingInfo, setDetectedMissingInfo] = useState<MissingInfoItem[]>([]);
  const [customDirective, setCustomDirective] = useState<string>('');
  const [abstractFormat, setAbstractFormat] = useState<'structured' | 'narrative'>('structured');
  const [previewTab, setPreviewTab] = useState<'proposed' | 'current' | 'diff'>('proposed');

  if (!isOpen || !section) return null;

  const isAbstract = section.sectionKey.toLowerCase().includes('abstract');
  const verifiedFacts = (project.facts || []).filter((f) => f.userVerified);
  const totalFactsCount = (project.facts || []).length;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        title: project.title,
        researchArea: project.researchArea,
        subField: project.subField,
        objectives: project.objectives,
        researchQuestions: project.researchQuestions,
        hypothesis: project.hypothesis,
        briefDescription: project.briefDescription,
        detailedDescription: project.detailedDescription,
        methodology: project.methodology,
        majorFindings: project.majorFindings,
        conclusion: project.conclusion,
        keywords: project.keywords || [],
        documentTypeTitle: project.documentTypeId,
        formatName: project.formatId,
        citationStyle: 'IEEE',
        sectionsToGenerate: [section.title],
        filesSummary: (project.files || []).map((f) => f.name).join(', '),
      };

      const result = await generateAcademicSection(
        section.title,
        payload,
        project.facts || [],
        {
          sectionKey: section.sectionKey,
          abstractFormat: isAbstract ? abstractFormat : undefined,
          customPrompt: customDirective.trim() || undefined,
          targetWordCount: section.wordCount > 50 ? section.wordCount : 350,
        }
      );

      setGeneratedDraft(result.content);
      setGeneratedProvenance(result.provenance || []);
      setDetectedMissingInfo(result.missingInfo || []);
      setPreviewTab('proposed');
    } catch (err: any) {
      alert(`Generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = (mode: 'replace' | 'append') => {
    if (generatedDraft) {
      onAcceptDraft(generatedDraft, generatedProvenance, detectedMissingInfo, mode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white font-serif-academic">
                  Evidence-Aware Section Drafting: <span className="text-indigo-400 font-sans-ui">{section.title}</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Safe Preview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grounded in {verifiedFacts.length} verified research facts & {totalFactsCount} empirical materials.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="bg-slate-950/40 border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {isAbstract && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Abstract Style:</span>
              <div className="flex rounded-md bg-slate-800 p-0.5 border border-slate-700">
                <button
                  onClick={() => setAbstractFormat('structured')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    abstractFormat === 'structured' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Structured (Subheadings)
                </button>
                <button
                  onClick={() => setAbstractFormat('narrative')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    abstractFormat === 'narrative' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Narrative Paragraph
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={customDirective}
              onChange={(e) => setCustomDirective(e.target.value)}
              placeholder="Optional focus directive (e.g. 'Emphasize temperature curve p < 0.01')..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            id="btn-run-section-draft"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Drafting Evidence Section...' : (generatedDraft ? 'Regenerate Draft' : 'Generate Section Draft')}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-300">
          {!generatedDraft && !isGenerating && (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-800 mx-auto flex items-center justify-center text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 font-serif-academic">Ready to Draft Section: {section.title}</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The AI engine will prioritize your verified research facts (Tier 1) and observed empirical data without inventing numbers, sample sizes, or bibliographic citations.
              </p>
              <button
                onClick={handleGenerate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm mt-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Scientific Draft
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300 font-medium font-serif-academic">Synthesizing verified empirical evidence...</p>
              <p className="text-xs text-slate-500">Checking tier 1 facts, figures, and research constraints</p>
            </div>
          )}

          {generatedDraft && !isGenerating && (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTab('proposed')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      previewTab === 'proposed'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Proposed AI Draft ({generatedDraft.split(/\s+/).filter(Boolean).length} words)
                  </button>
                  <button
                    onClick={() => setPreviewTab('current')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      previewTab === 'current'
                        ? 'bg-slate-800 text-slate-200 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Current Draft ({section.content.split(/\s+/).filter(Boolean).length} words)
                  </button>
                </div>

                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Evidence Grounded
                </span>
              </div>

              {/* Text View */}
              {previewTab === 'proposed' && (
                <div className="space-y-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-serif-academic text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {generatedDraft}
                  </div>

                  {/* Missing Info Warning */}
                  {detectedMissingInfo.length > 0 && (
                    <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Missing Scientific Parameters Detected in Draft:
                      </div>
                      <ul className="space-y-1 text-[11px] text-amber-200/90 pl-5 list-disc">
                        {detectedMissingInfo.map((mi) => (
                          <li key={mi.id}>
                            <strong>{mi.category}:</strong> {mi.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Provenance breakdown */}
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3 space-y-1.5">
                    <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Evidentiary Traceability ({generatedProvenance.length} paragraphs tagged)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Draft references project data without modifying other sections. You can replace the current draft or append below.
                    </p>
                  </div>
                </div>
              )}

              {previewTab === 'current' && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-serif-academic text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {section.content || '(Section is currently empty)'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          {generatedDraft && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAccept('append')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Insert Below Current Draft
              </button>
              <button
                id="btn-accept-replace-draft"
                onClick={() => handleAccept('replace')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Replace Current Section Draft
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
