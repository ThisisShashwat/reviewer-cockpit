import React, { useEffect, useState } from 'react';
import { CockpitProject, GitHubRepoData, VerdictDetails } from '../lib/types';
import { TriageStep, TriageStepperHeader } from './TriageStepperHeader';
import { HackatimeSanityStage } from './stages/HackatimeSanityStage';
import { ManifestDoubleDipStage } from './stages/ManifestDoubleDipStage';
import { ShippingDeliverablesStage } from './stages/ShippingDeliverablesStage';
import { CommitsDiffsStage } from './stages/CommitsDiffsStage';
import { AiQualityStage } from './stages/AiQualityStage';
import { VerdictDeskStage } from './stages/VerdictDeskStage';

interface CenterWorkspaceProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  verdict?: VerdictDetails;
  onOpenAdminDesk: () => void;
  onEarlyExit: (reason: string) => void;
  onApplyDeltaHours?: (hours: number, justification: string) => void;
}

export const CenterWorkspace: React.FC<CenterWorkspaceProps> = ({
  project,
  gitHubData,
  verdict,
  onOpenAdminDesk,
  onEarlyExit,
  onApplyDeltaHours,
}) => {
  const [currentStep, setCurrentStep] = useState<TriageStep>(0);

  // Reset to Step 0 when switching to a different project
  useEffect(() => {
    setCurrentStep(0);
  }, [project.id]);

  // Global numeric keyboard shortcuts: 0 - 5 to jump between stages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 0 && num <= 5) {
        setCurrentStep(num as TriageStep);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAdvance = () => {
    if (currentStep < 5) {
      setCurrentStep((s) => (s + 1) as TriageStep);
    }
  };

  const handleEarlyExitWithJump = (reason: string) => {
    onEarlyExit(reason);
    setCurrentStep(5);
  };

  return (
    <main className="flex-1 flex flex-col bg-rv-bg overflow-hidden min-w-0">
      {/* Triage Stepper Navigation Header */}
      <TriageStepperHeader
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        onEarlyExit={handleEarlyExitWithJump}
      />

      {/* Main Stage Content */}
      <div className="flex-1 overflow-hidden relative">
        {currentStep === 0 && (
          <HackatimeSanityStage
            project={project}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExitWithJump}
          />
        )}

        {currentStep === 1 && (
          <ManifestDoubleDipStage
            project={project}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExitWithJump}
            onApplyDeltaHours={onApplyDeltaHours}
          />
        )}

        {currentStep === 2 && (
          <ShippingDeliverablesStage
            project={project}
            gitHubData={gitHubData}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExitWithJump}
          />
        )}

        {currentStep === 3 && (
          <CommitsDiffsStage
            project={project}
            gitHubData={gitHubData}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExitWithJump}
          />
        )}

        {currentStep === 4 && (
          <AiQualityStage
            project={project}
            gitHubData={gitHubData}
            onAdvance={handleAdvance}
            onEarlyExit={handleEarlyExitWithJump}
          />
        )}

        {currentStep === 5 && (
          <VerdictDeskStage
            project={project}
            verdict={verdict}
            onOpenAdminDesk={onOpenAdminDesk}
          />
        )}
      </div>
    </main>
  );
};
