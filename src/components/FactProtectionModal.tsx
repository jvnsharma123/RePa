import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, FileCode, Database, BookOpen, X } from 'lucide-react';

interface FactProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FactProtectionModal: React.FC<FactProtectionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-gray-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl text-gray-900 overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">Research Fact Protection Principles</h2>
              <p className="text-xs text-gray-500 mt-0.5">Core Academic Integrity & Non-Fabrication Architecture</p>
            </div>
          </div>
          <button
            id="close-fact-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900 leading-relaxed">
            <strong className="text-emerald-950 block mb-1 text-xs font-semibold">
              The Platform Is an Academic Assistant, Not a Hallucination Engine
            </strong>
            Research Manuscript Studio is strictly engineered to structure, format, and synthesize your actual research inputs. It is explicitly constrained from inventing experimental numbers, statistical p-values, sample sizes, laboratory conditions, or fabricated citations.
          </div>

          <div>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2.5">
              The Four Distinct Content Classes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  1. User-Provided Research Facts
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Raw numerical values, experimental protocols, observed findings, and direct uploads that remain completely immutable and authentic.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  2. Literature-Derived Information
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Contextual academic background, theoretical framing, and standard disciplinary citations with verifiable DOI attribution.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800 mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  3. AI-Generated Explanatory Prose
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Transitions, synthesis paragraphs, and scholarly structure built directly to wrap your verified facts in publication-grade syntax.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  4. AI Suggestions (Require Verification)
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Suggested discussion points, limitation considerations, and caption drafts clearly marked for researcher confirmation before inclusion.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-100 pt-4 text-xs text-gray-700">
            <h4 className="font-semibold text-gray-900 text-xs">Researcher Responsibility Statement</h4>
            <p className="text-gray-500 leading-relaxed">
              The researcher maintains full responsibility for research integrity, factual accuracy, scientific authorship, interpretation of empirical results, and compliance with institutional or journal ethical guidelines.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
          <button
            id="fact-modal-understood-btn"
            onClick={onClose}
            className="bg-black hover:bg-neutral-800 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
