import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Download,
  ExternalLink,
  Laptop,
  PackageCheck,
  PlaySquare,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';

interface ShippingDeliverablesStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit: (reason: string) => void;
}

export const ShippingDeliverablesStage: React.FC<ShippingDeliverablesStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

  const playableUrl = project.playableUrl || '';
  const codeUrl = project.codeUrl || '';

  // Rule checks
  const isStreamlit = playableUrl.includes('streamlit.app');
  const isReplit = playableUrl.includes('replit.com') || playableUrl.includes('replit.dev');
  const isGoogleDrive = playableUrl.includes('drive.google.com');
  const isDuplicateCodeAndDemo = playableUrl.trim().toLowerCase() === codeUrl.trim().toLowerCase();

  const releases = gitHubData?.releases || [];
  const hasBinaryReleases = releases.some((r) => r.assets && r.assets.length > 0);

  // Criterion #10 check: Code URL == Demo URL with no binaries
  const isCriterion10Violation = isDuplicateCodeAndDemo && !hasBinaryReleases;

  const isProhibitedHost = isStreamlit || isReplit || isGoogleDrive;
  const prohibitedReason = isStreamlit
    ? 'Streamlit.app is strictly disallowed due to inactivity shutdowns. Submitter must deploy on persistent host or attach video.'
    : isReplit
    ? 'Replit is strictly disallowed due to inactivity shutdowns. Submitter must deploy on persistent host or attach video.'
    : isGoogleDrive
    ? 'Google Drive is strictly disallowed for video demos. Submitter must host on YouTube, Vimeo, or direct video.'
    : undefined;

  // Detect video embed
  const isYouTube = playableUrl.includes('youtube.com') || playableUrl.includes('youtu.be');
  const isDirectVideo = playableUrl.endsWith('.mp4') || playableUrl.endsWith('.webm');

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rv-border shrink-0">
        <div>
          <h2 className="text-base font-bold text-rv-text flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-rv-accent" />
            Stage 2: Live Demo & Binary Deliverables Inspector
          </h2>
          <p className="text-xs text-rv-dim mt-0.5">
            Test the live playable project directly, inspect attached desktop binaries, and enforce host guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-rv-surface2 border border-rv-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewportMode('desktop')}
              className={`p-1.5 rounded-md ${
                viewportMode === 'desktop' ? 'bg-rv-surface text-rv-accent' : 'text-rv-dim hover:text-rv-text'
              }`}
              title="Desktop Viewport"
            >
              <Laptop className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 rounded-md ${
                viewportMode === 'mobile' ? 'bg-rv-surface text-rv-accent' : 'text-rv-dim hover:text-rv-text'
              }`}
              title="Mobile Viewport"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <a
            href={playableUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-rv-surface2 border border-rv-border text-xs font-semibold text-rv-text hover:bg-rv-surface3 flex items-center gap-1.5 transition-colors"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Prohibited Host Alert Banner */}
      {isProhibitedHost && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 flex items-start justify-between gap-3 text-red-300 shrink-0">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-200">
                🚫 Hard Blocker: Disallowed Host ({playableUrl})
              </h4>
              <p className="text-xs mt-1 text-red-300/90 leading-relaxed">
                {prohibitedReason}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEarlyExit(`Disallowed Host: ${prohibitedReason}`)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            Reject: Disallowed Host
          </button>
        </div>
      )}

      {/* Criterion #10 Alert */}
      {isCriterion10Violation && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-start justify-between gap-3 text-amber-300 shrink-0">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                ⚠️ Criterion #10 Violation: Playable URL matches Code URL
              </h4>
              <p className="text-xs mt-1 text-amber-300/90 leading-relaxed">
                The Playable URL cannot simply point to the source repository unless pre-compiled release binaries are attached or a working demo video is provided.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onEarlyExit(
                'Playable URL equals Code URL with no attached release binaries or video demo (Violates Criterion #10).'
              )
            }
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
          >
            Reject: Criterion #10
          </button>
        </div>
      )}

      {/* GitHub Releases Card (if CLI or desktop project with releases) */}
      {releases.length > 0 && (
        <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rv-text flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              Verified GitHub Release Assets ({releases[0].tagName})
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">
              Valid Desktop/CLI Distribution
            </span>
          </div>

          <div className="space-y-1.5">
            {releases[0].assets.map((asset, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-rv-surface2 border border-rv-border text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Download className="w-4 h-4 text-rv-accent shrink-0" />
                  <span className="font-mono font-medium text-rv-text truncate">
                    {asset.name}
                  </span>
                  <span className="text-[11px] font-mono text-rv-muted">
                    {(asset.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <a
                  href={asset.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-rv-surface border border-rv-border text-[11px] text-rv-accent hover:text-white hover:bg-rv-accent transition-colors shrink-0"
                >
                  Download Asset
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive In-App Testing Deck */}
      <div className="flex-1 min-h-[460px] rounded-xl bg-rv-surface border border-rv-border flex flex-col overflow-hidden shadow-lg">
        {/* Browser Top Chrome */}
        <div className="h-10 bg-rv-surface2 border-b border-rv-border px-3 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1 text-rv-dim hover:text-rv-text rounded hover:bg-rv-surface3"
              title="Reload frame"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 bg-rv-bg border border-rv-border rounded-md px-2.5 py-1 text-[11px] font-mono text-rv-dim truncate">
              {playableUrl}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-rv-dim">
            <span>Embed Deck</span>
          </div>
        </div>

        {/* Browser Frame */}
        <div className="flex-1 bg-black/90 flex items-center justify-center overflow-hidden relative">
          {isYouTube ? (
            <iframe
              key={iframeKey}
              src={getYouTubeEmbedUrl(playableUrl)}
              title="Demo Video"
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
          ) : (
            <div
              className={`h-full transition-all flex flex-col ${
                viewportMode === 'mobile' ? 'w-[375px] border-x border-rv-border shadow-2xl' : 'w-full'
              }`}
            >
              <iframe
                key={iframeKey}
                src={playableUrl}
                title="Interactive Project Demo"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="w-full h-full bg-white border-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Advance Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-rv-border shrink-0">
        <button
          type="button"
          onClick={() => onEarlyExit('Unshipped Deliverable / Broken Playable Demo')}
          className="px-3.5 py-2 rounded-lg bg-rv-surface2 border border-rv-border text-red-400 hover:bg-red-950/40 hover:border-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Reject for Broken Demo</span>
        </button>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-rv-accent text-white hover:bg-rv-accent/90 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
        >
          <span>Pass Shipping & Go to Stage 3 (Commits & Diffs) →</span>
        </button>
      </div>
    </div>
  );
};
