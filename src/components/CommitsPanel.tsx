import React from 'react';
import { GitHubCommit } from '../lib/types';
import { timeAgo, timeBetween } from '../lib/utils';

interface CommitsPanelProps {
  commits: GitHubCommit[];
  repoUrl: string | null;
  loading?: boolean;
}

export const CommitsPanel: React.FC<CommitsPanelProps> = ({ commits, repoUrl, loading }) => {
  // Aggregate stats across all commits
  const totalAdditions = commits.reduce((acc, c) => acc + (c.additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.deletions || 0), 0);
  const isSingleCommit = commits.length === 1;

  // Calculate timespan
  const firstCommitDate = commits.length > 0 ? commits[commits.length - 1].date : null;
  const lastCommitDate = commits.length > 0 ? commits[0].date : null;
  const timespanText = firstCommitDate && lastCommitDate && commits.length > 1
    ? timeBetween(firstCommitDate, lastCommitDate)
    : null;

  return (
    <div className="h-full overflow-y-auto bg-rv-surface p-6 space-y-5 select-text">
      
      {/* 1. Commit Audit Summary Banner */}
      <div className="bg-rv-bg border border-rv-border rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-rv-text">
              Git Commit History ({commits.length})
            </span>
            {repoUrl && (
              <a
                href={`${repoUrl}/commits`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-rv-blue hover:underline"
              >
                View on GitHub ↗
              </a>
            )}
          </div>

          {/* Quick additions/deletions pills */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-green-500/10 text-green-700 font-bold border border-green-500/20">
              +{totalAdditions} lines
            </span>
            <span className="px-2 py-1 rounded bg-red-500/10 text-red-700 font-bold border border-red-500/20">
              -{totalDeletions} lines
            </span>
            <span className="px-2 py-1 rounded bg-gray-200 text-gray-800 font-bold border border-gray-300">
              Net: +{totalAdditions - totalDeletions}
            </span>
          </div>
        </div>

        {/* Audit Flag: Single Commit Dump vs Iterative Development */}
        {isSingleCommit ? (
          <div className="flex items-center gap-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 font-medium">
            <svg className="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>Single Commit Repository:</strong> All code was pushed in a single commit. Verify keystrokes in Hackatime or Timelapse to ensure code wasn't imported from an external template.
            </span>
          </div>
        ) : commits.length > 1 ? (
          <div className="flex items-center gap-2 p-2.5 rounded bg-green-500/10 border border-green-500/30 text-xs text-green-800 font-medium">
            <svg className="w-4 h-4 text-green-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              <strong>Iterative Progression:</strong> Verified {commits.length} commits {timespanText ? `spanning ${timespanText}` : ''} showing progressive, multi-step development.
            </span>
          </div>
        ) : null}
      </div>

      {/* 2. Detailed Commit List */}
      {loading ? (
        <div className="text-center py-12 text-rv-dim text-sm">
          Loading commit tree and diff statistics...
        </div>
      ) : commits.length === 0 ? (
        <div className="text-center py-12 text-rv-dim text-sm italic">
          No commits found in repository.
        </div>
      ) : (
        <div className="space-y-3">
          {commits.map((commit, index) => (
            <React.Fragment key={commit.sha}>
              <div className="bg-rv-surface2 border border-rv-border rounded-lg p-4 space-y-3 hover:border-gray-400 transition-colors">
                
                {/* Commit Header & Title (Clickable!) */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <a
                      href={commit.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-rv-text hover:text-rv-blue flex items-center gap-1.5 leading-snug group"
                    >
                      <span>{commit.message}</span>
                      <span className="text-xs text-rv-blue opacity-80 group-hover:opacity-100">↗</span>
                    </a>

                    <div className="flex items-center gap-2 text-xs text-rv-dim flex-wrap">
                      <span className="font-semibold text-rv-text">{commit.author}</span>
                      <span>·</span>
                      <span>{timeAgo(commit.date)}</span>
                      <span>·</span>
                      <span className="text-[11px] text-gray-500">{new Date(commit.date).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {commit.additions !== undefined && (
                      <span className="text-xs font-mono font-bold text-green-700 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                        +{commit.additions}
                      </span>
                    )}
                    {commit.deletions !== undefined && commit.deletions > 0 && (
                      <span className="text-xs font-mono font-bold text-red-700 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        -{commit.deletions}
                      </span>
                    )}
                    <a
                      href={commit.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs bg-rv-bg border border-rv-border text-rv-dim px-2 py-0.5 rounded hover:text-rv-blue hover:border-rv-blue"
                      title="Open commit on GitHub"
                    >
                      {commit.shortSha} ↗
                    </a>
                  </div>
                </div>

                {/* Modified Files in this Commit */}
                {commit.files && commit.files.length > 0 && (
                  <div className="pt-2 border-t border-rv-border/60">
                    <div className="text-[11px] uppercase tracking-wider text-rv-dim font-semibold mb-1.5">
                      Modified Files ({commit.files.length})
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {commit.files.map(f => (
                        <div key={f.filename} className="text-xs flex items-center justify-between font-mono bg-rv-bg px-2.5 py-1 rounded border border-rv-border">
                          <span className="text-rv-text truncate max-w-md">{f.filename}</span>
                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            <span className="text-gray-500 capitalize">{f.status}</span>
                            {f.additions > 0 && <span className="text-green-600 font-semibold">+{f.additions}</span>}
                            {f.deletions > 0 && <span className="text-red-600 font-semibold">-{f.deletions}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Time Gap Divider between commits */}
              {index < commits.length - 1 && (
                <div className="flex items-center gap-3 px-6 py-0.5 text-rv-dim text-xs">
                  <div className="h-px flex-1 bg-rv-border" />
                  <span className="font-mono text-[11px] text-gray-500">
                    {timeBetween(commit.date, commits[index + 1].date)} gap
                  </span>
                  <div className="h-px flex-1 bg-rv-border" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

    </div>
  );
};
