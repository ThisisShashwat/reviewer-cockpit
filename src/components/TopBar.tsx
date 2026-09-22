import React from 'react';

interface TopBarProps {
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onPrev: () => void;
  presets: Array<{ name: string; badge?: string }>;
  onSelectPreset: (index: number) => void;
  isBlocker?: boolean;
  blockerMessage?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentIndex,
  totalCount,
  onNext,
  onPrev,
  presets,
  onSelectPreset,
  isBlocker,
  blockerMessage
}) => {
  const btnClass = "bg-rv-surface2 border border-rv-border text-rv-dim px-3.5 py-1.5 rounded-md cursor-pointer text-[12px] font-inherit transition-all duration-150 hover:not-disabled:text-rv-text hover:not-disabled:border-rv-accent disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-rv-surface border-b border-rv-border shrink-0">
      <div className="flex items-center gap-2.5">
        {/* Preset Selector Dropdown styled matching Horizons */}
        <div className="flex items-center gap-1.5">
          <label className="text-[12px] text-rv-dim font-medium">Preset:</label>
          <select
            value={currentIndex}
            onChange={(e) => onSelectPreset(Number(e.target.value))}
            className="bg-rv-surface2 border border-rv-border text-rv-text px-2.5 py-1.5 rounded-md text-[12px] font-medium focus:outline-none focus:border-rv-accent cursor-pointer"
          >
            {presets.map((preset, idx) => (
              <option key={preset.name} value={idx}>
                {preset.name} {preset.badge ? `(${preset.badge})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Blocker or Warning pill matching Horizons alert badges */}
        {isBlocker ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-red-500/15 text-red-400 border-red-500/40"
            title={blockerMessage}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {blockerMessage || 'Hard Blocker Detected'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-green-500/10 text-green-400 border-green-500/30">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Ready to Review
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-[12px] text-rv-dim">
          Reviewing <strong className="text-rv-accent">{currentIndex + 1}</strong> of <strong className="text-rv-accent">{totalCount}</strong> pending
        </div>

        <button
          className={btnClass}
          onClick={onPrev}
          disabled={currentIndex <= 0}
        >
          Previous
        </button>
        <button
          className={btnClass}
          onClick={onNext}
          disabled={currentIndex >= totalCount - 1}
        >
          Skip
        </button>
      </div>
    </div>
  );
};
