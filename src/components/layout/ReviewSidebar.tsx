import React, { useState } from 'react';
import {
  ExternalLink,
  MessageSquare,
  Send,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { saveProjectNote } from '../../lib/api';
import { AuditLogEntry, CockpitProject } from '../../lib/types';
import { decodeHtmlEntities } from '../../lib/utils';

interface ReviewSidebarProps {
  project: CockpitProject;
  auditHistory: AuditLogEntry[];
  onNoteAdded: (entry: AuditLogEntry) => void;
  reviewChecklist: Record<string, boolean>;
}

export const ReviewSidebar: React.FC<ReviewSidebarProps> = ({
  project,
  auditHistory,
  onNoteAdded,
  reviewChecklist,
}) => {
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'code' | 'demo' | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await saveProjectNote(project.id, noteText.trim(), 'reviewer');
      onNoteAdded(res.entry);
      setNoteText('');
      toast.success('Note saved to project audit log');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const copyUrl = (url: string, type: 'code' | 'demo') => {
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    toast.success(`Copied ${type === 'code' ? 'repository' : 'demo'} link`);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const passedChecksCount = Object.values(reviewChecklist).filter((v) => v === true).length;
  const failedChecksCount = Object.values(reviewChecklist).filter((v) => v === false).length;
  const messages = (project as any).messages || [];

  return (
    <aside className="w-80 bg-canvas-card border-r border-border-subtle flex flex-col shrink-0 overflow-y-auto select-none">
      {/* Project Overview Card (Sleek Dark Console Aesthetic) */}
      <div className="p-5 border-b border-[#27272a] bg-[#121214] text-white space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight leading-snug truncate">
              {decodeHtmlEntities(project.projectName)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#a1a1aa] font-medium font-mono truncate">
                @{project.githubUsername}
              </span>
              <span
                className={`px-2 py-0.2 rounded text-[11px] font-mono uppercase font-semibold shrink-0 ${
                  project.projectType === 'hardware'
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                    : 'bg-blue-900/40 text-blue-300 border border-blue-500/30'
                }`}
              >
                {project.projectType}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase block tracking-wider">
              Claimed
            </span>
            <span className="text-base font-bold font-mono text-amber-400">
              {project.submittedHours} hrs
            </span>
          </div>
        </div>

        {/* Quick Links with Copy and Open (Supports up to 4+ Code, Demo, and Archive Links) */}
        <div className="space-y-1.5 pt-1">
          {/* Primary & Additional Code Repositories */}
          {(project.allCodeUrls && project.allCodeUrls.length > 0 ? project.allCodeUrls : [project.codeUrl].filter(Boolean)).map((cUrl, idx) => (
            <div key={`code-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileCode className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                <span className="font-mono text-[#d4d4d8] truncate text-[11px]" title={cUrl}>
                  {idx > 0 ? `Repo ${idx + 1}: ` : ''}{cUrl.replace('https://github.com/', '')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => copyUrl(cUrl, 'code')}
                  className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] cursor-pointer"
                  title="Copy Code URL"
                >
                  {copiedLink === 'code' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <a
                  href={cUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-[#a1a1aa] hover:text-brand-orange rounded hover:bg-[#27272a]"
                  title="Open Repository"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}

          {/* Primary & Additional Playable / Demo Links */}
          {(project.allPlayableUrls && project.allPlayableUrls.length > 0 ? project.allPlayableUrls : [project.playableUrl].filter(Boolean)).map((pUrl, idx) => (
            <div key={`demo-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-mono text-[#d4d4d8] truncate text-[11px]" title={pUrl}>
                  {idx > 0 ? `Demo ${idx + 1}: ` : ''}{pUrl.replace(/^https?:\/\//, '')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => copyUrl(pUrl, 'demo')}
                  className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] cursor-pointer"
                  title="Copy Demo URL"
                >
                  {copiedLink === 'demo' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <a
                  href={pUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-[#a1a1aa] hover:text-brand-orange rounded hover:bg-[#27272a]"
                  title="Open Demo in New Tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}

          {/* Archive URL if available */}
          {project.archiveUrl && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-mono text-[#d4d4d8] truncate text-[11px]" title={project.archiveUrl}>
                  Archive: {project.archiveUrl.replace(/^https?:\/\//, '')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <a
                  href={project.archiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-[#a1a1aa] hover:text-brand-orange rounded hover:bg-[#27272a]"
                  title="Open Archive Baseline"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discussion Messages Accordion */}
      {messages.length > 0 && (
        <div className="border-b border-border-subtle">
          <button
            type="button"
            onClick={() => setShowMessages(!showMessages)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-content-primary hover:bg-canvas-hover transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-brand-orange" />
              <span>Discussion Thread</span>
              <span className="px-1.5 py-0.2 rounded-full bg-canvas-subtle text-[11px] font-mono text-content-secondary">
                {messages.length}
              </span>
            </div>
            {showMessages ? (
              <ChevronUp className="w-4 h-4 text-content-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-content-tertiary" />
            )}
          </button>

          {showMessages && (
            <div className="p-3 bg-canvas space-y-2 max-h-48 overflow-y-auto text-xs">
              {messages.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    m.sender === 'Admin'
                      ? 'bg-blue-50/50 border-blue-200 text-blue-950'
                      : 'bg-canvas-card border-border-subtle text-content-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span>{m.sender}</span>
                    <span className="text-content-muted font-normal">
                      {m.sentAt ? new Date(m.sentAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checklist Progress Indicator */}
      <div className="p-4 border-b border-border-subtle space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-content-primary">
          <span>Review Checklist</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-emerald-600 font-bold">{passedChecksCount} passed</span>
            {failedChecksCount > 0 && (
              <span className="text-rose-600 font-bold">({failedChecksCount} flagged)</span>
            )}
          </div>
        </div>
        <div className="h-1.5 w-full bg-canvas-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-orange transition-all duration-300"
            style={{ width: `${Math.min(100, (passedChecksCount / 12) * 100)}%` }}
          />
        </div>
      </div>

      {/* Permanent Inline Reviewer Notes Composer */}
      <div className="p-4 border-b border-border-subtle space-y-2">
        <label className="text-xs font-semibold text-content-primary flex items-center justify-between">
          <span>Reviewer Notes</span>
          <span className="text-[11px] font-normal text-content-muted">Appended to audit log</span>
        </label>
        <form onSubmit={handleSaveNote} className="space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type observations, code checks, or concerns here..."
            rows={3}
            className="w-full bg-canvas border border-border-subtle rounded-lg p-2.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand-orange resize-none leading-relaxed"
          />
          <button
            type="submit"
            disabled={isSubmittingNote || !noteText.trim()}
            className="w-full py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle hover:bg-canvas-hover text-xs font-semibold text-content-primary flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3 h-3 text-brand-orange" />
            <span>Save Note</span>
          </button>
        </form>
      </div>

      {/* Audit History Timeline */}
      <div className="p-4 flex-1 overflow-y-auto space-y-2">
        <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider block">
          Recent Log History ({auditHistory.length})
        </span>

        {auditHistory.length === 0 ? (
          <p className="text-xs text-content-muted italic py-2">
            No history entries recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {auditHistory.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="p-2.5 rounded-lg bg-canvas border border-border-subtle text-xs space-y-0.5"
              >
                <div className="flex items-center justify-between text-[11px] text-content-muted font-mono">
                  <span className="font-semibold text-content-primary uppercase">
                    {entry.action.replace('_', ' ')}
                  </span>
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-content-secondary leading-snug">{entry.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
