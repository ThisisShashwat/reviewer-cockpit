import React, { useState } from 'react';
import {
  AlertTriangle,
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
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('unified');
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const commits = gitHubData?.commits || [];
  const totalAdditions = commits.reduce((acc, c) => acc + (c.additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.deletions || 0), 0);

  const isSingleCommitDump = commits.length === 1 && totalAdditions > 3000;
  const selectedCommit = commits.find((c) => c.sha === selectedCommitSha) || commits[0];

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
              Stage 3 of 5
            </span>
            <span className="text-xs text-content-tertiary">Git & Code Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Git Commit Progression & Differential Inspection
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm authentic incremental commit progression and inspect modified files to identify pre-made templates or copied starter packages.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-semantic-success font-semibold">
              +{totalAdditions.toLocaleString()} lines
            </span>
            <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-semantic-danger font-semibold">
              -{totalDeletions.toLocaleString()} lines
            </span>
          </div>

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

      {/* Single Commit Dump Notice */}
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
            <span className="text-[11px] font-mono text-content-tertiary">
              Click commit to inspect
            </span>
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
                    onClick={() => setSelectedCommitSha(c.sha)}
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

        {/* Right column: Selected Commit Inspector */}
        <div className="lg:col-span-7 bg-canvas-card border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
          {selectedCommit ? (
            <>
              <div className="p-3.5 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold font-mono text-content-primary block truncate">
                    Commit {selectedCommit.shortSha}: {selectedCommit.message}
                  </span>
                  <span className="text-[11px] text-content-tertiary">
                    {selectedCommit.author} committed on {selectedCommit.date ? new Date(selectedCommit.date).toLocaleString() : 'unknown date'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDiffViewMode(diffViewMode === 'unified' ? 'split' : 'unified')}
                    className="px-2 py-1 rounded bg-canvas-card border border-border-subtle text-[11px] font-mono text-content-secondary hover:text-content-primary"
                  >
                    {diffViewMode === 'unified' ? 'Unified' : 'Split'}
                  </button>
                  <a
                    href={selectedCommit.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-content-tertiary hover:text-content-primary"
                    title="Open on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Modified Files in Commit */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-content-tertiary block">
                  Files Changed ({selectedCommit.files?.length || 0})
                </span>

                {selectedCommit.files && selectedCommit.files.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedCommit.files.map((file: any, idx: number) => (
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
                ) : (
                  <div className="text-xs text-content-tertiary py-4">
                    Individual file list details unavailable for this commit.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-content-tertiary">
              Select a commit from the timeline on the left to inspect changed files.
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
              checked={Boolean(reviewChecklist['stage3_incremental_commits'])}
              onChange={() => handleCheckbox('stage3_incremental_commits')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Code shows meaningful incremental commits rather than a single pre-built code dump
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage3_dates_match'])}
              onChange={() => handleCheckbox('stage3_dates_match')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Commit timestamps correspond with tracked Hackatime heartbeats
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
              placeholder="Reason for git/commit concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`Git Concern: ${flagNote.trim()}`);
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
            <span>Flag Git Anomaly</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>Continue to AI & Quality →</span>
        </button>
      </div>
    </div>
  );
};
