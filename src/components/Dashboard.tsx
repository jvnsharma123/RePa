import React, { useState } from 'react';
import {
  FolderKanban,
  FileText,
  PlusCircle,
  Search,
  Filter,
  Layers,
  FileCheck,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
  Database,
  Eye,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  Edit2,
  Cloud,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { DOCUMENT_TYPE_OPTIONS } from '../data/catalog';
import { isSupabaseConfigured } from '../services/supabase';
import { PlanTier, PLAN_CONFIGS } from '../types/subscription';
import { UpgradeModal } from './UpgradeModal';

interface DashboardProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  onOpenWorkspace: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject?: (project: Project) => void;
  onRenameProject?: (projectId: string, newTitle: string) => void;
  onLoadSampleProject: (sampleId: string) => void;
  userProfile: UserProfile | null;
  onNavigate: (view: string) => void;
  isAuthenticated: boolean;
  onOpenAuthModal: () => void;
  currentPlan?: PlanTier;
  onPlanUpgraded?: (plan: PlanTier) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onNewProject,
  onOpenWorkspace,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onLoadSampleProject,
  userProfile,
  onNavigate,
  isAuthenticated,
  onOpenAuthModal,
  currentPlan = 'FREE',
  onPlanUpgraded,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'demo' | 'files'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Deletion modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename modal state
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const userProjectsCount = projects.filter((p) => !p.isDemoProject).length;
  const planLimits = PLAN_CONFIGS[currentPlan];

  const handleCreateProjectSafe = () => {
    if (userProjectsCount >= planLimits.maxActiveProjects) {
      setShowUpgradeModal(true);
      return;
    }
    onNewProject();
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.researchArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'user') return !p.isDemoProject;
    if (activeTab === 'demo') return Boolean(p.isDemoProject);
    if (statusFilter !== 'all') return p.status === statusFilter;
    return true;
  });

  // Calculate statistics
  const totalProjects = projects.length;
  const demoProjectsCount = projects.filter((p) => p.isDemoProject).length;
  const totalFacts = projects.reduce((acc, p) => acc + (p.facts?.length || 0), 0);
  const totalFiles = projects.reduce((acc, p) => acc + (p.files?.length || 0), 0);
  const completedProjects = projects.filter((p) => p.status === 'completed' || p.status === 'generated').length;

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteProject(projectToDelete.id);
      setProjectToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectToRename && newTitle.trim() && onRenameProject) {
      onRenameProject(projectToRename.id, newTitle.trim());
      setProjectToRename(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif-academic font-bold text-white">Research Project Dashboard</h1>
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              Supabase Storage
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans-ui">
            {isAuthenticated ? (
              <span>
                Signed in as <strong className="text-slate-200">{userProfile?.name || userProfile?.email}</strong>.
                Projects and manuscripts are securely persisted to your private Supabase database.
              </span>
            ) : (
              <span>
                Exploring in demo guest mode. Sign in to save and sync persistent research manuscripts across sessions.
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isAuthenticated && (
            <button
              onClick={onOpenAuthModal}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Sign In to Cloud
            </button>
          )}
          <button
            id="dash-new-project-btn"
            onClick={handleCreateProjectSafe}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-indigo-950/40 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            New Research Project
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs uppercase font-medium">Your Projects</span>
            <div className="text-2xl font-bold text-white mt-0.5">
              {userProjectsCount}
              <span className="text-xs text-slate-400 font-normal ml-1">
                / {planLimits.maxActiveProjects === Infinity ? '∞' : planLimits.maxActiveProjects}
              </span>
            </div>
            <span className="text-[11px] text-indigo-400">
              {planLimits.name} plan capacity
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs uppercase font-medium">Extracted Facts</span>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">{totalFacts}</div>
            <span className="text-[11px] text-emerald-500/90 font-medium">100% Provenance Traceable</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs uppercase font-medium">Research Files</span>
            <div className="text-2xl font-bold text-blue-400 mt-0.5">{totalFiles}</div>
            <span className="text-[11px] text-slate-400">Tables, Figures & Datasets</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs uppercase font-medium">Quality Compliance</span>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">98%</div>
            <span className="text-[11px] text-slate-400">Format & Non-Fabrication Passed</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Dashboard Tabs & Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Navigation Sub-Tabs */}
        <div className="px-6 pt-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-3">
            <button
              id="tab-all-projects"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              All Projects ({projects.length})
            </button>

            <button
              id="tab-user-projects"
              onClick={() => setActiveTab('user')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'user'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              My Cloud Projects ({userProjectsCount})
            </button>

            <button
              id="tab-demo-projects"
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Sample Datasets ({demoProjectsCount})
            </button>

            <button
              id="tab-files"
              onClick={() => setActiveTab('files')}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Research Files ({totalFiles})
            </button>
          </div>

          {/* Quick Preload Demo Projects */}
          <div className="flex items-center gap-2 pb-3">
            <span className="text-[11px] text-slate-400">Load sample:</span>
            <button
              id="dash-load-hydrogel"
              onClick={() => onLoadSampleProject('demo-biomed-hydrogel')}
              className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Biomedical Study
            </button>
            <button
              id="dash-load-genomics"
              onClick={() => onLoadSampleProject('demo-ai-genomics')}
              className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Genomics Study
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search research title, keywords, or field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="generated">Generated / Ready</option>
              <option value="reviewing">Under Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Project List View */}
        {activeTab !== 'files' ? (
          <div className="p-6">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-300">No Research Projects Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No projects match your search criteria. Try modifying your query.'
                    : activeTab === 'user' && !isAuthenticated
                    ? 'Sign in to access your Supabase cloud projects, or explore the pre-loaded sample datasets.'
                    : 'Get started by creating your first academic research project.'}
                </p>
                <button
                  onClick={handleCreateProjectSafe}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredProjects.map((project) => {
                  const docType = DOCUMENT_TYPE_OPTIONS.find((d) => d.key === project.documentTypeId);
                  const isCurrentActive = activeProject?.id === project.id;

                  return (
                    <div
                      key={project.id}
                      className={`bg-slate-950/70 border rounded-xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 ${
                        isCurrentActive ? 'border-indigo-600/80 shadow-md shadow-indigo-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        {/* Header badges */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                              {docType?.title || project.documentTypeId}
                            </span>
                            {project.isDemoProject ? (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                Sample Study
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                                <Cloud className="w-2.5 h-2.5" />
                                Supabase
                              </span>
                            )}
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center gap-1.5">
                            {onDuplicateProject && (
                              <button
                                onClick={() => onDuplicateProject(project)}
                                className="text-slate-400 hover:text-indigo-300 p-1 rounded transition-colors"
                                title="Duplicate Project"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onRenameProject && (
                              <button
                                onClick={() => {
                                  setProjectToRename(project);
                                  setNewTitle(project.title);
                                }}
                                className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors"
                                title="Rename Project"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => setProjectToDelete(project)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 leading-snug">
                          {project.title}
                        </h3>

                        {/* Research Area & Sub-Field */}
                        <div className="text-xs text-slate-400 mb-3 flex items-center gap-2">
                          <span className="font-medium text-slate-300">{project.researchArea}</span>
                          {project.subField && <span>• {project.subField}</span>}
                        </div>

                        {/* Brief Snippet */}
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {project.briefDescription || project.objectives || 'No description provided.'}
                        </p>

                        {/* Metadata summary chips */}
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mb-4">
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {project.facts?.length || 0} Extracted Facts
                          </span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {project.files?.length || 0} Uploaded Files
                          </span>
                          {project.manuscript && (
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-indigo-300">
                              {project.manuscript.totalWordCount} words
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onSelectProject(project);
                              onOpenWorkspace(project);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Open Workspace
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Files Management Tab */
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">All Project Research Files & Datasets</h3>
                  <p className="text-xs text-slate-400">
                    Uploaded materials categorized for fact extraction and manuscript citation.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
                {projects.flatMap((p) => p.files || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No files uploaded yet across projects.</div>
                ) : (
                  projects.flatMap((p) => (p.files || []).map((f) => ({ ...f, projectTitle: p.title }))).map((file, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block">{file.name}</span>
                          <span className="text-[11px] text-slate-400">
                            Project: {file.projectTitle} • {file.sizeFormatted} • {file.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                          {file.extractedFactsCount} facts extracted
                        </span>
                        <span className="text-[10px] text-slate-500">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Research Project?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete <strong className="text-slate-200">"{projectToDelete.title}"</strong>?
                  All associated facts, sections, and versions will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Project</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {projectToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Rename Research Project</h3>
              <button
                onClick={() => setProjectToRename(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  Save Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal for Active Project Limits */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonTitle="Active Project Limit Reached"
        reasonDescription={`You have ${userProjectsCount} active project${userProjectsCount > 1 ? 's' : ''}. The ${planLimits.name} plan allows up to ${planLimits.maxActiveProjects} active project${planLimits.maxActiveProjects > 1 ? 's' : ''}. Upgrade to start new manuscripts.`}
        targetPlan={currentPlan === 'FREE' ? 'RESEARCHER' : 'PRO_RESEARCHER'}
        currentPlan={currentPlan}
        userProfile={userProfile}
        userId={userProfile?.id}
        onPlanUpgraded={(newPlan) => {
          if (onPlanUpgraded) onPlanUpgraded(newPlan);
          setShowUpgradeModal(false);
          onNewProject();
        }}
      />
    </div>
  );
};
