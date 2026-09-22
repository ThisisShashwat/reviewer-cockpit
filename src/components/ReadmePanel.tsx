import React, { useMemo } from 'react';
import { marked } from 'marked';

interface ReadmePanelProps {
  markdown: string;
  loading?: boolean;
}

export const ReadmePanel: React.FC<ReadmePanelProps> = ({ markdown, loading }) => {
  const html = useMemo(() => {
    if (!markdown) return '';
    try {
      return marked.parse(markdown) as string;
    } catch {
      return markdown;
    }
  }, [markdown]);

  return (
    <div className="h-full overflow-y-auto px-8 py-6 bg-rv-surface select-text">
      {loading ? (
        <div className="flex items-center justify-center p-12 text-rv-dim text-sm">
          Loading repository README...
        </div>
      ) : html ? (
        <div 
          className="readme-content max-w-4xl mx-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-rv-dim italic">No README content found in default branch.</p>
      )}
    </div>
  );
};
