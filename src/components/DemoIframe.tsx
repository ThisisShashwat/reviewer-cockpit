import React, { useState, useRef, useEffect } from 'react';
import { GitHubRelease, GitHubRepoFile } from '../lib/types';

interface DemoIframeProps {
  demoUrl: string | null;
  codeUrl: string | null;
  track?: 'software' | 'hardware';
  releases?: GitHubRelease[];
  hardwareFiles?: GitHubRepoFile[];
  lapseLinks?: string;
}

export const DemoIframe: React.FC<DemoIframeProps> = ({
  demoUrl,
  codeUrl,
  track = 'software',
  releases = [],
  hardwareFiles = [],
  lapseLinks,
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect YouTube
  const getYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
      if (u.hostname.includes('youtube.com')) {
        if (u.searchParams.has('v')) return u.searchParams.get('v');
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0] === 'shorts' || parts[0] === 'embed') return parts[1] ?? null;
      }
    } catch {
      // not a valid URL
    }
    return null;
  };

  const youtubeId = demoUrl ? getYouTubeId(demoUrl) : null;
  const youtubeEmbedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?autoplay=0` : null;

  // Check if Playable URL is identical to Code URL
  const isCodeDuplicate = Boolean(
    demoUrl && codeUrl && 
    demoUrl.trim().toLowerCase().replace(/\/$/, '') === codeUrl.trim().toLowerCase().replace(/\/$/, '')
  );

  const hasReleases = releases && releases.length > 0;
  const isHardware = track === 'hardware';

  useEffect(() => {
    setIframeLoaded(false);
  }, [demoUrl]);

  const loadOrReload = () => {
    if (!demoUrl || youtubeId) return;
    if (!iframeLoaded) {
      setIframeLoaded(true);
    } else if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const openExternal = () => {
    if (!demoUrl) return;
    window.open(demoUrl, '_blank');
  };

  const btnClass = "bg-rv-surface2 border border-rv-border text-rv-dim p-1.5 rounded-md cursor-pointer transition-all duration-150 hover:not-disabled:border-rv-accent hover:not-disabled:text-rv-accent disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Bar with URL and Reload */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-rv-surface border-b border-rv-border shrink-0">
        {!youtubeId && !isCodeDuplicate && (
          <button className={btnClass} onClick={loadOrReload} disabled={!demoUrl} title={iframeLoaded ? 'Reload' : 'Load demo'}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        )}

        <div className="flex-1 bg-rv-surface2 border border-rv-border rounded-md py-1.5 px-3 text-gray-400 text-[12px] overflow-hidden text-ellipsis whitespace-nowrap font-mono">
          {demoUrl ?? 'No demo URL'}
        </div>

        {demoUrl && (
          <button className={btnClass} onClick={openExternal} title="Open in new tab">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" />
              <path d="M10 14L21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-[#0d1117] flex items-center justify-center relative overflow-y-auto p-6">
        
        {/* CASE 1: YouTube Video Embed */}
        {youtubeEmbedUrl ? (
          <iframe
            className="w-full h-full border-none max-w-4xl max-h-[85vh] rounded-lg"
            src={youtubeEmbedUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : isCodeDuplicate && isHardware ? (
          /* CASE 2: Hardware Project (Playable URL is GitHub Repo) */
          <div className="max-w-xl w-full bg-rv-surface border border-rv-border rounded-lg p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rv-accent/15 text-rv-accent mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-rv-text">Hardware Track Deliverable Repository</h3>
              <p className="text-xs text-rv-dim mt-1">
                Hardware submitters link their GitHub repository where CAD files (STEP, STL), KiCad PCB schematics, and gerber archives reside.
              </p>
            </div>

            {/* Detected Hardware Files */}
            {hardwareFiles.length > 0 ? (
              <div className="text-left bg-rv-bg p-3 rounded-md border border-rv-border space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-rv-accent">
                  Detected CAD / PCB Files ({hardwareFiles.length})
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {hardwareFiles.map(f => (
                    <div key={f.path} className="text-xs text-rv-text flex items-center justify-between font-mono">
                      <span>{f.name}</span>
                      <span className="text-[11px] text-rv-dim">{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-rv-dim bg-rv-bg p-3 rounded-md border border-rv-border">
                Inspect repository directory structure for hardware/electronics assets.
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={codeUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-rv-accent text-black font-semibold text-xs px-4 py-2 rounded-md hover:opacity-90 transition-all"
              >
                Inspect Hardware Files on GitHub ↗
              </a>
              {lapseLinks && (
                <a
                  href={lapseLinks}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-rv-surface2 border border-rv-border text-rv-text text-xs px-4 py-2 rounded-md hover:border-rv-accent transition-all"
                >
                  View Timelapse ↗
                </a>
              )}
            </div>
          </div>
        ) : isCodeDuplicate && hasReleases ? (
          /* CASE 3: Precompiled GitHub Release Binary Available (e.g. syspulse.exe) */
          <div className="max-w-xl w-full bg-rv-surface border border-rv-border rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-rv-border pb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rv-text">Precompiled Binary Found in GitHub Releases</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-mono font-bold">
                    Release {releases[0].tagName}
                  </span>
                </div>
                <p className="text-xs text-rv-dim mt-0.5">
                  The submitter compiled a standalone executable deliverable for reviewers to test.
                </p>
              </div>
            </div>

            {/* Release Description */}
            {releases[0].body && (
              <div className="bg-rv-bg p-3 rounded-md border border-rv-border">
                <span className="text-[11px] font-semibold text-rv-dim uppercase tracking-wider block mb-1">
                  Release Note
                </span>
                <p className="text-xs text-rv-text italic m-0">"{releases[0].body}"</p>
              </div>
            )}

            {/* Assets list with direct download */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rv-dim">
                Downloadable Release Binaries ({releases[0].assets.length})
              </span>
              <div className="space-y-2">
                {releases[0].assets.map(asset => (
                  <div key={asset.name} className="flex items-center justify-between p-3 bg-rv-surface2 border border-rv-border rounded-md">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-rv-blue shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="12" y2="18" />
                        <line x1="15" y1="15" x2="12" y2="18" />
                      </svg>
                      <div>
                        <div className="text-xs font-bold text-rv-text font-mono">{asset.name}</div>
                        <div className="text-[11px] text-rv-dim font-mono">{(asset.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <a
                      href={asset.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded bg-rv-blue hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      Download Binary ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-rv-dim border-t border-rv-border">
              <span>Published: {new Date(releases[0].publishedAt).toLocaleDateString()}</span>
              <a
                href={`${codeUrl}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rv-blue hover:underline"
              >
                View all releases on GitHub ↗
              </a>
            </div>
          </div>
        ) : isCodeDuplicate ? (
          /* CASE 4: Software Track with identical code repo and no releases */
          <div className="text-center text-rv-dim flex flex-col items-center px-6 max-w-sm">
            <svg className="w-16 h-16 text-rv-red opacity-80 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-[14px] text-rv-red font-semibold">Playable URL is Source Code</p>
            <p className="text-[12px] opacity-80 mt-1 mb-4 text-rv-text">
              The submitter provided the GitHub repository URL with no web deployment or precompiled releases. Reviewers cannot execute the project directly.
            </p>
            <button
              onClick={openExternal}
              className="flex items-center gap-2 bg-rv-red/15 border border-rv-red text-rv-red px-3.5 py-2 rounded-md text-[13px] cursor-pointer hover:bg-rv-red/25"
            >
              Inspect Source on GitHub ↗
            </button>
          </div>
        ) : iframeLoaded && demoUrl ? (
          /* CASE 5: Live Web URL (e.g. Vercel / Netlify / GitHub Pages) */
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            src={demoUrl}
            title="Demo preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          /* CASE 6: Default Click to Load */
          <button
            type="button"
            className="w-full h-full text-center text-rv-dim flex flex-col items-center justify-center cursor-pointer disabled:cursor-default"
            onClick={loadOrReload}
            disabled={!demoUrl}
          >
            <svg className="w-16 h-16 opacity-30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <p className="text-[14px]">Click anywhere to load the demo</p>
            {demoUrl && <p className="text-[12px] opacity-50 mt-1">{demoUrl}</p>}
          </button>
        )}

      </div>
    </div>
  );
};
