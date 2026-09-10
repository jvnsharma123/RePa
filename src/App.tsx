import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ProjectWizard } from './components/ProjectWizard';
import { ManuscriptWorkspace } from './components/ManuscriptWorkspace';
import { QualityControlPanel } from './components/QualityControlPanel';
import { SimilarityReportView } from './components/SimilarityReportView';
import { AIContentAnalysisView } from './components/AIContentAnalysisView';
import { FormatDirectory } from './components/FormatDirectory';
import { SettingsView } from './components/SettingsView';
import { PricingView } from './components/PricingView';
import { FactProtectionModal } from './components/FactProtectionModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { Project, UserProfile } from './types';
import { PlanTier, SubscriptionState } from './types/subscription';
import { getSubscriptionState, recordUsageAction } from './services/subscriptionService';
import {
  fetchHealth,
  fetchUserProfile,
  fetchProjects,
  updateProject,
  deleteProject as apiDeleteProject
} from './services/api';
import { useAutosave } from './hooks/useAutosave';
import {
  fetchUserProjectsFromSupabase,
  saveProjectToSupabase,
  deleteProjectFromSupabase
} from './services/supabaseData';
import { supabase, isSupabaseConfigured, getCurrentUser } from './services/supabase';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFactModalOpen, setIsFactModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);

  const currentPlan: PlanTier = subscriptionState?.plan || 'FREE';

  // Initialize data on mount
  useEffect(() => {
    async function initApp() {
      try {
        const [healthData, profileData, projectsData, userRes] = await Promise.all([
          fetchHealth().catch(() => ({ status: 'ok', service: 'RePa', aiConfigured: true })),
          fetchUserProfile().catch(() => null),
          fetchProjects().catch(() => []),
          getCurrentUser().catch(() => null)
        ]);

        setAiConfigured(healthData.aiConfigured);
        if (profileData) setUserProfile(profileData);

        const activeUser = userRes?.user;
        const targetUserId = activeUser ? activeUser.id : 'usr_guest';

        // Load subscription state
        getSubscriptionState(targetUserId)
          .then((sub) => {
            if (sub) setSubscriptionState(sub);
          })
          .catch(() => {});

        if (activeUser) {
          setCurrentUserId(activeUser.id);
          // If Supabase is configured, fetch user's cloud projects
          const cloudProjects = await fetchUserProjectsFromSupabase(activeUser.id);
          if (cloudProjects && cloudProjects.length > 0) {
            setProjects(cloudProjects);
            setActiveProject(cloudProjects[0]);
          } else if (projectsData && projectsData.length > 0) {
            setProjects(projectsData);
            setActiveProject(projectsData[0]);
          }
        } else {
          if (projectsData && projectsData.length > 0) {
            setProjects(projectsData);
            setActiveProject(projectsData[0]);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initApp();

    // Listen to Supabase auth state changes
    if (supabase && isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user;
        const targetUserId = user ? user.id : 'usr_guest';
        getSubscriptionState(targetUserId)
          .then((sub) => {
            if (sub) setSubscriptionState(sub);
          })
          .catch(() => {});

        if (user) {
          setCurrentUserId(user.id);
          try {
            const cloudProjects = await fetchUserProjectsFromSupabase(user.id);
            setProjects(cloudProjects || []);
            setActiveProject(cloudProjects?.[0] || null);
          } catch (err) {
            console.error('Failed to load user projects from Supabase:', err);
            setProjects([]);
            setActiveProject(null);
          }
        } else {
          setCurrentUserId(null);
          try {
            const fallbackProjects = await fetchProjects();
            setProjects(fallbackProjects || []);
            setActiveProject(fallbackProjects?.[0] || null);
          } catch {
            setProjects([]);
            setActiveProject(null);
          }
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // Autosave persistence handler
  const handleAutosave = useCallback(async (projectToSave: Project | null) => {
    if (!projectToSave) return;
    if (projectToSave.isDemoProject) {
      // Demo project: update local storage / memory only
      return;
    }

    // Try Supabase first if configured
    if (isSupabaseConfigured && currentUserId) {
      const { success, error } = await saveProjectToSupabase(projectToSave, currentUserId);
      if (!success && error) {
        console.warn('Supabase autosave error, falling back to API:', error);
      } else {
        return;
      }
    }

    // Fallback to Express backend API
    await updateProject(projectToSave.id, projectToSave);
  }, [currentUserId]);

  const autosave = useAutosave<Project | null>({
    data: activeProject,
    onSave: handleAutosave,
    debounceMs: 1500,
    isDemo: Boolean(activeProject?.isDemoProject),
    enabled: Boolean(activeProject && !activeProject.isDemoProject)
  });

  // Handlers
  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
  };

  const handleOpenWorkspace = (project: Project) => {
    setActiveProject(project);
    setCurrentView('workspace');
  };

  const handleProjectCreated = async (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProject(newProject);
    setCurrentView('workspace');

    // Save to Supabase if logged in
    if (isSupabaseConfigured && currentUserId && !newProject.isDemoProject) {
      await saveProjectToSupabase(newProject, currentUserId).catch((err) =>
        console.warn('Failed initial Supabase sync for new project:', err)
      );
    }
  };

  const handleUpdateActiveProject = async (updated: Project) => {
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      if (isSupabaseConfigured && currentUserId) {
        await deleteProjectFromSupabase(projectId, currentUserId);
      }
      await apiDeleteProject(projectId).catch(() => {});
      const remaining = projects.filter((p) => p.id !== projectId);
      setProjects(remaining);
      if (activeProject?.id === projectId) {
        setActiveProject(remaining[0] || null);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
  };

  const handleRenameProject = async (projectId: string, newTitle: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const updated: Project = { ...target, title: newTitle, updatedAt: new Date().toISOString() };
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    if (activeProject?.id === projectId) {
      setActiveProject(updated);
    }
    if (isSupabaseConfigured && currentUserId && !updated.isDemoProject) {
      await saveProjectToSupabase(updated, currentUserId).catch((err) =>
        console.warn('Supabase rename sync warning:', err)
      );
    }
    await updateProject(projectId, { title: newTitle }).catch(() => {});
  };

  const handleDuplicateProject = async (sourceProject: Project) => {
    const duplicated: Project = {
      ...sourceProject,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${sourceProject.title} (Copy)`,
      userId: currentUserId || 'usr-researcher-01',
      isDemoProject: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [duplicated, ...prev]);
    setActiveProject(duplicated);
    if (isSupabaseConfigured && currentUserId) {
      await saveProjectToSupabase(duplicated, currentUserId).catch((err) =>
        console.warn('Supabase duplicate sync warning:', err)
      );
    }
    await updateProject(duplicated.id, duplicated).catch(() => {});
  };

  const handleLoadSampleProject = (sampleId: string) => {
    const found = projects.find((p) => p.id === sampleId);
    if (found) {
      setActiveProject(found);
      setCurrentView('workspace');
    } else if (projects.length > 0) {
      setActiveProject(projects[0]);
      setCurrentView('workspace');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center text-[#141414] font-sans">
        <div className="w-10 h-10 bg-[#141414] flex items-center justify-center text-white text-lg font-bold font-mono mb-3 border border-[#141414] shadow-[4px_4px_0px_rgba(20,20,20,0.2)]">
          M
        </div>
        <p className="text-sm font-bold uppercase tracking-tight text-[#141414]">Manuscript Studio</p>
        <span className="text-[10px] font-mono text-[#141414]/70 mt-1 uppercase tracking-widest">Initializing research workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col selection:bg-[#141414] selection:text-white font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onNewProject={() => setCurrentView('wizard')}
        onOpenFactProtectionModal={() => setIsFactModalOpen(true)}
        userProfile={userProfile}
        aiConfigured={aiConfigured}
        isAuthenticated={Boolean(currentUserId)}
        currentPlan={currentPlan}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onSignOutComplete={async () => {
          setCurrentUserId(null);
          try {
            const fallbackProjects = await fetchProjects();
            setProjects(fallbackProjects || []);
            setActiveProject(fallbackProjects?.[0] || null);
          } catch {
            setProjects([]);
            setActiveProject(null);
          }
        }}
      />

      {/* View Routing */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <LandingPage
            onStartProject={() => setCurrentView('wizard')}
            onExploreHowItWorks={() => {
              const el = document.getElementById('how-it-works');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onSelectSampleProject={handleLoadSampleProject}
            onNavigateToDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            projects={projects}
            activeProject={activeProject}
            onSelectProject={handleSelectProject}
            onNewProject={() => setCurrentView('wizard')}
            onOpenWorkspace={handleOpenWorkspace}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onDuplicateProject={handleDuplicateProject}
            onLoadSampleProject={handleLoadSampleProject}
            userProfile={userProfile}
            onNavigate={(view) => setCurrentView(view)}
            isAuthenticated={Boolean(currentUserId)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            currentPlan={currentPlan}
            onPlanUpgraded={(newPlan) => {
              setSubscriptionState((prev) => prev ? { ...prev, plan: newPlan } : { plan: newPlan, status: 'active', usage: { aiAnalysesThisMonth: 0, exportsThisMonth: 0 } });
            }}
          />
        )}

        {currentView === 'wizard' && (
          <ProjectWizard
            onCancel={() => setCurrentView(projects.length > 0 ? 'dashboard' : 'landing')}
            onProjectCreated={handleProjectCreated}
          />
        )}

        {currentView === 'workspace' && (
          activeProject ? (
            <ManuscriptWorkspace
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              onNavigateToQualityChecks={() => setCurrentView('quality')}
              onNavigateToSimilarity={() => setCurrentView('similarity')}
              onNavigateToAIAnalysis={() => setCurrentView('ai_analysis')}
              onOpenFactProtectionModal={() => setIsFactModalOpen(true)}
              autosaveStatus={autosave.status}
              lastSavedAt={autosave.lastSavedAt}
              onRetrySave={autosave.retrySave}
              onManualSave={autosave.manualSaveNow}
              userId={currentUserId || 'default_user'}
              currentPlan={currentPlan}
              subscriptionState={subscriptionState || undefined}
              onPlanUpgraded={(newPlan) => {
                setSubscriptionState((prev) => prev ? { ...prev, plan: newPlan } : { plan: newPlan, status: 'active', usage: { aiAnalysesThisMonth: 0, exportsThisMonth: 0 } });
              }}
              onRecordUsage={async (action) => {
                const updated = await recordUsageAction(currentUserId || 'usr_guest', action, 1);
                if (updated) setSubscriptionState(updated);
              }}
              onNavigateToPricing={() => setCurrentView('pricing')}
            />
          ) : (
            <div className="p-12 text-center text-[#141414] max-w-md mx-auto my-12 bg-white border border-[#141414] shadow-[6px_6px_0px_rgba(20,20,20,0.15)]">
              <div className="w-10 h-10 bg-[#141414] text-white flex items-center justify-center mx-auto mb-3 font-bold font-mono text-sm">
                M
              </div>
              <h3 className="text-sm font-bold uppercase tracking-tight text-[#141414] mb-1">No Active Project Selected</h3>
              <p className="text-xs text-[#141414]/70 mb-4">Choose a research manuscript from your dashboard or start a new draft.</p>
              <button
                onClick={() => setCurrentView('wizard')}
                className="px-4 py-2 bg-[#141414] hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-[#141414]"
              >
                Create New Manuscript
              </button>
            </div>
          )
        )}

        {currentView === 'quality' && (
          activeProject ? (
            <QualityControlPanel
              project={activeProject}
              onUpdateProject={handleUpdateActiveProject}
              onOpenWorkspace={() => setCurrentView('workspace')}
            />
          ) : (
            <div className="p-12 text-center text-[#141414] font-mono text-xs">Please select a project first.</div>
          )
        )}

        {currentView === 'similarity' && (
          activeProject ? (
            <SimilarityReportView
              project={activeProject}
              onOpenWorkspace={() => setCurrentView('workspace')}
            />
          ) : (
            <div className="p-12 text-center text-[#141414] font-mono text-xs">Please select a project first.</div>
          )
        )}

        {currentView === 'ai_analysis' && (
          activeProject ? (
            <AIContentAnalysisView
              project={activeProject}
              onOpenWorkspace={() => setCurrentView('workspace')}
              currentPlan={currentPlan}
              subscriptionState={subscriptionState || undefined}
              userProfile={userProfile}
              onPlanUpgraded={(newPlan) => {
                setSubscriptionState((prev) => prev ? { ...prev, plan: newPlan } : { plan: newPlan, status: 'active', usage: { aiAnalysesThisMonth: 0, exportsThisMonth: 0 } });
              }}
              onRecordUsage={async (action) => {
                const updated = await recordUsageAction(currentUserId || 'usr_guest', action, 1);
                if (updated) setSubscriptionState(updated);
              }}
              onNavigateToPricing={() => setCurrentView('pricing')}
            />
          ) : (
            <div className="p-12 text-center text-[#141414] font-mono text-xs">Please select a project first.</div>
          )
        )}

        {currentView === 'formats' && (
          <FormatDirectory
            onSelectFormat={(formatId) => {
              if (activeProject) {
                handleUpdateActiveProject({ ...activeProject, formatId });
                alert(`Applied format to current project.`);
              }
            }}
            activeFormatId={activeProject?.formatId}
          />
        )}

        {currentView === 'pricing' && (
          <PricingView
            currentPlan={currentPlan}
            userProfile={userProfile}
            userId={currentUserId}
            onPlanChanged={(newPlan) => {
              setSubscriptionState((prev) => prev ? { ...prev, plan: newPlan } : { plan: newPlan, status: 'active', usage: { aiAnalysesThisMonth: 0, exportsThisMonth: 0 } });
            }}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            userProfile={userProfile}
            onUpdateProfile={(updated) => setUserProfile(updated)}
            currentPlan={currentPlan}
            subscriptionState={subscriptionState || undefined}
            onNavigateToPricing={() => setCurrentView('pricing')}
            activeProjectsCount={projects.length}
          />
        )}
      </main>

      {/* High Density Status Footer */}
      <footer className="h-7 bg-[#141414] text-[#E4E3E0] flex items-center justify-between px-4 font-mono text-[10px] uppercase tracking-wider shrink-0 border-t border-[#141414] z-30 select-none">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>STATUS: READY</span>
          </span>
          <span className="opacity-70 hidden xs:inline">
            DB: {isSupabaseConfigured ? 'SUPABASE_CONNECTED' : 'LOCAL_STORAGE'}
          </span>
          <span className="opacity-70 hidden md:inline">
            ENGINE: {aiConfigured ? 'GEMINI_ENABLED' : 'DETERMINISTIC'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="opacity-70 hidden sm:inline">AUTOSAVE: {autosave.status.toUpperCase()}</span>
          <span className="text-emerald-300 font-bold">0 ERRORS</span>
        </div>
      </footer>

      {/* Fact Protection Principles Modal */}
      <FactProtectionModal
        isOpen={isFactModalOpen}
        onClose={() => setIsFactModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* Researcher Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        onProfileUpdated={(updated) => {
          setUserProfile(updated);
          setIsProfileModalOpen(false);
        }}
      />
    </div>
  );
}
