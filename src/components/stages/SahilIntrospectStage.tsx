import React, { useState } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface SahilIntrospectStageProps {
  project: CockpitProject;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

export const SahilIntrospectStage: React.FC<SahilIntrospectStageProps> = ({
  project,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const cleanProjectName = (project.hackatimeProjects || project.projectName || '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

  // Introspect URL with all prefilled parameters supported by introspect.sahil.ink
  const introspectParams = new URLSearchParams();
  if (project.codeUrl) introspectParams.set('repo_url', project.codeUrl);
  if (project.playableUrl) introspectParams.set('demo_url', project.playableUrl);
  if ((project as any).slackMemberId || (project as any).slackId) {
    introspectParams.set('slack_id', (project as any).slackMemberId || (project as any).slackId);
  }
  if (project.hackatimeId) introspectParams.set('hackatime_user', project.hackatimeId);
  if (project.submittedHours) introspectParams.set('hours', String(project.submittedHours));
  if (project.submittedAt) introspectParams.set('submission_date', project.submittedAt);
  if (cleanProjectName) introspectParams.set('hackatime_projects', cleanProjectName);

  const introspectUrl = `https://introspect.sahil.ink/?${introspectParams.toString()}`;

  const copyPayload = () => {
    const payload = {
      project: project.projectName,
      codeUrl: project.codeUrl,
      playableUrl: project.playableUrl,
      submittedHours: project.submittedHours,
      hackatimeId: project.hackatimeId,
      hackatimeProjects: cleanProjectName,
      submittedAt: project.submittedAt,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    toast.success('Copied submission payload to clipboard');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handlePass = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, true);
    }
  };

  const handleFail = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 3 of 7
            </span>
            <span className="text-xs text-content-tertiary">Deep Timeline & Code Inspection</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Sahil&apos;s Introspect Inspector
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Evaluate commit cadence, velocity graphs, and automated timeline verification for @<strong className="text-content-primary">{project.githubUsername}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
            title="Reload Introspect frame"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Frame</span>
          </button>

          <button
            type="button"
            onClick={copyPayload}
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
            title="Copy submission details for Introspect manual paste"
          >
            {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Payload</span>
          </button>

          <a
            href={introspectUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-semibold hover:bg-orange-600 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Submission Context Strip */}
      <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white shadow-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
        <div>
          <span className="text-[#a1a1aa] text-[10px] uppercase block tracking-wider font-sans">Project</span>
          <span className="font-bold text-white truncate block">{project.projectName}</span>
        </div>
        <div>
          <span className="text-[#a1a1aa] text-[10px] uppercase block tracking-wider font-sans">Claimed Hours</span>
          <span className="font-bold text-amber-400">{project.submittedHours} hrs</span>
        </div>
        <div>
          <span className="text-[#a1a1aa] text-[10px] uppercase block tracking-wider font-sans">Tracked Project</span>
          <span className="text-white truncate block">{cleanProjectName || 'None'}</span>
        </div>
        <div>
          <span className="text-[#a1a1aa] text-[10px] uppercase block tracking-wider font-sans">Hackatime ID</span>
          <span className="text-emerald-400 font-bold">{project.hackatimeId || 'None'}</span>
        </div>
      </div>

      {/* Live Introspect Iframe Container */}
      <div className="p-3 rounded-2xl bg-[#121214] border border-[#27272a] shadow-lg flex flex-col space-y-2">
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-[#a1a1aa]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-[#f4f4f5]">introspect.sahil.ink</span>
          </div>
          <span className="text-[11px]">Sandboxed Embedded Analysis</span>
        </div>

        <div className="w-full h-[580px] rounded-xl overflow-hidden bg-[#0d0d0f] border border-[#27272a]">
          <iframe
            key={iframeKey}
            src={introspectUrl}
            title="Sahil's Introspect"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>

      {/* Interactive Reviewer Pass/Fail Checklist */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-orange" />
            Stage 2 Verification: Introspect & Timeline Checks
          </h3>
          <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
        </div>

        <div className="space-y-2.5">
          <PassFailControl
            label="Commit Progression & Cadence Plausible"
            description="Commits are distributed across real working sessions rather than a 10-minute automated dump."
            status={reviewChecklist['stage2_timeline_consistent']}
            onPass={() => handlePass('stage2_timeline_consistent')}
            onFail={() => handleFail('stage2_timeline_consistent')}
          />

          <PassFailControl
            label="No Uncredited Mass Code Import"
            description="Project code is written for this ship, not a copy-pasted external repository or template with fake history."
            status={reviewChecklist['stage2_no_mass_dump']}
            onPass={() => handlePass('stage2_no_mass_dump')}
            onFail={() => handleFail('stage2_no_mass_dump')}
          />

          <PassFailControl
            label="AI Heuristics & Human Touch Verified"
            description="Code contains genuine engineering logic, structure, and problem solving matching requested hours."
            status={reviewChecklist['stage2_ai_heuristic_verified']}
            onPass={() => handlePass('stage2_ai_heuristic_verified')}
            onFail={() => handleFail('stage2_ai_heuristic_verified')}
          />
        </div>
      </div>

      {/* Reviewer Action Bar */}
      <div className="pt-4 flex items-center justify-between border-t border-border-subtle shrink-0">
        {isFlagging ? (
          <div className="flex items-center gap-2 flex-1 max-w-md mr-4">
            <input
              type="text"
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Reason for introspect flag..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`Introspect Concern: ${flagNote.trim()}`);
                }
                setIsFlagging(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
            >
              Confirm Flag
            </button>
            <button
              type="button"
              onClick={() => setIsFlagging(false)}
              className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsFlagging(true)}
            className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Flag Timeline Concern</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>Continue to Project Overview & README →</span>
        </button>
      </div>
    </div>
  );
};
