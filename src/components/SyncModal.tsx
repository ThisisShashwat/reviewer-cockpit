import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RefreshCw, Upload, CheckCircle, AlertTriangle, X, Database } from 'lucide-react';
import { syncProjectsFromLive } from '../lib/api';

interface SyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  open,
  onOpenChange,
  onSyncComplete,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    processed: number;
    created: number;
    updated: number;
    unchanged: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setError(null);
    setResult(null);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setError('Invalid JSON. Please ensure your payload is valid JSON (array of submissions or { records: [...] }).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await syncProjectsFromLive(parsed);
      setResult(res);
      onSyncComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to sync with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSampleDump = async () => {
    setError(null);
    try {
      // Load seed from server
      const res = await fetch('/data/seed.json').catch(() => null);
      if (res && res.ok) {
        const text = await res.text();
        setJsonInput(text);
        return;
      }
    } catch {
      // fallback
    }

    // Default sample if file route not directly exposed by static server
    setJsonInput(
      JSON.stringify(
        [
          {
            id: `rec_live_${Date.now().toString().slice(-4)}`,
            projectName: 'New Live Submission',
            codeUrl: 'https://github.com/hackclub/sprig',
            playableUrl: 'https://sprig.hackclub.com',
            description: 'Custom tile engine game built with TypeScript and Sprig web hardware simulator.',
            githubUsername: 'sprig-builder',
            overrideHours: 10.5,
            overrideHoursJustification: '10.5 hours tracked in Hackatime on custom Sprig audio synth and collision engine.',
            hackatimeId: 'sprig_builder',
            hackatimeProjects: 'sprig-game',
            lapseLinks: ['https://lapse.hackclub.com/video/sprig_game.mp4'],
            approved: false,
            reviewStatus: 'Pending',
          },
        ],
        null,
        2
      )
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-rv-surface border border-rv-border rounded-xl p-6 shadow-2xl z-50 focus:outline-none max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-rv-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rv-accent/10 text-rv-accent">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-rv-text">
                  Sync Submissions from Live
                </Dialog.Title>
                <Dialog.Description className="text-xs text-rv-dim">
                  Paste JSON dump exported from Live Admin. Changes are appended to history without overwriting.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1 text-rv-dim hover:text-rv-text rounded-md hover:bg-rv-surface2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="py-4 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-rv-text flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-rv-accent" />
                Raw JSON Dump
              </label>
              <button
                type="button"
                onClick={loadSampleDump}
                className="text-xs text-rv-accent hover:underline font-medium"
              >
                + Load Sample Payload
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON array of submissions or Airtable dump { records: [...] } here..."
              rows={10}
              className="w-full bg-rv-bg border border-rv-border rounded-lg p-3 text-xs font-mono text-rv-text placeholder:text-rv-muted focus:outline-none focus:border-rv-accent resize-none"
            />

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-2.5 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-start gap-2.5 text-emerald-300 text-xs">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Sync Completed Successfully</p>
                  <p className="mt-1 text-[11px] text-emerald-200">
                    Processed {result.processed} items &bull; {result.created} created &bull; {result.updated} updated with diffs &bull; {result.unchanged} unchanged
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-rv-border flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-medium bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3"
              >
                Cancel
              </button>
            </Dialog.Close>

            <button
              type="button"
              disabled={isSubmitting || !jsonInput.trim()}
              onClick={handleSync}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-rv-accent text-white hover:bg-rv-accent/90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ingest & Compute Diffs
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
