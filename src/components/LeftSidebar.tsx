import React, { useState } from 'react';
import {
  Clock,
  ExternalLink,
  History,
  MessageSquare,
  Send,
  Video,
  Hash,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { saveProjectNote } from '../lib/api';
import { AuditLogEntry, CockpitProject } from '../lib/types';

interface LeftSidebarProps {
  project: CockpitProject;
  auditHistory: AuditLogEntry[];
  onNoteAdded: (entry: AuditLogEntry) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  project,
  auditHistory,
  onNoteAdded,
}) => {
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await saveProjectNote(project.id, noteText.trim(), 'reviewer');
      onNoteAdded(res.entry);
      setNoteText('');
      toast.success('Internal note recorded in audit log');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const avatarUrl = project.githubUsername
    ? `https://github.com/${project.githubUsername}.png?size=96`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=${project.id}`;

  return (
    <aside className="w-80 bg-rv-surface border-r border-rv-border flex flex-col shrink-0 overflow-y-auto select-none">
      {/* Submitter Profile Header */}
      <div className="p-4 border-b border-rv-border bg-gradient-to-b from-rv-surface to-rv-surface2">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt={project.githubUsername || 'User'}
            className="w-12 h-12 rounded-full border-2 border-rv-border bg-rv-bg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${project.id}`;
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-rv-text truncate">
              {project.projectName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {project.githubUsername ? (
                <a
                  href={`https://github.com/${project.githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-rv-accent hover:underline flex items-center gap-1 truncate"
                >
                  <svg className="w-3 h-3 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  @{project.githubUsername}
                </a>
              ) : (
                <span className="text-xs text-rv-muted">Anonymous</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links & Contact */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 pt-2 border-t border-rv-border/50 text-[11px]">
          {project.hackatimeId && (
            <a
              href={`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(project.hackatimeId)}/stats`}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1.5 rounded bg-rv-surface border border-rv-border text-rv-dim hover:text-rv-text hover:border-rv-accent/50 flex items-center gap-1.5 transition-colors truncate"
              title="Inspect Raw Hackatime User Stats"
            >
              <Clock className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="truncate">{project.hackatimeId}</span>
            </a>
          )}

          <a
            href={`https://slack.hackclub.com`}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1.5 rounded bg-rv-surface border border-rv-border text-rv-dim hover:text-rv-text hover:border-rv-accent/50 flex items-center gap-1.5 transition-colors"
            title="Open Hack Club Slack"
          >
            <MessageSquare className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Slack Member</span>
          </a>
        </div>
      </div>

      {/* Submission Core Metadata */}
      <div className="p-4 border-b border-rv-border space-y-3 text-xs">
        <div className="flex items-center justify-between text-rv-dim">
          <span className="flex items-center gap-1.5 text-rv-muted">
            <Clock className="w-3.5 h-3.5" /> Requested Hours:
          </span>
          <span className="font-bold text-sm text-rv-text font-mono">
            {project.submittedHours} hrs
          </span>
        </div>

        {project.hackatimeProjects && (
          <div>
            <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider block mb-1">
              Tracked Project & Window
            </span>
            <div className="p-2 rounded bg-rv-bg border border-rv-border font-mono text-[11px] text-rv-dim break-words">
              {project.hackatimeProjects}
            </div>
          </div>
        )}

        {project.overrideHoursJustification && (
          <div>
            <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider block mb-1">
              Submitter's Justification
            </span>
            <div className="p-2 rounded bg-rv-bg border border-rv-border text-[11px] text-rv-dim max-h-24 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {project.overrideHoursJustification}
            </div>
          </div>
        )}

        {project.lapseLinks && project.lapseLinks.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider block mb-1">
              Timelapse Videos ({project.lapseLinks.length})
            </span>
            <div className="space-y-1">
              {project.lapseLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-1.5 rounded bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-accent hover:border-rv-accent/40 text-[11px] font-mono transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Video className="w-3 h-3 text-red-400 shrink-0" />
                    Lapse #{idx + 1}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-rv-border/60 flex items-center justify-between text-[11px] text-rv-muted">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" /> Live ID:
          </span>
          <span className="font-mono text-rv-dim">{project.liveRecordId}</span>
        </div>
      </div>

      {/* Append-Only Audit History Accordion */}
      <div className="border-b border-rv-border">
        <button
          type="button"
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-rv-text hover:bg-rv-surface2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-rv-accent" />
            <span>Audit History & Diffs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rv-surface2 border border-rv-border text-[10px] font-mono text-rv-dim">
              v{project.version} &bull; {auditHistory.length}
            </span>
          </div>
          {isHistoryExpanded ? (
            <ChevronUp className="w-4 h-4 text-rv-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-rv-muted" />
          )}
        </button>

        {isHistoryExpanded && (
          <div className="px-3.5 pb-3.5 space-y-2 max-h-56 overflow-y-auto">
            {auditHistory.length === 0 ? (
              <p className="text-[11px] text-rv-muted py-2 italic">
                No history entries recorded yet.
              </p>
            ) : (
              auditHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2 rounded bg-rv-bg border border-rv-border text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-rv-muted">
                    <span className="font-semibold text-rv-text uppercase tracking-wider">
                      {entry.action.replace('_', ' ')}
                    </span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-rv-dim leading-snug">{entry.summary}</p>
                  {entry.diffs && entry.diffs.length > 0 && (
                    <div className="pt-1 text-[10px] text-rv-muted space-y-0.5 font-mono">
                      {entry.diffs.map((d, i) => (
                        <div key={i} className="truncate">
                          <span className="text-rv-accent">{d.field}:</span>{' '}
                          <span className="line-through text-red-400/80">
                            {JSON.stringify(d.oldValue)}
                          </span>{' '}
                          →{' '}
                          <span className="text-emerald-400">
                            {JSON.stringify(d.newValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Internal Reviewer Scratchpad Notes */}
      <div className="p-3.5 mt-auto bg-rv-surface2/60 border-t border-rv-border">
        <form onSubmit={handleSaveNote} className="space-y-2">
          <label className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-rv-accent" />
            Reviewer Note
          </label>
          <div className="relative">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Private note (e.g. checked commit diff)..."
              className="w-full bg-rv-bg border border-rv-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-rv-text placeholder:text-rv-muted focus:outline-none focus:border-rv-accent"
            />
            <button
              type="submit"
              disabled={isSubmittingNote || !noteText.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-rv-accent hover:text-white disabled:opacity-30 disabled:hover:text-rv-accent"
              title="Save Note to Audit History"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
};
