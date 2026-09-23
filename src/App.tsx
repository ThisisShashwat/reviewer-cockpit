import React, { useEffect, useState, useCallback } from 'react';
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

// Top-level UI components
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { CenterWorkspace } from './components/CenterWorkspace';
import { RightSidebar } from './components/RightSidebar';
import { SyncModal } from './components/SyncModal';
import { AdminDeskModal } from './components/AdminDeskModal';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<CockpitProject[]>([]);
  const [stats, setStats] = useState<QueueStats | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serverOnline, setServerOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Project Detailed State
  const [activeProject, setActiveProject] = useState<CockpitProject | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditLogEntry[]>([]);
  const [gitHubData, setGitHubData] = useState<Partial<GitHubRepoData>>({ isLoading: true });

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAdminDeskOpen, setIsAdminDeskOpen] = useState(false);

  // Load project list from server
  const loadProjects = useCallback(async () => {
    try {
      const isOnline = await checkServerHealth();
      setServerOnline(isOnline);

      const res = await fetchCockpitProjects({ status: statusFilter });
      setProjects(res.projects);
      setStats(res.stats);

      if (res.projects.length > 0) {
        // Clamp current index
        const safeIdx = Math.min(currentIndex, res.projects.length - 1);
        setCurrentIndex(safeIdx);
      }
    } catch (err: any) {
      console.error('Error loading cockpit projects:', err);
      setServerOnline(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, currentIndex]);

  // Initial load & poll server health periodically
  useEffect(() => {
    loadProjects();

    const interval = setInterval(async () => {
      const online = await checkServerHealth();
      setServerOnline(online);
    }, 15000);

    return () => clearInterval(interval);
  }, [loadProjects]);

  // When active index or projects list changes, load detailed project data
  useEffect(() => {
    if (projects.length === 0 || currentIndex >= projects.length) {
      setActiveProject(null);
      return;
    }

    const current = projects[currentIndex];
    setActiveProject(current);

    // Fetch full project with audit history
    fetchCockpitProject(current.id)
      .then((res) => {
        setActiveProject(res.project);
        setAuditHistory(res.auditHistory);
      })
      .catch(() => {
        // fallback to base project
      });

    // Fetch GitHub Repo Data
    setGitHubData({ isLoading: true });
    if (current.codeUrl) {
      fetchGitHubRepoData(current.codeUrl)
        .then((data) => {
          setGitHubData(data);
        })
        .catch((err) => {
          setGitHubData({ isLoading: false, error: err.message });
        });
    } else {
      setGitHubData({ isLoading: false, error: 'No Code URL provided' });
    }
  }, [currentIndex, projects]);

  // Global Keyboard Shortcuts (N for Next, P for Prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        if (currentIndex < projects.length - 1) {
          setCurrentIndex((idx) => idx + 1);
          toast.info(`Moved to next project (#${currentIndex + 2})`);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (currentIndex > 0) {
          setCurrentIndex((idx) => idx - 1);
          toast.info(`Moved to previous project (#${currentIndex})`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, projects.length]);

  const handleNext = () => {
    if (currentIndex < projects.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
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
    // Reload full audit history
    fetchCockpitProject(updatedProject.id).then((res) => {
      setAuditHistory(res.auditHistory);
    });
    // Refresh stats
    loadProjects();
  };

  const handleEarlyExit = (reason: string) => {
    if (!activeProject) return;
    toast.warning(`Early exit triggered: ${reason}`);
  };

  const handleApplyDeltaHours = (hours: number, _justification: string) => {
    if (!activeProject) return;
    toast.success(`Applied ${hours}h net delta to verdict station`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-rv-bg text-rv-text overflow-hidden font-sans">
      {/* TopBar Header */}
      <TopBar
        currentIndex={currentIndex}
        totalProjects={projects.length}
        projects={projects}
        currentProject={activeProject || undefined}
        stats={stats}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onSelectProject={setCurrentIndex}
        onPrev={handlePrev}
        onNext={handleNext}
        serverOnline={serverOnline}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenAdminDesk={() => setIsAdminDeskOpen(true)}
        onRefresh={() => {
          setIsRefreshing(true);
          loadProjects();
        }}
        isRefreshing={isRefreshing}
      />

      {/* Main 3-Column Reviewer Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-rv-dim">
            Loading Reviewer Cockpit...
          </div>
        ) : !activeProject ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-rv-dim space-y-4">
            <h3 className="text-base font-bold text-rv-text">
              No Submissions Found in Selected Filter ({statusFilter})
            </h3>
            <p className="text-xs max-w-md text-rv-dim">
              Click &quot;Sync Live Dump&quot; in the top bar to ingest submissions from Live Admin, or switch filter to All.
            </p>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-rv-accent text-white text-xs font-semibold hover:bg-rv-accent/90 shadow-md"
            >
              Sync Live Dump
            </button>
          </div>
        ) : (
          <>
            {/* Left Column: Submitter & Audit History */}
            <LeftSidebar
              project={activeProject}
              auditHistory={auditHistory}
              onNoteAdded={(newEntry) => {
                setAuditHistory((prev) => [newEntry, ...prev]);
              }}
            />

            {/* Center Column: 6-Stage Triage Stepper Workspace */}
            <CenterWorkspace
              project={activeProject}
              gitHubData={gitHubData}
              verdict={activeProject.cockpitVerdict}
              onOpenAdminDesk={() => setIsAdminDeskOpen(true)}
              onEarlyExit={handleEarlyExit}
              onApplyDeltaHours={handleApplyDeltaHours}
            />

            {/* Right Column: High-Speed Verdict Station */}
            <RightSidebar
              project={activeProject}
              onVerdictSubmitted={handleVerdictSubmitted}
              onNextProject={handleNext}
            />
          </>
        )}
      </div>

      {/* Live Sync Modal */}
      <SyncModal
        open={isSyncModalOpen}
        onOpenChange={setIsSyncModalOpen}
        onSyncComplete={() => {
          setIsSyncModalOpen(false);
          loadProjects();
          toast.success('Synced submissions from Live!');
        }}
      />

      {/* Admin Clipboard Desk Modal */}
      <AdminDeskModal
        open={isAdminDeskOpen}
        onOpenChange={setIsAdminDeskOpen}
      />

      {/* Sonner Toast Notifications */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
};

export default App;
