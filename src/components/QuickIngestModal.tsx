import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Zap, Clipboard, AlertTriangle, X, ArrowRight, Loader2 } from 'lucide-react';
import { quickIngestSingleProject } from '../lib/api';
import { CockpitProject } from '../lib/types';
import { toast } from 'sonner';

interface QuickIngestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (project: CockpitProject) => void;
}

export const QuickIngestModal: React.FC<QuickIngestModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setJsonInput(text.trim());
        setError(null);
        toast.info('Pasted JSON from clipboard');
      } else {
        toast.error('Clipboard is empty');
      }
    } catch (err: any) {
      toast.error('Could not access clipboard: ' + (err.message || 'Permission denied'));
    }
  };

  const handleIngest = async () => {
    setError(null);
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      setError('Please paste a JSON object first.');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setError('Invalid JSON syntax. Please verify the JSON string format.');
      return;
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        setError('Provided JSON array is empty.');
        return;
      }
      parsed = parsed[0];
    }

    if (!parsed || typeof parsed !== 'object') {
      setError('Expected a JSON object representing a project submission.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await quickIngestSingleProject(parsed);
      if (res.ok && res.project) {
        toast.success(`Ingested "${res.project.projectName}" into Pending!`);
        onSuccess(res.project);
        setJsonInput('');
        onOpenChange(false);
      } else {
        setError('Server did not return a valid project.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to ingest project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleIngest();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-canvas-card border border-border-subtle rounded-xl p-6 shadow-2xl z-50 focus:outline-none max-h-[90vh] flex flex-col text-content-primary">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-brand-orange/10 text-brand-orange">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-content-primary">
                  Quick Ingest Single Submission
                </Dialog.Title>
                <Dialog.Description className="text-xs text-content-tertiary">
                  Paste 1 project JSON. It will be added to the Pending queue and opened immediately in the review cockpit.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1 text-content-muted hover:text-content-primary rounded-md hover:bg-canvas-hover transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="py-4 flex-1 overflow-y-auto space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-content-secondary flex items-center gap-1.5">
                <span>Single Project JSON Object</span>
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-brand-orange hover:text-orange-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste from Clipboard</span>
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder={`{\n  "id": "recMeGSWsu10qIl4I",\n  "projectName": "Example Project",\n  "codeUrl": "https://github.com/...",\n  "playableUrl": "https://...",\n  "description": "...",\n  "submittedHours": 5,\n  "hackatimeId": "12345",\n  "githubUsername": "user"\n}`}
              rows={9}
              className="w-full bg-canvas-subtle border border-border-subtle rounded-lg p-3 text-xs font-mono text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange resize-none"
            />

            <div className="flex items-center justify-between text-[11px] text-content-muted">
              <span>Supports raw Airtable card JSON or normalized format</span>
              <span>Press <kbd className="px-1 py-0.5 rounded bg-canvas-card border border-border-subtle font-mono text-[10px]">Ctrl+Enter</kbd> to submit</span>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-2.5 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-medium bg-canvas-subtle border border-border-subtle text-content-secondary hover:text-content-primary hover:bg-canvas-hover transition-colors"
              >
                Cancel
              </button>
            </Dialog.Close>

            <button
              type="button"
              disabled={isSubmitting || !jsonInput.trim()}
              onClick={handleIngest}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-orange-600 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ingest & Open Cockpit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
