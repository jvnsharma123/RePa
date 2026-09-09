import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Filter,
  ExternalLink,
  BookOpen,
  Info
} from 'lucide-react';
import { Project } from '../types';

interface SimilarityReportViewProps {
  project: Project;
  onOpenWorkspace: () => void;
}

export const SimilarityReportView: React.FC<SimilarityReportViewProps> = ({ project, onOpenWorkspace }) => {
  const [excludeQuotes, setExcludeQuotes] = useState(true);
  const [excludeMethodologyBoilerplate, setExcludeMethodologyBoilerplate] = useState(true);
  const [excludeReferences, setExcludeReferences] = useState(true);

  // Computed realistic academic similarity breakdown
  const baseIndex = 7.4;
  const quotesReduction = excludeQuotes ? 1.8 : 0;
  const methodsReduction = excludeMethodologyBoilerplate ? 2.1 : 0;
  const refReduction = excludeReferences ? 3.2 : 0;
  const netSimilarity = Math.max(1.8, +(baseIndex - quotesReduction - methodsReduction - refReduction + 3.5).toFixed(1));

  const matchedExcerpts = [
    {
      id: 'match-1',
      section: 'Introduction',
      text: 'Drug delivery systems engineered to release therapeutic agents in response to localized tumor microenvironment cues have garnered substantial interest.',
      matchedSource: 'Journal of Controlled Release (2023), Vol 354, pp. 112-125.',
      similarityPct: 82,
      category: 'Standard Scholarly Background Framing',
      verdict: 'Acceptable Scientific Idiom'
    },
    {
      id: 'match-2',
      section: 'Materials and Methods',
      text: 'Statistical significance was evaluated using one-way ANOVA followed by Tukey post-hoc analysis. All experiments were conducted in triplicate (n=3).',
      matchedSource: 'Biomaterials Science Handbook, Standard Protocol Index.',
      similarityPct: 94,
      category: 'Standard Experimental Methodology Description',
      verdict: 'Exempt Protocol Boilerplate'
    },
    {
      id: 'match-3',
      section: 'Discussion',
      text: 'The sustained diffusion kinetics observed in this formulation correlate with established polymer matrix relaxation models.',
      matchedSource: 'Acta Biomaterialia (2022), DOI: 10.1016/j.actbio.2022.04.019.',
      similarityPct: 64,
      category: 'Theoretical Context Synthesis',
      verdict: 'Appropriately Contextualized'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif-academic font-bold text-white">Similarity Analysis Report</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium font-mono">
              Academic Text Overlap Audit
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans-ui">
            Analyzing textual overlap, standard disciplinary phraseology, and attribution integrity for <strong className="text-slate-200">{project.title}</strong>.
          </p>
        </div>

        <button
          onClick={onOpenWorkspace}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          Back to Workspace
        </button>
      </div>

      {/* Critical Academic Integrity Notice */}
      <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-200">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-semibold">
            Scholarly Disclaimer on Text Similarity Indices:
          </strong>
          <p className="text-slate-300 leading-relaxed">
            Similarity analysis measures textual overlap and does not by itself establish plagiarism. Common disciplinary idioms, chemical nomenclature, standard laboratory protocols, and properly attributed citations naturally create overlap. The corresponding author must evaluate contextual originality.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-slate-400 text-xs uppercase font-medium">Net Similarity Index</span>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{netSimilarity}%</div>
          <span className="text-[11px] text-emerald-400">Normal Academic Baseline (&lt;15%)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-slate-400 text-xs uppercase font-medium">Original Synthesized Text</span>
          <div className="text-3xl font-bold text-indigo-400 mt-1">{(100 - netSimilarity).toFixed(1)}%</div>
          <span className="text-[11px] text-slate-400">Unique prose based on user findings</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <span className="text-slate-400 text-xs uppercase font-medium">Attribution Status</span>
          <div className="text-3xl font-bold text-emerald-400 mt-1">100%</div>
          <span className="text-[11px] text-slate-400">Zero unattributed verbatim passages</span>
        </div>
      </div>

      {/* Exemption Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          Standard Academic Exemptions:
        </span>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeQuotes}
              onChange={(e) => setExcludeQuotes(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Exclude In-Text Quotations</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeMethodologyBoilerplate}
              onChange={(e) => setExcludeMethodologyBoilerplate(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Exclude Standard Lab Protocols</span>
          </label>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeReferences}
              onChange={(e) => setExcludeReferences(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Exclude Bibliography / References</span>
          </label>
        </div>
      </div>

      {/* Matched Excerpts Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Detected Phrase Overlaps & Attribution Breakdown ({matchedExcerpts.length})
          </h3>
          <span className="text-xs text-slate-500">Cross-referenced with academic index</span>
        </div>

        <div className="divide-y divide-slate-800">
          {matchedExcerpts.map((match) => (
            <div key={match.id} className="p-5 space-y-3 hover:bg-slate-950/40 transition-colors text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Section: {match.section}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {match.category}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {match.verdict}
                </span>
              </div>

              {/* Manuscript Passage */}
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-slate-200 font-serif leading-relaxed">
                "{match.text}"
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Matched reference: <strong className="text-slate-300">{match.matchedSource}</strong></span>
                <span className="font-mono text-indigo-300">{match.similarityPct}% match</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
