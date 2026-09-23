import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Marked } from 'marked';
import 'github-markdown-css/github-markdown-dark.css';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCode,
  FileText,
  Globe,
  Image as ImageIcon,
  Laptop,
  PackageCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { parseGitHubRepo } from '../../lib/api';
import { PassFailControl } from '../common/PassFailControl';

interface ReadmeDeliverablesStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

export const ReadmeDeliverablesStage: React.FC<ReadmeDeliverablesStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [activeTab, setActiveTab] = useState<'readme' | 'deliverable' | 'split'>('readme');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isExpandedDesc, setIsExpandedDesc] = useState(false);
  const [iframeKey] = useState(0);

  const playableUrl = (project.playableUrl || '').trim();
  const codeUrl = (project.codeUrl || '').trim();
  const readmeContent = gitHubData?.readmeContent || '';
  const screenshotUrl = (project.screenshotUrl || '').trim();

  // Host rule checks per GitBook
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
    ? 'Google Drive is disallowed for video demos. Use YouTube, Vimeo, or a direct web video.'
    : undefined;

  const releases = gitHubData?.releases || [];
  const hasBinaryReleases = releases.some((r) => r.assets && r.assets.length > 0);
  const isGitHubUrl = playableUrl.includes('github.com');
  const isYouTube = playableUrl.includes('youtube.com') || playableUrl.includes('youtu.be');
  const isDirectVideo = playableUrl.endsWith('.mp4') || playableUrl.endsWith('.webm');

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  // Render README with relative image and link resolution
  const renderedReadme = useMemo(() => {
    if (!readmeContent) return null;
    try {
      const parsedRepo = parseGitHubRepo(project.codeUrl);
      const owner = parsedRepo?.owner || '';
      const repo = parsedRepo?.repo || '';
      const branch = gitHubData?.defaultBranch || 'main';
      const rawBase =
        owner && repo ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/` : '';
      const blobBase = owner && repo ? `https://github.com/${owner}/${repo}/blob/${branch}/` : '';

      const renderer = {
        image({ href, title, text }: { href: string; title?: string | null; text?: string }) {
          let fullSrc = href;
          if (
            rawBase &&
            href &&
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('data:')
          ) {
            const clean = href.replace(/^\.\//, '').replace(/^\//, '');
            fullSrc = `${rawBase}${clean}`;
          }
          return `<img src="${fullSrc}" alt="${text || ''}" title="${title || ''}" style="max-width: 100%; border-radius: 8px; margin: 12px 0;" loading="lazy" />`;
        },
        link({ href, title, text }: { href: string; title?: string | null; text: string }) {
          let fullHref = href;
          if (
            blobBase &&
            href &&
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('#') &&
            !href.startsWith('mailto:')
          ) {
            const clean = href.replace(/^\.\//, '').replace(/^\//, '');
            fullHref = `${blobBase}${clean}`;
          }
          return `<a href="${fullHref}" target="_blank" rel="noreferrer" title="${title || ''}">${text}</a>`;
        },
      };

      const customMarked = new Marked({
        gfm: true,
        breaks: true,
        renderer,
      });

      return customMarked.parse(readmeContent) as string;
    } catch {
      return '<p class="text-[#71717a]">Unable to render README markdown.</p>';
    }
  }, [readmeContent, project.codeUrl, gitHubData?.defaultBranch]);

  // Automated 7-Point Shipped Criteria
  const shippedChecks = useMemo(() => {
    const hasName = Boolean(project.projectName && project.projectName.trim().length >= 2);
    const hasDesc = Boolean(project.description && project.description.trim().length >= 10);
    const hasCode = Boolean(codeUrl && codeUrl.includes('github.com'));
    const hasDemo = Boolean(playableUrl && !isDuplicateCodeAndDemo);
    const hasScreenshot = Boolean(screenshotUrl && screenshotUrl.length > 5);
    const hasReadme = Boolean(readmeContent && readmeContent.length > 30);
    const hostCompliant = !isProhibitedHost;

    return [
      {
        id: 'name_valid',
        label: 'Project Name',
        desc: project.projectName || 'Missing project name',
        passed: hasName,
        autoPass: hasName,
        checkKey: 'shipped_name_valid',
      },
      {
        id: 'desc_valid',
        label: 'Description',
        desc: project.description
          ? project.description.length > 80 && !isExpandedDesc
            ? `${project.description.slice(0, 80)}...`
            : project.description
          : 'Missing description',
        passed: hasDesc,
        autoPass: hasDesc,
        checkKey: 'shipped_desc_valid',
        canExpand: (project.description || '').length > 80,
      },
      {
        id: 'code_valid',
        label: 'Source Code Repo',
        desc: codeUrl || 'Missing code URL',
        passed: hasCode,
        autoPass: hasCode,
        checkKey: 'shipped_code_valid',
        isLink: Boolean(codeUrl),
        url: codeUrl,
      },
      {
        id: 'playable_valid',
        label: 'Playable Demo',
        desc: isDuplicateCodeAndDemo
          ? 'Identical to Code URL (No compiled binary / video attached)'
          : playableUrl || 'Missing playable URL',
        passed: hasDemo,
        autoPass: hasDemo,
        checkKey: 'shipped_playable_valid',
        isLink: Boolean(playableUrl) && !isDuplicateCodeAndDemo,
        url: playableUrl,
        warning: isDuplicateCodeAndDemo,
      },
      {
        id: 'screenshot_attached',
        label: 'Screenshot Image',
        desc: hasScreenshot ? 'Deliverable image attached' : 'No screenshot provided',
        passed: hasScreenshot,
        autoPass: hasScreenshot,
        checkKey: 'shipped_screenshot_valid',
        thumbnail: hasScreenshot ? screenshotUrl : undefined,
      },
      {
        id: 'readme_present',
        label: 'Repository README',
        desc: hasReadme ? `${readmeContent.length.toLocaleString()} chars with instructions` : 'Missing or empty README.md',
        passed: hasReadme,
        autoPass: hasReadme,
        checkKey: 'shipped_readme_valid',
      },
      {
        id: 'host_compliant',
        label: 'Host Compliance',
        desc: isProhibitedHost
          ? prohibitedReason || 'Disallowed host detected'
          : 'Compliant persistent hosting',
        passed: hostCompliant,
        autoPass: hostCompliant,
        checkKey: 'shipped_host_compliant',
        isBlocker: isProhibitedHost,
      },
    ];
  }, [
    project.projectName,
    project.description,
    codeUrl,
    playableUrl,
    screenshotUrl,
    readmeContent,
    isProhibitedHost,
    prohibitedReason,
    isDuplicateCodeAndDemo,
    isExpandedDesc,
  ]);

  const passedCount = shippedChecks.filter((c) => {
    if (reviewChecklist[c.checkKey] !== undefined) {
      return reviewChecklist[c.checkKey];
    }
    return c.autoPass;
  }).length;

  const handlePass = (key: string) => {
    onToggleChecklist?.(key, true);
  };

  const handleFail = (key: string) => {
    onToggleChecklist?.(key, false);
  };

  const handleBatchApproveAll = () => {
    shippedChecks.forEach((c) => {
      onToggleChecklist?.(c.checkKey, true);
    });
    toast.success('Marked all 7 shipped checks as Passed');
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 2 of 5
            </span>
            <span className="text-xs text-content-tertiary">GitBook Shipped Verification</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Readme & Shipped Deliverables Verification
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit the 7 core requirements that define a shipped Hack Club project: title, description, code repository, playable testing, screenshot, README, and host stability.
          </p>
        </div>

        {/* View Layout Tabs */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-canvas-card border border-border-subtle rounded-lg p-0.5 shadow-sm text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('readme')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'readme'
                  ? 'bg-brand-orange text-white font-semibold'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              README View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deliverable')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'deliverable'
                  ? 'bg-brand-orange text-white font-semibold'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Deliverable & Demo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors hidden md:block ${
                activeTab === 'split'
                  ? 'bg-brand-orange text-white font-semibold'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Split View
            </button>
          </div>
        </div>
      </div>

      {/* TOP MANDATORY RIBBON: 7-Point Shipped Criteria Checklist */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white shadow-xl space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-brand-orange" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Official GitBook Shipped Requirements Checklist
              </h3>
              <p className="text-[11px] text-[#a1a1aa] mt-0.5">
                Every project in Unified must satisfy all shipped criteria before approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                passedCount === 7
                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                  : passedCount >= 5
                  ? 'bg-amber-950/70 text-amber-400 border-amber-500/40'
                  : 'bg-rose-950/70 text-rose-400 border-rose-500/40'
              }`}
            >
              {passedCount} / 7 Checks Passed
            </span>

            <button
              type="button"
              onClick={handleBatchApproveAll}
              className="px-2.5 py-1 rounded-md bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] text-xs font-semibold transition-colors"
            >
              Approve All
            </button>

            {passedCount < 7 && onEarlyExit && (
              <button
                type="button"
                onClick={() =>
                  onEarlyExit(
                    `Failed Shipped Requirements: ${shippedChecks
                      .filter((c) => reviewChecklist[c.checkKey] === false || (!c.autoPass && reviewChecklist[c.checkKey] !== true))
                      .map((c) => c.label)
                      .join(', ')}`
                  )
                }
                className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Reject for Missing Requirements
              </button>
            )}
          </div>
        </div>

        {/* 7 Interactive Criteria Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {shippedChecks.map((check) => {
            const isExplicitlyPassed = reviewChecklist[check.checkKey] === true;
            const isExplicitlyFailed = reviewChecklist[check.checkKey] === false;
            const isCurrentPassed =
              isExplicitlyPassed || (isExplicitlyFailed ? false : check.autoPass);

            return (
              <div
                key={check.id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                  isExplicitlyFailed || (!check.autoPass && !isExplicitlyPassed)
                    ? 'bg-rose-950/30 border-rose-500/40 text-white'
                    : isCurrentPassed
                    ? 'bg-[#18181b] border-[#27272a] text-white'
                    : 'bg-[#18181b] border-[#27272a] text-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {isCurrentPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span>{check.label}</span>
                    </span>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                        isCurrentPassed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCurrentPassed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#a1a1aa] min-h-[32px] break-words">
                    {check.isLink ? (
                      <a
                        href={check.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <span className="truncate max-w-[190px]">{check.desc}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ) : (
                      <p className="line-clamp-2">{check.desc}</p>
                    )}
                    {check.canExpand && (
                      <button
                        type="button"
                        onClick={() => setIsExpandedDesc(!isExpandedDesc)}
                        className="text-[10px] text-brand-orange hover:underline mt-0.5 block"
                      >
                        {isExpandedDesc ? 'Show less' : 'View full description'}
                      </button>
                    )}
                  </div>

                  {check.thumbnail && (
                    <div className="pt-1">
                      <img
                        src={check.thumbnail}
                        alt="Screenshot thumbnail"
                        className="w-full h-16 object-cover rounded-lg border border-[#27272a] bg-black/40 cursor-pointer hover:opacity-90"
                        onClick={() => setActiveTab('deliverable')}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2.5 mt-2 border-t border-[#27272a] flex items-center justify-between">
                  <span className="text-[10px] text-[#71717a] font-mono">Verdict</span>
                  <PassFailControl
                    label={check.label}
                    status={
                      isExplicitlyPassed ? true : isExplicitlyFailed ? false : undefined
                    }
                    onPass={() => handlePass(check.checkKey)}
                    onFail={() => handleFail(check.checkKey)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disallowed Host Blocker Alert Banner */}
      {isProhibitedHost && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex items-start gap-3 shadow-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 flex-1">
            <span className="font-bold text-rose-300 block text-sm">
              Instant GitBook Blocker: Disallowed Web or Video Host
            </span>
            <p className="text-rose-200/90 leading-relaxed">{prohibitedReason}</p>
            <div className="pt-1">
              <span className="text-[11px] text-rose-300 font-mono">
                Playable URL: {playableUrl}
              </span>
            </div>
          </div>
          {onEarlyExit && (
            <button
              type="button"
              onClick={() => onEarlyExit(`Disallowed Host: ${prohibitedReason}`)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
            >
              Reject: Disallowed Host
            </button>
          )}
        </div>
      )}

      {/* WORKSPACE CONTENT: README & DELIVERABLES */}
      <div className="flex-1 flex flex-col min-h-0 space-y-6">
        {/* Split View */}
        {activeTab === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
            {/* README Panel */}
            <div className="bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
              <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-orange" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Repository README.md
                  </span>
                </div>
                {codeUrl && (
                  <a
                    href={`${codeUrl}#readme`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <span>GitHub README</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-6 select-text">
                {renderedReadme ? (
                  <div
                    className="markdown-body text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderedReadme }}
                  />
                ) : (
                  <div className="py-16 text-center text-xs text-[#71717a]">
                    No README.md discovered in repository root.
                  </div>
                )}
              </div>
            </div>

            {/* Deliverable & Screenshot Panel */}
            <div className="bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
              <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-orange" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Playable Deliverable & Screenshot
                  </span>
                </div>
                {playableUrl && (
                  <a
                    href={playableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <span>Open External</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Screenshot Card */}
                {screenshotUrl && (
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#a1a1aa] block">
                      Submitted Deliverable Screenshot
                    </span>
                    <div className="rounded-xl border border-[#27272a] overflow-hidden bg-black/60 shadow-md">
                      <img
                        src={screenshotUrl}
                        alt="Submitted Deliverable Screenshot"
                        className="w-full max-h-72 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Deliverable Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#a1a1aa] block">
                    Playable Testing
                  </span>
                  {isYouTube ? (
                    <div className="rounded-xl overflow-hidden border border-[#27272a] aspect-video">
                      <iframe
                        src={getYouTubeEmbedUrl(playableUrl)}
                        title="YouTube video player"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : isDirectVideo ? (
                    <video src={playableUrl} controls className="w-full rounded-xl border border-[#27272a]" />
                  ) : playableUrl && !isGitHubUrl ? (
                    <div className="rounded-xl overflow-hidden border border-[#27272a] h-72 bg-white">
                      <iframe
                        key={iframeKey}
                        src={playableUrl}
                        title="Playable Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-[#18181b] border border-[#27272a] text-center text-xs text-[#a1a1aa]">
                      <p>Playable link points to GitHub or external host.</p>
                      <a
                        href={playableUrl || codeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange text-white font-semibold text-xs"
                      >
                        <span>Open Deliverable URL</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'readme' ? (
          /* Full README View */
          <div className="bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg flex-1 min-h-[500px]">
            <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-orange" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Repository README.md
                </span>
                {gitHubData?.defaultBranch && (
                  <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">
                    branch: {gitHubData.defaultBranch}
                  </span>
                )}
              </div>

              {codeUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={`${codeUrl}#readme`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 select-text">
              {renderedReadme ? (
                <div
                  className="markdown-body text-xs leading-relaxed max-w-4xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: renderedReadme }}
                />
              ) : (
                <div className="py-24 text-center text-xs text-[#71717a] space-y-2">
                  <FileCode className="w-8 h-8 text-[#52525b] mx-auto" />
                  <p>No README.md discovered in repository root.</p>
                  <p className="text-[11px] text-[#52525b]">
                    GitBook guidelines require setup and usage documentation for software submissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Deliverables & Playable Testing View */
          <div className="space-y-6 flex-1">
            {/* Submitted Screenshot Highlight Card */}
            {screenshotUrl && (
              <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white shadow-lg space-y-3 shrink-0">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-brand-orange" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Submitted Deliverable Screenshot
                    </h3>
                  </div>
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
                  >
                    <span>Open Fullscreen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="rounded-xl overflow-hidden border border-[#27272a] bg-black/50 p-2 flex justify-center">
                  <img
                    src={screenshotUrl}
                    alt="Submitted Project Deliverable"
                    className="max-h-96 w-auto object-contain rounded-lg shadow"
                  />
                </div>
              </div>
            )}

            {/* Interactive Playable Sandbox / Video / Releases */}
            <div className="bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg min-h-[440px]">
              <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-orange" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Playable Sandbox & Testing
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!isGitHubUrl && !isYouTube && (
                    <div className="flex items-center bg-[#27272a] rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewportMode('desktop')}
                        className={`p-1.5 rounded-md ${
                          viewportMode === 'desktop'
                            ? 'bg-[#18181b] text-brand-orange'
                            : 'text-[#a1a1aa] hover:text-white'
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
                            ? 'bg-[#18181b] text-brand-orange'
                            : 'text-[#a1a1aa] hover:text-white'
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
                      className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Open Playable Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-center items-center">
                {isYouTube ? (
                  <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden border border-[#27272a]">
                    <iframe
                      src={getYouTubeEmbedUrl(playableUrl)}
                      title="YouTube video player"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : isDirectVideo ? (
                  <video
                    src={playableUrl}
                    controls
                    className="w-full max-w-3xl rounded-xl border border-[#27272a]"
                  />
                ) : playableUrl && !isGitHubUrl ? (
                  <div
                    className={`w-full transition-all rounded-xl overflow-hidden border border-[#27272a] bg-white h-[450px] ${
                      viewportMode === 'mobile' ? 'max-w-sm mx-auto shadow-2xl' : 'max-w-full'
                    }`}
                  >
                    <iframe
                      key={iframeKey}
                      src={playableUrl}
                      title="Playable Demo"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[#a1a1aa] space-y-3">
                    <PackageCheck className="w-10 h-10 text-[#52525b] mx-auto" />
                    <p className="font-semibold text-white">External Demo or Compiled Application</p>
                    <p className="max-w-md mx-auto text-[#71717a]">
                      The provided Playable URL is either a GitHub release, an external store, or requires standalone execution.
                    </p>
                    {hasBinaryReleases && (
                      <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-emerald-400 font-mono inline-block">
                        ✓ GitHub release contains downloadable binary assets (.exe / .dmg / .AppImage)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-content-tertiary">
            {passedCount === 7 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All 7 GitBook Shipped Requirements Passed
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {7 - passedCount} requirement(s) pending verification
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2.5 rounded-lg bg-brand-orange text-white text-xs font-semibold hover:bg-orange-600 transition-colors shadow-sm cursor-pointer"
        >
          Next: Telemetry & Introspect →
        </button>
      </div>
    </div>
  );
};
