import React, { useState } from 'react';

interface UserInfoProps {
  displayName: string;
  githubOwner?: string;
  slackUserId?: string;
  repoUrl: string | null;
  playableUrl: string | null;
  readmeUrl?: string | null;
  hasReleases?: boolean;
  submittedHours: number;
  hackatimeTotalHours?: string;
  track: string;
  projectNote: string;
  onProjectNoteChange: (note: string) => void;
  userNote: string;
  onUserNoteChange: (note: string) => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  displayName,
  githubOwner,
  slackUserId,
  repoUrl,
  playableUrl,
  readmeUrl,
  hasReleases = false,
  submittedHours,
  hackatimeTotalHours,
  track,
  projectNote,
  onProjectNoteChange,
  userNote,
  onUserNoteChange,
}) => {
  const [projectNoteOpen, setProjectNoteOpen] = useState(Boolean(projectNote));
  const [userNoteOpen, setUserNoteOpen] = useState(Boolean(userNote));

  const resolvedReadmeUrl = readmeUrl || (repoUrl ? `${repoUrl.replace(/\/$/, '')}/blob/main/README.md` : null);
  const introspectUrl = `https://introspect.sahil.ink/?repo_url=${encodeURIComponent(repoUrl || '')}&hours=${submittedHours}`;

  return (
    <div className="p-4 select-text space-y-4">
      
      {/* Submitter Name Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-rv-text leading-tight">
            {displayName}
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase">
            {track}
          </span>
        </div>
        {githubOwner && (
          <p className="text-xs text-rv-dim mt-0.5 font-mono">
            @{githubOwner}
          </p>
        )}
      </div>

      {/* Real Tracked Hours Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-rv-surface2 border border-rv-border rounded-md p-2.5">
          <span className="text-[11px] text-rv-dim font-medium block">Claimed Time</span>
          <span className="text-base font-bold font-mono text-rv-text mt-0.5 block">
            {submittedHours.toFixed(1)}h
          </span>
        </div>

        <div className="bg-rv-surface2 border border-rv-border rounded-md p-2.5">
          <span className="text-[11px] text-rv-dim font-medium block">Hackatime Total</span>
          <span className="text-base font-bold font-mono text-rv-accent mt-0.5 block">
            {hackatimeTotalHours || '0h'}
          </span>
        </div>
      </div>

      {/* Slack DM Row (rendered ONLY if real Slack ID exists) */}
      {slackUserId && (
        <div className="text-[12px] text-rv-dim flex items-center gap-2">
          <a 
            href={`https://hackclub.slack.com/team/${slackUserId}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-rv-dim hover:text-rv-blue underline inline-flex items-center gap-1"
          >
            DM on Slack (@{slackUserId}) ↗
          </a>
        </div>
      )}

      {/* Quick Action Links Grid */}
      <div className="grid grid-cols-2 gap-2 [&_a]:flex [&_a]:items-center [&_a]:gap-1.5 [&_a]:text-[12px] [&_a]:font-medium [&_a]:py-1.5 [&_a]:px-3 [&_a]:border [&_a]:rounded-md [&_a]:transition-all [&_a]:duration-150 [&_a_svg]:w-3.5 [&_a_svg]:h-3.5">
        {repoUrl && (
          <a 
            href={repoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white border-rv-border text-rv-text hover:border-rv-accent hover:text-rv-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Code ↗
          </a>
        )}

        {playableUrl && (
          <a 
            href={playableUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Demo ↗
          </a>
        )}

        {resolvedReadmeUrl && (
          <a 
            href={resolvedReadmeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white border-rv-border text-rv-text hover:border-rv-accent hover:text-rv-accent"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            README ↗
          </a>
        )}

        {hasReleases && repoUrl && (
          <a 
            href={`${repoUrl}/releases`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-semibold"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            </svg>
            Releases ↗
          </a>
        )}

        <a 
          href={introspectUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-white border-rv-border text-rv-dim hover:text-rv-blue hover:border-rv-blue"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Introspect ↗
        </a>
      </div>

      <hr className="border-none border-t border-rv-border my-2" />

      {/* Notes — Project */}
      <div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rv-dim">
            Notes — Project
          </span>
          <button
            className="bg-transparent border border-rv-border text-rv-dim w-5 h-5 rounded text-xs cursor-pointer flex items-center justify-center hover:border-gray-400"
            onClick={() => setProjectNoteOpen(!projectNoteOpen)}
          >
            {projectNoteOpen ? '−' : '+'}
          </button>
        </div>
        {projectNoteOpen && (
          <div className="pt-1.5">
            <textarea
              className="w-full bg-white border border-rv-border rounded p-2 text-rv-text text-xs leading-relaxed min-h-[60px] focus:outline-none focus:border-rv-blue font-sans"
              value={projectNote}
              onChange={(e) => onProjectNoteChange(e.target.value)}
              placeholder="Notes about this project..."
            />
          </div>
        )}
      </div>

      {/* Notes — User */}
      <div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-rv-dim">
            Notes — User
          </span>
          <button
            className="bg-transparent border border-rv-border text-rv-dim w-5 h-5 rounded text-xs cursor-pointer flex items-center justify-center hover:border-gray-400"
            onClick={() => setUserNoteOpen(!userNoteOpen)}
          >
            {userNoteOpen ? '−' : '+'}
          </button>
        </div>
        {userNoteOpen && (
          <div className="pt-1.5">
            <textarea
              className="w-full bg-white border border-rv-border rounded p-2 text-rv-text text-xs leading-relaxed min-h-[60px] focus:outline-none focus:border-rv-blue font-sans"
              value={userNote}
              onChange={(e) => onUserNoteChange(e.target.value)}
              placeholder="Notes about this user..."
            />
          </div>
        )}
      </div>

    </div>
  );
};
