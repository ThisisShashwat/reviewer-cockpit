import React from 'react';

interface ReadmePanelProps {
  markdown: string;
  loading?: boolean;
}

export const ReadmePanel: React.FC<ReadmePanelProps> = ({ markdown, loading }) => {
  return (
    <div className="readme-content h-full overflow-y-auto px-6 py-5 text-sm leading-[1.7] text-rv-text bg-rv-bg">
      {loading ? (
        <div className="flex items-center justify-center p-12 text-rv-dim text-sm">
          Loading README...
        </div>
      ) : markdown ? (
        <div className="space-y-4 max-w-4xl">
          <pre className="bg-rv-surface border border-rv-border rounded-lg p-5 text-[13px] font-mono text-rv-text whitespace-pre-wrap leading-relaxed">
            {markdown}
          </pre>
        </div>
      ) : (
        <p className="text-rv-dim italic">No README content available.</p>
      )}
    </div>
  );
};
