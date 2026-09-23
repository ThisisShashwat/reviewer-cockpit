import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  History,
  Send,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { saveProjectNote } from '../../lib/api';
import { AuditLogEntry, CockpitProject } from '../../lib/types';

interface ScratchpadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CockpitProject;
  auditHistory: AuditLogEntry[];
  onNoteAdded: (entry: AuditLogEntry) => void;
}

export const ScratchpadDrawer: React.FC<ScratchpadDrawerProps> = ({
  open,
  onOpenChange,
  project,
  auditHistory,
  onNoteAdded,
}) => {
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await saveProjectNote(project.id, noteText.trim(), 'reviewer');
      onNoteAdded(res.entry);
      setNoteText('');
      toast.success('Note appended to audit history');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-0 right-0 h-screen w-full max-w-md bg-canvas-card border-l border-border-subtle p-6 shadow-2xl z-50 focus:outline-none flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-brand-orange" />
              <Dialog.Title className="text-sm font-bold text-content-primary">
                Reviewer Scratchpad & History
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1 rounded-md text-content-tertiary hover:text-content-primary hover:bg-canvas-hover"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="py-4 flex-1 overflow-y-auto space-y-5 text-xs">
            {/* Submitter Quick Details */}
            <div className="p-3.5 rounded-lg bg-canvas border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-content-primary">
                  @{project.githubUsername}
                </span>
                <span className="font-mono text-content-muted text-[11px]">
                  {project.liveRecordId}
                </span>
              </div>
              <div className="flex items-center gap-3 text-content-tertiary font-mono">
                {project.hackatimeId && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-400" />
                    ID: {project.hackatimeId}
                  </span>
                )}
                <span>Requested: {project.submittedHours}h</span>
              </div>
            </div>

            {/* Submitter's Work Justification */}
            {project.overrideHoursJustification && (
              <div>
                <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block mb-1.5">
                  Submitter Justification
                </span>
                <div className="p-3 rounded-lg bg-canvas border border-border-subtle text-content-secondary leading-relaxed whitespace-pre-wrap">
                  {project.overrideHoursJustification}
                </div>
              </div>
            )}

            {/* Audit History Timeline */}
            <div>
              <span className="text-[11px] font-semibold text-content-muted uppercase tracking-wider block mb-1.5">
                Audit Timeline ({auditHistory.length})
              </span>
              <div className="space-y-2">
                {auditHistory.length === 0 ? (
                  <p className="text-content-muted py-2 italic">
                    No history entries recorded yet.
                  </p>
                ) : (
                  auditHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-content-tertiary">
                        <span className="font-semibold text-content-primary uppercase">
                          {entry.action.replace('_', ' ')}
                        </span>
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-content-secondary leading-snug">{entry.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Note Input */}
          <div className="pt-4 border-t border-border-subtle shrink-0">
            <form onSubmit={handleSaveNote} className="space-y-2">
              <label className="text-[11px] font-semibold text-content-muted uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-brand-orange" />
                Add Reviewer Note
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Private note for this submission..."
                  className="flex-1 bg-canvas border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand-orange"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !noteText.trim()}
                  className="p-2 rounded-lg bg-brand-orange text-white hover:opacity-90 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
