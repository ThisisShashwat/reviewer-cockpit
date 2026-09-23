import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Activity,
  Layers,
  PlaySquare,
  GitCommit,
  Cpu,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AuditLogEntry,
  CockpitProject,
  GitHubRepoData,
  VerdictDetails,
} from '../../lib/types';

import { HackatimeSanityStage } from '../stages/HackatimeSanityStage';
import { ManifestDoubleDipStage } from '../stages/ManifestDoubleDipStage';
import { ShippingDeliverablesStage } from '../stages/ShippingDeliverablesStage';
import { CommitsDiffsStage } from '../stages/CommitsDiffsStage';
import { AiQualityStage } from '../stages/AiQualityStage';
import { VerdictDeskStage } from '../stages/VerdictDeskStage';
import { ScratchpadDrawer } from '../layout/ScratchpadDrawer';

export type ReviewStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { id: 0 as ReviewStep, label: '1. Sanity', title: 'Hackatime Velocity Sanity', icon: Activity },
  { id: 1 as ReviewStep, label: '2. Double-Dip', title: 'Manifest Cross-YSWS Check', icon: Layers },
  { id: 2 as ReviewStep, label: '3. Demo', title: 'Shipping & Playable Deliverable', icon: PlaySquare },
  { id: 3 as ReviewStep, label: '4. Commits', title: 'Git History & Diffs', icon: GitCommit },
  { id: 4 as ReviewStep, label: '5. AI & Quality', title: 'AI Heuristics & README', icon: Cpu },
  { id: 5 as ReviewStep, label: '6. Verdict', title: 'Final Verdict Desk', icon: ShieldCheck },
];

interface ReviewPageProps {
  project: CockpitProject;
  currentIndex: number;
  totalProjects: number;
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
  currentIndex,
  totalProjects,
  onBackToQueue,
  onNextProject,
  onPrevProject,
  gitHubData,
  verdict,
  auditHistory,
  onNoteAdded,
  onVerdictSubmitted: _onVerdictSubmitted,
}) => {
  const [currentStep, setCurrentStep] = useState<ReviewStep>(0);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Reset to Step 0 when switching projects
  useEffect(() => {
    setCurrentStep(0);
  }, [project.id]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        onBackToQueue();
      } else if (e.key === 's' || e.key === 'S') {
        setIsScratchpadOpen((o) => !o);
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
    toast.warning(`Early exit triggered: ${reason}`);
    setCurrentStep(5);
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden min-w-0">
      {/* 1. Fixed Contextual Top Header */}
      <header className="h-14 bg-canvas-subtle border-b border-border-subtle px-6 flex items-center justify-between shrink-0 select-none z-10">
        {/* Left: Back + Project Info */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBackToQueue}
            className="flex items-center gap-1.5 text-xs font-semibold text-content-tertiary hover:text-content-primary px-2.5 py-1.5 rounded-lg bg-canvas-card border border-border-subtle hover:bg-canvas-hover transition-colors shrink-0"
            title="Return to Queue (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Queue</span>
          </button>

          <div className="h-4 w-[1px] bg-border-subtle shrink-0" />

          <div className="flex items-center gap-2.5 truncate">
            <h2 className="text-sm font-bold text-content-primary truncate">
              {project.projectName}
            </h2>
            <span className="text-xs font-mono text-content-tertiary">
              @{project.githubUsername}
            </span>
            <span className="text-xs font-mono font-bold text-brand-orange px-2 py-0.5 rounded bg-brand-orange/10 border border-brand-orange/20">
              {project.submittedHours} hrs
            </span>
          </div>
        </div>

        {/* Center: Quick Links */}
        <div className="hidden md:flex items-center gap-3 text-xs font-mono text-content-tertiary">
          <a
            href={project.codeUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-content-primary flex items-center gap-1 text-content-secondary"
          >
            <span>Code</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={project.playableUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-content-primary flex items-center gap-1 text-content-secondary"
          >
            <span>Playable Demo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Right: Stepping Controls & Notes Drawer Toggle */}
        <div className="flex items-center gap-2">
          {/* Notes Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsScratchpadOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors"
            title="Toggle Notes & History Drawer (S)"
          >
            <MessageSquare className="w-3.5 h-3.5 text-brand-orange" />
            <span className="hidden sm:inline">Notes</span>
            {auditHistory.length > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-canvas text-content-muted">
                {auditHistory.length}
              </span>
            )}
          </button>

          <div className="h-4 w-[1px] bg-border-subtle" />

          {/* Project Prev/Next Stepper */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevProject}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-md bg-canvas-card border border-border-subtle text-content-tertiary hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Submission (P)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-content-muted px-1.5">
              {currentIndex + 1} / {totalProjects}
            </span>
            <button
              type="button"
              onClick={onNextProject}
              disabled={currentIndex >= totalProjects - 1}
              className="p-1.5 rounded-md bg-canvas-card border border-border-subtle text-content-tertiary hover:text-content-primary disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Submission (N)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Linear Progressive Stepper Bar */}
      <div className="h-12 bg-canvas border-b border-border-subtle px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-sm'
                    : isCompleted
                    ? 'text-content-secondary hover:text-content-primary hover:bg-canvas-card'
                    : 'text-content-muted hover:text-content-tertiary hover:bg-canvas-card'
                }`}
                title={s.title}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fail-Fast Trigger */}
        <button
          type="button"
          onClick={() => handleEarlyExit('Failed review criteria in step')}
          className="px-2.5 py-1 rounded-md text-xs font-medium text-semantic-danger hover:bg-semantic-dangerBg transition-colors flex items-center gap-1.5"
          title="Fail fast to rejection"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Fail Fast</span>
        </button>
      </div>

      {/* 3. Main Stage Workspace (Full Width Single Focus) */}
      <div className="flex-1 overflow-hidden relative">
        {currentStep === 0 && (
          <HackatimeSanityStage
            project={project}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExit}
          />
        )}

        {currentStep === 1 && (
          <ManifestDoubleDipStage
            project={project}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExit}
          />
        )}

        {currentStep === 2 && (
          <ShippingDeliverablesStage
            project={project}
            gitHubData={gitHubData}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExit}
          />
        )}

        {currentStep === 3 && (
          <CommitsDiffsStage
            project={project}
            gitHubData={gitHubData}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExit}
          />
        )}

        {currentStep === 4 && (
          <AiQualityStage
            project={project}
            gitHubData={gitHubData}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExit}
          />
        )}

        {currentStep === 5 && (
          <VerdictDeskStage
            project={project}
            verdict={verdict}
            onOpenAdminDesk={() => {}}
          />
        )}
      </div>

      {/* 4. Slide-Out Notes Drawer */}
      <ScratchpadDrawer
        open={isScratchpadOpen}
        onOpenChange={setIsScratchpadOpen}
        project={project}
        auditHistory={auditHistory}
        onNoteAdded={onNoteAdded}
      />
    </div>
  );
};
