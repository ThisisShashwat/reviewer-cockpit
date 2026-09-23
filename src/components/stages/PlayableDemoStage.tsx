import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Laptop,
  PackageCheck,
  RefreshCw,
  Smartphone,
  Download,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';
import { checkUrlFrameable } from '../../lib/api';

interface PlayableDemoStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

export const PlayableDemoStage: React.FC<PlayableDemoStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [forceEmbed, setForceEmbed] = useState(false);

  const playableUrl = (project.playableUrl || '').trim();
  const codeUrl = (project.codeUrl || '').trim();

  // Multi-link support: all demo links
  const allDemos =
    project.allPlayableUrls && project.allPlayableUrls.length > 0
      ? project.allPlayableUrls
      : [playableUrl].filter(Boolean);

  // Host rule checks per GitBook submission guidelines
  const isStreamlit = playableUrl.includes('streamlit.app');
  const isReplit = playableUrl.includes('replit.com') || playableUrl.includes('replit.dev');
  const isGoogleDrive = playableUrl.includes('drive.google.com');
  const isDuplicateCodeAndDemo =
    playableUrl.length > 0 &&
    codeUrl.length > 0 &&
    playableUrl.toLowerCase() === codeUrl.toLowerCase();

  const isProhibitedHost = isStreamlit || isReplit || isGoogleDrive;
  const prohibitedReason = isStreamlit
    ? 'Streamlit.app apps sleep upon inactivity. GitBook rules require persistent hosting or video demo.'
    : isReplit
    ? 'Replit apps shut down upon inactivity. GitBook rules require persistent hosting or video demo.'
    : isGoogleDrive
    ? 'Google Drive is disallowed for video demos. Use YouTube, Vimeo, or direct web video.'
    : undefined;

  const isGitHubUrl = playableUrl.includes('github.com');
  const isYouTube = playableUrl.includes('youtube.com') || playableUrl.includes('youtu.be');
  const isDirectVideo =
    playableUrl.endsWith('.mp4') ||
    playableUrl.endsWith('.webm') ||
    playableUrl.endsWith('.mov') ||
    playableUrl.includes('.mp4?') ||
    playableUrl.includes('.webm?');

  const releases = gitHubData?.releases || [];
  const hasBinaryReleases = releases.some((r) => r.assets && r.assets.length > 0);

  // Automatic X-Frame-Options & CSP Header Inspection
  const [frameCheck, setFrameCheck] = useState<{
    isLoading: boolean;
    canFrame: boolean;
    reason?: string;
  }>({
    isLoading: !isYouTube && !isDirectVideo && Boolean(playableUrl) && !isGitHubUrl,
    canFrame: true,
  });

  const hasAutoOpenedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    if (!playableUrl || isYouTube || isDirectVideo || isGitHubUrl) {
      setFrameCheck({ isLoading: false, canFrame: true });
      return;
    }

    setFrameCheck({ isLoading: true, canFrame: true });

    checkUrlFrameable(playableUrl).then((res) => {
      if (!mounted) return;
      setFrameCheck({
        isLoading: false,
        canFrame: res.canFrame,
        reason: res.reason,
      });

      // Automatically detect that X-Frame-Options is denied and open it in a new tab!
      if (!res.canFrame && !hasAutoOpenedRef.current[project.id]) {
        hasAutoOpenedRef.current[project.id] = true;
        try {
          window.open(playableUrl, '_blank');
          toast.info('Application opened in a new tab (iframe embedding blocked by server headers)');
        } catch {
          // Handled via prominent UI button if browser popup blocker intervened
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [playableUrl, isYouTube, isDirectVideo, isGitHubUrl, project.id]);

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url;
  };

  const handlePass = (key: string) => {
    onToggleChecklist?.(key, true);
  };

  const handleFail = (key: string) => {
    onToggleChecklist?.(key, false);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    toast.success('Copied URL to clipboard');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // SINGLE CHECKBOX: Playable URL includes host compliance automatically!
  // If host compliance fails (isProhibitedHost), autoPass is FALSE (FAIL).
  const isPlayableAutoPassed = Boolean(playableUrl && !isDuplicateCodeAndDemo && !isProhibitedHost);
  const isPlayableExplicitPassed = reviewChecklist['shipped_playable_valid'] === true;
  const isPlayableExplicitFailed = reviewChecklist['shipped_playable_valid'] === false;
  const isPlayablePassed =
    isPlayableExplicitPassed || (isPlayableExplicitFailed ? false : isPlayableAutoPassed);

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col select-text">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 3 of 6
            </span>
            <span className="text-xs text-content-tertiary">Playable Demo & Testing</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Playable Application Demo & Deliverable Testing
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit interactive demo functionality and verify deliverable stability per GitBook guidelines. Ephemeral hosts (Streamlit / Replit) automatically fail.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {playableUrl && (
            <a
              href={playableUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>Open Playable Demo in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* TOP AUDIT CONTROL: Single Playable URL Card with Bundled Host Verification */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 text-white shadow-xl space-y-4 shrink-0">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-orange" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Playable Deliverable Verification
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#a1a1aa]">
            GitBook Rules Requirement 4 (Interactive Playable Demo)
          </span>
        </div>

        {/* Playable URL(s) Row with Single Pass/Fail Control */}
        <div className="space-y-3">
          {allDemos.map((demoLink, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#18181b] border border-[#27272a]"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {allDemos.length > 1 ? `Playable URL ${idx + 1}` : 'Playable Deliverable URL'}
                  </span>
                  {idx === 0 && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isPlayablePassed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isPlayablePassed ? 'PASS' : 'FAIL'}
                    </span>
                  )}
                  {isProhibitedHost && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Disallowed Host
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <a
                    href={demoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-brand-orange hover:underline truncate inline-flex items-center gap-1.5"
                    title={demoLink}
                  >
                    <span className="truncate">{demoLink}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyUrl(demoLink)}
                    className="p-1 rounded text-[#a1a1aa] hover:text-white hover:bg-[#27272a] cursor-pointer shrink-0"
                    title="Copy URL"
                  >
                    {copiedLink === demoLink ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Automated Host Failure Notice */}
                {isProhibitedHost && (
                  <p className="text-xs text-rose-300 pt-1 leading-relaxed">
                    ⚠️ <strong>Host Policy Violation:</strong> {prohibitedReason} Automatically marked as FAIL.
                  </p>
                )}
              </div>

              {idx === 0 && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-[#71717a] font-mono">Verdict</span>
                  <PassFailControl
                    label="Playable URL"
                    status={
                      isPlayableExplicitPassed
                        ? true
                        : isPlayableExplicitFailed
                        ? false
                        : undefined
                    }
                    onPass={() => handlePass('shipped_playable_valid')}
                    onFail={() => handleFail('shipped_playable_valid')}
                  />
                </div>
              )}
            </div>
          ))}

          {allDemos.length === 0 && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
              <span className="font-semibold">No playable demo link submitted.</span>
              <PassFailControl
                label="Playable URL"
                status={false}
                onPass={() => handlePass('shipped_playable_valid')}
                onFail={() => handleFail('shipped_playable_valid')}
              />
            </div>
          )}

          {isDuplicateCodeAndDemo && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Playable URL is identical to the Code URL. Submissions must include either a hosted demo, compiled binary release, or gameplay video.
              </span>
            </div>
          )}
        </div>

        {/* Early Reject Button on Host Violation */}
        {isProhibitedHost && onEarlyExit && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Instant Blocker: Ephemeral host violates GitBook rules.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onEarlyExit(`Disallowed Ephemeral Host: ${prohibitedReason}`)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              Reject for Disallowed Host
            </button>
          </div>
        )}
      </div>

      {/* FULL-WIDTH INTERACTIVE TESTING CONTAINER (Auto-detects X-Frame-Options to avoid broken UI) */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-xl flex-1 min-h-[620px]">
        {/* Container Top Toolbar */}
        <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-brand-orange" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Testing Environment
            </span>
            {!frameCheck.canFrame && !isYouTube && !isDirectVideo && (
              <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
                X-Frame-Options Protected (Opened in New Tab)
              </span>
            )}
            {frameCheck.canFrame && playableUrl && !isGitHubUrl && !isYouTube && (
              <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">
                sandbox iframe
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isGitHubUrl && !isYouTube && (frameCheck.canFrame || forceEmbed) && (
              <div className="flex items-center bg-[#27272a] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewportMode === 'desktop'
                      ? 'bg-[#18181b] text-brand-orange shadow-xs'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                  title="Desktop Viewport"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewportMode === 'mobile'
                      ? 'bg-[#18181b] text-brand-orange shadow-xs'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                  title="Mobile Viewport (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] transition-colors cursor-pointer"
              title="Reload sandbox preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {playableUrl && (
              <a
                href={playableUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="p-6 flex-1 flex flex-col justify-center items-center bg-[#0d0d0f] relative overflow-hidden">
          {isYouTube ? (
            /* YouTube Player */
            <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-[#27272a] shadow-2xl">
              <iframe
                src={getYouTubeEmbedUrl(playableUrl)}
                title="YouTube Video Player"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isDirectVideo ? (
            /* Direct MP4 / WebM Player */
            <div className="w-full max-w-4xl">
              <video
                src={playableUrl}
                controls
                className="w-full rounded-2xl border border-[#27272a] shadow-2xl max-h-[560px]"
              />
            </div>
          ) : !frameCheck.canFrame && !forceEmbed && playableUrl && !isGitHubUrl ? (
            /* AUTOMATICALLY DETECTED X-FRAME-OPTIONS DENIED CARD (No broken UI) */
            <div className="p-8 text-center text-xs text-[#a1a1aa] space-y-5 max-w-xl mx-auto my-auto animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                  <span>X-Frame-Options Protected</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Live Application Active in New Tab
                </h3>
                <p className="text-xs text-[#d4d4d8] leading-relaxed max-w-md mx-auto">
                  This application server explicitly blocks embedding in iframes ({frameCheck.reason || 'X-Frame-Options: DENY / SAMEORIGIN'}). To prevent a broken UI, the cockpit automatically detected it and opened the live demo in a new browser tab.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] text-left space-y-2.5">
                <span className="font-semibold text-white block text-xs">Direct Link:</span>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#121214] border border-[#27272a]">
                  <span className="font-mono text-brand-orange text-xs truncate">
                    {playableUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyUrl(playableUrl)}
                    className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] cursor-pointer shrink-0"
                    title="Copy URL"
                  >
                    {copiedLink === playableUrl ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href={playableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span>Re-Open Playable Application</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setForceEmbed(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Try iframe anyway
                </button>
              </div>
            </div>
          ) : playableUrl && !isGitHubUrl ? (
            /* Embedded Live Web Sandbox with Fallback Bar */
            <div className="w-full flex-1 flex flex-col space-y-3 min-h-[500px]">
              {/* Fallback Banner */}
              <div className="px-4 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-[#a1a1aa] flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                  <span>
                    Embedded Sandbox: If the demo appears blank, click:
                  </span>
                </span>
                <a
                  href={playableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-brand-orange hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Sandbox Frame */}
              <div
                className={`flex-1 transition-all rounded-2xl overflow-hidden border border-[#27272a] bg-white min-h-[520px] ${
                  viewportMode === 'mobile'
                    ? 'max-w-sm mx-auto shadow-2xl w-full'
                    : 'w-full'
                }`}
              >
                <iframe
                  key={iframeKey}
                  src={playableUrl}
                  title="Playable Application Sandbox"
                  className="w-full h-full border-0 min-h-[520px]"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            </div>
          ) : (
            /* Standalone / GitHub Binary Release / CLI Application */
            <div className="p-8 text-center text-xs text-[#a1a1aa] space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mx-auto text-brand-orange">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Standalone Application or Binary Release
                </h3>
                <p className="text-xs text-[#71717a] mt-1 leading-relaxed">
                  The provided playable URL points to a GitHub repository, releases page, or compiled desktop binary.
                </p>
              </div>

              {hasBinaryReleases ? (
                <div className="p-4 rounded-xl bg-[#18181b] border border-emerald-500/30 text-left space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Download className="w-4 h-4" />
                    <span>Downloadable Binary Assets Available</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {releases[0]?.assets?.map((asset: any) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#27272a] text-xs"
                      >
                        <span className="font-mono text-white truncate text-[11px]">
                          {asset.name}
                        </span>
                        <a
                          href={asset.browser_download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-brand-orange text-white text-[11px] font-bold inline-flex items-center gap-1 shrink-0 ml-2"
                        >
                          <Download className="w-3 h-3" />
                          <span>{(asset.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] text-left text-xs space-y-2">
                  <span className="font-semibold text-white block">Reviewer Guidance:</span>
                  <p className="text-[#a1a1aa] leading-relaxed">
                    Check if the repository contains release executables (.exe, .dmg, .AppImage) or if video documentation is provided. If no runnable build or gameplay demo is accessible, flag as failing the Playable Demo criteria.
                  </p>
                </div>
              )}

              {playableUrl && (
                <a
                  href={playableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                >
                  <span>Open Deliverable Target</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          {isPlayablePassed ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Playable Demo Verified</span>
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {isProhibitedHost
                  ? 'Playable demo failed due to prohibited ephemeral host'
                  : 'Playable demo requires verification or is broken'}
              </span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2.5 rounded-xl bg-brand-orange text-white font-bold hover:bg-orange-600 transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <span>Next: Telemetry & Introspect →</span>
        </button>
      </div>
    </div>
  );
};
