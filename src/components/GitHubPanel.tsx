import React from 'react';
import { GitHubRepoData } from '../lib/types';
import { timeAgo } from '../lib/utils';

interface GitHubPanelProps {
  repo: Partial<GitHubRepoData>;
  repoUrl: string | null;
}

export const GitHubPanel: React.FC<GitHubPanelProps> = ({ repo, repoUrl }) => {
  return (
    <div className="flex flex-col min-h-0 bg-rv-surface select-text">
      {/* GitHub Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-rv-border">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-rv-dim" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="text-[13px] font-semibold text-rv-text">GitHub Stats</span>
        </div>
        {repoUrl && (
          <a
            className="text-[12px] font-semibold text-rv-blue hover:underline truncate max-w-[170px]"
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {repo.fullName || repoUrl.replace('https://github.com/', '')} ↗
          </a>
        )}
      </div>

      {repo.isLoading ? (
        <div className="px-4 py-4 text-xs text-rv-dim text-center">Loading GitHub data...</div>
      ) : repo.error ? (
        <div className="px-4 py-2.5 text-xs text-amber-800 bg-amber-50 rounded mx-3 my-2 text-center border border-amber-200">
          {repo.error}
        </div>
      ) : (
        <div className="p-3 space-y-3">
          
          {/* Stats Metrics 4-Box Row */}
          <div className="grid grid-cols-4 gap-1 text-center bg-rv-surface2 border border-rv-border rounded-md py-2 px-1">
            <div title="Stars">
              <span className="text-[10px] uppercase text-rv-dim block font-medium">Stars</span>
              <strong className="text-xs font-bold text-rv-text font-mono">{repo.stars ?? 0}</strong>
            </div>
            <div title="Forks">
              <span className="text-[10px] uppercase text-rv-dim block font-medium">Forks</span>
              <strong className="text-xs font-bold text-rv-text font-mono">{repo.forks ?? 0}</strong>
            </div>
            <div title="Open Issues">
              <span className="text-[10px] uppercase text-rv-dim block font-medium">Issues</span>
              <strong className="text-xs font-bold text-rv-text font-mono">{repo.openIssues ?? 0}</strong>
            </div>
            <div title="Default Branch">
              <span className="text-[10px] uppercase text-rv-dim block font-medium">Branch</span>
              <strong className="text-xs font-bold text-rv-text font-mono truncate block px-1">
                {repo.defaultBranch || 'main'}
              </strong>
            </div>
          </div>

          {/* Language & Timestamps */}
          <div className="flex items-center justify-between text-xs text-rv-dim px-1">
            <div className="flex items-center gap-1.5">
              {repo.language && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[11px] border border-amber-200">
                  {repo.language}
                </span>
              )}
              {repo.license && (
                <span className="text-[11px] text-gray-500 truncate max-w-[100px]">{repo.license}</span>
              )}
            </div>
            <span className="text-[11px]">
              Pushed {timeAgo(repo.pushedAt || '')}
            </span>
          </div>

          {/* Root Files Summary */}
          {repo.files && repo.files.length > 0 && (
            <div className="border-t border-rv-border pt-2.5">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-rv-dim font-semibold mb-1.5 px-1">
                <span>Repository Files ({repo.files.length})</span>
                <span className="text-[10px] font-mono text-gray-500">Root</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {repo.files.map((file) => (
                  <div key={file.path} className="flex items-center justify-between text-xs font-mono p-1.5 bg-rv-surface2 rounded border border-rv-border/70">
                    <span className="truncate max-w-[170px] text-rv-text">{file.name}</span>
                    <span className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
