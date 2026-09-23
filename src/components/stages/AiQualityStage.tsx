import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';

interface AiQualityStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
}

export const AiQualityStage: React.FC<AiQualityStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const commits = gitHubData?.commits || [];
  const files = gitHubData?.files || [];
  const readmeContent = gitHubData?.readmeContent || '';

  // Render markdown safely
  const renderedReadme = useMemo(() => {
    if (!readmeContent) return null;
    try {
      return marked.parse(readmeContent) as string;
    } catch {
      return '<p class="text-content-tertiary">Unable to render README markdown.</p>';
    }
  }, [readmeContent]);

  // AI Heuristic checks
  const aiIndicatorFiles = files.filter((f) =>
    ['.cursorrules', '.claude', 'copilot', 'devin', 'prompts'].some((kw) =>
      f.name.toLowerCase().includes(kw)
    )
  );

  const genericAiMessages = commits.filter((c) =>
    [
      'initial commit',
      'create complete',
      'added all',
      'feat: complete project',
      'full architecture',
      'implemented application',
    ].some((pattern) => c.message.toLowerCase().includes(pattern))
  );

  const hasAiIndicators = aiIndicatorFiles.length > 0 || genericAiMessages.length >= 2;

  const handleCheckbox = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 4 of 5
            </span>
            <span className="text-xs text-content-tertiary">Quality & AI Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            AI Heuristics & Documentation ({project.projectName})
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Evaluate whether the project exhibits unrefined AI generation or template cloning, and review README documentation quality.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasAiIndicators ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> AI Signals Present
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-semantic-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Organic Code Patterns
            </span>
          )}
        </div>
      </div>

      {/* AI Indicator Notice */}
      {hasAiIndicators && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-semibold block text-amber-950">
              AI Configuration or Scaffold Patterns Detected
            </span>
            <span>
              Found {aiIndicatorFiles.length} assistant configuration file(s) and {genericAiMessages.length} generic commit messages. GitBook allows AI tools provided the submitter genuinely understands the codebase and can iterate on it. If single-prompt generated, consider deflation.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Grid: AI Signal Breakdown + README Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[440px]">
        {/* Left Column: AI Detection Details */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-orange" />
              Repository Indicators
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-canvas-subtle border border-border-subtle">
                <span className="text-content-tertiary block text-[11px]">Assistant Config Files</span>
                <span className="font-semibold text-content-primary">
                  {aiIndicatorFiles.length > 0
                    ? aiIndicatorFiles.map((f) => f.name).join(', ')
                    : 'None detected'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas-subtle border border-border-subtle">
                <span className="text-content-tertiary block text-[11px]">Generic Commit Patterns</span>
                <span className="font-semibold text-content-primary">
                  {genericAiMessages.length} of {commits.length} commits
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas-subtle border border-border-subtle">
                <span className="text-content-tertiary block text-[11px]">Total Repository Files</span>
                <span className="font-semibold text-content-primary font-mono">
                  {files.length} files detected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: README Preview */}
        <div className="lg:col-span-8 bg-canvas-card border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3.5 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-orange" />
              README Documentation
            </span>
            <span className="text-[11px] font-mono text-content-tertiary">
              {readmeContent ? `${readmeContent.length} chars` : 'Missing'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 select-text">
            {renderedReadme ? (
              <div
                className="prose prose-sm max-w-none text-content-secondary leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderedReadme }}
              />
            ) : (
              <div className="py-16 text-center text-xs text-content-tertiary space-y-2">
                <HelpCircle className="w-6 h-6 text-content-muted mx-auto" />
                <p>No README.md file detected in the root of this repository.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviewer Compliance Checks */}
      <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
          Reviewer Compliance Checks
        </h3>
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage4_understands_code'])}
              onChange={() => handleCheckbox('stage4_understands_code')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Submitter demonstrates genuine comprehension of the project architecture
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage4_not_slop'])}
              onChange={() => handleCheckbox('stage4_not_slop')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Project is not unrefined single-prompt AI slop or an unmodified starter template
            </span>
          </label>
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
              placeholder="Reason for quality or AI concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`AI/Quality Concern: ${flagNote.trim()}`);
                }
                setIsFlagging(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0"
            >
              Confirm Flag
            </button>
            <button
              type="button"
              onClick={() => setIsFlagging(false)}
              className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsFlagging(true)}
            className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Flag AI / Quality Issue</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>Continue to Final Verdict Desk →</span>
        </button>
      </div>
    </div>
  );
};
