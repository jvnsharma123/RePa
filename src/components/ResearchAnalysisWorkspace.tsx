import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  FileText,
  Image as ImageIcon,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Search,
  Plus,
  Check,
  X,
  Edit3,
  Eye,
  Sliders,
  Layers,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Zap,
  Tag,
  ShieldCheck,
  BarChart2
} from 'lucide-react';
import {
  Project,
  ResearchFile,
  ResearchFact,
  StructuredAIAnalysis,
  DirectObservation,
  QuantitativeMetric,
  AIInterpretationItem,
  ConflictItem,
  FactCategory,
  FactType,
  VerificationStatus
} from '../types';
import { analyzeResearchMaterials, analyzeResearchFile } from '../services/api';

interface ResearchAnalysisWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToFactsTab: () => void;
  userId?: string;
}

export const ResearchAnalysisWorkspace: React.FC<ResearchAnalysisWorkspaceProps> = ({
  project,
  onUpdateProject,
  onNavigateToFactsTab,
  userId = 'Dr. Evelyn Vance'
}) => {
  const files = project.files || [];

  // Selected files for analysis
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    files.length > 0 ? [files[0].id] : []
  );

  // Custom focus prompt / instructions
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Execution state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Active analysis results (either current session or stored in project/file)
  const [currentAnalysis, setCurrentAnalysis] = useState<StructuredAIAnalysis | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<
    'candidates' | 'observations' | 'quantitative' | 'interpretations' | 'limitations' | 'conflicts'
  >('candidates');

  // Edit candidate fact modal state
  const [editingCandidate, setEditingCandidate] = useState<ResearchFact | null>(null);
  const [editedStatement, setEditedStatement] = useState<string>('');
  const [editedCategory, setEditedCategory] = useState<FactCategory>('Findings/Data');
  const [editedFactType, setEditedFactType] = useState<FactType>('OBSERVATION');

  // Source inspection modal
  const [viewingSourceFact, setViewingSourceFact] = useState<ResearchFact | null>(null);

  // Quick focus presets
  const focusPresets = [
    {
      label: '🔬 All Empirical Observations',
      text: 'Perform comprehensive extraction of all empirical findings, direct experimental observations, and material properties without assumptions.'
    },
    {
      label: '📊 Quantitative Data & P-Values',
      text: 'Focus specifically on numerical measurements, sample sizes (n), p-values, statistical significance, error margins, and table metrics.'
    },
    {
      label: '🧪 Protocol & Methodology Parameters',
      text: 'Extract exact experimental conditions, chemical concentrations, temperatures, instrument parameters, and control groups.'
    },
    {
      label: '⚡ Cross-Material Discrepancies & Conflicts',
      text: 'Carefully compare the data across materials and project objectives to detect any conflicting numbers, unaligned trends, or unstated limitations.'
    }
  ];

  const handleToggleFileSelection = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      if (selectedFileIds.length > 1) {
        setSelectedFileIds(selectedFileIds.filter((id) => id !== fileId));
      }
    } else {
      setSelectedFileIds([...selectedFileIds, fileId]);
    }
  };

  const handleSelectAllFiles = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds(files.length > 0 ? [files[0].id] : []);
    } else {
      setSelectedFileIds(files.map((f) => f.id));
    }
  };

  // Run AI Material Analysis
  const handleRunAnalysis = async () => {
    if (selectedFileIds.length === 0) {
      alert('Please select at least one research material to analyze.');
      return;
    }

    const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      let analysisResult: StructuredAIAnalysis;

      if (selectedFiles.length === 1) {
        analysisResult = await analyzeResearchFile(
          selectedFiles[0],
          {
            title: project.title,
            hypothesis: project.hypothesis,
            methodology: project.methodology,
            majorFindings: project.majorFindings
          },
          customInstructions.trim() || undefined
        );
      } else {
        analysisResult = await analyzeResearchMaterials(
          selectedFiles,
          {
            title: project.title,
            hypothesis: project.hypothesis,
            methodology: project.methodology,
            majorFindings: project.majorFindings
          },
          customInstructions.trim() || undefined
        );
      }

      setCurrentAnalysis(analysisResult);

      // Update project files with analysis summary
      const updatedFiles = files.map((f) => {
        if (selectedFileIds.includes(f.id)) {
          return {
            ...f,
            aiAnalysis: analysisResult,
            extractedFactsCount: (analysisResult.candidateFacts || []).length,
            extractedFactsSummary: analysisResult.summary
          };
        }
        return f;
      });

      // Integrate candidate facts into project.facts if not already present
      const existingFactIds = new Set((project.facts || []).map((fact) => fact.id));
      const newCandidateFacts = (analysisResult.candidateFacts || []).filter(
        (cand) => !existingFactIds.has(cand.id)
      );

      onUpdateProject({
        ...project,
        files: updatedFiles,
        facts: [...(project.facts || []), ...newCandidateFacts],
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'Failed to complete research material analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Promote a candidate fact to Verified Research Fact
  const handleVerifyCandidate = (factId: string) => {
    const nowIso = new Date().toISOString();
    const updatedFacts = (project.facts || []).map((fact) => {
      if (fact.id === factId) {
        return {
          ...fact,
          verificationStatus: 'VERIFIED' as VerificationStatus,
          userVerified: true,
          verifiedStatement: fact.verifiedStatement || fact.fact || fact.keyStatement,
          verifiedBy: userId,
          verifiedAt: nowIso,
          updatedAt: nowIso
        };
      }
      return fact;
    });

    onUpdateProject({
      ...project,
      facts: updatedFacts,
      updatedAt: nowIso
    });

    // Update in current analysis state as well
    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        candidateFacts: currentAnalysis.candidateFacts.map((fact) =>
          fact.id === factId
            ? {
                ...fact,
                verificationStatus: 'VERIFIED' as VerificationStatus,
                userVerified: true,
                verifiedStatement: fact.verifiedStatement || fact.fact || fact.keyStatement,
                verifiedBy: userId,
                verifiedAt: nowIso
              }
            : fact
        )
      });
    }
  };

  // Reject a candidate fact
  const handleRejectCandidate = (factId: string) => {
    const nowIso = new Date().toISOString();
    const updatedFacts = (project.facts || []).map((fact) => {
      if (fact.id === factId) {
        return {
          ...fact,
          verificationStatus: 'REJECTED' as VerificationStatus,
          userVerified: false,
          verifiedBy: userId,
          verifiedAt: nowIso,
          updatedAt: nowIso
        };
      }
      return fact;
    });

    onUpdateProject({
      ...project,
      facts: updatedFacts,
      updatedAt: nowIso
    });

    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        candidateFacts: currentAnalysis.candidateFacts.map((fact) =>
          fact.id === factId
            ? {
                ...fact,
                verificationStatus: 'REJECTED' as VerificationStatus,
                userVerified: false
              }
            : fact
        )
      });
    }
  };

  // Open candidate edit modal
  const handleOpenEditCandidate = (fact: ResearchFact) => {
    setEditingCandidate(fact);
    setEditedStatement(fact.verifiedStatement || fact.fact || fact.keyStatement || '');
    setEditedCategory(fact.category || 'Findings/Data');
    setEditedFactType(fact.factType || 'OBSERVATION');
  };

  // Save edited candidate and verify
  const handleSaveAndVerifyCandidate = () => {
    if (!editingCandidate || !editedStatement.trim()) return;
    const nowIso = new Date().toISOString();

    const updatedFacts = (project.facts || []).map((fact) => {
      if (fact.id === editingCandidate.id) {
        return {
          ...fact,
          fact: editedStatement.trim(),
          keyStatement: editedStatement.trim(),
          verifiedStatement: editedStatement.trim(),
          category: editedCategory,
          factType: editedFactType,
          verificationStatus: 'VERIFIED' as VerificationStatus,
          userVerified: true,
          verifiedBy: userId,
          verifiedAt: nowIso,
          updatedAt: nowIso
        };
      }
      return fact;
    });

    onUpdateProject({
      ...project,
      facts: updatedFacts,
      updatedAt: nowIso
    });

    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        candidateFacts: currentAnalysis.candidateFacts.map((fact) =>
          fact.id === editingCandidate.id
            ? {
                ...fact,
                fact: editedStatement.trim(),
                keyStatement: editedStatement.trim(),
                verifiedStatement: editedStatement.trim(),
                category: editedCategory,
                factType: editedFactType,
                verificationStatus: 'VERIFIED' as VerificationStatus,
                userVerified: true,
                verifiedBy: userId,
                verifiedAt: nowIso
              }
            : fact
        )
      });
    }

    setEditingCandidate(null);
  };

  // Convert an interpretation item into a candidate fact
  const handlePromoteInterpretationToFact = (item: AIInterpretationItem) => {
    const nowIso = new Date().toISOString();
    const newFact: ResearchFact = {
      id: `fact-promoted-interp-${Date.now()}`,
      projectId: project.id,
      fact: item.text,
      keyStatement: item.text,
      factType: 'AI_INTERPRETATION',
      category: 'Conclusion',
      source: item.reasoning || 'AI Interpretation',
      sourceFile: selectedFileIds[0] ? files.find((f) => f.id === selectedFileIds[0])?.originalName : 'Research Material',
      sourceFileName: selectedFileIds[0] ? files.find((f) => f.id === selectedFileIds[0])?.originalName : 'Research Material',
      sourceLocation: 'Discussion Hypothesis',
      supportingObservation: item.reasoning,
      confidence: item.confidence || 'Medium',
      verificationStatus: 'INTERPRETATION',
      userVerified: false,
      originalAiStatement: item.text,
      isInterpretation: true,
      tags: ['Interpretation', 'Hypothesis'],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onUpdateProject({
      ...project,
      facts: [newFact, ...(project.facts || [])],
      updatedAt: nowIso
    });

    alert('AI interpretation saved to the candidate queue. You can verify or edit it in the Research Facts tab.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                AI Research Analysis & Evidence Extraction
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-medium">
                Phase 2B Verification Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed font-sans-ui">
              Inspect raw figures, tables, datasets, and documents with academic integrity controls. 
              The system isolates direct observations, quantitative measurements, and AI interpretations into distinct evidence tiers. 
              <strong className="text-slate-300"> No AI interpretation becomes a manuscript fact until you explicitly verify it.</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToFactsTab}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Facts Center ({(project.facts || []).filter((f) => f.userVerified || f.verificationStatus === 'VERIFIED').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Analysis Configuration & Control Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Material Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                1. Select Research Materials ({selectedFileIds.length}/{files.length})
              </span>
              {files.length > 1 && (
                <button
                  onClick={handleSelectAllFiles}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
                >
                  {selectedFileIds.length === files.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                No files uploaded to this project yet. Please go to the <strong>Research Files</strong> tab to upload figures, tables, or datasets.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {files.map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);
                  const isImage = file.category === 'Figures' || file.category === 'Images' || file.type?.includes('image');
                  const isTable = file.category === 'Tables' || file.type?.includes('csv') || file.type?.includes('spreadsheet');

                  return (
                    <div
                      key={file.id}
                      onClick={() => handleToggleFileSelection(file.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-600/80 shadow-xs'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 h-4 w-4 cursor-pointer"
                        />
                      </div>

                      <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                        {isImage ? (
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                        ) : isTable ? (
                          <TableIcon className="w-4 h-4 text-sky-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">{file.name || file.originalName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{file.sizeFormatted || 'Ready'}</span>
                          <span>•</span>
                          <span className="text-indigo-300">{file.category}</span>
                        </div>
                        {file.extractedFactsCount !== undefined && file.extractedFactsCount > 0 && (
                          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            {file.extractedFactsCount} candidate facts extracted
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick multi-material analysis note */}
            {selectedFileIds.length > 1 && (
              <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-lg p-2.5 text-[11px] text-indigo-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Multi-material cross inspection enabled: checks for concordances and discrepancies across {selectedFileIds.length} artifacts.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Focus Directives & Trigger (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                2. Researcher Focus Directives & Investigation Prompts (Optional)
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans-ui">
                Direct the AI inspection to concentrate on specific panels, metrics, statistical parameters, or experimental groups.
              </p>
            </div>

            {/* Focus Preset Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Quick Focus Presets:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {focusPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomInstructions(preset.text)}
                    className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-200 text-[11px]">{preset.label}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{preset.text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Focus Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                <span>Custom Instructions / Areas of Interest:</span>
                {customInstructions && (
                  <button
                    onClick={() => setCustomInstructions('')}
                    className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Focus on Table 2 panel B vs Figure 3. Extract all IC50 values and identify if sample size n is documented. Do not make assumptions about mechanism of action."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans-ui"
              />
            </div>

            {/* Action Trigger Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enforces 5-Tier Non-Fabrication Evidence Classification</span>
              </div>

              <button
                id="run-ai-research-analysis-btn"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || selectedFileIds.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Research Materials...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Research Material Analysis</span>
                  </>
                )}
              </button>
            </div>

            {analysisError && (
              <div className="bg-rose-950/40 border border-rose-800 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Results Display Section */}
      {currentAnalysis && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
          {/* Results Header */}
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-serif-academic font-bold text-white">
                  Structured Research Evidence Report
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {new Date(currentAnalysis.analyzedAt || Date.now()).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-serif-academic leading-relaxed max-w-4xl">
                {currentAnalysis.summary}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {(currentAnalysis.candidateFacts || []).length} candidate facts identified
              </span>
            </div>
          </div>

          {/* Result Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
            <button
              onClick={() => setActiveResultTab('candidates')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeResultTab === 'candidates'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              <span>Candidate Facts ({(currentAnalysis.candidateFacts || []).length})</span>
            </button>

            <button
              onClick={() => setActiveResultTab('observations')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeResultTab === 'observations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Direct Observations ({(currentAnalysis.directObservations || []).length})</span>
            </button>

            <button
              onClick={() => setActiveResultTab('quantitative')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeResultTab === 'quantitative'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Measurements & Data ({(currentAnalysis.quantitativeData || []).length})</span>
            </button>

            <button
              onClick={() => setActiveResultTab('interpretations')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeResultTab === 'interpretations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Interpretations ({(currentAnalysis.aiInterpretations || []).length})</span>
            </button>

            <button
              onClick={() => setActiveResultTab('limitations')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeResultTab === 'limitations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Limitations & Uncertainties ({(currentAnalysis.limitationsAndUncertainties || []).length})</span>
            </button>

            {currentAnalysis.conflictsDetected && currentAnalysis.conflictsDetected.length > 0 && (
              <button
                onClick={() => setActiveResultTab('conflicts')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeResultTab === 'conflicts'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Conflicts Detected ({currentAnalysis.conflictsDetected.length})</span>
              </button>
            )}
          </div>

          {/* TAB CONTENT: 1. CANDIDATE FACTS */}
          {activeResultTab === 'candidates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Candidate Research Facts Awaiting Investigator Verification
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Promote verified facts to enable their authoritative use in manuscript generation.
                </span>
              </div>

              {currentAnalysis.candidateFacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  No candidate facts isolated.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentAnalysis.candidateFacts.map((fact) => {
                    const isVerified = fact.userVerified || fact.verificationStatus === 'VERIFIED';
                    const isRejected = fact.verificationStatus === 'REJECTED';

                    return (
                      <div
                        key={fact.id}
                        className={`bg-slate-950 border rounded-xl p-4 space-y-3 transition-all ${
                          isVerified
                            ? 'border-emerald-800/80 bg-emerald-950/10'
                            : isRejected
                            ? 'border-slate-800 opacity-60'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-indigo-900/60 font-mono">
                              {fact.factType || 'OBSERVATION'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                              {fact.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isVerified ? (
                              <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Verified
                              </span>
                            ) : isRejected ? (
                              <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-rose-950 text-rose-300 border border-rose-800">
                                Rejected
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-amber-950 text-amber-300 border border-amber-800">
                                Pending Review
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Statement */}
                        <p className="text-xs font-serif-academic text-slate-200 leading-relaxed">
                          {fact.verifiedStatement || fact.fact || fact.keyStatement}
                        </p>

                        {/* Location and Source */}
                        <div className="text-[10px] text-slate-400 bg-slate-900/70 p-2 rounded border border-slate-800/80 space-y-0.5 font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Source:</span>
                            <span className="text-slate-300">{fact.sourceFileName || fact.source || 'Material'}</span>
                          </div>
                          {fact.sourceLocation && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Location:</span>
                              <span className="text-indigo-300">{fact.sourceLocation}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="border-t border-slate-900 pt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditCandidate(fact)}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 flex items-center gap-1 cursor-pointer"
                              title="Edit statement or category before verifying"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setViewingSourceFact(fact)}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-[11px] border border-slate-800 flex items-center gap-1 cursor-pointer"
                              title="Inspect extraction source details"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Source</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isVerified && (
                              <button
                                onClick={() => handleVerifyCandidate(fact.id)}
                                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              >
                                <Check className="w-3 h-3" />
                                <span>Verify Fact</span>
                              </button>
                            )}
                            {!isRejected && (
                              <button
                                onClick={() => handleRejectCandidate(fact.id)}
                                className="px-2 py-1 rounded bg-slate-900 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-[11px] border border-slate-800 transition-colors cursor-pointer"
                                title="Reject candidate fact"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: 2. DIRECT OBSERVATIONS */}
          {activeResultTab === 'observations' && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Direct Empirical & Visual Observations (Strictly Grounded in Materials)
              </span>

              <div className="space-y-2">
                {currentAnalysis.directObservations.map((obs, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="text-sky-300 font-semibold">Location: {obs.location || 'Document/Figure Body'}</span>
                      <span className="px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800">Confidence: {obs.confidence}</span>
                    </div>
                    <p className="text-slate-200 font-serif-academic leading-relaxed">{obs.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 3. QUANTITATIVE MEASUREMENTS */}
          {activeResultTab === 'quantitative' && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Extracted Numerical Metrics & Measured Parameters
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentAnalysis.quantitativeData.map((metric, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">{metric.label}</span>
                    <div className="text-xl font-bold font-mono text-white">
                      {metric.value} <span className="text-xs text-indigo-300 font-normal">{metric.unit || ''}</span>
                    </div>
                    {metric.pValue && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        p / CI: {metric.pValue}
                      </div>
                    )}
                    {metric.location && (
                      <div className="text-[10px] text-slate-500 font-mono border-t border-slate-900 pt-1">
                        Loc: {metric.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 4. AI INTERPRETATIONS & HYPOTHESES */}
          {activeResultTab === 'interpretations' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Tier 4 Classification - AI Interpretations & Hypotheses:</strong>
                  <span>These statements represent AI contextual reasoning and hypotheses. They are deliberately NOT treated as verified facts and will only be suggested for Discussion/Hypothesis sections unless you explicitly promote and verify them.</span>
                </div>
              </div>

              <div className="space-y-3">
                {currentAnalysis.aiInterpretations.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                        AI Interpretation / Hypothesis
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Confidence: {item.confidence || 'Medium'}</span>
                    </div>

                    <p className="text-xs font-serif-academic text-slate-200 leading-relaxed">
                      {item.text}
                    </p>

                    {item.reasoning && (
                      <div className="text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-400">
                        <strong className="text-slate-300 block text-[10px] uppercase font-mono">Underlying Observation / Reasoning:</strong>
                        <span className="font-serif-academic italic">{item.reasoning}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-900 pt-2 flex justify-end">
                      <button
                        onClick={() => handlePromoteInterpretationToFact(item)}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Save to Fact Queue</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 5. LIMITATIONS & UNCERTAINTIES */}
          {activeResultTab === 'limitations' && (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Identified Uncertainties, Missing Parameters, & Methodological Caveats
              </span>

              <div className="space-y-2">
                {currentAnalysis.limitationsAndUncertainties.map((lim, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
                    <span className="text-amber-400 font-mono mt-0.5">•</span>
                    <span className="font-serif-academic leading-relaxed">{lim}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: 6. CONFLICTS DETECTED */}
          {activeResultTab === 'conflicts' && currentAnalysis.conflictsDetected && (
            <div className="space-y-4">
              <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold">Cross-Material Discrepancies Flagged:</strong>
                  <span>The analysis detected discrepancies or contradictory parameters across your uploaded research artifacts. Review and decide which claim is authoritative.</span>
                </div>
              </div>

              <div className="space-y-3">
                {currentAnalysis.conflictsDetected.map((conf, idx) => (
                  <div key={idx} className="bg-slate-950 border border-rose-900/60 rounded-xl p-4 space-y-2 text-xs">
                    <div className="font-semibold text-rose-300">{conf.description}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Source A ({conf.sourceA}):</span>
                        <span>{conf.factA || 'Claim A'}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Source B ({conf.sourceB}):</span>
                        <span>{conf.factB || 'Claim B'}</span>
                      </div>
                    </div>
                    {conf.resolutionRecommendation && (
                      <div className="text-[11px] text-indigo-300 font-mono bg-indigo-950/40 p-2 rounded border border-indigo-900/50">
                        Recommendation: {conf.resolutionRecommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EDIT CANDIDATE MODAL */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Edit & Verify Candidate Fact
              </h3>
              <button
                onClick={() => setEditingCandidate(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Fact Statement (Scholarly Text)
                </label>
                <textarea
                  value={editedStatement}
                  onChange={(e) => setEditedStatement(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-serif-academic leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Fact Type (Evidence Tier)
                  </label>
                  <select
                    value={editedFactType}
                    onChange={(e) => setEditedFactType(e.target.value as FactType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="OBSERVATION">OBSERVATION (Visual/Empirical)</option>
                    <option value="MEASUREMENT">MEASUREMENT (Numerical metric)</option>
                    <option value="RESEARCHER_INPUT">RESEARCHER_INPUT (Authoritative)</option>
                    <option value="AI_INTERPRETATION">AI_INTERPRETATION (Hypothesis)</option>
                    <option value="HYPOTHESIS">HYPOTHESIS (Testable)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value as FactCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Findings/Data">Findings / Data</option>
                    <option value="Methodology">Methodology</option>
                    <option value="Hypothesis">Hypothesis</option>
                    <option value="Population/Sample">Population / Sample</option>
                    <option value="Variables">Variables</option>
                    <option value="Conclusion">Conclusion</option>
                    <option value="Limitations">Limitations</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingCandidate(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndVerifyCandidate}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Verify</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SOURCE INSPECTION MODAL */}
      {viewingSourceFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                Source Provenance & Extraction Trace
              </h3>
              <button
                onClick={() => setViewingSourceFact(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block">Source Artifact:</span>
                  <span className="text-white font-semibold">{viewingSourceFact.sourceFileName || viewingSourceFact.source || 'Direct Upload'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono block">Specific Location:</span>
                  <span className="text-indigo-300 font-mono">{viewingSourceFact.sourceLocation || 'Unspecified'}</span>
                </div>
                {viewingSourceFact.supportingObservation && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">Supporting Observation:</span>
                    <span className="text-slate-300 font-serif-academic">{viewingSourceFact.supportingObservation}</span>
                  </div>
                )}
              </div>

              {viewingSourceFact.originalAiStatement && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block">Original AI Extracted Statement:</span>
                  <p className="text-slate-300 font-serif-academic italic text-[11px]">
                    &quot;{viewingSourceFact.originalAiStatement}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setViewingSourceFact(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
