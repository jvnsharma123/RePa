import React, { useState } from 'react';
import {
  Layers,
  BookOpen,
  Plus,
  CheckCircle2,
  Sliders,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  Building,
  GraduationCap
} from 'lucide-react';
import { FORMAT_SPECIFICATIONS } from '../data/catalog';
import { FormatSpecification } from '../types';

interface FormatDirectoryProps {
  onSelectFormat?: (formatId: string) => void;
  activeFormatId?: string;
}

export const FormatDirectory: React.FC<FormatDirectoryProps> = ({ onSelectFormat, activeFormatId }) => {
  const [formats, setFormats] = useState<FormatSpecification[]>(FORMAT_SPECIFICATIONS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // Custom Format Form State
  const [customName, setCustomName] = useState('');
  const [customOrg, setCustomOrg] = useState('');
  const [customCitation, setCustomCitation] = useState<'APA' | 'IEEE' | 'Vancouver' | 'Harvard' | 'MLA' | 'Chicago' | 'Custom'>('APA');
  const [customWordMax, setCustomWordMax] = useState(8000);
  const [customAbstractMax, setCustomAbstractMax] = useState(250);

  const categories = ['All', 'journal', 'university', 'institute', 'department', 'custom'];

  const filteredFormats = formats.filter((fmt) => {
    const matchesCat = selectedCategory === 'All' || fmt.category === selectedCategory;
    const matchesQuery =
      fmt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fmt.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fmt.citationStyle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCreateCustomFormat = () => {
    if (!customName.trim()) {
      alert('Please enter a template name.');
      return;
    }

    const newFmt: FormatSpecification = {
      id: `fmt-custom-${Date.now()}`,
      name: customName.trim(),
      category: 'custom',
      organization: customOrg.trim() || 'Institutional Guideline',
      citationStyle: customCitation,
      documentTypeSupport: ['research_article', 'original_research_paper', 'masters_thesis', 'phd_thesis'],
      referenceStyleRules: `Formatted according to ${customCitation} guidelines`,
      wordLimit: { min: 2000, max: customWordMax, recommended: Math.round(customWordMax * 0.8) },
      abstractLimit: { min: 100, max: customAbstractMax },
      fontRules: {
        family: 'Calibri / Arial',
        sizePt: 11,
        lineSpacing: '1.5'
      },
      marginRules: {
        top: '1.0 in',
        bottom: '1.0 in',
        left: '1.0 in',
        right: '1.0 in'
      },
      headingRules: 'Numbered Decimal (1.0, 1.1)',
      figureRequirements: 'Embedded with descriptive figure captions',
      tableRequirements: 'Embedded in text near first mention',
      supplementaryMaterialRequirements: 'Standard supplementary section',
      submissionRequirements: 'Department submission protocol',
      isPlaceholder: false,
      disclaimer: `Custom template configured for ${customOrg || customName}. Word budget capped at ${customWordMax} words.`
    };

    setFormats((prev) => [newFmt, ...prev]);
    setShowCustomModal(false);
    setCustomName('');
    setCustomOrg('');
    if (onSelectFormat) onSelectFormat(newFmt.id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif-academic font-bold text-white">Journal & Thesis Format Directory</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium font-mono">
              Format Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans-ui">
            Browse journal guidelines, university dissertation standards, or create custom laboratory formatting presets.
          </p>
        </div>

        <button
          onClick={() => setShowCustomModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Custom Template
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium capitalize transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search formats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Formats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFormats.map((fmt) => {
          const isSelected = activeFormatId === fmt.id;

          return (
            <div
              key={fmt.id}
              className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isSelected ? 'border-indigo-500 shadow-md shadow-indigo-950/20' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {fmt.category}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300">
                    Citation: {fmt.citationStyle}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white mb-1">{fmt.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{fmt.organization}</p>

                {/* Specs List */}
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Max Word Count:</span>
                    <span className="font-mono text-slate-200">{fmt.wordLimit.max} words</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Abstract Limit:</span>
                    <span className="font-mono text-slate-200">{fmt.abstractLimit.max} words</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Typography:</span>
                    <span className="text-slate-200">{fmt.fontRules.family} ({fmt.fontRules.sizePt}pt)</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Margins:</span>
                    <span className="text-slate-200">{fmt.marginRules.top}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic mb-3">
                  {fmt.disclaimer || fmt.referenceStyleRules}
                </p>
              </div>

              {onSelectFormat && (
                <button
                  onClick={() => onSelectFormat(fmt.id)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isSelected ? 'Currently Selected' : 'Apply Format to Project'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Custom Format Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-semibold text-white">Create Custom Institutional / Lab Template</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Template Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Department of Oncology Dissertation Standard"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Institution / Department</label>
                <input
                  type="text"
                  placeholder="e.g., Stanford University School of Medicine"
                  value={customOrg}
                  onChange={(e) => setCustomOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Citation Style</label>
                  <select
                    value={customCitation}
                    onChange={(e: any) => setCustomCitation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="APA">APA 7th Edition</option>
                    <option value="IEEE">IEEE Numbered</option>
                    <option value="Vancouver">Vancouver</option>
                    <option value="Harvard">Harvard</option>
                    <option value="Chicago">Chicago</option>
                    <option value="MLA">MLA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Word Budget</label>
                  <input
                    type="number"
                    value={customWordMax}
                    onChange={(e) => setCustomWordMax(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomFormat}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
