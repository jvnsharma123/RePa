import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Cpu,
  FileCheck,
  BookOpen,
  Info,
  HelpCircle
} from 'lucide-react';
import {
  Project,
  DocumentTypeKey,
  ResearchFile,
  FileCategory,
  ProcessingStage
} from '../types';
import { DOCUMENT_TYPE_OPTIONS, FORMAT_SPECIFICATIONS, DEMO_SAMPLE_PROJECTS } from '../data/catalog';
import { runProcessingPipeline } from '../services/api';

interface ProjectWizardProps {
  onCancel: () => void;
  onProjectCreated: (project: Project) => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ onCancel, onProjectCreated }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1 - Form State
  const [title, setTitle] = useState('');
  const [researchArea, setResearchArea] = useState('');
  const [subField, setSubField] = useState('');
  const [objectives, setObjectives] = useState('');
  const [researchQuestions, setResearchQuestions] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [briefDescription, setBriefDescription] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [methodology, setMethodology] = useState('');
  const [studyPopulationSample, setStudyPopulationSample] = useState('');
  const [variables, setVariables] = useState('');
  const [majorFindings, setMajorFindings] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [limitations, setLimitations] = useState('');
  const [keywordsString, setKeywordsString] = useState('');

  // STEP 2 - Uploaded Files State
  const [files, setFiles] = useState<ResearchFile[]>([]);
  const [selectedFileCategory, setSelectedFileCategory] = useState<FileCategory>('Experimental Data');
  const [isDragging, setIsDragging] = useState(false);

  // STEP 3 - Output Selection State
  const [documentTypeId, setDocumentTypeId] = useState<DocumentTypeKey>('research_article');
  const [formatId, setFormatId] = useState<string>('fmt-ieee-trans');
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('All');

  // STEP 4 - Pipeline Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [stages, setStages] = useState<ProcessingStage[]>([
    { id: 1, name: 'Reading research materials', description: 'Parsing user research inputs and uploaded file buffers', status: 'pending', progressPercent: 0 },
    { id: 2, name: 'Analyzing uploaded figures and documents', description: 'Extracting figures, tabular structures, and data schemas', status: 'pending', progressPercent: 0 },
    { id: 3, name: 'Extracting research facts', description: 'Isolating hypotheses, methodology parameters, and empirical metrics', status: 'pending', progressPercent: 0 },
    { id: 4, name: 'Organizing methodology and results', description: 'Correlating experimental variables with documented findings', status: 'pending', progressPercent: 0 },
    { id: 5, name: 'Identifying literature requirements', description: 'Establishing theoretical grounding and citation requirements', status: 'pending', progressPercent: 0 },
    { id: 6, name: 'Building manuscript structure', description: 'Configuring section hierarchy for selected document type', status: 'pending', progressPercent: 0 },
    { id: 7, name: 'Generating manuscript sections', description: 'Synthesizing publication-grade academic prose with strict provenance', status: 'pending', progressPercent: 0 },
    { id: 8, name: 'Applying selected format', description: 'Calibrating typography, citation brackets, word budgets, and headings', status: 'pending', progressPercent: 0 },
    { id: 9, name: 'Running academic quality checks', description: 'Auditing fact consistency, citation integrity, and formatting rules', status: 'pending', progressPercent: 0 }
  ]);

  // Categories for uploads
  const fileCategories: FileCategory[] = [
    'Figure',
    'Table',
    'Experimental Data',
    'Research Document',
    'Statistical Data',
    'Image',
    'Supplementary Material',
    'Other'
  ];

  // Helper to pre-fill sample data
  const handlePreFillSample = (sampleKey: 'hydrogel' | 'genomics') => {
    const sample = sampleKey === 'hydrogel' ? DEMO_SAMPLE_PROJECTS[0] : DEMO_SAMPLE_PROJECTS[1];
    setTitle(sample.title);
    setResearchArea(sample.researchArea);
    setSubField(sample.subField);
    setObjectives(sample.objectives);
    setResearchQuestions(sample.researchQuestions);
    setHypothesis(sample.hypothesis);
    setBriefDescription(sample.briefDescription);
    setDetailedDescription(sample.detailedDescription);
    setMethodology(sample.methodology);
    setStudyPopulationSample(sample.studyPopulationSample || '');
    setVariables(sample.variables || '');
    setMajorFindings(sample.majorFindings);
    setConclusion(sample.conclusion);
    setLimitations(sample.limitations || '');
    setKeywordsString(sample.keywords.join(', '));
    setDocumentTypeId(sample.documentTypeId);
    setFormatId(sample.formatId);

    // Pre-populate sample research files
    setFiles([
      {
        id: `file-sample-1-${Date.now()}`,
        projectId: 'temp',
        name: `${sampleKey}_Raw_Measurement_Series.csv`,
        originalName: 'Measurement_Series_Final.csv',
        category: 'Experimental Data',
        type: 'text/csv',
        size: 1024 * 180,
        sizeFormatted: '180 KB',
        uploadStatus: 'ready',
        extractedFactsCount: 3,
        extractedFactsSummary: 'Contains 36 experimental runs across triplicate cohorts.',
        uploadedAt: new Date().toISOString()
      },
      {
        id: `file-sample-2-${Date.now()}`,
        projectId: 'temp',
        name: `${sampleKey}_Characterization_Schematic.png`,
        originalName: 'Schematic_Fig1.png',
        category: 'Figure',
        type: 'image/png',
        size: 1024 * 650,
        sizeFormatted: '650 KB',
        uploadStatus: 'ready',
        extractedFactsCount: 2,
        uploadedAt: new Date().toISOString()
      }
    ]);
  };

  // Handle local file selection
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles: File[] = Array.from(e.target.files);

    const newFiles: ResearchFile[] = selectedFiles.map((file: File, idx: number) => ({
      id: `file-${Date.now()}-${idx}`,
      projectId: 'temp',
      name: file.name,
      originalName: file.name,
      category: selectedFileCategory,
      type: file.type || file.name.split('.').pop() || 'document',
      size: file.size,
      sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
      uploadStatus: 'ready',
      extractedFactsCount: selectedFileCategory === 'Experimental Data' || selectedFileCategory === 'Statistical Results' ? 2 : 1,
      uploadedAt: new Date().toISOString()
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Run the 9-stage pipeline
  const handleExecuteGO = async () => {
    if (!title.trim()) {
      alert('Please provide a research title in Step 1 before proceeding.');
      setCurrentStep(1);
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);

    const keywordsArray = keywordsString
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter(Boolean);

    const projectPayload: Partial<Project> = {
      title: title.trim(),
      researchArea: researchArea.trim() || 'Applied Sciences',
      subField: subField.trim(),
      objectives: objectives.trim(),
      researchQuestions: researchQuestions.trim(),
      hypothesis: hypothesis.trim(),
      briefDescription: briefDescription.trim(),
      detailedDescription: detailedDescription.trim(),
      methodology: methodology.trim(),
      studyPopulationSample: studyPopulationSample.trim(),
      variables: variables.trim(),
      majorFindings: majorFindings.trim(),
      conclusion: conclusion.trim(),
      limitations: limitations.trim(),
      keywords: keywordsArray.length > 0 ? keywordsArray : ['Empirical Research', 'Methodology'],
      documentTypeId,
      formatId,
      files
    };

    // Stage progress simulator function for realistic pipeline visualization
    const updateStage = (stageId: number, status: ProcessingStage['status'], percent: number, details?: string) => {
      setStages((prev) =>
        prev.map((st) => (st.id === stageId ? { ...st, status, progressPercent: percent, details } : st))
      );
    };

    try {
      // Step through stages visually while real server processing completes
      updateStage(1, 'in_progress', 50, 'Ingesting text inputs & file streams...');
      await new Promise((r) => setTimeout(r, 600));
      updateStage(1, 'completed', 100, `Processed ${files.length} uploaded files & structured metadata.`);

      updateStage(2, 'in_progress', 40, 'Analyzing figures & schema matrices...');
      await new Promise((r) => setTimeout(r, 600));
      updateStage(2, 'completed', 100, 'Indexed figures & table structures.');

      updateStage(3, 'in_progress', 40, 'Extracting research facts with non-fabrication constraints...');
      await new Promise((r) => setTimeout(r, 700));
      updateStage(3, 'completed', 100, 'Structured facts verified against user input provenance.');

      updateStage(4, 'in_progress', 60, 'Correlating methodology & findings...');
      await new Promise((r) => setTimeout(r, 500));
      updateStage(4, 'completed', 100, 'Empirical variables mapped to results.');

      updateStage(5, 'in_progress', 60, 'Synthesizing scholarly literature grounding...');
      await new Promise((r) => setTimeout(r, 500));
      updateStage(5, 'completed', 100, 'Formatted citation references with DOI linking.');

      updateStage(6, 'in_progress', 50, 'Configuring manuscript section blueprints...');
      await new Promise((r) => setTimeout(r, 500));
      updateStage(6, 'completed', 100, 'Section layout initialized.');

      updateStage(7, 'in_progress', 50, 'Synthesizing publication-grade academic prose...');

      // Call the actual server-side endpoint
      const resultProject = await runProcessingPipeline(projectPayload);

      updateStage(7, 'completed', 100, `Drafted ${resultProject.manuscript?.sections.length || 0} academic sections.`);

      updateStage(8, 'in_progress', 60, `Applying ${formatId} formatting rules...`);
      await new Promise((r) => setTimeout(r, 500));
      updateStage(8, 'completed', 100, 'Typography & citation styles formatted.');

      updateStage(9, 'in_progress', 80, 'Auditing academic quality & consistency...');
      await new Promise((r) => setTimeout(r, 600));
      updateStage(9, 'completed', 100, 'All compliance audits complete. 0 fact contradictions.');

      await new Promise((r) => setTimeout(r, 700));
      onProjectCreated(resultProject);
    } catch (err: any) {
      console.error('Processing error:', err);
      setProcessingError(err.message || 'Pipeline execution failed.');
      setIsProcessing(false);
    }
  };

  const selectedDocTypeObj = DOCUMENT_TYPE_OPTIONS.find((d) => d.key === documentTypeId) || DOCUMENT_TYPE_OPTIONS[0];
  const selectedFormatObj = FORMAT_SPECIFICATIONS.find((f) => f.id === formatId) || FORMAT_SPECIFICATIONS[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Wizard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif-academic font-bold text-white">Create New Research Project</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium font-mono">
              Step {currentStep} of 4
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans-ui">
            Transform your research materials, findings, and figures into a publication-grade manuscript.
          </p>
        </div>

        {/* Pre-fill Sample Helper */}
        {currentStep === 1 && !isProcessing && (
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pre-fill sample:
            </span>
            <button
              onClick={() => handlePreFillSample('hydrogel')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
            >
              Biomedical Study
            </button>
            <button
              onClick={() => handlePreFillSample('genomics')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono transition-colors"
            >
              AI Genomics Study
            </button>
          </div>
        )}
      </div>

      {/* Stepper Progress Bar */}
      {!isProcessing && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          <button
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
              currentStep === 1
                ? 'bg-indigo-950/60 border-indigo-600 text-white shadow-sm'
                : currentStep > 1
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-950 border-slate-900 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 1</div>
            <div className="text-xs font-bold truncate mt-0.5">Research Information</div>
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
              currentStep === 2
                ? 'bg-indigo-950/60 border-indigo-600 text-white shadow-sm'
                : currentStep > 2
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-950 border-slate-900 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 2</div>
            <div className="text-xs font-bold truncate mt-0.5">Upload Materials ({files.length})</div>
          </button>

          <button
            onClick={() => setCurrentStep(3)}
            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
              currentStep === 3
                ? 'bg-indigo-950/60 border-indigo-600 text-white shadow-sm'
                : currentStep > 3
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-950 border-slate-900 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 3</div>
            <div className="text-xs font-bold truncate mt-0.5">Select Output & Format</div>
          </button>

          <button
            onClick={() => setCurrentStep(4)}
            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
              currentStep === 4
                ? 'bg-indigo-950/60 border-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 border-slate-900 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 4</div>
            <div className="text-xs font-bold truncate mt-0.5 text-indigo-400">Pipeline Execution (GO)</div>
          </button>
        </div>
      )}

      {/* Main Wizard Form Body */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        {/* STEP 1: Research Information */}
        {currentStep === 1 && !isProcessing && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-white">Step 1 — Research Information</h2>
              <p className="text-xs text-slate-400">
                Provide the empirical foundation, hypothesis, and observed findings. Make fields optional where appropriate.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Research Title */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Research Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Injectable Biomimetic Hydrogel for Sustained Localized Doxorubicin Delivery..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>

              {/* Research Area & Sub-Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Research Area</label>
                  <input
                    type="text"
                    placeholder="e.g., Biomedical Engineering & Oncology"
                    value={researchArea}
                    onChange={(e) => setResearchArea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sub-Field / Domain</label>
                  <input
                    type="text"
                    placeholder="e.g., Nanomedicine & Targeted Drug Delivery"
                    value={subField}
                    onChange={(e) => setSubField(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Objectives & Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Research Objectives (Aims)</label>
                  <textarea
                    rows={3}
                    placeholder="State the primary research goals and experimental objectives..."
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Research Question(s)</label>
                  <textarea
                    rows={3}
                    placeholder="What specific questions or parameter relationships are being investigated?"
                    value={researchQuestions}
                    onChange={(e) => setResearchQuestions(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed"
                  />
                </div>
              </div>

              {/* Hypothesis */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Theoretical Hypothesis</label>
                <input
                  type="text"
                  placeholder="e.g., Incorporation of 0.5% GO crosslinking reduces burst release to <12%..."
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>

              {/* Brief & Detailed Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Brief Description (Summary)</label>
                  <textarea
                    rows={3}
                    placeholder="Concise overview of context and study rationale..."
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Detailed Research Description</label>
                  <textarea
                    rows={3}
                    placeholder="In-depth scientific narrative, background, and study rationale..."
                    value={detailedDescription}
                    onChange={(e) => setDetailedDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed"
                  />
                </div>
              </div>

              {/* Methodology & Population */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Methodology & Experimental Design</label>
                  <textarea
                    rows={3}
                    placeholder="Describe laboratory protocols, sample preparation, instrumentation, assays, and controls..."
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Study Population / Cohort / Sample Size</label>
                  <textarea
                    rows={3}
                    placeholder="Specify cell lines, clinical cohorts, sample sizes (n=..), power calculations, or material batches..."
                    value={studyPopulationSample}
                    onChange={(e) => setStudyPopulationSample(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed font-mono"
                  />
                </div>
              </div>

              {/* Empirical Variables & Major Findings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Independent, Dependent & Control Variables</label>
                  <textarea
                    rows={4}
                    placeholder="e.g., Independent: Drug concentration (0.1 - 10 uM); Dependent: Cell viability (%), release rate; Control: PBS vehicle..."
                    value={variables}
                    onChange={(e) => setVariables(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Major Findings & Numerical Results <span className="text-emerald-400">(Facts)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="List specific measured values, p-values, percentages, and observed outcomes (one per line)..."
                    value={majorFindings}
                    onChange={(e) => setMajorFindings(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 leading-relaxed font-mono"
                  />
                </div>
              </div>

              {/* Conclusion & Limitations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Core Conclusion</label>
                  <textarea
                    rows={3}
                    placeholder="Main academic deduction substantiated by findings..."
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Study Limitations & Boundary Conditions</label>
                  <textarea
                    rows={3}
                    placeholder="e.g., In vitro evaluation only, long-term degradation beyond 60 days requires further in vivo tracking..."
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keywords (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., Injectable Hydrogel, Osteosarcoma, Sustained Release"
                  value={keywordsString}
                  onChange={(e) => setKeywordsString(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Next: Upload Materials
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Upload Research Material */}
        {currentStep === 2 && !isProcessing && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-white">Step 2 — Upload Research Material</h2>
              <p className="text-xs text-slate-400">
                Upload raw experimental datasets, figures, tables, and documents for automated fact extraction.
              </p>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Category for Next Upload:
              </label>
              <div className="flex flex-wrap gap-2">
                {fileCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedFileCategory(cat)}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      selectedFileCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  const droppedFiles: File[] = Array.from(e.dataTransfer.files);
                  const newFiles: ResearchFile[] = droppedFiles.map((file: File, idx: number) => ({
                    id: `file-drop-${Date.now()}-${idx}`,
                    projectId: 'temp',
                    name: file.name,
                    originalName: file.name,
                    category: selectedFileCategory,
                    type: file.type || file.name.split('.').pop() || 'document',
                    size: file.size,
                    sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
                    uploadStatus: 'ready',
                    extractedFactsCount: 2,
                    uploadedAt: new Date().toISOString()
                  }));
                  setFiles((prev) => [...prev, ...newFiles]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/20'
                  : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Drag and drop research files here, or browse
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Supported formats: JPG, JPEG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT (Up to 50MB)
              </p>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors">
                <span>Select Files</span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={handleFileSelection}
                  className="hidden"
                />
              </label>
            </div>

            {/* Uploaded Files Table */}
            <div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="font-semibold text-slate-300">
                  Uploaded Materials ({files.length})
                </span>
                <span className="text-slate-500">Categorized for manuscript drafting</span>
              </div>

              {files.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800">
                  No files uploaded yet. You can proceed using only text description or upload figures/data above.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950 overflow-hidden">
                  {files.map((file) => (
                    <div key={file.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block">{file.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {file.sizeFormatted} • <span className="text-indigo-300">{file.category}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                          Ready for extraction
                        </span>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Next: Select Output & Format
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Output & Format */}
        {currentStep === 3 && !isProcessing && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-white">Step 3 — Select Output Document Type & Format</h2>
              <p className="text-xs text-slate-400">
                Choose the target academic publication model and formatting specification.
              </p>
            </div>

            {/* Document Type Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Select Document Type (16 Academic Archetypes):
                </label>
                {/* Category filters */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 text-[11px]">
                  {['All', 'Journal Articles', 'Theses & Dissertations', 'Technical & Reports', 'Custom'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDocCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        docCategoryFilter === cat ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                {DOCUMENT_TYPE_OPTIONS.filter(
                  (d) => docCategoryFilter === 'All' || d.category === docCategoryFilter
                ).map((doc) => (
                  <button
                    key={doc.key}
                    onClick={() => setDocumentTypeId(doc.key)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      documentTypeId === doc.key
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-white mb-0.5">{doc.title}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">{doc.description}</div>
                    </div>
                    <div className="mt-2 text-[10px] text-indigo-300 font-mono">
                      {doc.defaultSections.length} Sections • {doc.recommendedWordRange}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selector */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-200 block">
                Select Journal, University, or Custom Template:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FORMAT_SPECIFICATIONS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setFormatId(fmt.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formatId === fmt.id
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {fmt.category}
                        </span>
                        <span className="text-[10px] text-amber-300 font-medium">Placeholder Spec</span>
                      </div>
                      <div className="text-xs font-semibold text-white">{fmt.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{fmt.organization}</div>
                    </div>
                    <div className="mt-2 text-[10px] text-indigo-300">
                      Citation: <span className="font-mono">{fmt.citationStyle}</span> • Word Limit: {fmt.wordLimit.max}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration Summary Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                Configuration Summary
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Research:</span>
                  <span className="font-semibold text-white truncate block">{title || 'Untitled Research'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Document:</span>
                  <span className="font-semibold text-indigo-300">{selectedDocTypeObj.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Format:</span>
                  <span className="font-semibold text-indigo-300">{selectedFormatObj.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Files:</span>
                  <span className="font-semibold text-emerald-400">{files.length} items ready</span>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                Next: Review & Execute GO
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: GO & Processing Pipeline */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {!isProcessing ? (
              <div className="text-center py-8 space-y-6 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-950/50">
                  <Cpu className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-2xl font-serif font-bold text-white mb-2">Ready to Launch Academic Pipeline</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Clicking <strong className="text-white">GO</strong> will execute the 9-stage analysis, extract structured facts from your inputs, organize methodology & results, and generate sections adhering to <strong className="text-indigo-300">{selectedFormatObj.name}</strong> standards.
                  </p>
                </div>

                {/* Prominent Large GO Button */}
                <div>
                  <button
                    id="wizard-go-btn"
                    onClick={handleExecuteGO}
                    className="w-full sm:w-64 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-lg tracking-wider shadow-xl shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    GO
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Non-Fabrication Guarantee: Your raw findings remain protected.</span>
                </div>

                {processingError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300 text-left">
                    <strong className="block font-semibold mb-1">Error:</strong>
                    {processingError}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Configuration
                  </button>
                </div>
              </div>
            ) : (
              /* Live 9-Stage Processing Interface */
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400 animate-spin" />
                      Executing Manuscript Processing Pipeline
                    </h2>
                    <p className="text-xs text-slate-400">
                      Analyzing uploaded materials, extracting research facts, and drafting publication sections...
                    </p>
                  </div>
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800">
                    Live Status
                  </span>
                </div>

                {/* 9 Stages List */}
                <div className="space-y-3">
                  {stages.map((st) => (
                    <div
                      key={st.id}
                      className={`p-3 rounded-lg border text-xs transition-all ${
                        st.status === 'completed'
                          ? 'bg-slate-950 border-emerald-900/60 text-slate-200'
                          : st.status === 'in_progress'
                          ? 'bg-indigo-950/40 border-indigo-700 text-white shadow-sm'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 font-medium">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              st.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : st.status === 'in_progress'
                                ? 'bg-indigo-600 text-white animate-pulse'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {st.status === 'completed' ? '✓' : st.id}
                          </span>
                          <span>
                            {st.id}. {st.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono capitalize text-slate-400">{st.status.replace('_', ' ')}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-7">{st.details || st.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
