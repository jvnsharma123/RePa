import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Sparkles,
  HelpCircle,
  X,
  FileText,
  Check
} from 'lucide-react';
import { Project, ManuscriptSection, MissingInfoItem, ResearchFact } from '../types';
import { detectMissingInformation } from '../services/api';

interface MissingInformationScannerProps {
  section?: ManuscriptSection;
  activeSection?: ManuscriptSection;
  project: Project;
  onAddVerifiedFact: (newFact: Partial<ResearchFact>) => void;
  onUpdateSectionMissingInfo: (sectionId: string, items: MissingInfoItem[]) => void;
}

export const MissingInformationScanner: React.FC<MissingInformationScannerProps> = ({
  section: propSection,
  activeSection: propActiveSection,
  project,
  onAddVerifiedFact,
  onUpdateSectionMissingInfo,
}) => {
  const section = propSection || propActiveSection || project.manuscript?.sections?.[0];
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [inputValues, setInputValues] = useState<{ [id: string]: string }>({});
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  if (!section) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        No active section selected to scan.
      </div>
    );
  }

  const missingItems = (section.missingInfo || []).filter((item) => !resolvedIds.includes(item.id));

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const results = await detectMissingInformation(section.sectionKey, section.content, project);
      onUpdateSectionMissingInfo(section.id, results);
      setResolvedIds([]);
    } catch (err: any) {
      alert(`Scanning error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleResolve = (item: MissingInfoItem) => {
    const enteredValue = inputValues[item.id]?.trim();
    if (!enteredValue) return;

    const paramName = item.parameter || item.category;

    // 1. Create a verified research fact from the researcher's input
    onAddVerifiedFact({
      projectId: project.id,
      category: 'Methodology',
      keyStatement: `${paramName}: ${enteredValue}`,
      statement: `${paramName}: ${enteredValue}`,
      value: enteredValue,
      unit: '',
      userVerified: true,
      confidence: 'High',
      sourceLocation: `Supplied by Researcher for ${section.title}`,
    });

    // 2. Mark as resolved locally
    setResolvedIds((prev) => [...prev, item.id]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white font-serif-academic">Scientific Completeness & Missing Parameters</h4>
            <p className="text-[11px] text-slate-400">Detect and supply required empirical variables for peer review</p>
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={isScanning}
          className="text-xs text-indigo-400 hover:text-indigo-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning Prose...' : 'Scan Section'}
        </button>
      </div>

      {/* List of items */}
      {missingItems.length === 0 ? (
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-3 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No critical missing parameters detected in this section. All standard methodological and statistical variables are accounted for.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {missingItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{item.parameter || item.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">{item.description}</p>
                </div>
              </div>

              {item.suggestedPrompt && (
                <div className="text-[11px] text-slate-500 italic bg-slate-900/60 p-2 rounded border border-slate-800">
                  Example: "{item.suggestedPrompt}"
                </div>
              )}

              {/* Input field to supply missing value */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={inputValues[item.id] || ''}
                  onChange={(e) => setInputValues({ ...inputValues, [item.id]: e.target.value })}
                  placeholder={`Enter verified ${(item.parameter || item.category).toLowerCase()} (e.g. n = 50, p < 0.01)...`}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleResolve(item)}
                  disabled={!inputValues[item.id]?.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                  Add Fact & Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
