import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import {
  ExternalLink,
  FileCode,
  FileText,
  Globe,
  HelpCircle,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface ProjectReadmeStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

export const ProjectReadmeStage: React.FC<ProjectReadmeStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const readmeContent = gitHubData?.readmeContent || '';

  const renderedReadme = useMemo(() => {
    if (!readmeContent) return null;
    try {
      return marked.parse(readmeContent) as string;
    } catch {
      return '<p class="text-[#71717a]">Unable to render README markdown.</p>';
    }
  }, [readmeContent]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field}`);
    setTimeout(() => setCopiedField(null), 2000);
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

  const isCodeUrlGitHub = (project.codeUrl || '').includes('github.com');
  const hasDescription = (project.description || '').trim().length > 10;

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 3 of 6
            </span>
            <span className="text-xs text-content-tertiary">Deliverable Overview & README</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Project Overview, Links & README Verification
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm that URLs are valid, project details and descriptions are coherent, and verify instructions in the repository README.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={project.codeUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>GitHub Repo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Metadata & URLs Inspection Cards (Dark Console Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {/* Code URL Card */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-brand-orange" />
              Source Code Repository
            </span>
            {isCodeUrlGitHub && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20">
                Verified GitHub
              </span>
            )}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181b] border border-[#27272a]">
            <span className="text-xs font-mono text-white truncate select-all">
              {project.codeUrl || 'No code URL provided'}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => copyToClipboard(project.codeUrl, 'Code URL')}
                className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] cursor-pointer"
                title="Copy Code URL"
              >
                {copiedField === 'Code URL' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href={project.codeUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-[#a1a1aa] hover:text-brand-orange rounded hover:bg-[#27272a]"
                title="Open Code URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Playable Demo URL Card */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Playable / Demo URL
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181b] border border-[#27272a]">
            <span className="text-xs font-mono text-white truncate select-all">
              {project.playableUrl || 'No playable URL provided'}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => copyToClipboard(project.playableUrl, 'Playable URL')}
                className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#27272a] cursor-pointer"
                title="Copy Demo URL"
              >
                {copiedField === 'Playable URL' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href={project.playableUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-[#a1a1aa] hover:text-brand-orange rounded hover:bg-[#27272a]"
                title="Open Demo URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Submitter Description Card */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3 shadow-lg shrink-0">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Submitter Project Description
            </h3>
            {hasDescription ? (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                Detailed
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                Brief
              </span>
            )}
          </div>
          <span className="text-xs text-[#a1a1aa] font-mono">
            {project.submittedHours} hrs requested
          </span>
        </div>
        <p className="text-xs text-[#d4d4d8] leading-relaxed bg-[#18181b] p-3.5 rounded-xl border border-[#27272a] whitespace-pre-wrap">
          {project.description || 'No description provided by submitter.'}
        </p>
      </div>

      {/* Full README Render Card */}
      <div className="flex-1 min-h-[360px] bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
        <div className="p-4 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-orange" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Repository README.md
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#a1a1aa]">
            {readmeContent ? `${readmeContent.length} characters` : 'No README found'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 select-text">
          {renderedReadme ? (
            <div
              className="prose prose-invert prose-sm max-w-none text-[#d4d4d8] leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{ __html: renderedReadme }}
            />
          ) : (
            <div className="py-16 text-center text-xs text-[#71717a] space-y-2">
              <HelpCircle className="w-6 h-6 text-[#52525b] mx-auto" />
              <p>No README.md found in the root of repository {project.codeUrl}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Reviewer Pass/Fail Checklist */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg shrink-0">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Stage 3 Verification: Deliverable & Documentation Checks
          </h3>
          <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
        </div>

        <div className="space-y-2.5">
          <PassFailControl
            label="Source Code & Demo URLs Valid & Accessible"
            description="Repository is public on GitHub and playable demo URL resolves without connection errors."
            status={reviewChecklist['stage3_urls_valid']}
            onPass={() => handlePass('stage3_urls_valid')}
            onFail={() => handleFail('stage3_urls_valid')}
          />

          <PassFailControl
            label="Project Description & Name Coherent"
            description="Submitted title and summary accurately describe what was built and matches the repo code."
            status={reviewChecklist['stage3_description_coherent']}
            onPass={() => handlePass('stage3_description_coherent')}
            onFail={() => handleFail('stage3_description_coherent')}
          />

          <PassFailControl
            label="README Exists with Usage / Setup Instructions"
            description="Repository contains clear setup, build, or operating steps for the reviewer."
            status={reviewChecklist['stage3_readme_present']}
            onPass={() => handlePass('stage3_readme_present')}
            onFail={() => handleFail('stage3_readme_present')}
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
              placeholder="Reason for deliverable or documentation concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`README Concern: ${flagNote.trim()}`);
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
            <span>Flag Documentation Concern</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>Continue to Playable Demo Testing →</span>
        </button>
      </div>
    </div>
  );
};
