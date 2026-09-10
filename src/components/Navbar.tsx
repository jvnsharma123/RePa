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
  Database,
  CreditCard,
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { AccountMenu } from './AccountMenu';
import { isSupabaseConfigured } from '../services/supabase';
import { PlanTier } from '../types/subscription';

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
  currentPlan?: PlanTier;
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
  currentPlan = 'FREE',
  onOpenAuthModal,
  onOpenProfileModal,
  onSignOutComplete,
}) => {
  return (
    <header className="bg-white border-b border-[#141414] sticky top-0 z-40 text-[#141414] font-sans">
      {/* Top Banner / Academic Fact Guarantee */}
      <div className="bg-[#F0EFED] px-4 sm:px-6 py-1 text-xs border-b border-[#141414]/20 flex items-center justify-between text-[#141414]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 text-[#141414] font-bold bg-white px-2 py-0.5 border border-[#141414] tracking-tight text-[10px] uppercase font-mono">
            <ShieldCheck className="w-3 h-3 text-[#141414]" />
            NON-FABRICATION GUARANTEE
          </span>
          <span className="hidden md:inline text-[#141414]/80 text-[11px] font-normal">
            Academic facts, empirical metrics, and findings are strictly preserved from primary data.
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            id="nav-fact-protection-btn"
            onClick={onOpenFactProtectionModal}
            className="text-[#141414]/80 hover:text-[#141414] flex items-center gap-1 transition-colors underline decoration-[#141414]/30 underline-offset-4 hover:decoration-[#141414] cursor-pointer text-[11px]"
          >
            <HelpCircle className="w-3 h-3 text-[#141414]" />
            <span>Fact Protection Principles</span>
          </button>
          <span className="text-[#141414]/30">|</span>
          <div className="flex items-center gap-1.5" title={isSupabaseConfigured ? 'Connected to Supabase PostgreSQL & Auth' : 'Running in local demonstration state'}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            <span className="text-[#141414] text-[11px] font-mono uppercase">
              {isSupabaseConfigured ? 'Supabase Cloud RLS' : 'Demo State'}
            </span>
          </div>
          <span className="text-[#141414]/30">|</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${aiConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            <span className="text-[#141414] text-[11px] font-mono uppercase">
              {aiConfigured ? 'Gemini Engine' : 'Deterministic'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-13">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <button
            id="nav-logo-btn"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="w-7 h-7 bg-[#141414] flex items-center justify-center text-white font-bold font-mono text-sm border border-[#141414]">
              R
            </div>
            <div className="flex items-center gap-2">
              <div className="font-bold uppercase tracking-tighter text-base text-[#141414] leading-tight">
                RePa
              </div>
              <span className="font-mono text-[10px] opacity-60 px-1 bg-[#E4E3E0] border border-[#141414]/30">v4.3</span>
            </div>
          </button>

          {/* Active Project Title Preview / Dropdown */}
          {projects.length > 0 && (
            <div className="hidden xl:flex items-center gap-3 pl-4 border-l border-[#141414]/20">
              <div className="h-4 w-px bg-[#141414] opacity-20"></div>
              <span className="text-[10px] font-mono font-bold text-[#141414]/60 uppercase tracking-wider">PROJECT:</span>
              <div className="relative group">
                <select
                  id="nav-project-selector"
                  value={activeProject?.id || ''}
                  onChange={(e) => {
                    const found = projects.find((p) => p.id === e.target.value);
                    if (found) onSelectProject(found);
                  }}
                  className="bg-white border border-[#141414] text-[#141414] text-xs px-2.5 py-1 pr-6 max-w-[240px] truncate focus:outline-none font-sans"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.isDemoProject ? '[Demo] ' : ''}
                      {p.title.length > 28 ? p.title.substring(0, 28) + '...' : p.title}
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
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors cursor-pointer ${
              currentView === 'landing'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            Overview
          </button>

          <button
            id="nav-tab-dashboard"
            onClick={() => onNavigate('dashboard')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Projects
          </button>

          <button
            id="nav-tab-workspace"
            onClick={() => onNavigate('workspace')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'workspace'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Workspace
          </button>

          <button
            id="nav-tab-quality"
            onClick={() => onNavigate('quality')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'quality'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Quality Checks
          </button>

          <button
            id="nav-tab-similarity"
            onClick={() => onNavigate('similarity')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'similarity'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Similarity
          </button>

          <button
            id="nav-tab-ai-analysis"
            onClick={() => onNavigate('ai_analysis')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'ai_analysis'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Audit
          </button>

          <button
            id="nav-tab-formats"
            onClick={() => onNavigate('formats')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'formats'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Formats
          </button>

          <button
            id="nav-tab-pricing"
            onClick={() => onNavigate('pricing')}
            className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-tight transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentView === 'pricing'
                ? 'bg-[#141414] text-white border border-[#141414]'
                : 'text-[#141414] hover:bg-[#F0EFED] border border-transparent'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-500" />
            <span>Plans</span>
            {currentPlan !== 'FREE' && (
              <span className="text-[9px] px-1 bg-emerald-600 text-white rounded-xs uppercase font-mono">
                Pro
              </span>
            )}
          </button>
        </nav>

        {/* Right Action & User Profile / Account Menu */}
        <div className="flex items-center gap-3">
          <button
            id="nav-new-project-btn"
            onClick={onNewProject}
            className="bg-[#141414] hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 border border-[#141414] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Manuscript</span>
          </button>

          <AccountMenu
            userProfile={userProfile}
            isAuthenticated={isAuthenticated}
            currentPlan={currentPlan}
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


