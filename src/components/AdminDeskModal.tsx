import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Check, ExternalLink, X, ShieldCheck, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPreapprovedQueue } from '../lib/api';
import { PreapprovedExportItem } from '../lib/types';

interface AdminDeskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminDeskModal: React.FC<AdminDeskModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [items, setItems] = useState<PreapprovedExportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPreapprovedQueue();
      setItems(res.items);
    } catch {
      toast.error('Failed to load pre-approved queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleCopy = (item: PreapprovedExportItem) => {
    navigator.clipboard.writeText(item.clipboardText);
    setCopiedId(item.projectId);
    toast.success(`Copied justification for ${item.projectName} to clipboard!`, {
      description: 'Ready to paste directly into Live Admin dashboard.',
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-rv-surface border border-rv-border rounded-xl p-6 shadow-2xl z-50 focus:outline-none max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-rv-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-rv-text">
                  Admin Clipboard Desk (2nd-Pass Queue)
                </Dialog.Title>
                <Dialog.Description className="text-xs text-rv-dim">
                  {items.length} projects pre-approved by first-pass reviewers. Click copy to grab the GitBook-compliant justification and paste into Live.
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

          <div className="py-4 flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-rv-dim">
                Loading pre-approved submissions...
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-xs text-rv-dim">
                No projects are currently in the pre-approved queue. Reviewers will populate this queue upon pre-approval.
              </div>
            ) : (
              items.map((item) => {
                const isCopied = copiedId === item.projectId;
                return (
                  <div
                    key={item.projectId}
                    className="p-4 rounded-lg bg-rv-surface2 border border-rv-border hover:border-rv-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-rv-text">
                            {item.projectName}
                          </h4>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rv-surface border border-rv-border text-rv-dim">
                            @{item.githubUsername}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.approvedHours}h Approved
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-rv-dim flex items-center gap-3 font-mono">
                          <a
                            href={item.codeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-rv-accent flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Code
                          </a>
                          <a
                            href={item.playableUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-rv-accent flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Demo
                          </a>
                          <span className="text-rv-muted">
                            Reviewed by: {item.reviewerName} &bull; {new Date(item.decidedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rv-accent text-white hover:bg-rv-accent/90'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy for Live Admin
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-3 p-2.5 rounded bg-rv-bg border border-rv-border font-mono text-[11px] text-rv-dim whitespace-pre-wrap max-h-28 overflow-y-auto">
                      {item.clipboardText}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t border-rv-border flex items-center justify-between">
            <span className="text-xs text-rv-dim flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Standardized format meets all Hack Club GitBook justification requirements.
            </span>
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-medium bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
