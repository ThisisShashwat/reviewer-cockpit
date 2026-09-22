import React from 'react';

interface ProjectCardPanelProps {
  projectTitle: string;
  projectDescription: string;
  projectType: string;
  demoUrl: string | null;
  codeUrl: string | null;
  readmeUrl?: string | null;
  screenshotUrl?: string | null;
}

export const ProjectCardPanel: React.FC<ProjectCardPanelProps> = ({
  projectTitle,
  projectDescription,
  projectType,
  demoUrl,
  codeUrl,
  readmeUrl,
  screenshotUrl,
}) => {
  return (
    <div className="h-full flex flex-col overflow-y-auto bg-rv-bg p-6 gap-5 select-text">
      {/* Screenshot / Media placeholder */}
      {screenshotUrl ? (
        <div className="flex-1 min-h-40 border border-rv-border rounded-lg overflow-hidden bg-rv-surface">
          <img
            className="w-full h-full object-contain bg-rv-surface2 block"
            src={screenshotUrl}
            alt={projectTitle}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-24 border border-rv-border rounded-lg overflow-hidden bg-rv-surface2 flex items-center justify-center text-rv-dim text-sm">
          No screenshot submitted
        </div>
      )}

      {/* Title + Track / Type Badge */}
      <div className="shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold m-0 leading-tight text-rv-text">
            {projectTitle || 'Untitled Project'}
          </h2>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded bg-rv-surface2 border border-rv-border text-rv-dim font-mono">
            {projectType}
          </span>
        </div>

        {projectDescription ? (
          <p className="text-sm text-rv-dim m-0 leading-relaxed whitespace-pre-wrap">
            {projectDescription}
          </p>
        ) : (
          <p className="text-sm text-rv-dim italic m-0">No description provided.</p>
        )}
      </div>

      {/* Links Rows */}
      <div className="shrink-0 flex flex-col gap-2.5 pt-2 border-t border-rv-border">
        {demoUrl && (
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-rv-dim font-semibold w-16 shrink-0 text-[13px]">Demo</span>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rv-blue truncate hover:underline text-[13px] font-mono"
            >
              {demoUrl}
            </a>
          </div>
        )}
        {codeUrl && (
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-rv-dim font-semibold w-16 shrink-0 text-[13px]">Code</span>
            <a
              href={codeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rv-blue truncate hover:underline text-[13px] font-mono"
            >
              {codeUrl}
            </a>
          </div>
        )}
        {readmeUrl && (
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-rv-dim font-semibold w-16 shrink-0 text-[13px]">README</span>
            <a
              href={readmeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rv-blue truncate hover:underline text-[13px] font-mono"
            >
              {readmeUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
