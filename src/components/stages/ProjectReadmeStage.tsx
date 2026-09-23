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

interface ProjectReadmeStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
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
      return '<p class="text-content-tertiary">Unable to render README markdown.</p>';
    }
  }, [readmeContent]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckbox = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key);
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
              Stage 2 of 5
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

      {/* Metadata & URLs Inspection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {/* Code URL Card */}
        <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-brand-orange" />
              Source Code URL
            </span>
            {isCodeUrlGitHub && (
              <span className="text-[10px] font-mono text-semantic-success bg-semantic-successBg px-2 py-0.2 rounded border border-semantic-successBorder">
                Verified GitHub
              </span>
            )}
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-canvas-subtle border border-border-subtle">
            <span className="text-xs font-mono text-content-primary truncate select-all">
              {project.codeUrl || 'No code URL provided'}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => copyToClipboard(project.codeUrl, 'Code URL')}
                className="p-1 text-content-tertiary hover:text-content-primary rounded hover:bg-canvas-card"
                title="Copy Code URL"
              >
                {copiedField === 'Code URL' ? (
                  <Check className="w-3.5 h-3.5 text-semantic-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href={project.codeUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-content-tertiary hover:text-brand-orange rounded hover:bg-canvas-card"
                title="Open Code URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Playable Demo URL Card */}
        <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Playable / Demo URL
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-canvas-subtle border border-border-subtle">
            <span className="text-xs font-mono text-content-primary truncate select-all">
              {project.playableUrl || 'No playable URL provided'}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => copyToClipboard(project.playableUrl, 'Playable URL')}
                className="p-1 text-content-tertiary hover:text-content-primary rounded hover:bg-canvas-card"
                title="Copy Demo URL"
              >
                {copiedField === 'Playable URL' ? (
                  <Check className="w-3.5 h-3.5 text-semantic-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href={project.playableUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-content-tertiary hover:text-brand-orange rounded hover:bg-canvas-card"
                title="Open Demo URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Submitter Description Card */}
      <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
              Submitter Project Description
            </h3>
            {hasDescription ? (
              <span className="text-[10px] font-mono text-semantic-success bg-semantic-successBg px-1.5 py-0.2 rounded border border-semantic-successBorder">
                Detailed
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                Brief
              </span>
            )}
          </div>
          <span className="text-xs text-content-tertiary font-mono">
            {project.submittedHours} hrs requested
          </span>
        </div>
        <p className="text-xs text-content-secondary leading-relaxed bg-canvas-subtle p-3 rounded-lg border border-border-subtle">
          {project.description || 'No description provided by submitter.'}
        </p>
      </div>

      {/* Full README Render Card */}
      <div className="flex-1 min-h-[360px] bg-canvas-card border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-3.5 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-orange" />
            <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
              Repository README.md
            </span>
          </div>
          <span className="text-[11px] font-mono text-content-tertiary">
            {readmeContent ? `${readmeContent.length} characters` : 'No README found'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 select-text">
          {renderedReadme ? (
            <div
              className="prose prose-sm max-w-none text-content-secondary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedReadme }}
            />
          ) : (
            <div className="py-16 text-center text-xs text-content-tertiary space-y-2">
              <HelpCircle className="w-6 h-6 text-content-muted mx-auto" />
              <p>No README.md found in the root of repository {project.codeUrl}.</p>
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
              checked={Boolean(reviewChecklist['stage2_urls_valid'])}
              onChange={() => handleCheckbox('stage2_urls_valid')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Source code repository URL and demo links are valid, public, and accessible
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage2_desc_complete'])}
              onChange={() => handleCheckbox('stage2_desc_complete')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Project name and description accurately explain the purpose and functionality
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage2_readme_clear'])}
              onChange={() => handleCheckbox('stage2_readme_clear')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              README provides clear instructions on what the project is and how to use or run it
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
              placeholder="Reason for URL or README concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`Metadata Concern: ${flagNote.trim()}`);
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
            <span>Flag Metadata Issue</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <span>Continue to Live Demo →</span>
        </button>
      </div>
    </div>
  );
};
