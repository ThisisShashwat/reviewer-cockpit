import React from 'react';
import { GitHubRepoData } from '../lib/types';
import { timeAgo, timeBetween } from '../lib/utils';

interface GitHubPanelProps {
  repo: Partial<GitHubRepoData>;
  repoUrl: string | null;
}

export const GitHubPanel: React.FC<GitHubPanelProps> = ({ repo, repoUrl }) => {
  const commits = repo.commits || [];

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-rv-surface select-text">
      {/* GitHub Header */}
      <div className="flex items-center justify-between px-4 py-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-rv-dim" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="text-[13px] text-rv-dim">GitHub</span>
        </div>
        {repoUrl && (
          <a
            className="text-[13px] font-bold text-rv-blue no-underline hover:underline truncate max-w-[200px]"
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {repo.fullName || repoUrl.replace('https://github.com/', '')} ↗
          </a>
        )}
      </div>

      <hr className="border-none border-t border-rv-border m-0 shrink-0" />

      {repo.isLoading ? (
        <div className="px-4 py-5 text-[13px] text-rv-dim text-center">Loading GitHub data...</div>
      ) : repo.error ? (
        <div className="px-4 py-3 text-[13px] text-[#e8a732] bg-[rgba(176,114,25,0.1)] rounded mx-3 my-2 text-center">
          {repo.error}
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="flex justify-evenly px-4 py-3 text-[13px] text-rv-dim border-b border-rv-border shrink-0">
            <div className="flex items-center gap-1.5" title="Stars">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <strong className="text-rv-text font-semibold">{repo.stars || 0}</strong>
            </div>
            <div className="flex items-center gap-1.5" title="Forks">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="6" r="3" />
                <line x1="12" y1="15" x2="12" y2="9" />
                <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9" />
              </svg>
              <strong className="text-rv-text font-semibold">{repo.fork ? 1 : 0}</strong>
            </div>
            <div className="flex items-center gap-1.5" title="Branch">
              <span className="text-[11px] font-mono text-rv-dim">branch:</span>
              <strong className="text-rv-text font-semibold font-mono text-[12px]">{repo.defaultBranch || 'main'}</strong>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex gap-4 px-4 py-2 text-[11px] text-rv-dim border-b border-rv-border shrink-0">
            <span>Created {timeAgo(repo.createdAt || '')}</span>
            <span>Pushed {timeAgo(repo.updatedAt || '')}</span>
          </div>

          {/* Commit List matching Horizons CommitList.svelte */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
            <span className="text-[14px] font-bold text-rv-text">Commits</span>
            <span className="bg-rv-red text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {commits.length}
            </span>
          </div>

          <div className="pb-2.5 overflow-y-auto flex-1 min-h-0">
            {commits.map((commit, i) => (
              <React.Fragment key={commit.sha}>
                <div className="px-4 py-2.5 hover:bg-white/[0.03] transition-all">
                  <div className="text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis mb-[3px] text-rv-text" title={commit.message}>
                    {commit.message}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-rv-dim">
                    <span className="w-[18px] h-[18px] rounded-full bg-rv-surface2 flex items-center justify-center text-[10px] font-bold text-rv-dim shrink-0">
                      {commit.author?.[0]?.toUpperCase() || '?'}
                    </span>
                    <span className="truncate max-w-[120px]">{commit.author}</span> ·
                    <span className="shrink-0">{timeAgo(commit.date)}</span>
                    <span className="ml-auto font-mono text-[11px] text-rv-dim">
                      {commit.shortSha}
                    </span>
                  </div>
                </div>

                {i < commits.length - 1 && (
                  <div className="flex items-center gap-2 px-4 text-rv-dim/60 border-b border-rv-divider my-0.5">
                    <div className="h-px flex-1 bg-rv-divider" />
                    <span className="text-[10px] font-medium tabular-nums">
                      {timeBetween(commit.date, commits[i + 1].date)} gap
                    </span>
                    <div className="h-px flex-1 bg-rv-divider" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
