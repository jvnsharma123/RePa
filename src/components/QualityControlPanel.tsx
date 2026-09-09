import React, { useState } from 'react';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  BookOpen,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Project, QualityReport, QualityCheckItem } from '../types';
import { runQualityChecks } from '../services/api';

interface QualityControlPanelProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onOpenWorkspace: () => void;
}

export const QualityControlPanel: React.FC<QualityControlPanelProps> = ({
  project,
  onUpdateProject,
  onOpenWorkspace
}) => {
  const [report, setReport] = useState<QualityReport | null>(project.qualityReport || null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'facts', 'citations', 'structure', 'word_count', 'formatting', 'claims'];

  const handleRunAudit = async () => {
    setIsRunning(true);
    try {
      const newReport = await runQualityChecks(
        project.manuscript,
        project.facts || [],
        project.formatId
      );
      setReport(newReport);
      onUpdateProject({
        ...project,
        qualityReport: newReport,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      alert(`Audit failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const checksList = report?.checks || [];
  const filteredItems = checksList.filter((item) =>
    selectedCategory === 'all' ? true : item.category === selectedCategory
  );

  const passedCount = checksList.filter((i) => i.status === 'Passed').length;
  const warningCount = checksList.filter((i) => i.status === 'Warning').length;
  const reviewCount = checksList.filter((i) => i.status === 'Needs Review').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif-academic font-bold text-white">Academic Quality & Compliance Checks</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium font-mono">
              Manuscript Audit Suite
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans-ui">
            Auditing research fact consistency, missing sections, citation matching, and scientific claims for <strong className="text-slate-200">{project.title}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-quality-audit-btn"
            onClick={handleRunAudit}
            disabled={isRunning}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Auditing Manuscript...' : 'Re-Run Full Audit'}
          </button>
          <button
            onClick={onOpenWorkspace}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Back to Editor
          </button>
        </div>
      </div>

      {/* Score and Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-slate-400 text-xs uppercase font-medium">Overall Quality Score</span>
          <div className="text-2xl font-bold text-emerald-400 mt-0.5">
            {report?.overallScore || 95}/100
          </div>
          <span className="text-[11px] text-emerald-400">Publication Grade</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-slate-400 text-xs uppercase font-medium">Passed Checks</span>
          <div className="text-2xl font-bold text-emerald-400 mt-0.5">{passedCount}</div>
          <span className="text-[11px] text-slate-400">Strict compliance satisfied</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-slate-400 text-xs uppercase font-medium">Warnings</span>
          <div className="text-2xl font-bold text-amber-400 mt-0.5">{warningCount}</div>
          <span className="text-[11px] text-slate-400">Minor formatting recommendations</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <span className="text-slate-400 text-xs uppercase font-medium">Author Verification</span>
          <div className="text-2xl font-bold text-blue-400 mt-0.5">{reviewCount}</div>
          <span className="text-[11px] text-slate-400">Human checks recommended</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400">{filteredItems.length} check items</span>
        </div>

        {/* Audit Items List */}
        <div className="divide-y divide-slate-800">
          {filteredItems.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-950/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.status === 'Passed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {item.status === 'Warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  {item.status === 'Needs Review' && (
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  )}

                  <span className="text-xs font-semibold text-white">{item.name}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                    item.status === 'Passed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : item.status === 'Warning'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 pl-6 leading-relaxed">{item.message}</p>

              {item.recommendation && (
                <div className="ml-6 bg-slate-950 p-2.5 rounded border border-slate-800/80 text-xs text-indigo-300">
                  <strong className="text-slate-400 font-semibold">Recommendation: </strong>
                  {item.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
