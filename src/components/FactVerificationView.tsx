import React, { useState } from 'react';
import {
  Tag,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Plus,
  Search,
  Check,
  X,
  Edit3,
  Eye,
  Trash2,
  ShieldCheck,
  Filter,
  BarChart2,
  Calendar,
  UserCheck,
  ArrowRight,
  Layers,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import {
  Project,
  ResearchFact,
  FactCategory,
  FactType,
  VerificationStatus,
  DataValueItem
} from '../types';

interface FactVerificationViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onNavigateToAnalysis: () => void;
  userId?: string;
}

export const FactVerificationView: React.FC<FactVerificationViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToAnalysis,
  userId = 'Dr. Evelyn Vance'
}) => {
  const facts = project.facts || [];

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddFactOpen, setIsAddFactOpen] = useState<boolean>(false);
  const [editingFact, setEditingFact] = useState<ResearchFact | null>(null);
  const [auditingFact, setAuditingFact] = useState<ResearchFact | null>(null);
  const [conflictFact, setConflictFact] = useState<ResearchFact | null>(null);

  // New Fact form state
  const [newStatement, setNewStatement] = useState<string>('');
  const [newCategory, setNewCategory] = useState<FactCategory>('Findings/Data');
  const [newFactType, setNewFactType] = useState<FactType>('OBSERVATION');
  const [newSourceFile, setNewSourceFile] = useState<string>('');
  const [newSourceLocation, setNewSourceLocation] = useState<string>('');
  const [newMetricLabel, setNewMetricLabel] = useState<string>('');
  const [newMetricValue, setNewMetricValue] = useState<string>('');
  const [newMetricUnit, setNewMetricUnit] = useState<string>('');
  const [newMetricPValue, setNewMetricPValue] = useState<string>('');

  // Edit Fact form state
  const [editStatement, setEditStatement] = useState<string>('');
  const [editCategory, setEditCategory] = useState<FactCategory>('Findings/Data');
  const [editFactType, setEditFactType] = useState<FactType>('OBSERVATION');
  const [editSourceLocation, setEditSourceLocation] = useState<string>('');

  // Quick stats calculation
  const totalCount = facts.length;
  const verifiedCount = facts.filter((f) => f.userVerified || f.verificationStatus === 'VERIFIED').length;
  const pendingCount = facts.filter((f) => !f.userVerified && (!f.verificationStatus || f.verificationStatus === 'PENDING')).length;
  const rejectedCount = facts.filter((f) => f.verificationStatus === 'REJECTED').length;
  const interpretationCount = facts.filter((f) => f.factType === 'AI_INTERPRETATION' || f.verificationStatus === 'INTERPRETATION').length;
  const hypothesisCount = facts.filter((f) => f.factType === 'HYPOTHESIS' || f.verificationStatus === 'HYPOTHESIS').length;

  // Single-click verify
  const handleVerifyFact = (factId: string) => {
    const nowIso = new Date().toISOString();
    const updatedFacts = facts.map((fact) => {
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
  };

  // Single-click reject
  const handleRejectFact = (factId: string) => {
    const nowIso = new Date().toISOString();
    const updatedFacts = facts.map((fact) => {
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
  };

  // Delete a fact
  const handleDeleteFact = (factId: string) => {
    const updatedFacts = facts.filter((fact) => fact.id !== factId);
    onUpdateProject({
      ...project,
      facts: updatedFacts,
      updatedAt: new Date().toISOString()
    });
  };

  // Create new manual researcher fact
  const handleCreateNewFact = () => {
    if (!newStatement.trim()) return;
    const nowIso = new Date().toISOString();

    const dataValues: DataValueItem[] = [];
    if (newMetricValue.trim()) {
      dataValues.push({
        label: newMetricLabel.trim() || 'Observed Value',
        value: newMetricValue.trim(),
        unit: newMetricUnit.trim() || undefined,
        pValue: newMetricPValue.trim() || undefined
      });
    }

    const newFact: ResearchFact = {
      id: `fact-user-${Date.now()}`,
      projectId: project.id,
      fact: newStatement.trim(),
      keyStatement: newStatement.trim(),
      factType: newFactType,
      category: newCategory,
      source: newSourceFile.trim() || 'Authoritative Investigator Input',
      sourceFile: newSourceFile.trim() || 'Investigator Input',
      sourceFileName: newSourceFile.trim() || 'Investigator Input',
      sourceLocation: newSourceLocation.trim() || 'Direct Addition',
      confidence: 'High',
      verificationStatus: 'VERIFIED',
      userVerified: true,
      verifiedStatement: newStatement.trim(),
      verifiedBy: userId,
      verifiedAt: nowIso,
      originalAiStatement: undefined,
      isInterpretation: newFactType === 'AI_INTERPRETATION' || newFactType === 'HYPOTHESIS',
      isObserved: newFactType === 'OBSERVATION' || newFactType === 'MEASUREMENT',
      dataValues: dataValues.length > 0 ? dataValues : undefined,
      provenanceType: 'user_fact',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onUpdateProject({
      ...project,
      facts: [newFact, ...facts],
      updatedAt: nowIso
    });

    // Reset form
    setNewStatement('');
    setNewMetricLabel('');
    setNewMetricValue('');
    setNewMetricUnit('');
    setNewMetricPValue('');
    setNewSourceFile('');
    setNewSourceLocation('');
    setIsAddFactOpen(false);
  };

  // Open edit modal
  const handleOpenEditFact = (fact: ResearchFact) => {
    setEditingFact(fact);
    setEditStatement(fact.verifiedStatement || fact.fact || fact.keyStatement || '');
    setEditCategory(fact.category || 'Findings/Data');
    setEditFactType(fact.factType || 'OBSERVATION');
    setEditSourceLocation(fact.sourceLocation || '');
  };

  // Save edited fact
  const handleSaveEditedFact = () => {
    if (!editingFact || !editStatement.trim()) return;
    const nowIso = new Date().toISOString();

    const updatedFacts = facts.map((fact) => {
      if (fact.id === editingFact.id) {
        return {
          ...fact,
          fact: editStatement.trim(),
          keyStatement: editStatement.trim(),
          verifiedStatement: editStatement.trim(),
          category: editCategory,
          factType: editFactType,
          sourceLocation: editSourceLocation.trim() || fact.sourceLocation,
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

    setEditingFact(null);
  };

  // Filtered facts list
  const filteredFacts = facts.filter((fact) => {
    // Status filter
    if (statusFilter === 'VERIFIED' && !(fact.userVerified || fact.verificationStatus === 'VERIFIED')) {
      return false;
    }
    if (statusFilter === 'PENDING' && (fact.userVerified || fact.verificationStatus === 'VERIFIED' || fact.verificationStatus === 'REJECTED')) {
      return false;
    }
    if (statusFilter === 'REJECTED' && fact.verificationStatus !== 'REJECTED') {
      return false;
    }
    if (statusFilter === 'INTERPRETATION' && !(fact.factType === 'AI_INTERPRETATION' || fact.verificationStatus === 'INTERPRETATION')) {
      return false;
    }
    if (statusFilter === 'HYPOTHESIS' && !(fact.factType === 'HYPOTHESIS' || fact.verificationStatus === 'HYPOTHESIS')) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'All' && fact.factType !== typeFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'All' && fact.category !== categoryFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const text = `${fact.fact || ''} ${fact.keyStatement || ''} ${fact.verifiedStatement || ''} ${fact.source || ''} ${fact.sourceFileName || ''} ${fact.category || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif-academic font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                Verified Research Facts & Provenance Engine
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-medium">
                Phase 2B Evidence Tiering
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed font-sans-ui">
              Every empirical finding, measurement, and hypothesis is tracked with strict academic provenance. 
              Only <strong className="text-emerald-300">Verified Facts</strong> and direct investigator inputs are prioritized for manuscript drafting. 
              Unverified AI suggestions and interpretations remain strictly segregated.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToAnalysis}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inspect Materials with AI</span>
            </button>
            <button
              onClick={() => setIsAddFactOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Fact Manually</span>
            </button>
          </div>
        </div>

        {/* Statistical Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div
            onClick={() => setStatusFilter('All')}
            className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-slate-400 font-mono block">TOTAL DOSSIER</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{totalCount}</div>
          </div>

          <div
            onClick={() => setStatusFilter('VERIFIED')}
            className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/50 hover:border-emerald-800 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-emerald-400 font-mono block flex items-center gap-1">
              <Check className="w-3 h-3" /> VERIFIED
            </span>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">{verifiedCount}</div>
          </div>

          <div
            onClick={() => setStatusFilter('PENDING')}
            className="bg-amber-950/20 p-3 rounded-lg border border-amber-900/50 hover:border-amber-800 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-amber-400 font-mono block flex items-center gap-1">
              <HelpCircle className="w-3 h-3" /> PENDING REVIEW
            </span>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{pendingCount}</div>
          </div>

          <div
            onClick={() => setStatusFilter('INTERPRETATION')}
            className="bg-purple-950/20 p-3 rounded-lg border border-purple-900/50 hover:border-purple-800 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-purple-400 font-mono block">INTERPRETATIONS</span>
            <div className="text-xl font-bold font-mono text-purple-300 mt-0.5">{interpretationCount}</div>
          </div>

          <div
            onClick={() => setStatusFilter('HYPOTHESIS')}
            className="bg-sky-950/20 p-3 rounded-lg border border-sky-900/50 hover:border-sky-800 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-sky-400 font-mono block">HYPOTHESES</span>
            <div className="text-xl font-bold font-mono text-sky-300 mt-0.5">{hypothesisCount}</div>
          </div>

          <div
            onClick={() => setStatusFilter('REJECTED')}
            className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/50 hover:border-rose-800 transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-rose-400 font-mono block flex items-center gap-1">
              <X className="w-3 h-3" /> REJECTED
            </span>
            <div className="text-xl font-bold font-mono text-rose-300 mt-0.5">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 font-mono">Status:</span>
            {['All', 'VERIFIED', 'PENDING', 'INTERPRETATION', 'HYPOTHESIS', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st === 'All' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full lg:w-72">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search facts, sources, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Secondary Category & Evidence Tier Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-500 font-mono">Evidence Tier:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Types</option>
              <option value="OBSERVATION">OBSERVATION (Visual/Empirical)</option>
              <option value="MEASUREMENT">MEASUREMENT (Numerical metric)</option>
              <option value="RESEARCHER_INPUT">RESEARCHER_INPUT (Investigator)</option>
              <option value="AI_INTERPRETATION">AI_INTERPRETATION (Hypothesis)</option>
              <option value="HYPOTHESIS">HYPOTHESIS (Testable)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-500 font-mono">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="Findings/Data">Findings / Data</option>
              <option value="Methodology">Methodology</option>
              <option value="Hypothesis">Hypothesis</option>
              <option value="Population/Sample">Population / Sample</option>
              <option value="Variables">Variables</option>
              <option value="Conclusion">Conclusion</option>
              <option value="Limitations">Limitations</option>
            </select>
          </div>

          {(statusFilter !== 'All' || typeFilter !== 'All' || categoryFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setTypeFilter('All');
                setCategoryFilter('All');
                setSearchQuery('');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Facts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFacts.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
            <Tag className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-semibold text-slate-300">No research facts found matching current filters.</div>
            <p className="text-slate-500 text-[11px]">
              Try adjusting your search criteria or click &quot;Add Fact Manually&quot; to register a new observation.
            </p>
          </div>
        ) : (
          filteredFacts.map((fact) => {
            const isVerified = fact.userVerified || fact.verificationStatus === 'VERIFIED';
            const isRejected = fact.verificationStatus === 'REJECTED';
            const isModified = fact.verifiedStatement && fact.originalAiStatement && fact.verifiedStatement !== fact.originalAiStatement;

            return (
              <div
                key={fact.id}
                className={`bg-slate-950 border rounded-xl p-5 space-y-3.5 transition-all shadow-xs ${
                  isVerified
                    ? 'border-emerald-800/80 bg-emerald-950/5 hover:border-emerald-700'
                    : isRejected
                    ? 'border-slate-800 opacity-60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header: Evidence Tier, Category, and Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Fact Type Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                        fact.factType === 'MEASUREMENT'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : fact.factType === 'RESEARCHER_INPUT'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : fact.factType === 'AI_INTERPRETATION'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : fact.factType === 'HYPOTHESIS'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}
                    >
                      {fact.factType || 'OBSERVATION'}
                    </span>

                    {/* Category Badge */}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {fact.category}
                    </span>

                    {/* Conflict Badge */}
                    {fact.conflictDetails && (
                      <span
                        onClick={() => setConflictFact(fact)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 cursor-pointer"
                        title="Cross-material discrepancy flagged"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Conflict
                      </span>
                    )}
                  </div>

                  {/* Verification Status Badge */}
                  <div>
                    {isVerified ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Verified Fact
                      </span>
                    ) : isRejected ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded font-mono bg-rose-950 text-rose-300 border border-rose-800">
                        Rejected
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded font-mono bg-amber-950 text-amber-300 border border-amber-800">
                        Pending Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Statement */}
                <div>
                  <p className="text-xs font-serif-academic text-slate-200 leading-relaxed">
                    {fact.verifiedStatement || fact.fact || fact.keyStatement}
                  </p>

                  {isModified && (
                    <div className="text-[10px] text-amber-400/90 font-mono mt-1 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span>Investigator modified from original AI extraction</span>
                    </div>
                  )}
                </div>

                {/* Quantitative Data Value Pills */}
                {fact.dataValues && fact.dataValues.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {fact.dataValues.map((v, i) => (
                      <div
                        key={i}
                        className="text-[11px] bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-indigo-300 font-mono"
                      >
                        {v.label}: <strong className="text-white">{v.value}</strong> {v.unit || ''}{' '}
                        {v.pValue ? <span className="text-emerald-400 text-[10px]">({v.pValue})</span> : ''}
                      </div>
                    ))}
                  </div>
                )}

                {/* Source & Provenance Bar */}
                <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 space-y-1 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Source Artifact:</span>
                    <span className="text-slate-300 truncate max-w-[220px]">
                      {fact.sourceFileName || fact.source || 'Investigator Input'}
                    </span>
                  </div>
                  {fact.sourceLocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Specific Location:</span>
                      <span className="text-indigo-300 truncate max-w-[220px]">{fact.sourceLocation}</span>
                    </div>
                  )}
                  {fact.verifiedBy && (
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-1 text-slate-500">
                      <span>Audit:</span>
                      <span className="text-emerald-400">
                        {fact.verifiedBy} • {new Date(fact.verifiedAt || fact.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="border-t border-slate-900 pt-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditFact(fact)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit fact statement or classification"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setAuditingFact(fact)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Inspect full audit trail and provenance"
                    >
                      <Eye className="w-3 h-3 text-sky-400" />
                      <span>Audit Trail</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isVerified && (
                      <button
                        onClick={() => handleVerifyFact(fact.id)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify</span>
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        onClick={() => handleRejectFact(fact.id)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs border border-slate-800 transition-colors cursor-pointer"
                        title="Reject Fact"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteFact(fact.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Delete Fact from Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD FACT MODAL */}
      {isAddFactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add Authoritative Research Fact
              </h3>
              <button
                onClick={() => setIsAddFactOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Key Statement (Scholarly Text) *
                </label>
                <textarea
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  placeholder="e.g. Scanning electron microscopy confirmed uniform nanoscale porosity with average pore diameter of 42.6 ± 3.2 nm."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-serif-academic leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Evidence Tier (Fact Type)
                  </label>
                  <select
                    value={newFactType}
                    onChange={(e) => setNewFactType(e.target.value as FactType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="OBSERVATION">OBSERVATION (Visual/Empirical)</option>
                    <option value="MEASUREMENT">MEASUREMENT (Numerical metric)</option>
                    <option value="RESEARCHER_INPUT">RESEARCHER_INPUT (Investigator)</option>
                    <option value="HYPOTHESIS">HYPOTHESIS (Testable)</option>
                    <option value="AI_INTERPRETATION">AI_INTERPRETATION (Context)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as FactCategory)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Source File / Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Figure_2_SEM.png or Lab_Notebook_p42"
                    value={newSourceFile}
                    onChange={(e) => setNewSourceFile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Specific Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Panel C / Row 14"
                    value={newSourceLocation}
                    onChange={(e) => setNewSourceLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Optional Quantitative Metric Fields */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-indigo-300 block font-mono">
                  Optional Measured Metric & Values:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Label (e.g. IC50)"
                      value={newMetricLabel}
                      onChange={(e) => setNewMetricLabel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Value (e.g. 42.6)"
                      value={newMetricValue}
                      onChange={(e) => setNewMetricValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Unit (e.g. nm)"
                      value={newMetricUnit}
                      onChange={(e) => setNewMetricUnit(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="p / CI (e.g. p<0.01)"
                      value={newMetricPValue}
                      onChange={(e) => setNewMetricPValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddFactOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFact}
                disabled={!newStatement.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Add & Verify Fact</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FACT MODAL */}
      {editingFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                Edit Fact & Update Verification
              </h3>
              <button
                onClick={() => setEditingFact(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Fact Statement
                </label>
                <textarea
                  value={editStatement}
                  onChange={(e) => setEditStatement(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-serif-academic leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Evidence Tier
                  </label>
                  <select
                    value={editFactType}
                    onChange={(e) => setEditFactType(e.target.value as FactType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="OBSERVATION">OBSERVATION (Visual/Empirical)</option>
                    <option value="MEASUREMENT">MEASUREMENT (Numerical metric)</option>
                    <option value="RESEARCHER_INPUT">RESEARCHER_INPUT (Investigator)</option>
                    <option value="HYPOTHESIS">HYPOTHESIS (Testable)</option>
                    <option value="AI_INTERPRETATION">AI_INTERPRETATION (Hypothesis)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as FactCategory)}
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

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Source Location
                </label>
                <input
                  type="text"
                  value={editSourceLocation}
                  onChange={(e) => setEditSourceLocation(e.target.value)}
                  placeholder="e.g. Figure 2 panel B / Table 1 column 3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingFact(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedFact}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Mark Verified</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL & PROVENANCE MODAL */}
      {auditingFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Fact Provenance & Audit Trail
              </h3>
              <button
                onClick={() => setAuditingFact(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-mono">Fact ID:</span>
                  <span className="text-slate-400 font-mono">{auditingFact.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-mono">Evidence Tier:</span>
                  <span className="text-indigo-300 font-semibold">{auditingFact.factType || 'OBSERVATION'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-mono">Status:</span>
                  <span className="text-emerald-400 font-semibold">{auditingFact.verificationStatus || 'PENDING'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-mono">Source File:</span>
                  <span className="text-white font-semibold">{auditingFact.sourceFileName || auditingFact.source || 'Investigator'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-mono">Location:</span>
                  <span className="text-slate-300">{auditingFact.sourceLocation || 'Direct Entry'}</span>
                </div>
              </div>

              {auditingFact.originalAiStatement && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block">Original AI Candidate Statement:</span>
                  <p className="text-slate-400 font-serif-academic italic text-[11px]">
                    &quot;{auditingFact.originalAiStatement}&quot;
                  </p>
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono block">Verified Statement (Authoritative):</span>
                <p className="text-white font-serif-academic text-xs font-semibold">
                  &quot;{auditingFact.verifiedStatement || auditingFact.fact || auditingFact.keyStatement}&quot;
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-slate-400 text-[11px] font-mono">
                <div>Verified By: <span className="text-emerald-300">{auditingFact.verifiedBy || 'Pending verification'}</span></div>
                <div>Timestamp: <span className="text-slate-300">{auditingFact.verifiedAt || auditingFact.createdAt || 'N/A'}</span></div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setAuditingFact(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT RESOLUTION MODAL */}
      {conflictFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Cross-Material Discrepancy Flag
              </h3>
              <button
                onClick={() => setConflictFact(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                This fact was flagged during multi-material cross-inspection due to potential variance with other project materials.
              </p>

              <div className="bg-slate-950 p-3 rounded-lg border border-rose-900/60 space-y-1">
                <span className="text-[10px] font-mono text-rose-400 font-bold block">Conflict Details:</span>
                <p className="text-slate-200 font-serif-academic text-xs">
                  {conflictFact.conflictDetails || 'Parameter discrepancy detected across source artifacts.'}
                </p>
              </div>

              <p className="text-[11px] text-slate-400">
                You can edit this statement to clarify conditions or dismiss the conflict flag once confirmed.
              </p>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  // Dismiss conflict flag
                  const updated = facts.map((f) => (f.id === conflictFact.id ? { ...f, conflictDetails: undefined } : f));
                  onUpdateProject({ ...project, facts: updated });
                  setConflictFact(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Dismiss Flag
              </button>
              <button
                onClick={() => {
                  const target = conflictFact;
                  setConflictFact(null);
                  handleOpenEditFact(target);
                }}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
              >
                Edit & Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
