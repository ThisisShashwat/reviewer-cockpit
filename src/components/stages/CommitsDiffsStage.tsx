import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileCode,
  GitCommit,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';

interface CommitsDiffsStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
}

export const CommitsDiffsStage: React.FC<CommitsDiffsStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'files' | 'ai'>('files');
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const commits = gitHubData?.commits || [];
  const files = gitHubData?.files || [];
  const totalAdditions = commits.reduce((acc, c) => acc + (c.additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.deletions || 0), 0);

  const isSingleCommitDump = commits.length === 1 && totalAdditions > 3000;
  const selectedCommit = commits.find((c) => c.sha === selectedCommitSha) || commits[0];

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
            <span className="text-xs text-content-tertiary">Code History & Integrity Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Git Commits Progression & AI Heuristics
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm authentic incremental development progression across commits, inspect changed files, and evaluate AI generation signals.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasAiIndicators ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> AI Signals Present
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-semantic-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Organic Code Patterns
            </span>
          )}

          <a
            href={`${project.codeUrl}/commits`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>GitHub Commits</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Warnings & Notices */}
      {isSingleCommitDump && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-semibold block text-amber-950">
              Single-Commit Package Dump Detected ({totalAdditions.toLocaleString()} lines)
            </span>
            <span>
              Repository contains only one commit with over 3,000 lines. Verify whether this code was generated in one shot, cloned from a template, or represents true manual work.
            </span>
          </div>
        </div>
      )}

      {/* Commit Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[440px]">
        {/* Left column: Commits Timeline */}
        <div className="lg:col-span-5 bg-canvas-card border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3.5 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-brand-orange" />
              Commit Timeline ({commits.length})
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-semantic-success font-semibold">+{totalAdditions}</span>
              <span className="text-semantic-danger font-semibold">-{totalDeletions}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {commits.length === 0 ? (
              <div className="p-8 text-center text-xs text-content-tertiary">
                No recent commits retrieved or repository is empty.
              </div>
            ) : (
              commits.map((c) => {
                const isSelected = selectedCommit?.sha === c.sha;
                return (
                  <button
                    key={c.sha}
                    type="button"
                    onClick={() => {
                      setSelectedCommitSha(c.sha);
                      setActiveInspectorTab('files');
                    }}
                    className={`w-full text-left p-3.5 transition-colors block ${
                      isSelected
                        ? 'bg-canvas-hover border-l-2 border-l-brand-orange'
                        : 'hover:bg-canvas-hover/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-content-primary truncate">
                        {c.shortSha}
                      </span>
                      <span className="text-[11px] text-content-tertiary">
                        {c.date ? new Date(c.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-content-secondary line-clamp-2 mt-1">
                      {c.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-content-tertiary">
                      <span>{c.author}</span>
                      <span>·</span>
                      <span className="text-semantic-success">+{c.additions}</span>
                      <span className="text-semantic-danger">-{c.deletions}</span>
                      <span>·</span>
                      <span>{c.files?.length || 0} files</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Inspector with Files & AI Heuristics Tabs */}
        <div className="lg:col-span-7 bg-canvas-card border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center bg-canvas-card border border-border-subtle rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('files')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeInspectorTab === 'files'
                    ? 'bg-canvas-subtle text-content-primary font-semibold shadow-sm'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
              >
                Changed Files ({selectedCommit?.files?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('ai')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                  activeInspectorTab === 'ai'
                    ? 'bg-canvas-subtle text-content-primary font-semibold shadow-sm'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
              >
                <Cpu className="w-3 h-3 text-brand-orange" />
                <span>AI Signals</span>
                {hasAiIndicators && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            </div>

            {selectedCommit && (
              <a
                href={selectedCommit.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-content-secondary hover:text-brand-orange flex items-center gap-1 font-mono"
              >
                <span>Commit {selectedCommit.shortSha}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {activeInspectorTab === 'files' ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedCommit ? (
                <>
                  <div className="pb-2 border-b border-border-subtle">
                    <span className="text-xs font-semibold text-content-primary block">
                      {selectedCommit.message}
                    </span>
                    <span className="text-[11px] text-content-tertiary">
                      {selectedCommit.author} committed on {selectedCommit.date ? new Date(selectedCommit.date).toLocaleString() : ''}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {(selectedCommit.files || []).map((file: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-canvas-subtle border border-border-subtle text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="w-3.5 h-3.5 text-content-tertiary shrink-0" />
                          <span className="font-mono text-content-primary truncate text-[11px]">
                            {file.filename}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                          <span className="text-semantic-success">+{file.additions}</span>
                          <span className="text-semantic-danger">-{file.deletions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-content-tertiary">
                  Select a commit from the timeline on the left to inspect changed files.
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-content-primary block">
                  AI & Scaffold Indicators
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-canvas-subtle border border-border-subtle">
                    <span className="text-[11px] text-content-tertiary block">Assistant Config Files</span>
                    <span className="font-semibold text-content-primary mt-1 block">
                      {aiIndicatorFiles.length > 0
                        ? aiIndicatorFiles.map((f) => f.name).join(', ')
                        : 'None detected'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas-subtle border border-border-subtle">
                    <span className="text-[11px] text-content-tertiary block">Generic Commit Patterns</span>
                    <span className="font-semibold text-content-primary mt-1 block">
                      {genericAiMessages.length} of {commits.length} commits
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-canvas-subtle border border-border-subtle text-xs text-content-secondary leading-relaxed">
                <p className="font-semibold text-content-primary mb-1">GitBook AI Policy Guideline:</p>
                Using AI assistants (Copilot, Cursor, Claude) is permitted provided the submitter actively guides and understands the architecture. If a project consists of an unrefined single-prompt scaffold without iterative debugging, apply deflation during final verdict.
              </div>
            </div>
          )}
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
              checked={Boolean(reviewChecklist['stage4_incremental_commits'])}
              onChange={() => handleCheckbox('stage4_incremental_commits')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Commit log demonstrates meaningful iterative development rather than a single pre-made dump
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage4_understands_code'])}
              onChange={() => handleCheckbox('stage4_understands_code')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Code shows original implementation logic and is not unrefined single-prompt AI slop
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
              placeholder="Reason for code or AI concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`Code Concern: ${flagNote.trim()}`);
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
            <span>Flag Code Anomaly</span>
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
