import React, { useMemo } from 'react';
import { marked } from 'marked';
import {
  Bot,
  CheckCircle,
  Cpu,
  FileQuestion,
  FileText,
  ShieldAlert,
  Sparkles,
  XOctagon,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';

interface AiQualityStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit: (reason: string) => void;
}

export const AiQualityStage: React.FC<AiQualityStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
}) => {
  const commits = gitHubData?.commits || [];
  const files = gitHubData?.files || [];
  const readmeContent = gitHubData?.readmeContent || '';

  // Render markdown safely
  const renderedReadme = useMemo(() => {
    if (!readmeContent) return null;
    try {
      return marked.parse(readmeContent) as string;
    } catch {
      return '<p class="text-rv-dim">Unable to render README markdown.</p>';
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

  const isHighAiRisk = aiIndicatorFiles.length > 0 || genericAiMessages.length >= 2;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rv-border shrink-0">
        <div>
          <h2 className="text-base font-bold text-rv-text flex items-center gap-2">
            <Cpu className="w-5 h-5 text-rv-accent" />
            Stage 4: AI & Quality Heuristics ({project.projectName})
          </h2>
          <p className="text-xs text-rv-dim mt-0.5">
            GitBook strictly bans single-prompt AI slop. Detect automated code generators, agent configs, and review project documentation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHighAiRisk ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> High AI Signals
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Organic Code Patterns
            </span>
          )}
        </div>
      </div>

      {/* AI Risk Alert Banner */}
      {isHighAiRisk && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-start justify-between gap-3 text-amber-300 shrink-0">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                ⚠️ Prominent AI Signals Detected
              </h4>
              <p className="text-xs mt-1 text-amber-300/90 leading-relaxed">
                Found {aiIndicatorFiles.length} agent config file(s) and {genericAiMessages.length} generic single-shot commit message(s). Check if submitter refined and deeply understands the code, or apply the 2/3 AI deflation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onEarlyExit(
                'Single-prompt unrefined AI slop without substantive human refinement (Violates GitBook AI policy).'
              )
            }
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            Reject: AI Slop
          </button>
        </div>
      )}

      {/* Heuristics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Agent Artifacts */}
        <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-1.5">
          <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-rv-accent" />
            Agent Artifacts
          </span>
          <div className="text-lg font-bold font-mono text-rv-text">
            {aiIndicatorFiles.length === 0 ? 'None Found' : `${aiIndicatorFiles.length} Detected`}
          </div>
          <p className="text-[11px] text-rv-dim">
            {aiIndicatorFiles.length > 0
              ? aiIndicatorFiles.map((f) => f.name).join(', ')
              : 'Zero .cursorrules or agent configs'}
          </p>
        </div>

        {/* Commit Message Heuristics */}
        <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-1.5">
          <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Generic LLM Commits
          </span>
          <div className="text-lg font-bold font-mono text-rv-text">
            {genericAiMessages.length} of {commits.length}
          </div>
          <p className="text-[11px] text-rv-dim">
            Commits with single-shot generated style messages
          </p>
        </div>

        {/* Documentation Quality */}
        <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-1.5">
          <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            README Status
          </span>
          <div className="text-lg font-bold font-mono text-rv-text">
            {readmeContent ? `${readmeContent.length.toLocaleString()} chars` : 'Missing'}
          </div>
          <p className="text-[11px] text-rv-dim">
            {readmeContent ? 'Comprehensive markdown docs' : 'No README.md found in repo root'}
          </p>
        </div>
      </div>

      {/* GitHub Pixel-Perfect README Viewer */}
      <div className="flex-1 min-h-[380px] rounded-xl bg-rv-surface border border-rv-border flex flex-col overflow-hidden shadow-lg">
        <div className="p-3 border-b border-rv-border bg-rv-surface2 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-rv-accent" />
            <span className="font-bold text-rv-text">README.md</span>
          </div>
          <span className="text-[11px] text-rv-dim">GitHub Markdown Renderer</span>
        </div>

        <div className="p-6 flex-1 overflow-y-auto select-text">
          {renderedReadme ? (
            <div
              className="readme-content"
              dangerouslySetInnerHTML={{ __html: renderedReadme }}
            />
          ) : (
            <div className="py-16 text-center text-xs text-rv-dim space-y-2">
              <FileQuestion className="w-8 h-8 mx-auto text-rv-muted" />
              <p>No README.md file found in repository root.</p>
            </div>
          )}
        </div>
      </div>

      {/* Advance Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-rv-border shrink-0">
        <button
          type="button"
          onClick={() => onEarlyExit('Unrefined AI slop without genuine human understanding')}
          className="px-3.5 py-2 rounded-lg bg-rv-surface2 border border-rv-border text-red-400 hover:bg-red-950/40 hover:border-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <XOctagon className="w-3.5 h-3.5" />
          <span>Reject for AI Slop</span>
        </button>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-rv-accent text-white hover:bg-rv-accent/90 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
        >
          <span>Pass AI & Go to Stage 5 (Verdict Desk) →</span>
        </button>
      </div>
    </div>
  );
};
