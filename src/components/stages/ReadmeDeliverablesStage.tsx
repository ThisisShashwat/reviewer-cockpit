import React, { useMemo } from 'react';
import { Marked } from 'marked';
import 'github-markdown-css/github-markdown-dark.css';
import {
  CheckCircle2,
  ExternalLink,
  FileCode,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  AlertTriangle,
  FolderGit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { parseGitHubRepo } from '../../lib/api';
import { PassFailControl } from '../common/PassFailControl';
import { decodeHtmlEntities } from '../../lib/utils';

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
  onEarlyExit: _onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  const codeUrl = (project.codeUrl || '').trim();
  const readmeContent = gitHubData?.readmeContent || '';
  const screenshotUrl = (project.screenshotUrl || '').trim();
  const cleanProjectName = decodeHtmlEntities(project.projectName || '').trim();
  const cleanDescription = decodeHtmlEntities(project.description || '').trim();

  // Multi-link support: all repository links
  const allRepos =
    project.allCodeUrls && project.allCodeUrls.length > 0
      ? project.allCodeUrls
      : [codeUrl].filter(Boolean);

  const handlePass = (key: string) => {
    onToggleChecklist?.(key, true);
  };

  const handleFail = (key: string) => {
    onToggleChecklist?.(key, false);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Copied URL to clipboard');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Status checks for Stage 2
  const hasName = Boolean(cleanProjectName.length >= 2);
  const isNameExplicitPassed = reviewChecklist['shipped_name_valid'] === true;
  const isNameExplicitFailed = reviewChecklist['shipped_name_valid'] === false;
  const isNamePassed =
    isNameExplicitPassed || (isNameExplicitFailed ? false : hasName);

  const hasCode = Boolean(codeUrl && codeUrl.includes('github.com'));
  const isCodeExplicitPassed = reviewChecklist['shipped_code_valid'] === true;
  const isCodeExplicitFailed = reviewChecklist['shipped_code_valid'] === false;
  const isCodePassed =
    isCodeExplicitPassed || (isCodeExplicitFailed ? false : hasCode);

  const hasDesc = Boolean(cleanDescription.length >= 10);
  const isDescExplicitPassed = reviewChecklist['shipped_desc_valid'] === true;
  const isDescExplicitFailed = reviewChecklist['shipped_desc_valid'] === false;
  const isDescPassed =
    isDescExplicitPassed || (isDescExplicitFailed ? false : hasDesc);

  const hasScreenshot = Boolean(screenshotUrl && screenshotUrl.length > 5);
  const isScreenshotExplicitPassed = reviewChecklist['shipped_screenshot_valid'] === true;
  const isScreenshotExplicitFailed = reviewChecklist['shipped_screenshot_valid'] === false;
  const isScreenshotPassed =
    isScreenshotExplicitPassed || (isScreenshotExplicitFailed ? false : hasScreenshot);

  const hasReadme = Boolean(readmeContent && readmeContent.length > 30);
  const isReadmeExplicitPassed = reviewChecklist['shipped_readme_valid'] === true;
  const isReadmeExplicitFailed = reviewChecklist['shipped_readme_valid'] === false;
  const isReadmePassed =
    isReadmeExplicitPassed || (isReadmeExplicitFailed ? false : hasReadme);

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

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col select-text">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 2 of 6
            </span>
            <span className="text-xs text-content-tertiary">Deliverables & README Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Project Deliverables, Screenshot & README Documentation
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit core project metadata: title, repository source code, untruncated description, submitted deliverable image, and README setup instructions.
          </p>
        </div>
      </div>

      {/* 1. CORE PROJECT METADATA CARD (Perfect Alignment) */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 text-white shadow-xl space-y-5 shrink-0">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-brand-orange" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Project Identification & Source Code
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#a1a1aa]">
            GitBook Rules Requirement 1, 2 & 3
          </span>
        </div>

        {/* Row 1: Project Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#18181b] border border-[#27272a]">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Project Title</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isNamePassed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isNamePassed ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <p className="text-sm font-bold text-white tracking-wide truncate">
              {cleanProjectName || <span className="text-rose-400 font-normal">Missing project name</span>}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] text-[#71717a] font-mono">Check</span>
            <PassFailControl
              label="Project Title"
              status={
                isNameExplicitPassed ? true : isNameExplicitFailed ? false : undefined
              }
              onPass={() => handlePass('shipped_name_valid')}
              onFail={() => handleFail('shipped_name_valid')}
            />
          </div>
        </div>

        {/* Row 2: Source Code Repository URL(s) - Untruncated */}
        <div className="space-y-2">
          {allRepos.map((repoUrl, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#18181b] border border-[#27272a]"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {allRepos.length > 1 ? `Source Code Repo ${idx + 1}` : 'Source Code Repository'}
                  </span>
                  {idx === 0 && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isCodePassed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCodePassed ? 'PASS' : 'FAIL'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-brand-orange hover:underline truncate inline-flex items-center gap-1.5"
                    title={repoUrl}
                  >
                    <span className="truncate">{repoUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyUrl(repoUrl)}
                    className="p-1 rounded text-[#a1a1aa] hover:text-white hover:bg-[#27272a] cursor-pointer shrink-0"
                    title="Copy URL"
                  >
                    {copiedUrl === repoUrl ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {idx === 0 && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-[#71717a] font-mono">Check</span>
                  <PassFailControl
                    label="Source Code"
                    status={
                      isCodeExplicitPassed ? true : isCodeExplicitFailed ? false : undefined
                    }
                    onPass={() => handlePass('shipped_code_valid')}
                    onFail={() => handleFail('shipped_code_valid')}
                  />
                </div>
              )}
            </div>
          ))}

          {allRepos.length === 0 && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
              <span className="font-semibold">No source code repository provided.</span>
              <PassFailControl
                label="Source Code"
                status={false}
                onPass={() => handlePass('shipped_code_valid')}
                onFail={() => handleFail('shipped_code_valid')}
              />
            </div>
          )}
        </div>

        {/* Row 3: Full Untruncated Description Box */}
        <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Project Description</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isDescPassed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isDescPassed ? 'PASS' : 'FAIL'}
              </span>
              <span className="text-[11px] font-mono text-[#a1a1aa]">
                ({cleanDescription.length} characters)
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-[#71717a] font-mono">Check</span>
              <PassFailControl
                label="Description"
                status={
                  isDescExplicitPassed ? true : isDescExplicitFailed ? false : undefined
                }
                onPass={() => handlePass('shipped_desc_valid')}
                onFail={() => handleFail('shipped_desc_valid')}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#121214] border border-[#27272a] text-xs text-[#d4d4d8] leading-relaxed whitespace-pre-wrap select-text">
            {cleanDescription || (
              <span className="text-rose-400 italic">No project description provided.</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUBMITTED DELIVERABLE SCREENSHOT CARD */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 text-white shadow-xl space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-brand-orange" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Submitted Deliverable Screenshot
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ml-2 ${
                isScreenshotPassed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isScreenshotPassed ? 'PASS' : 'FAIL'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {screenshotUrl && (
              <a
                href={screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
              >
                <span>Open Original Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#71717a] font-mono">Check</span>
              <PassFailControl
                label="Screenshot"
                status={
                  isScreenshotExplicitPassed
                    ? true
                    : isScreenshotExplicitFailed
                    ? false
                    : undefined
                }
                onPass={() => handlePass('shipped_screenshot_valid')}
                onFail={() => handleFail('shipped_screenshot_valid')}
              />
            </div>
          </div>
        </div>

        {screenshotUrl ? (
          <div className="rounded-xl overflow-hidden border border-[#27272a] bg-black/60 p-3 flex justify-center items-center shadow-inner">
            <img
              src={screenshotUrl}
              alt="Submitted Project Deliverable Screenshot"
              className="max-h-[500px] w-auto max-w-full object-contain rounded-lg shadow-lg"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#18181b] border border-[#27272a] text-center text-xs text-[#a1a1aa] space-y-2">
            <ImageIcon className="w-8 h-8 text-[#52525b] mx-auto" />
            <p className="font-semibold text-rose-400">No screenshot image attached to submission.</p>
            <p className="text-[11px] text-[#71717a]">
              GitBook guidelines require an image screenshot of the completed deliverable.
            </p>
          </div>
        )}
      </div>

      {/* 3. REPOSITORY DOCUMENTATION (README.md) VIEWER */}
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl overflow-hidden text-white shadow-xl flex flex-col shrink-0 min-h-[600px]">
        {/* README Header */}
        <div className="p-4 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-brand-orange" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Repository README.md Documentation
            </span>
            {gitHubData?.defaultBranch && (
              <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded">
                branch: {gitHubData.defaultBranch}
              </span>
            )}
          </div>

          {codeUrl && (
            <a
              href={`${codeUrl}#readme`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* README Body Viewer */}
        <div className="p-8 select-text bg-[#0d0d0f] overflow-y-auto max-h-[700px]">
          {renderedReadme ? (
            <div
              className="markdown-body text-xs leading-relaxed max-w-4xl mx-auto"
              dangerouslySetInnerHTML={{ __html: renderedReadme }}
            />
          ) : (
            <div className="py-20 text-center text-xs text-[#71717a] space-y-2">
              <FileCode className="w-8 h-8 text-[#52525b] mx-auto" />
              <p className="font-semibold text-rose-400">No README.md discovered in repository root.</p>
              <p className="text-[11px] text-[#71717a]">
                GitBook guidelines require setup, execution, and feature documentation for all software submissions.
              </p>
            </div>
          )}
        </div>

        {/* README Footer: Pass/Fail Control Placed Directly Beneath */}
        <div className="p-4 bg-[#18181b] border-t border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isReadmePassed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isReadmePassed ? 'PASS' : 'FAIL'}
            </span>
            <span className="text-xs text-[#a1a1aa]">
              {readmeContent
                ? `${readmeContent.length.toLocaleString()} characters of documentation`
                : 'Missing repository README'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#71717a] font-mono">README Check</span>
            <PassFailControl
              label="README"
              status={
                isReadmeExplicitPassed ? true : isReadmeExplicitFailed ? false : undefined
              }
              onPass={() => handlePass('shipped_readme_valid')}
              onFail={() => handleFail('shipped_readme_valid')}
            />
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          {isNamePassed && isCodePassed && isDescPassed && isScreenshotPassed && isReadmePassed ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Core Deliverables & Documentation Verified</span>
            </span>
          ) : (
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>One or more deliverable checks pending review</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2.5 rounded-xl bg-brand-orange text-white font-bold hover:bg-orange-600 transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <span>Next: Playable Demo & Testing →</span>
        </button>
      </div>
    </div>
  );
};
