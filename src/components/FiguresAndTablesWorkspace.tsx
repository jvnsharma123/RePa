import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Table as TableIcon,
  Plus,
  Sparkles,
  Check,
  Copy,
  Trash2,
  Edit3,
  ExternalLink,
  Info,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Project, ResearchFigure, ResearchTable } from '../types';
import { generateFigureCaption, generateTableCaption } from '../services/api';

interface FiguresAndTablesWorkspaceProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onInsertReferenceToEditor?: (refText: string) => void;
}

export const FiguresAndTablesWorkspace: React.FC<FiguresAndTablesWorkspaceProps> = ({
  project,
  onUpdateProject,
  onInsertReferenceToEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'figures' | 'tables'>('figures');
  const [generatingCaptionId, setGeneratingCaptionId] = useState<string | null>(null);
  const [showAddFigureModal, setShowAddFigureModal] = useState<boolean>(false);
  const [showAddTableModal, setShowAddTableModal] = useState<boolean>(false);

  // New figure state
  const [newFigTitle, setNewFigTitle] = useState<string>('');
  const [newFigCaption, setNewFigCaption] = useState<string>('');
  const [newFigFile, setNewFigFile] = useState<string>('');

  // New table state
  const [newTabTitle, setNewTabTitle] = useState<string>('');
  const [newTabCaption, setNewTabCaption] = useState<string>('');
  const [newTabFootnotes, setNewTabFootnotes] = useState<string>('');

  const figures = project.figures || [];
  const tables = project.tables || [];

  const handleGenerateFigureCaption = async (fig: ResearchFigure) => {
    setGeneratingCaptionId(fig.id);
    try {
      const result = await generateFigureCaption(fig, project);
      const updatedFigures = figures.map((f) =>
        f.id === fig.id
          ? {
              ...f,
              caption: result.caption,
              description: result.notes || f.description,
            }
          : f
      );
      onUpdateProject({ ...project, figures: updatedFigures });
    } catch (err: any) {
      alert(`Caption error: ${err.message}`);
    } finally {
      setGeneratingCaptionId(null);
    }
  };

  const handleGenerateTableCaption = async (tab: ResearchTable) => {
    setGeneratingCaptionId(tab.id);
    try {
      const result = await generateTableCaption(tab, project);
      const updatedTables = tables.map((t) =>
        t.id === tab.id
          ? {
              ...t,
              caption: result.caption,
              footnotes: result.footnotes || t.footnotes,
            }
          : t
      );
      onUpdateProject({ ...project, tables: updatedTables });
    } catch (err: any) {
      alert(`Caption error: ${err.message}`);
    } finally {
      setGeneratingCaptionId(null);
    }
  };

  const handleAddFigure = () => {
    if (!newFigTitle.trim()) return;
    const newFig: ResearchFigure = {
      id: `fig-${Date.now()}`,
      projectId: project.id,
      figureNumber: figures.length + 1,
      title: newFigTitle.trim(),
      caption: newFigCaption.trim() || `Figure ${figures.length + 1}. ${newFigTitle.trim()}.`,
      imageUrl: '',
      sourceFileName: 'User-provided research visual',
      description: 'Empirical data visual representation.',
    };
    onUpdateProject({ ...project, figures: [...figures, newFig] });
    setNewFigTitle('');
    setNewFigCaption('');
    setShowAddFigureModal(false);
  };

  const handleAddTable = () => {
    if (!newTabTitle.trim()) return;
    const newTab: ResearchTable = {
      id: `tab-${Date.now()}`,
      projectId: project.id,
      tableNumber: tables.length + 1,
      title: newTabTitle.trim(),
      caption: newTabCaption.trim() || `Table ${tables.length + 1}. ${newTabTitle.trim()}.`,
      notes: newTabFootnotes.trim() || 'Values denote mean ± standard deviation.',
      footnotes: newTabFootnotes.trim() || 'Values denote mean ± standard deviation.',
      sourceFileName: 'User-provided research table',
      headers: ['Parameter / Variable', 'Baseline Control', 'Experimental Group', 'p-value'],
      rows: [
        ['Primary Metric', '10.2 ± 0.8', '14.6 ± 0.5', '< 0.01'],
        ['Secondary Response', '100%', '138%', '< 0.05'],
      ],
    };
    onUpdateProject({ ...project, tables: [...tables, newTab] });
    setNewTabTitle('');
    setNewTabCaption('');
    setNewTabFootnotes('');
    setShowAddTableModal(false);
  };

  const handleDeleteFigure = (id: string) => {
    const updated = figures.filter((f) => f.id !== id).map((f, idx) => ({ ...f, figureNumber: idx + 1 }));
    onUpdateProject({ ...project, figures: updated });
  };

  const handleDeleteTable = (id: string) => {
    const updated = tables.filter((t) => t.id !== id).map((t, idx) => ({ ...t, tableNumber: idx + 1 }));
    onUpdateProject({ ...project, tables: updated });
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('figures')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'figures'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Figures & Plots ({figures.length})
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'tables'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Tables & Matrices ({tables.length})
          </button>
        </div>

        <div>
          {activeTab === 'figures' ? (
            <button
              onClick={() => setShowAddFigureModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Register Figure
            </button>
          ) : (
            <button
              onClick={() => setShowAddTableModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Register Table
            </button>
          )}
        </div>
      </div>

      {/* Figures View */}
      {activeTab === 'figures' && (
        <div className="space-y-4">
          {figures.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Figures Registered Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Register figures, diagrams, and data plots to generate publication-grade captions and embed references into your manuscript prose.
              </p>
              <button
                onClick={() => setShowAddFigureModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Figure
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {figures.map((fig) => (
                <div
                  key={fig.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Figure {fig.figureNumber}
                        </span>
                        <h4 className="text-xs font-semibold text-white truncate max-w-[200px]">{fig.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteFigure(fig.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="Delete Figure"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Figure Caption Block */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Formal Journal Caption</span>
                        <button
                          onClick={() => handleGenerateFigureCaption(fig)}
                          disabled={generatingCaptionId === fig.id}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className={`w-3 h-3 ${generatingCaptionId === fig.id ? 'animate-spin' : ''}`} />
                          {generatingCaptionId === fig.id ? 'Formulating...' : 'AI Caption'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-serif-academic leading-relaxed italic">
                        "{fig.caption}"
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Cited as: (Figure {fig.figureNumber})</span>
                    {onInsertReferenceToEditor && (
                      <button
                        onClick={() => onInsertReferenceToEditor(`(Figure ${fig.figureNumber})`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Insert In Prose
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tables View */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          {tables.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
              <TableIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Tables Registered Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Organize quantitative matrices, experimental comparisons, and statistical footnotes.
              </p>
              <button
                onClick={() => setShowAddTableModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Table
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tables.map((tab) => (
                <div
                  key={tab.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        Table {tab.tableNumber}
                      </span>
                      <h4 className="text-xs font-semibold text-white">{tab.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerateTableCaption(tab)}
                        disabled={generatingCaptionId === tab.id}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700 cursor-pointer"
                      >
                        <Sparkles className={`w-3 h-3 ${generatingCaptionId === tab.id ? 'animate-spin' : ''}`} />
                        {generatingCaptionId === tab.id ? 'Formulating...' : 'AI Caption & Footnotes'}
                      </button>
                      <button
                        onClick={() => handleDeleteTable(tab.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Caption */}
                  <p className="text-xs text-slate-300 font-serif-academic italic">
                    {tab.caption}
                  </p>

                  {/* Table Matrix Preview */}
                  <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                        <tr>
                          {tab.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {tab.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/40">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footnotes */}
                  {tab.footnotes && (
                    <p className="text-[11px] text-slate-400 font-serif-academic">
                      <strong>Footnotes:</strong> {tab.footnotes}
                    </p>
                  )}

                  {/* Cross-ref link */}
                  {onInsertReferenceToEditor && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">Cited in text as: (Table {tab.tableNumber})</span>
                      <button
                        onClick={() => onInsertReferenceToEditor(`(Table ${tab.tableNumber})`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Insert In Prose
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Figure Modal */}
      {showAddFigureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white font-serif-academic">Register Research Figure</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Figure Title / Subject:</label>
                <input
                  type="text"
                  value={newFigTitle}
                  onChange={(e) => setNewFigTitle(e.target.value)}
                  placeholder="e.g. Temperature-dependent efficacy curves"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Draft Caption (Optional):</label>
                <textarea
                  value={newFigCaption}
                  onChange={(e) => setNewFigCaption(e.target.value)}
                  placeholder="Will automatically generate standard journal caption if left blank..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddFigureModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFigure}
                disabled={!newFigTitle.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                Save Figure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white font-serif-academic">Register Research Table</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Table Title:</label>
                <input
                  type="text"
                  value={newTabTitle}
                  onChange={(e) => setNewTabTitle(e.target.value)}
                  placeholder="e.g. Comparative demographic parameters"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Footnote Specification:</label>
                <input
                  type="text"
                  value={newTabFootnotes}
                  onChange={(e) => setNewTabFootnotes(e.target.value)}
                  placeholder="e.g. Statistical significance: *p < 0.05, **p < 0.01"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddTableModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                disabled={!newTabTitle.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                Save Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
