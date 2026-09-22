import React, { useState, useRef, useEffect } from 'react';

interface DemoIframeProps {
  demoUrl: string | null;
  codeUrl: string | null;
}

export const DemoIframe: React.FC<DemoIframeProps> = ({ demoUrl, codeUrl }) => {
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
        {!youtubeId && (
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

        <button className={btnClass} onClick={openExternal} disabled={!demoUrl} title="Open in new tab">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </button>
      </div>

      {/* Main Sandbox Frame */}
      <div className="flex-1 bg-[#0d1117] flex items-center justify-center relative">
        {isCodeDuplicate ? (
          <div className="text-center text-rv-dim flex flex-col items-center px-6 max-w-sm">
            <svg className="w-16 h-16 text-rv-red opacity-80 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-[14px] text-rv-red font-semibold">Playable URL is Source Code</p>
            <p className="text-[12px] opacity-80 mt-1 mb-4 text-rv-text">
              The submitter provided the GitHub repository URL instead of a live deployment or video walkthrough.
            </p>
            <button
              onClick={openExternal}
              className="flex items-center gap-2 bg-rv-red/15 border border-rv-red text-rv-red px-3.5 py-2 rounded-md text-[13px] cursor-pointer hover:bg-rv-red/25"
            >
              Inspect Source on GitHub ↗
            </button>
          </div>
        ) : youtubeEmbedUrl ? (
          <iframe
            className="w-full h-full border-none"
            src={youtubeEmbedUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : iframeLoaded && demoUrl ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            src={demoUrl}
            title="Demo preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
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
