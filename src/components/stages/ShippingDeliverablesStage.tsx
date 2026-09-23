import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Laptop,
  PackageCheck,
  RefreshCw,
  Smartphone,
  Info,
  Code,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';

interface ShippingDeliverablesStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
}

export const ShippingDeliverablesStage: React.FC<ShippingDeliverablesStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const playableUrl = (project.playableUrl || '').trim();
  const codeUrl = (project.codeUrl || '').trim();

  // Host rule checks
  const isStreamlit = playableUrl.includes('streamlit.app');
  const isReplit = playableUrl.includes('replit.com') || playableUrl.includes('replit.dev');
  const isGoogleDrive = playableUrl.includes('drive.google.com');
  const isDuplicateCodeAndDemo =
    playableUrl.length > 0 &&
    codeUrl.length > 0 &&
    playableUrl.toLowerCase() === codeUrl.toLowerCase();

  const releases = gitHubData?.releases || [];
  const hasBinaryReleases = releases.some((r) => r.assets && r.assets.length > 0);

  // GitHub iframe CSP safety: NEVER iframe a GitHub URL
  const isGitHubUrl = playableUrl.includes('github.com');

  const isProhibitedHost = isStreamlit || isReplit || isGoogleDrive;
  const prohibitedReason = isStreamlit
    ? 'Streamlit.app apps sleep upon inactivity. GitBook rules require persistent hosting or video demo.'
    : isReplit
    ? 'Replit apps shut down upon inactivity. GitBook rules require persistent hosting or video demo.'
    : isGoogleDrive
    ? 'Google Drive is disallowed for video demos. Use YouTube, Vimeo, or a direct web video.'
    : undefined;

  // Video embeds
  const isYouTube = playableUrl.includes('youtube.com') || playableUrl.includes('youtu.be');
  const isDirectVideo = playableUrl.endsWith('.mp4') || playableUrl.endsWith('.webm');

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const handleCheckbox = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 2 of 5
            </span>
            <span className="text-xs text-content-tertiary">Deliverables Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Shipping & Playable Deliverable Inspector
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Test the live playable project, inspect attached release binaries, and confirm compliance with host stability rules.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isGitHubUrl && !isYouTube && (
            <div className="flex items-center bg-canvas-card border border-border-subtle rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded-md ${
                  viewportMode === 'desktop'
                    ? 'bg-canvas-subtle text-brand-orange'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
                title="Desktop Viewport"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded-md ${
                  viewportMode === 'mobile'
                    ? 'bg-canvas-subtle text-brand-orange'
                    : 'text-content-tertiary hover:text-content-primary'
                }`}
                title="Mobile Viewport"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {playableUrl && (
            <a
              href={playableUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Host Rule Warning Card */}
      {isProhibitedHost && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-semibold block text-amber-950">
              Host Guidelines Notice: {playableUrl}
            </span>
            <span>{prohibitedReason}</span>
          </div>
        </div>
      )}

      {/* Criterion #10 Notice (Playable equals Code URL) */}
      {isDuplicateCodeAndDemo && !hasBinaryReleases && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shrink-0">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-semibold block text-amber-950">
              Criterion #10: Playable URL Points to Repository
            </span>
            <span>
              The playable demo link matches the code repository and no release binaries were detected. If this is a desktop/CLI tool, verify that the README has clear compilation steps or a demo video.
            </span>
          </div>
        </div>
      )}

      {/* Verified GitHub Releases Card */}
      {releases.length > 0 && (
        <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-semantic-success" />
              Verified GitHub Release Assets ({releases[0].tagName})
            </h3>
            <span className="text-[11px] font-mono text-semantic-success font-medium">
              Desktop / CLI Distribution
            </span>
          </div>

          <div className="space-y-1.5">
            {releases[0].assets.map((asset, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-canvas-subtle border border-border-subtle text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Download className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                  <span className="font-mono font-medium text-content-primary truncate">
                    {asset.name}
                  </span>
                  <span className="text-[11px] font-mono text-content-tertiary">
                    {(asset.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <a
                  href={asset.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-canvas-card border border-border-subtle text-[11px] text-brand-orange hover:text-orange-600 transition-colors shrink-0 font-medium"
                >
                  Download Asset
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliverable Preview Viewport */}
      <div className="flex-1 min-h-[460px] rounded-xl bg-canvas-card border border-border-subtle flex flex-col overflow-hidden shadow-sm">
        {/* Browser Chrome Header */}
        <div className="h-10 bg-canvas-subtle border-b border-border-subtle px-4 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1 text-content-tertiary hover:text-content-primary rounded hover:bg-canvas"
              title="Reload frame"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 bg-canvas-card border border-border-subtle rounded-md px-2.5 py-1 text-[11px] font-mono text-content-tertiary truncate">
              {playableUrl || 'No playable URL specified'}
            </div>
          </div>
          <span className="text-[11px] text-content-tertiary font-mono">Deliverable Viewport</span>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-canvas flex items-center justify-center overflow-hidden relative">
          {isGitHubUrl ? (
            /* Safe view for GitHub URL: Never iframe github.com to avoid CSP block */
            <div className="p-8 text-center max-w-md space-y-3">
              <div className="w-12 h-12 rounded-xl bg-canvas-card border border-border-subtle flex items-center justify-center mx-auto text-content-primary shadow-sm">
                <Code className="w-6 h-6 text-brand-orange" />
              </div>
              <h4 className="text-sm font-bold text-content-primary font-heading">
                Repository Deliverable
              </h4>
              <p className="text-xs text-content-tertiary leading-relaxed">
                The playable URL links directly to GitHub. GitHub blocks in-app iframe embedding via strict CSP security policies.
              </p>
              <div className="pt-2">
                <a
                  href={playableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-brand-orange text-white text-xs font-semibold hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Repository on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : isYouTube ? (
            <iframe
              key={iframeKey}
              src={getYouTubeEmbedUrl(playableUrl)}
              title="Project Demo Video"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isDirectVideo ? (
            <video
              key={iframeKey}
              src={playableUrl}
              controls
              className="max-w-full max-h-full"
            />
          ) : playableUrl ? (
            <div
              className={`h-full transition-all flex flex-col bg-white ${
                viewportMode === 'mobile'
                  ? 'w-[375px] border-x border-border-subtle shadow-md'
                  : 'w-full'
              }`}
            >
              <iframe
                key={iframeKey}
                src={playableUrl}
                title="Interactive Deliverable"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full h-full bg-white border-0"
              />
            </div>
          ) : (
            <div className="text-xs text-content-tertiary">
              No playable URL provided for this submission.
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Compliance Checks */}
      <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
          Reviewer Compliance Checks
        </h3>
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage2_playable_running'])}
              onChange={() => handleCheckbox('stage2_playable_running')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Deliverable is interactive, deployed, or has an accessible video demonstration
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage2_host_stable'])}
              onChange={() => handleCheckbox('stage2_host_stable')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Hosting complies with guidelines (not an ephemeral server that shuts down)
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage2_not_raw_repo'])}
              onChange={() => handleCheckbox('stage2_not_raw_repo')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Criterion #10 satisfied (not simply raw uncompiled code without execution instructions)
            </span>
          </label>
        </div>
      </div>

      {/* Reviewer Action Bar */}
      <div className="pt-4 flex items-center justify-between border-t border-border-subtle shrink-0">
        {isFlagging ? (
          <div className="flex items-center gap-2 flex-1 max-w-md mr-4">
            <input
              type="text"
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Reason for deliverable concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`Deliverable Concern: ${flagNote.trim()}`);
                }
                setIsFlagging(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0"
            >
              Confirm Flag
            </button>
            <button
              type="button"
              onClick={() => setIsFlagging(false)}
              className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsFlagging(true)}
            className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Flag Deliverable Issue</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>Continue to Commits & Diffs →</span>
        </button>
      </div>
    </div>
  );
};
