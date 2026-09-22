import React from 'react';

interface TopBarProps {
  currentIndex: number;
  presets: Array<{ name: string; badge?: string }>;
  onSelectPreset: (index: number) => void;
  recordId?: string;
  isBlocker?: boolean;
  blockerMessage?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentIndex,
  presets,
  onSelectPreset,
  recordId,
  isBlocker,
  blockerMessage
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-rv-surface border-b border-rv-border shrink-0 select-none">
      <div className="flex items-center gap-3">
        
        {/* Project Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rv-dim">Submission:</span>
          <select
            value={currentIndex}
            onChange={(e) => onSelectPreset(Number(e.target.value))}
            className="bg-rv-surface2 border border-rv-border text-rv-text px-3 py-1.5 rounded-md text-xs font-medium focus:outline-none focus:border-rv-accent cursor-pointer shadow-sm"
          >
            {presets.map((preset, idx) => (
              <option key={preset.name} value={idx}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Real Record ID Badge */}
        {recordId && (
          <span className="text-[11px] font-mono text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md">
            ID: {recordId}
          </span>
        )}
      </div>

      {/* Audit Blocker or Pass Status Badge */}
      <div className="flex items-center gap-2">
        {isBlocker ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border bg-red-50 text-red-700 border-red-200 shadow-sm"
            title={blockerMessage}
          >
            <svg className="w-3.5 h-3.5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {blockerMessage || 'Hard Blocker Detected'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border bg-green-50 text-green-700 border-green-200 shadow-sm">
            <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Ready to Review
          </span>
        )}
      </div>
    </div>
  );
};
