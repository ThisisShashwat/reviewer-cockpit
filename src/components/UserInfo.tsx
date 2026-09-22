import React, { useState } from 'react';

interface UserInfoProps {
  displayName: string;
  slackUserId?: string;
  repoUrl: string | null;
  playableUrl: string | null;
  readmeUrl?: string | null;
  submittedHours: number;
  track: string;
  projectNote: string;
  onProjectNoteChange: (note: string) => void;
  userNote: string;
  onUserNoteChange: (note: string) => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  displayName,
  slackUserId = 'U08BE9Q0X',
  repoUrl,
  playableUrl,
  readmeUrl,
  submittedHours,
  track,
  projectNote,
  onProjectNoteChange,
  userNote,
  onUserNoteChange,
}) => {
  const [slackCopied, setSlackCopied] = useState(false);
  const [projectNoteOpen, setProjectNoteOpen] = useState(Boolean(projectNote));
  const [userNoteOpen, setUserNoteOpen] = useState(Boolean(userNote));

  const copySlackId = () => {
    navigator.clipboard.writeText(slackUserId);
    setSlackCopied(true);
    setTimeout(() => setSlackCopied(false), 1500);
  };

  const resolvedReadmeUrl = readmeUrl || (repoUrl ? `${repoUrl.replace(/\/$/, '')}/blob/main/README.md` : null);
  const airlockUrl = repoUrl ? `https://airlock.hackclub.com/?r=${encodeURIComponent(repoUrl)}` : null;
  const introspectUrl = `https://introspect.sahil.ink/?repo_url=${encodeURIComponent(repoUrl || '')}&hours=${submittedHours}`;

  return (
    <div className="p-4 select-text">
      {/* Submitter Name Header */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[18px] font-bold text-rv-text">{displayName}</span>
      </div>

      {/* Fraud & Trust Badges matching Horizons */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-green-500 text-green-500 bg-green-500/10">
          Fraud: passed
        </span>
        <span className="inline-flex items-center rounded-full border border-rv-border text-rv-dim px-2 py-0.5 text-[11px] font-medium font-mono">
          Track: {track.toUpperCase()}
        </span>
        <span className="inline-flex items-center rounded-full border border-rv-border text-rv-dim px-2 py-0.5 text-[11px] font-medium font-mono">
          Trust: 100
        </span>
      </div>

      {/* Slack DM Row */}
      <div className="text-[12px] text-rv-dim mb-3.5 flex items-center gap-2 flex-wrap">
        <a 
          href={`https://hackclub.slack.com/team/${slackUserId}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-rv-dim no-underline inline-flex items-center gap-1 transition-all duration-150 hover:text-rv-accent"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.5 2a2.5 2.5 0 0 0 0 5H17V4.5A2.5 2.5 0 0 0 14.5 2z" />
            <path d="M7 8.5a2.5 2.5 0 0 0 5 0V6H9.5A2.5 2.5 0 0 0 7 8.5z" />
            <path d="M9.5 22a2.5 2.5 0 0 0 0-5H7v2.5A2.5 2.5 0 0 0 9.5 22z" />
            <path d="M17 15.5a2.5 2.5 0 0 0-5 0V18h2.5a2.5 2.5 0 0 0 2.5-2.5z" />
          </svg>
          DM on Slack ↗
        </a>
        <span className="inline-flex items-center gap-1 text-rv-dim/80">
          <span>@{slackUserId}</span>
          <button
            type="button"
            onClick={copySlackId}
            title={slackCopied ? 'Copied!' : 'Copy Slack ID'}
            className="inline-flex items-center justify-center p-0.5 rounded text-rv-dim hover:text-rv-accent transition-colors duration-150 cursor-pointer"
          >
            {slackCopied ? (
              <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </span>
      </div>

      {/* 2-Column Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3.5 [&_a]:flex [&_a]:items-center [&_a]:gap-1.25 [&_a]:text-rv-dim [&_a]:no-underline [&_a]:text-[13px] [&_a]:font-medium [&_a]:py-1.5 [&_a]:px-3.5 [&_a]:border [&_a]:border-rv-border [&_a]:rounded-md [&_a]:transition-all [&_a]:duration-150 [&_a:hover]:text-rv-accent [&_a:hover]:border-rv-accent [&_a_svg]:w-3.5 [&_a_svg]:h-3.5">
        {repoUrl && (
          <a href={repoUrl} target="_blank" rel="noopener noreferrer">
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
            className="bg-[rgba(239,83,80,0.15)]! text-rv-red! border-[rgba(239,83,80,0.3)]! hover:bg-[rgba(239,83,80,0.25)]!"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Demo ↗
          </a>
        )}
        {resolvedReadmeUrl && (
          <a href={resolvedReadmeUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            README ↗
          </a>
        )}
        {airlockUrl && (
          <a href={airlockUrl} target="_blank" rel="noopener noreferrer" className="border-rv-accent! text-rv-accent! hover:bg-rv-tag-bg!">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Airlock ↗
          </a>
        )}
        <a href={introspectUrl} target="_blank" rel="noopener noreferrer" className="border-rv-accent! text-rv-accent! hover:bg-rv-tag-bg!">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Introspect ↗
        </a>
        {repoUrl && (
          <a 
            href={`${repoUrl}/releases`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="border-green-500/50! text-green-400! hover:bg-green-500/10!"
            title="View GitHub releases and precompiled binaries"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Releases ↗
          </a>
        )}
      </div>

      {/* Hours Breakdown */}
      <div className="flex items-center gap-1.5 text-[13px] mb-2 text-rv-text">
        <svg className="w-3.5 h-3.5 text-rv-dim shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <strong>{submittedHours.toFixed(1)}h</strong>
        <span className="text-rv-dim text-[12px]">submitted</span>
      </div>

      {/* Age / Country */}
      <div className="text-[13px] text-rv-text flex items-center gap-1.5 mb-3">
        <svg className="w-3.5 h-3.5 text-rv-dim shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="bg-rv-green-bg text-rv-green text-[11px] font-bold py-0.5 px-2 rounded-sm">17yo</span>
        <span className="bg-rv-tag-bg text-rv-accent text-[11px] font-bold py-0.5 px-2 rounded-sm">Verified Member</span>
      </div>

      <hr className="border-none border-t border-rv-border my-3" />

      {/* Notes — Project Section (Horizons style) */}
      <div className={projectNote.trim().length > 0 ? 'border-l-2 border-l-rv-accent bg-rv-accent/5' : ''}>
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] uppercase tracking-[0.8px] font-semibold ${projectNote.trim().length > 0 ? 'text-rv-accent' : 'text-rv-dim'}`}>
              Notes — Project
            </span>
            {projectNote.trim().length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-rv-accent/15 text-rv-accent border border-rv-accent/40">
                Has note
              </span>
            )}
          </div>
          <button
            className="bg-transparent border border-rv-border text-rv-dim w-[22px] h-[22px] rounded text-sm cursor-pointer flex items-center justify-center hover:text-rv-accent hover:border-rv-accent"
            onClick={() => setProjectNoteOpen(!projectNoteOpen)}
          >
            {projectNoteOpen ? '−' : '+'}
          </button>
        </div>
        {projectNoteOpen && (
          <div className="pb-2 pt-1">
            <textarea
              className="w-full bg-rv-bg border border-rv-border rounded-[6px] p-2.5 text-rv-text font-inherit text-[13px] leading-[1.6] resize-y min-h-[70px] focus:outline-none focus:border-rv-accent"
              value={projectNote}
              onChange={(e) => onProjectNoteChange(e.target.value)}
              placeholder="Notes about this project..."
            />
          </div>
        )}
      </div>

      <hr className="border-none border-t border-rv-border my-3" />

      {/* Notes — User Section (Horizons style) */}
      <div className={userNote.trim().length > 0 ? 'border-l-2 border-l-rv-accent bg-rv-accent/5' : ''}>
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] uppercase tracking-[0.8px] font-semibold ${userNote.trim().length > 0 ? 'text-rv-accent' : 'text-rv-dim'}`}>
              Notes — User
            </span>
            {userNote.trim().length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-rv-accent/15 text-rv-accent border border-rv-accent/40">
                Has note
              </span>
            )}
          </div>
          <button
            className="bg-transparent border border-rv-border text-rv-dim w-[22px] h-[22px] rounded text-sm cursor-pointer flex items-center justify-center hover:text-rv-accent hover:border-rv-accent"
            onClick={() => setUserNoteOpen(!userNoteOpen)}
          >
            {userNoteOpen ? '−' : '+'}
          </button>
        </div>
        {userNoteOpen && (
          <div className="pb-2 pt-1">
            <textarea
              className="w-full bg-rv-bg border border-rv-border rounded-[6px] p-2.5 text-rv-text font-inherit text-[13px] leading-[1.6] resize-y min-h-[70px] focus:outline-none focus:border-rv-accent"
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
