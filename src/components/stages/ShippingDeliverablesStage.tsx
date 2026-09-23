import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Laptop,
  PackageCheck,
  RefreshCw,
  Smartphone,
  Code,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface ShippingDeliverablesStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
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

  const handlePass = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, true);
    }
  };

  const handleFail = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 4 of 6
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
                className={`p-1.5 rounded-md cursor-pointer ${
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
                className={`p-1.5 rounded-md cursor-pointer ${
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
              className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <span>Open Demo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Host Rule Warning: Sleeping Host or Google Drive */}
      {isProhibitedHost && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3 text-xs shadow-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300 block">
              Host Compliance Warning: {isStreamlit ? 'Streamlit' : isReplit ? 'Replit' : 'Google Drive'}
            </span>
            <p className="text-amber-200/90 leading-relaxed">{prohibitedReason}</p>
          </div>
        </div>
      )}

      {/* Duplicate Code and Demo Warning */}
      {isDuplicateCodeAndDemo && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3 text-xs shadow-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300 block">
              Playable URL Matches Repository URL
            </span>
            <p className="text-amber-200/90 leading-relaxed">
              The submitter provided their GitHub code repository link in place of a live playable demo or release binary.
            </p>
          </div>
        </div>
      )}

      {/* Binary Releases Card (If Available) */}
      {hasBinaryReleases && (
        <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3 shadow-lg shrink-0">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2.5">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-brand-orange" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                GitHub Release Assets & Executables
              </h3>
            </div>
            <span className="text-xs font-mono text-[#a1a1aa]">
              {releases.length} release(s) found
            </span>
          </div>

          <div className="space-y-2">
            {releases.map((rel) => (
              <div
                key={rel.id}
                className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white block">{rel.name || rel.tagName}</span>
                  <span className="text-[11px] text-[#71717a] font-mono">
                    Tagged {rel.tagName} • {rel.publishedAt ? new Date(rel.publishedAt).toLocaleDateString() : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {rel.assets.map((asset, aIdx) => (
                    <a
                      key={aIdx}
                      href={asset.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#27272a] text-white hover:bg-[#333338] text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3 h-3 text-brand-orange" />
                      <span>{asset.name}</span>
                      <span className="text-[10px] text-[#a1a1aa]">
                        ({(asset.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Deliverable Preview Container (Dark Console Frame) */}
      <div className="flex-1 min-h-[460px] bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
        {/* Frame Topbar */}
        <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-mono text-[#d4d4d8] truncate">
              {playableUrl || 'No playable URL'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isGitHubUrl && !isYouTube && playableUrl && (
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] cursor-pointer"
                title="Reload preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[10px] font-mono text-[#71717a] uppercase">
              {isYouTube ? 'Video Embed' : isGitHubUrl ? 'GitHub Link' : viewportMode}
            </span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-[#09090b] flex items-center justify-center p-4 overflow-auto">
          {isGitHubUrl ? (
            <div className="text-center p-8 space-y-3 max-w-md">
              <Code className="w-8 h-8 text-brand-orange mx-auto" />
              <h4 className="text-sm font-semibold text-white">Repository Submitted as Playable Deliverable</h4>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                GitHub URLs block iframe embedding. Review the README for setup steps, or check if releases and build artifacts exist above.
              </p>
              <a
                href={playableUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
              >
                <span>Open Repository in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : isYouTube ? (
            <div className="w-full h-full max-w-4xl aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
              <iframe
                src={getYouTubeEmbedUrl(playableUrl)}
                title="Video Demonstration"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          ) : isDirectVideo ? (
            <div className="w-full h-full max-w-4xl flex items-center justify-center bg-black rounded-xl overflow-hidden shadow-lg">
              <video controls src={playableUrl} className="max-w-full max-h-full">
                Your browser does not support the video tag.
              </video>
            </div>
          ) : playableUrl ? (
            <div
              className={`h-full transition-all duration-300 rounded-xl overflow-hidden bg-white ${
                viewportMode === 'mobile'
                  ? 'w-[375px] shadow-2xl border-2 border-[#27272a]'
                  : 'w-full shadow-lg'
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
            <div className="text-xs text-[#71717a]">
              No playable URL provided for this submission.
            </div>
          )}
        </div>
      </div>

      {/* Interactive Reviewer Pass/Fail Checklist */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg shrink-0">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Stage 4 Verification: Shipping & Host Checks
          </h3>
          <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
        </div>

        <div className="space-y-2.5">
          <PassFailControl
            label="Deliverable Executable & Interactive"
            description="Playable web application, binary release, or high-fidelity video demonstration runs as intended."
            status={reviewChecklist['stage4_playable_running']}
            onPass={() => handlePass('stage4_playable_running')}
            onFail={() => handleFail('stage4_playable_running')}
          />

          <PassFailControl
            label="Hosting Complies with Stability Guidelines"
            description="Hosting is persistent and stable (not sleeping Streamlit/Replit servers or raw Google Drive links)."
            status={reviewChecklist['stage4_host_stable']}
            onPass={() => handlePass('stage4_host_stable')}
            onFail={() => handleFail('stage4_host_stable')}
          />

          <PassFailControl
            label="Shipped Product Delivers Claimed Features"
            description="All core interactive functionality claimed in requested hours is demonstrated in the deliverable."
            status={reviewChecklist['stage4_features_delivered']}
            onPass={() => handlePass('stage4_features_delivered')}
            onFail={() => handleFail('stage4_features_delivered')}
          />
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
              className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
            >
              Confirm Flag
            </button>
            <button
              type="button"
              onClick={() => setIsFlagging(false)}
              className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsFlagging(true)}
            className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Flag Deliverable Issue</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>Continue to Commits & AI Heuristics →</span>
        </button>
      </div>
    </div>
  );
};
