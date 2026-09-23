import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  PlaySquare,
  GitCommit,
  Cpu,
  ShieldCheck,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AuditLogEntry,
  CockpitProject,
  GitHubRepoData,
  VerdictDetails,
} from '../../lib/types';

import { ReviewSidebar } from '../layout/ReviewSidebar';
import { HackatimeSanityStage } from '../stages/HackatimeSanityStage';
import { ManifestDoubleDipStage } from '../stages/ManifestDoubleDipStage';
import { ShippingDeliverablesStage } from '../stages/ShippingDeliverablesStage';
import { CommitsDiffsStage } from '../stages/CommitsDiffsStage';
import { AiQualityStage } from '../stages/AiQualityStage';
import { VerdictDeskStage } from '../stages/VerdictDeskStage';

export type ReviewStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { id: 0 as ReviewStep, label: '1. Sanity', title: 'Hackatime Velocity Sanity', icon: Activity },
  { id: 1 as ReviewStep, label: '2. Double-Dip', title: 'Manifest & Past Submissions', icon: Layers },
  { id: 2 as ReviewStep, label: '3. Deliverables', title: 'Shipping & Playable Deliverable', icon: PlaySquare },
  { id: 3 as ReviewStep, label: '4. Commits', title: 'Git History & Diffs', icon: GitCommit },
  { id: 4 as ReviewStep, label: '5. AI & Quality', title: 'AI Heuristics & Documentation', icon: Cpu },
  { id: 5 as ReviewStep, label: '6. Verdict', title: 'Final Verdict Desk', icon: ShieldCheck },
];

interface ReviewPageProps {
  project: CockpitProject;
  allProjects?: CockpitProject[];
  currentIndex: number;
  totalProjects: number;
  isSoftwareQueueLocked?: boolean;
  onToggleQueueLock?: () => void;
  onBackToQueue: () => void;
  onNextProject: () => void;
  onPrevProject: () => void;
  gitHubData?: Partial<GitHubRepoData>;
  verdict?: VerdictDetails;
  auditHistory: AuditLogEntry[];
  onNoteAdded: (entry: AuditLogEntry) => void;
  onVerdictSubmitted: (verdict: VerdictDetails, updatedProject: CockpitProject) => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  project,
  allProjects = [],
  currentIndex,
  totalProjects,
  isSoftwareQueueLocked = true,
  onToggleQueueLock,
  onBackToQueue,
  onNextProject,
  onPrevProject,
  gitHubData,
  verdict,
  auditHistory,
  onNoteAdded,
  onVerdictSubmitted,
}) => {
  const [currentStep, setCurrentStep] = useState<ReviewStep>(0);
  const [reviewChecklist, setReviewChecklist] = useState<Record<string, boolean>>({});

  // Reset to Step 0 when switching projects
  useEffect(() => {
    setCurrentStep(0);
    setReviewChecklist(project.cockpitVerdict?.appliedChecklist || {});
  }, [project.id]);

  const toggleChecklist = (key: string) => {
    setReviewChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        onBackToQueue();
      } else if (e.key === 'n' || e.key === 'N') {
        onNextProject();
      } else if (e.key === 'p' || e.key === 'P') {
        onPrevProject();
      } else {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 6) {
          setCurrentStep((num - 1) as ReviewStep);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToQueue, onNextProject, onPrevProject]);

  const handleAdvance = () => {
    if (currentStep < 5) {
      setCurrentStep((s) => (s + 1) as ReviewStep);
    }
  };

  const handleEarlyExit = (reason: string) => {
    toast.info(`Flag noted: ${reason}. Advanced to Final Verdict Desk.`);
    setCurrentStep(5);
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden min-w-0">
      {/* 1. Contextual Top Navigation Bar */}
      <header className="h-14 bg-canvas-card border-b border-border-subtle px-6 flex items-center justify-between shrink-0 select-none z-10">
        {/* Left: Back + Queue Lock Status */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToQueue}
            className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary hover:text-content-primary px-3 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle hover:bg-canvas-hover transition-colors shrink-0"
            title="Return to Queue (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Queue</span>
          </button>

          <div className="h-4 w-[1px] bg-border-subtle shrink-0" />

          {/* Software Queue Lock Badge */}
          {onToggleQueueLock ? (
            <button
              type="button"
              onClick={onToggleQueueLock}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
                isSoftwareQueueLocked
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-canvas-subtle text-content-secondary border-border-subtle hover:bg-canvas-hover'
              }`}
              title={
                isSoftwareQueueLocked
                  ? 'Queue locked to Software submissions only. Click to unlock.'
                  : 'Queue unlocked. Click to lock to Software track.'
              }
            >
              {isSoftwareQueueLocked ? (
                <Lock className="w-3 h-3 text-blue-600" />
              ) : (
                <Unlock className="w-3 h-3 text-content-tertiary" />
              )}
              <span>
                {isSoftwareQueueLocked ? 'Software Queue' : 'All Tracks'}: {currentIndex + 1} / {totalProjects}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Lock className="w-3 h-3 text-blue-600" />
              <span>Software Queue: {currentIndex + 1} / {totalProjects}</span>
            </div>
          )}
        </div>

        {/* Center: Stage Step Navigator */}
        <div className="hidden lg:flex items-center gap-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-sm'
                    : isCompleted
                    ? 'text-content-primary hover:bg-canvas-hover'
                    : 'text-content-tertiary hover:text-content-primary hover:bg-canvas-hover'
                }`}
                title={s.title}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Prev / Next Stepping Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevProject}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg bg-canvas-card border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-canvas-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Previous Submission (P)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-content-tertiary px-1">
            {currentIndex + 1} / {totalProjects}
          </span>
          <button
            type="button"
            onClick={onNextProject}
            disabled={currentIndex >= totalProjects - 1}
            className="p-1.5 rounded-lg bg-canvas-card border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-canvas-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Next Submission (N)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout: Persistent Left Sidebar + Stage Main View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Persistent Review Sidebar */}
        <ReviewSidebar
          project={project}
          auditHistory={auditHistory}
          onNoteAdded={onNoteAdded}
          reviewChecklist={reviewChecklist}
        />

        {/* Right Stage Workspace */}
        <main className="flex-1 overflow-hidden bg-canvas relative flex flex-col">
          {currentStep === 0 && (
            <HackatimeSanityStage
              project={project}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 1 && (
            <ManifestDoubleDipStage
              project={project}
              allProjects={allProjects}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 2 && (
            <ShippingDeliverablesStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 3 && (
            <CommitsDiffsStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 4 && (
            <AiQualityStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 5 && (
            <VerdictDeskStage
              project={project}
              verdict={verdict}
              reviewChecklist={reviewChecklist}
              onVerdictSubmitted={onVerdictSubmitted}
            />
          )}
        </main>
      </div>
    </div>
  );
};
