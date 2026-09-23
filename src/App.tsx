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
import { ReviewPage } from './components/pages/ReviewPage';
import { AdminDeskPage } from './components/pages/AdminDeskPage';
import { SyncModal } from './components/SyncModal';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>('queue');
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

  // Software Queue Lock: Keep reviewer focused strictly on the 100 software submissions
  const [isSoftwareQueueLocked, setIsSoftwareQueueLocked] = useState(true);

  // Sync Modal
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Fetch project list from server
  const loadProjects = useCallback(async () => {
    try {
      const isOnline = await checkServerHealth();
      setServerOnline(isOnline);

      const res = await fetchCockpitProjects();
      setProjects(res.projects);
      setStats(res.stats);

      // If active project is loaded, keep it up to date
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
      const softwareOnly = projects.filter((p) => p.projectType === 'software');
      return softwareOnly.length > 0 ? softwareOnly : projects;
    }
    return projects;
  }, [projects, isSoftwareQueueLocked]);

  // Launch review mode for a project
  const handleStartReview = (project: CockpitProject) => {
    // If selecting a software project, keep lock active; if selecting hardware, unlock
    if (project.projectType === 'hardware') {
      setIsSoftwareQueueLocked(false);
    } else {
      setIsSoftwareQueueLocked(true);
    }
    setActiveProjectId(project.id);
    setCurrentPage('review');
  };

  const handleStartSoftwareQueue = () => {
    setIsSoftwareQueueLocked(true);
    const softwareProjects = projects.filter((p) => p.projectType === 'software');
    const firstPending = softwareProjects.find((p) => p.cockpitStatus === 'pending') || softwareProjects[0];
    if (firstPending) {
      setActiveProjectId(firstPending.id);
      setCurrentPage('review');
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
    }
  };

  const handlePrevProject = () => {
    if (currentProjectIndex > 0) {
      const prev = activeReviewList[currentProjectIndex - 1];
      setActiveProjectId(prev.id);
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
        onNavigate={(page) => setCurrentPage(page)}
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

        {currentPage === 'review' && activeProject && (
          <ReviewPage
            project={activeProject}
            allProjects={projects}
            currentIndex={currentProjectIndex >= 0 ? currentProjectIndex : 0}
            totalProjects={activeReviewList.length}
            isSoftwareQueueLocked={isSoftwareQueueLocked}
            onToggleQueueLock={() => setIsSoftwareQueueLocked((l) => !l)}
            onBackToQueue={() => setCurrentPage('queue')}
            onNextProject={handleNextProject}
            onPrevProject={handlePrevProject}
            gitHubData={gitHubData}
            verdict={activeProject.cockpitVerdict}
            auditHistory={auditHistory}
            onNoteAdded={(newEntry) => setAuditHistory((prev) => [newEntry, ...prev])}
            onVerdictSubmitted={handleVerdictSubmitted}
          />
        )}

        {currentPage === 'admin' && (
          <AdminDeskPage onBackToQueue={() => setCurrentPage('queue')} />
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
