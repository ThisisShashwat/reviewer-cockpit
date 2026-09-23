import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import {
  checkServerHealth,
  fetchCockpitProject,
  fetchCockpitProjects,
  fetchGitHubRepoData,
} from './lib/api';
import {
  AuditLogEntry,
  CockpitProject,
  GitHubRepoData,
  QueueStats,
  VerdictDetails,
} from './lib/types';

import { AppPage, TopNav } from './components/layout/TopNav';
import { QueuePage } from './components/pages/QueuePage';
import { ReviewPage, ReviewStep } from './components/pages/ReviewPage';
import { AdminDeskPage } from './components/pages/AdminDeskPage';
import { SyncModal } from './components/SyncModal';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>('queue');
  const [activeStep, setActiveStep] = useState<ReviewStep>(0);
  const [projects, setProjects] = useState<CockpitProject[]>([]);
  const [stats, setStats] = useState<QueueStats | undefined>(undefined);
  const [serverOnline, setServerOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Project for Review Page
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<CockpitProject | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  const [gitHubData, setGitHubData] = useState<Partial<GitHubRepoData>>({ isLoading: true });

  // Software Queue Lock: Keep reviewer focused strictly on the software submissions
  const [isSoftwareQueueLocked, setIsSoftwareQueueLocked] = useState(true);

  // Sync Modal
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // URL Synchronization helper
  const updateUrl = useCallback(
    (page: AppPage, projId: string | null, step: ReviewStep, replace = false) => {
      const url = new URL(window.location.href);
      if (page === 'review' && projId) {
        url.searchParams.delete('page');
        url.searchParams.set('project', projId);
        url.searchParams.set('step', String(step));
      } else if (page === 'admin') {
        url.searchParams.delete('project');
        url.searchParams.delete('step');
        url.searchParams.set('page', 'admin');
      } else {
        url.searchParams.delete('page');
        url.searchParams.delete('project');
        url.searchParams.delete('step');
      }

      if (replace) {
        window.history.replaceState({}, '', url.pathname + url.search);
      } else {
        window.history.pushState({}, '', url.pathname + url.search);
      }
    },
    []
  );

  // Initialize state from URL params on first mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const pageParam = searchParams.get('page');
    const projectParam = searchParams.get('project');
    const stepParam = searchParams.get('step');

    if (projectParam) {
      setActiveProjectId(projectParam);
      setCurrentPage('review');
      if (stepParam !== null && !isNaN(Number(stepParam))) {
        const s = Math.max(0, Math.min(6, parseInt(stepParam, 10))) as ReviewStep;
        setActiveStep(s);
      }
    } else if (pageParam === 'admin') {
      setCurrentPage('admin');
    } else {
      setCurrentPage('queue');
    }
  }, []);

  // Listen to browser popstate (Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const pageParam = searchParams.get('page');
      const projectParam = searchParams.get('project');
      const stepParam = searchParams.get('step');

      if (projectParam) {
        setActiveProjectId(projectParam);
        setCurrentPage('review');
        if (stepParam !== null && !isNaN(Number(stepParam))) {
          const s = Math.max(0, Math.min(6, parseInt(stepParam, 10))) as ReviewStep;
          setActiveStep(s);
        } else {
          setActiveStep(0);
        }
      } else if (pageParam === 'admin') {
        setCurrentPage('admin');
        setActiveProjectId(null);
      } else {
        setCurrentPage('queue');
        setActiveProjectId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch project list from server
  const loadProjects = useCallback(async () => {
    try {
      const isOnline = await checkServerHealth();
      setServerOnline(isOnline);

      const res = await fetchCockpitProjects();
      setProjects(res.projects);
      setStats(res.stats);

      // If active project is loaded or deep-linked, keep it up to date
      if (activeProjectId) {
        const found = res.projects.find((p) => p.id === activeProjectId);
        if (found) setActiveProject(found);
      }
    } catch (err: any) {
      console.error('Error fetching cockpit projects:', err);
      setServerOnline(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    loadProjects();

    const interval = setInterval(async () => {
      const online = await checkServerHealth();
      setServerOnline(online);
    }, 15000);

    return () => clearInterval(interval);
  }, [loadProjects]);

  // When activeProjectId changes, fetch full project telemetry & audit history
  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      return;
    }

    const current = projects.find((p) => p.id === activeProjectId);
    if (current) {
      setActiveProject(current);
    }

    fetchCockpitProject(activeProjectId)
      .then((res) => {
        setActiveProject(res.project);
        setAuditHistory(res.auditHistory);
      })
      .catch(() => {});

    // Fetch GitHub repository data
    if (current?.codeUrl) {
      setGitHubData({ isLoading: true });
      fetchGitHubRepoData(current.codeUrl)
        .then((data) => setGitHubData(data))
        .catch((err) => setGitHubData({ isLoading: false, error: err.message }));
    }
  }, [activeProjectId, projects]);

  // Active navigation list depending on whether queue lock is active
  const activeReviewList = useMemo(() => {
    if (isSoftwareQueueLocked) {
      const software = projects.filter((p) => p.projectType === 'software');
      // If reviewing pending software, prioritize pending items while keeping active project in list
      const pendingSoftware = software.filter(
        (p) => p.cockpitStatus === 'pending' || p.id === activeProjectId
      );
      if (pendingSoftware.length > 0) return pendingSoftware;
      return software.length > 0 ? software : projects;
    }
    return projects;
  }, [projects, isSoftwareQueueLocked, activeProjectId]);

  // Launch review mode for a project
  const handleStartReview = (project: CockpitProject) => {
    // If selecting a software project, keep lock active; if selecting hardware, unlock
    if (project.projectType === 'hardware') {
      setIsSoftwareQueueLocked(false);
    } else {
      setIsSoftwareQueueLocked(true);
    }
    setActiveProjectId(project.id);
    setActiveStep(0);
    setCurrentPage('review');
    updateUrl('review', project.id, 0);
  };

  const handleStartSoftwareQueue = () => {
    setIsSoftwareQueueLocked(true);
    const softwareProjects = projects.filter((p) => p.projectType === 'software');
    const firstPending =
      softwareProjects.find((p) => p.cockpitStatus === 'pending') || softwareProjects[0];
    if (firstPending) {
      setActiveProjectId(firstPending.id);
      setActiveStep(0);
      setCurrentPage('review');
      updateUrl('review', firstPending.id, 0);
    }
  };

  const handleStepChange = (step: ReviewStep) => {
    setActiveStep(step);
    if (activeProjectId) {
      updateUrl('review', activeProjectId, step, true);
    }
  };

  const handleBackToQueue = () => {
    setCurrentPage('queue');
    setActiveProjectId(null);
    updateUrl('queue', null, 0);
  };

  const handleNavigate = (page: AppPage) => {
    setCurrentPage(page);
    if (page !== 'review') {
      setActiveProjectId(null);
      updateUrl(page, null, 0);
    } else if (activeProjectId) {
      updateUrl('review', activeProjectId, activeStep);
    }
  };

  // Stepping through projects in Review mode
  const currentProjectIndex = activeProjectId
    ? activeReviewList.findIndex((p) => p.id === activeProjectId)
    : 0;

  const handleNextProject = () => {
    if (currentProjectIndex < activeReviewList.length - 1) {
      const next = activeReviewList[currentProjectIndex + 1];
      setActiveProjectId(next.id);
      setActiveStep(0);
      updateUrl('review', next.id, 0);
    }
  };

  const handlePrevProject = () => {
    if (currentProjectIndex > 0) {
      const prev = activeReviewList[currentProjectIndex - 1];
      setActiveProjectId(prev.id);
      setActiveStep(0);
      updateUrl('review', prev.id, 0);
    }
  };

  const handleVerdictSubmitted = (
    _verdict: VerdictDetails,
    updatedProject: CockpitProject
  ) => {
    setActiveProject(updatedProject);
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
    loadProjects();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas text-content-primary overflow-hidden font-sans">
      {/* Persistent Horizons Top Navigation Bar */}
      <TopNav
        currentPage={currentPage}
        onNavigate={handleNavigate}
        stats={stats}
        serverOnline={serverOnline}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onRefresh={() => {
          setIsRefreshing(true);
          loadProjects();
        }}
        isRefreshing={isRefreshing}
        activeProjectTitle={activeProject?.projectName}
      />

      {/* Main Page Workspace */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {currentPage === 'queue' && (
          <QueuePage
            projects={projects}
            stats={stats}
            onSelectProject={handleStartReview}
            onStartSoftwareQueue={handleStartSoftwareQueue}
            isLoading={isLoading}
          />
        )}

        {currentPage === 'review' && (
          activeProject ? (
            <ReviewPage
              project={activeProject}
              allProjects={projects}
              currentIndex={currentProjectIndex >= 0 ? currentProjectIndex : 0}
              totalProjects={activeReviewList.length}
              isSoftwareQueueLocked={isSoftwareQueueLocked}
              onToggleQueueLock={() => setIsSoftwareQueueLocked((l) => !l)}
              onBackToQueue={handleBackToQueue}
              onNextProject={handleNextProject}
              onPrevProject={handlePrevProject}
              gitHubData={gitHubData}
              verdict={activeProject.cockpitVerdict}
              auditHistory={auditHistory}
              onNoteAdded={(newEntry) => setAuditHistory((prev) => [newEntry, ...prev])}
              onVerdictSubmitted={handleVerdictSubmitted}
              initialStep={activeStep}
              onStepChange={handleStepChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-canvas">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-content-tertiary">Loading submission review...</span>
              </div>
            </div>
          )
        )}

        {currentPage === 'admin' && (
          <AdminDeskPage onBackToQueue={handleBackToQueue} />
        )}
      </main>

      {/* Sync Live Dump Modal */}
      <SyncModal
        open={isSyncModalOpen}
        onOpenChange={setIsSyncModalOpen}
        onSyncComplete={() => {
          setIsSyncModalOpen(false);
          loadProjects();
          toast.success('Live submissions ingested!');
        }}
      />

      {/* Sonner Toast Notifications (Light Theme) */}
      <Toaster position="bottom-right" theme="light" richColors />
    </div>
  );
};

export default App;
