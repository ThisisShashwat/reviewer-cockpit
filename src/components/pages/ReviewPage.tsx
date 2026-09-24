import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  FileText,
  Globe,
  GitCommit,
  ShieldCheck,
  Lock,
  Unlock,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AuditLogEntry,
  CockpitProject,
  GitHubRepoData,
  VerdictDetails,
} from '../../lib/types';

import { ReviewSidebar } from '../layout/ReviewSidebar';
import { ManifestDoubleDipStage } from '../stages/ManifestDoubleDipStage';
import { ReadmeDeliverablesStage } from '../stages/ReadmeDeliverablesStage';
import { PlayableDemoStage } from '../stages/PlayableDemoStage';
import { TelemetryIntrospectStage } from '../stages/TelemetryIntrospectStage';
import { CommitsDiffsStage } from '../stages/CommitsDiffsStage';
import { PortfolioExperienceStage } from '../stages/PortfolioExperienceStage';
import { VerdictDeskStage } from '../stages/VerdictDeskStage';

export type ReviewStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { id: 0 as ReviewStep, label: '1. History', title: 'Prior Ships & Double-Dip', icon: Layers },
  { id: 1 as ReviewStep, label: '2. README & Info', title: 'Deliverables, Screenshot & README', icon: FileText },
  { id: 2 as ReviewStep, label: '3. Playable Demo', title: 'Playable Testing & Host Stability', icon: Globe },
  { id: 3 as ReviewStep, label: '4. Telemetry', title: 'Telemetry & Coding Timeline', icon: Activity },
  { id: 4 as ReviewStep, label: '5. Commits & AI', title: 'Git History, Churn & AI Forensics', icon: GitCommit },
  { id: 5 as ReviewStep, label: '6. Portfolio', title: 'Experience & Other Repos', icon: UserCheck },
  { id: 6 as ReviewStep, label: '7. Verdict', title: 'Final Verdict Desk', icon: ShieldCheck },
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
  onCompletePreApproval?: (project: CockpitProject) => void;
  initialStep?: ReviewStep;
  onStepChange?: (step: ReviewStep) => void;
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
  onCompletePreApproval,
  initialStep,
  onStepChange,
}) => {
  const isReadOnly = project.cockpitStatus !== 'pending';
  const defaultInitialStep: ReviewStep = isReadOnly ? 6 : 0;
  const [currentStep, setCurrentStep] = useState<ReviewStep>(initialStep ?? defaultInitialStep);
  const [reviewChecklist, setReviewChecklist] = useState<Record<string, any>>({});
  const [baselineArchiveCommit, setBaselineArchiveCommit] = useState<{
    commitHash: string;
    shortHash: string;
    shipName: string;
    archiveUrl: string;
    program?: string;
    hours?: number;
  } | undefined>(undefined);

  // Sync step changes upward
  const handleStepSelect = (step: ReviewStep) => {
    setCurrentStep(step);
    onStepChange?.(step);
  };

  // Reset checklist and baseline ONLY when switching projects (project.id changes)
  useEffect(() => {
    setReviewChecklist(project.cockpitVerdict?.appliedChecklist || {});
    setBaselineArchiveCommit(undefined);
  }, [project.id]);

  // Sync step if initialStep is passed or changes from parent
  useEffect(() => {
    if (initialStep !== undefined && initialStep !== currentStep) {
      setCurrentStep(initialStep as ReviewStep);
    }
  }, [initialStep]);

  const toggleChecklist = (key: string, status?: any) => {
    if (isReadOnly) return;
    setReviewChecklist((prev) => {
      if (status !== undefined) {
        if (prev[key] === status) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: status };
      }
      return { ...prev, [key]: !prev[key] };
    });
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
        if (num >= 1 && num <= 7) {
          handleStepSelect((num - 1) as ReviewStep);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToQueue, onNextProject, onPrevProject]);

  const handleAdvance = () => {
    if (currentStep < 6) {
      const next = (currentStep + 1) as ReviewStep;
      handleStepSelect(next);
    }
  };

  const handleEarlyExit = (reason: string) => {
    toast.info(`Flag noted: ${reason}. Advanced to Final Verdict Desk.`);
    handleStepSelect(6);
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
            className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary hover:text-content-primary px-3 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle hover:bg-canvas-hover transition-colors shrink-0 cursor-pointer"
            title="Return to Queue (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Queue</span>
          </button>

          {onToggleQueueLock && (
            <button
              type="button"
              onClick={onToggleQueueLock}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                isSoftwareQueueLocked
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-canvas-subtle border-border-subtle text-content-secondary'
              }`}
              title="Toggle Software / Hardware Queue Lock"
            >
              {isSoftwareQueueLocked ? (
                <>
                  <Lock className="w-3 h-3 text-blue-600" />
                  <span>Software Filter Active</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-content-tertiary" />
                  <span>All Tracks</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Center: Review Stage Stepper Pills (No horizontal scrollbar) */}
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStepSelect(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ff6b35] text-white shadow-sm font-bold ring-2 ring-[#ff6b35]/20'
                    : isCompleted
                    ? 'bg-zinc-200/90 text-zinc-800 hover:bg-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                title={s.title}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Stepping Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevProject}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg bg-canvas-card border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-canvas-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
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
            className="p-1.5 rounded-lg bg-canvas-card border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-canvas-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
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
          onToggleChecklist={toggleChecklist}
        />

        {/* Right Stage Workspace */}
        <main className="flex-1 overflow-hidden bg-canvas relative flex flex-col">
          {currentStep === 0 && (
            <ManifestDoubleDipStage
              project={project}
              allProjects={allProjects}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
              onBaselineCommitDiscovered={setBaselineArchiveCommit}
            />
          )}

          {currentStep === 1 && (
            <ReadmeDeliverablesStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 2 && (
            <PlayableDemoStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 3 && (
            <TelemetryIntrospectStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 4 && (
            <CommitsDiffsStage
              project={project}
              gitHubData={gitHubData}
              baselineArchiveCommit={baselineArchiveCommit}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 5 && (
            <PortfolioExperienceStage
              project={project}
              gitHubData={gitHubData}
              onAdvance={handleAdvance}
              onEarlyExit={handleEarlyExit}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
            />
          )}

          {currentStep === 6 && (
            <VerdictDeskStage
              project={project}
              verdict={verdict}
              gitHubData={gitHubData}
              reviewChecklist={reviewChecklist}
              onToggleChecklist={toggleChecklist}
              onVerdictSubmitted={onVerdictSubmitted}
              onCompletePreApproval={onCompletePreApproval}
              isReadOnly={isReadOnly}
            />
          )}
        </main>
      </div>
    </div>
  );
};
