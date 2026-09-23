import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, ExternalLink, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getGitHubToken, setGitHubToken, getGitHubRateLimitInfo } from '../../lib/api';

interface GitHubTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubTokenModal: React.FC<GitHubTokenModalProps> = ({ isOpen, onClose }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [currentRateLimit, setCurrentRateLimit] = useState<{ limit: number; remaining: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTokenInput(getGitHubToken() || '');
      const info = getGitHubRateLimitInfo();
      if (info) {
        setCurrentRateLimit({ limit: info.limit, remaining: info.remaining });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setGitHubToken(null);
      toast.success('GitHub token cleared. Using unauthenticated access (60/hr).');
      onClose();
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${trimmed}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        const core = json.resources?.core;
        setGitHubToken(trimmed);
        toast.success(`Token verified! Rate limit: ${core.remaining} / ${core.limit} requests per hour.`);
        onClose();
      } else {
        toast.error(`Invalid GitHub token (HTTP ${res.status}). Please check your token.`);
      }
    } catch (err: any) {
      toast.error(`Verification failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setGitHubToken(null);
    setTokenInput('');
    toast.success('GitHub token removed.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-white">
        <div className="p-4 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#ff6b35]" />
            <h3 className="text-sm font-bold text-white">GitHub API Rate Limit Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#e4e4e7]">Current API Limit:</span>
              <span className="font-mono font-bold text-[#ff6b35]">
                {currentRateLimit ? `${currentRateLimit.remaining} / ${currentRateLimit.limit} req/hr` : getGitHubToken() ? '5,000 req/hr (Token Active)' : '60 req/hr (Unauthenticated)'}
              </span>
            </div>
            <p className="text-[#a1a1aa] leading-relaxed text-[11px]">
              Unauthenticated GitHub requests share a strict IP pool limit of 60 requests/hour. Supplying a Personal Access Token increases your quota to <strong>5,000 requests/hour</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-[#d4d4d8]">
              Personal Access Token (classic or fine-grained)
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder:text-[#71717a] font-mono text-xs focus:outline-none focus:border-[#ff6b35]"
            />
            <p className="text-[10px] text-[#71717a]">
              Saved only in your browser&apos;s local storage. No write permissions required.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-purple-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>How to create a free token</span>
            </div>
            <p className="leading-relaxed text-purple-200/80">
              Go to GitHub Settings → Developer Settings → Personal Access Tokens → Generate new token (classic). You do NOT need to check any scopes/checkboxes for public repositories.
            </p>
            <a
              href="https://github.com/settings/tokens/new?description=HackClubReviewerCockpit&scopes="
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#ff6b35] hover:underline font-semibold pt-1"
            >
              <span>Create Token on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#27272a]">
            {getGitHubToken() ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
              >
                Remove Token
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isTesting}
                className="px-4 py-1.5 rounded-lg bg-[#ff6b35] hover:bg-[#ea580c] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
