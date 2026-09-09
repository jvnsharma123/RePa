import React from 'react';
import {
  FileText,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2,
  BookOpen,
  Search,
  Settings,
  PlusCircle,
  HelpCircle,
  FolderKanban,
  FileCheck,
  ChevronDown,
  Database
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { AccountMenu } from './AccountMenu';
import { isSupabaseConfigured } from '../services/supabase';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  onOpenFactProtectionModal: () => void;
  userProfile: UserProfile | null;
  aiConfigured: boolean;
  isAuthenticated: boolean;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  onSignOutComplete: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  projects,
  activeProject,
  onSelectProject,
  onNewProject,
  onOpenFactProtectionModal,
  userProfile,
  aiConfigured,
  isAuthenticated,
  onOpenAuthModal,
  onOpenProfileModal,
  onSignOutComplete,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 text-gray-900 font-sans shadow-xs">
      {/* Top Banner / Academic Fact Guarantee */}
      <div className="bg-gray-50/90 px-4 sm:px-6 py-1.5 text-xs border-b border-gray-200/70 flex items-center justify-between text-gray-500">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 tracking-tight text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            NON-FABRICATION GUARANTEE
          </span>
          <span className="hidden md:inline text-gray-600 text-xs font-normal">
            Academic facts, empirical metrics, and findings are strictly preserved from primary data.
          </span>
        </div>
        <div className="flex items-center gap-3.5 text-xs">
          <button
            id="nav-fact-protection-btn"
            onClick={onOpenFactProtectionModal}
            className="text-gray-600 hover:text-black flex items-center gap-1.5 transition-colors underline decoration-gray-300 underline-offset-4 hover:decoration-gray-900 cursor-pointer text-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
            <span>Fact Protection Principles</span>
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5" title={isSupabaseConfigured ? 'Connected to Supabase PostgreSQL & Auth' : 'Running in local demonstration state'}>
            <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="text-gray-600 text-xs font-mono">
              {isSupabaseConfigured ? 'Supabase Cloud RLS' : 'Demo State'}
            </span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${aiConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-gray-600 text-xs font-mono">
              {aiConfigured ? 'Gemini Engine Active' : 'Deterministic Engine'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo & Brand */}
        <div className="flex items-center gap-5">
          <button
            id="nav-logo-btn"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold text-base shadow-xs group-hover:bg-neutral-800 transition-colors">
              M
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900 leading-tight">
                Manuscript Studio
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-0.5">
                Research Management
              </p>
            </div>
          </button>

          {/* Active Project Dropdown */}
          {projects.length > 0 && (
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project:</span>
              <div className="relative group">
                <select
                  id="nav-project-selector"
                  value={activeProject?.id || ''}
                  onChange={(e) => {
                    const found = projects.find((p) => p.id === e.target.value);
                    if (found) onSelectProject(found);
                  }}
                  className="bg-white border border-gray-200 text-gray-800 text-xs rounded-md px-2.5 py-1.5 pr-6 max-w-[220px] truncate focus:outline-none focus:ring-1 focus:ring-black cursor-pointer font-sans shadow-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.isDemoProject ? '🔬 [Demo] ' : '📁 '}
                      {p.title.length > 25 ? p.title.substring(0, 25) + '...' : p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            id="nav-tab-landing"
            onClick={() => onNavigate('landing')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              currentView === 'landing'
                ? 'bg-gray-100 text-black font-semibold border border-gray-200/80'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            Overview
          </button>

          <button
            id="nav-tab-dashboard"
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-gray-100 text-black font-semibold border border-gray-200/80'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            My Projects
          </button>

          <button
            id="nav-tab-workspace"
            onClick={() => onNavigate('workspace')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'workspace'
                ? 'bg-black text-white font-medium shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Workspace
          </button>

          <button
            id="nav-tab-quality"
            onClick={() => onNavigate('quality')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'quality'
                ? 'bg-gray-100 text-black font-semibold border border-gray-200/80'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Quality Checks
          </button>

          <button
            id="nav-tab-similarity"
            onClick={() => onNavigate('similarity')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'similarity'
                ? 'bg-gray-100 text-black font-semibold border border-gray-200/80'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Similarity
          </button>

          <button
            id="nav-tab-ai-analysis"
            onClick={() => onNavigate('ai_analysis')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'ai_analysis'
                ? 'bg-gray-100 text-black font-semibold border border-gray-200/80'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI Audit
          </button>

          <button
            id="nav-tab-formats"
            onClick={() => onNavigate('formats')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'formats'
                ? 'bg-gray-100 text-black font-semibold border border-gray-200/80'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Formats
          </button>
        </nav>

        {/* Right Action & User Profile / Account Menu */}
        <div className="flex items-center gap-3">
          <button
            id="nav-new-project-btn"
            onClick={onNewProject}
            className="bg-black hover:bg-neutral-800 text-white text-xs font-medium px-3.5 py-1.5 rounded-md transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Manuscript</span>
          </button>

          <AccountMenu
            userProfile={userProfile}
            isAuthenticated={isAuthenticated}
            onOpenAuthModal={onOpenAuthModal}
            onOpenProfileModal={onOpenProfileModal}
            onNavigate={onNavigate}
            onSignOutComplete={onSignOutComplete}
          />
        </div>
      </div>
    </header>
  );
};


