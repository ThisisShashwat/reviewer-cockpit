import React, { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import {
  AlertOctagon,
  ExternalLink,
  FileCode,
  GitCommit,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';

interface CommitsDiffsStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit: (reason: string) => void;
}

export const CommitsDiffsStage: React.FC<CommitsDiffsStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
}) => {
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('unified');

  const commits = gitHubData?.commits || [];
  const totalAdditions = commits.reduce((acc, c) => acc + (c.additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.deletions || 0), 0);

  const isSingleCommitDump = commits.length === 1 && totalAdditions > 3000;

  const selectedCommit = commits.find((c) => c.sha === selectedCommitSha) || commits[0];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rv-border shrink-0">
        <div>
          <h2 className="text-base font-bold text-rv-text flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-rv-accent" />
            Stage 3: Git History & Differential Code Inspection
          </h2>
          <p className="text-xs text-rv-dim mt-0.5">
            Verify iterative commit progression and inspect changed files to weed out pre-made templates and unrefined code dumps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              +{totalAdditions.toLocaleString()} lines
            </span>
            <span className="px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 font-bold">
              -{totalDeletions.toLocaleString()} lines
            </span>
          </div>

          <a
            href={`${project.codeUrl}/commits`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-rv-surface2 border border-rv-border text-xs font-semibold text-rv-text hover:bg-rv-surface3 flex items-center gap-1.5 transition-colors"
          >
            <span>GitHub Commits</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Single Commit Dump Alert */}
      {isSingleCommitDump && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 flex items-start justify-between gap-3 text-red-300 shrink-0">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-200">
                🚨 Massive Single-Commit Dump Detected ({totalAdditions.toLocaleString()} lines in 1 commit)
              </h4>
              <p className="text-xs mt-1 text-red-300/90 leading-relaxed">
                Repository contains only one commit with over 3,000 lines of code. This strongly indicates copied starter code or pre-existing projects rather than iterative creation during the program.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onEarlyExit(
                `Single-Commit Mega-Dump: ${totalAdditions.toLocaleString()} lines committed all at once with zero iterative progression.`
              )
            }
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            Reject: Single Dump
          </button>
        </div>
      )}

      {/* Main Commit Explorer: 2-Column (Timeline List + Selected Commit Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[480px]">
        {/* Left Column: Commit Timeline */}
        <div className="lg:col-span-5 rounded-xl bg-rv-surface border border-rv-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-rv-border bg-rv-surface2 flex items-center justify-between text-xs">
            <span className="font-bold text-rv-text uppercase tracking-wider text-[11px]">
              Recent Commits ({commits.length})
            </span>
            <span className="text-[11px] text-rv-dim">Click commit to inspect files</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-rv-border/50">
            {commits.length === 0 ? (
              <div className="p-6 text-center text-xs text-rv-dim">
                No commits found or repository private.
              </div>
            ) : (
              commits.map((c) => {
                const isSelected = selectedCommit?.sha === c.sha;
                return (
                  <button
                    key={c.sha}
                    type="button"
                    onClick={() => setSelectedCommitSha(c.sha)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-rv-accent/15 border-l-4 border-l-rv-accent'
                        : 'hover:bg-rv-surface2/60'
                    }`}
                  >
                    <GitCommit
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isSelected ? 'text-rv-accent' : 'text-rv-muted'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-rv-text truncate">
                        {c.message || 'No commit message'}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-rv-dim font-mono">
                        <span className="text-rv-accent">{c.shortSha}</span>
                        <span>&bull;</span>
                        <span className="truncate">{c.author}</span>
                        <span>&bull;</span>
                        <span>{new Date(c.date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono shrink-0 flex items-center gap-1.5">
                      <span className="text-emerald-400">+{c.additions || 0}</span>
                      <span className="text-red-400">-{c.deletions || 0}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Diff Inspector */}
        <div className="lg:col-span-7 rounded-xl bg-rv-surface border border-rv-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-rv-border bg-rv-surface2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-rv-text">
                Commit {selectedCommit?.shortSha || 'Details'}
              </span>
              {selectedCommit?.htmlUrl && (
                <a
                  href={selectedCommit.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rv-accent hover:underline flex items-center gap-1 text-[11px]"
                >
                  GitHub <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-1 bg-rv-surface rounded-lg p-0.5 border border-rv-border">
              <button
                type="button"
                onClick={() => setDiffViewMode('unified')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  diffViewMode === 'unified' ? 'bg-rv-accent text-white' : 'text-rv-dim'
                }`}
              >
                Unified
              </button>
              <button
                type="button"
                onClick={() => setDiffViewMode('split')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  diffViewMode === 'split' ? 'bg-rv-accent text-white' : 'text-rv-dim'
                }`}
              >
                Split
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {selectedCommit ? (
              <>
                <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border space-y-1">
                  <h4 className="text-xs font-bold text-rv-text">
                    {selectedCommit.message}
                  </h4>
                  <p className="text-[11px] text-rv-dim font-mono">
                    Author: {selectedCommit.author} &bull; Date: {new Date(selectedCommit.date).toLocaleString()}
                  </p>
                </div>

                {/* Changed Files List */}
                <div>
                  <h5 className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider mb-2">
                    Changed Files ({selectedCommit.files?.length || 0})
                  </h5>
                  <div className="space-y-1.5">
                    {(selectedCommit.files || []).map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-rv-bg border border-rv-border flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-3.5 h-3.5 text-rv-accent shrink-0" />
                          <span className="text-rv-text truncate">{file.filename}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                          <span className="text-emerald-400">+{file.additions}</span>
                          <span className="text-red-400">-{file.deletions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Diff Preview Box */}
                <div className="rounded-lg overflow-hidden border border-rv-border text-xs">
                  <ReactDiffViewer
                    oldValue="// Previous commit state\nconst app = initialize();"
                    newValue={`// Commit: ${selectedCommit.message}\nconst app = initialize();\n// Changes: +${selectedCommit.additions} -${selectedCommit.deletions} lines\napp.start();`}
                    splitView={diffViewMode === 'split'}
                    useDarkTheme={true}
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#121212',
                          diffViewerColor: '#f4f4f5',
                          addedBackground: '#064e3b',
                          addedColor: '#a7f3d0',
                          removedBackground: '#7f1d1d',
                          removedColor: '#fecaca',
                          wordAddedBackground: '#047857',
                          wordRemovedBackground: '#991b1b',
                          gutterBackground: '#18181b',
                          gutterBackgroundDark: '#18181b',
                          highlightBackground: '#2a2a2a',
                          highlightGutterBackground: '#2a2a2a',
                        },
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-rv-dim">
                Select a commit on the left to inspect file changes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advance Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-rv-border shrink-0">
        <button
          type="button"
          onClick={() => onEarlyExit('Single-commit boilerplate code dump')}
          className="px-3.5 py-2 rounded-lg bg-rv-surface2 border border-rv-border text-red-400 hover:bg-red-950/40 hover:border-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Flag Code Dump</span>
        </button>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-rv-accent text-white hover:bg-rv-accent/90 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
        >
          <span>Pass Commits & Go to Stage 4 (AI & Quality) →</span>
        </button>
      </div>
    </div>
  );
};
