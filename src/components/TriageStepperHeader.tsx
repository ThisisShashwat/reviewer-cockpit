import React from 'react';
import {
  Activity,
  Layers,
  PlaySquare,
  GitCommit,
  Cpu,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';

export type TriageStep = 0 | 1 | 2 | 3 | 4 | 5;

interface TriageStepperHeaderProps {
  currentStep: TriageStep;
  onSelectStep: (step: TriageStep) => void;
  onEarlyExit?: (reason: string) => void;
}

const STEPS = [
  { id: 0 as TriageStep, label: '0. Sanity', title: 'Hackatime Tracker Sanity', icon: Activity },
  { id: 1 as TriageStep, label: '1. Double-Dip', title: 'Manifest Cross-YSWS Check', icon: Layers },
  { id: 2 as TriageStep, label: '2. Shipping', title: 'Live Demo & Release Binaries', icon: PlaySquare },
  { id: 3 as TriageStep, label: '3. Commits', title: 'Git History & Diffs', icon: GitCommit },
  { id: 4 as TriageStep, label: '4. AI & Quality', title: 'AI Heuristics & README', icon: Cpu },
  { id: 5 as TriageStep, label: '5. Verdict', title: 'Final Verdict Desk', icon: ShieldCheck },
];

export const TriageStepperHeader: React.FC<TriageStepperHeaderProps> = ({
  currentStep,
  onSelectStep,
  onEarlyExit,
}) => {
  return (
    <div className="h-12 bg-rv-surface2 border-b border-rv-border px-4 flex items-center justify-between shrink-0 select-none">
      {/* Linear Stepper Tabs */}
      <div className="flex items-center gap-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.id;
          const isPassed = currentStep > s.id;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectStep(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-rv-accent text-white shadow-sm'
                  : isPassed
                  ? 'text-rv-dim hover:text-rv-text hover:bg-rv-surface3'
                  : 'text-rv-muted hover:text-rv-dim hover:bg-rv-surface3'
              }`}
              title={s.title}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Early Exit Dropdown or Trigger */}
      {onEarlyExit && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-rv-muted hidden md:inline">Fail fast:</span>
          <button
            type="button"
            onClick={() => onEarlyExit('Bot velocity spike detected')}
            className="px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 text-red-400 hover:bg-red-900/60 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            title="Early Exit: Reject immediately for tracker or bot anomaly"
          >
            <AlertOctagon className="w-3 h-3" />
            <span>Early Exit</span>
          </button>
        </div>
      )}
    </div>
  );
};
