import React, { useEffect, useState } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchPreapprovedQueue } from '../../lib/api';
import { PreapprovedExportItem } from '../../lib/types';

interface AdminDeskPageProps {
  onBackToQueue: () => void;
}

export const AdminDeskPage: React.FC<AdminDeskPageProps> = ({ onBackToQueue }) => {
  const [items, setItems] = useState<PreapprovedExportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    loadData();
  }, []);

  const handleCopy = (item: PreapprovedExportItem) => {
    navigator.clipboard.writeText(item.clipboardText);
    setCopiedId(item.projectId);
    toast.success(`Copied justification for ${item.projectName} to clipboard!`, {
      description: 'Ready to paste directly into Live Admin dashboard.',
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden min-w-0">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border-subtle bg-canvas-subtle shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToQueue}
              className="p-1.5 rounded-lg bg-canvas-card border border-border-subtle text-content-tertiary hover:text-content-primary hover:bg-canvas-hover transition-colors"
              title="Return to queue (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-content-primary flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-semantic-success" />
                Admin Clipboard Desk
              </h1>
              <p className="text-sm text-content-tertiary mt-0.5">
                Submissions pre-approved by first-pass reviewers. Click copy to grab the GitBook-compliant justification and paste into Live.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Desk</span>
          </button>
        </div>
      </div>

      {/* Main Pre-Approved Submissions List */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {isLoading ? (
          <div className="py-24 text-center text-sm text-content-tertiary">
            Loading pre-approved submissions...
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center text-sm text-content-tertiary space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-content-muted" />
            <p className="font-semibold text-content-secondary text-base">
              No Projects in Pre-Approved Queue
            </p>
            <p className="max-w-md mx-auto text-xs text-content-tertiary">
              First-pass reviewers will populate this queue as they approve projects in Stage 6 of the review flow.
            </p>
            <button
              type="button"
              onClick={onBackToQueue}
              className="px-4 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-primary hover:bg-canvas-hover inline-flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go to Submissions Queue</span>
            </button>
          </div>
        ) : (
          items.map((item) => {
            const isCopied = copiedId === item.projectId;
            return (
              <div
                key={item.projectId}
                className="p-5 rounded-xl bg-canvas-card border border-border-subtle hover:border-border transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-content-primary">
                        {item.projectName}
                      </h3>
                      <span className="text-xs font-mono text-content-tertiary px-2 py-0.5 rounded bg-canvas border border-border-subtle">
                        @{item.githubUsername}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-semantic-successBg text-semantic-success border border-semantic-success/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.approvedHours} hrs Approved
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs font-mono text-content-tertiary">
                      <a
                        href={item.codeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-brand-orange flex items-center gap-1 text-content-secondary"
                      >
                        <ExternalLink className="w-3 h-3" /> Code Repo
                      </a>
                      <a
                        href={item.playableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-brand-orange flex items-center gap-1 text-content-secondary"
                      >
                        <ExternalLink className="w-3 h-3" /> Live Demo
                      </a>
                      <span className="text-content-muted">
                        Reviewer: {item.reviewerName} &bull; {new Date(item.decidedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-sm ${
                      isCopied
                        ? 'bg-semantic-success text-white'
                        : 'bg-brand-orange text-white hover:opacity-90'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied Justification!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy for Live Admin</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Formatted Justification Block */}
                <div className="p-3.5 rounded-lg bg-canvas border border-border-subtle font-mono text-xs text-content-secondary whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {item.clipboardText}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
