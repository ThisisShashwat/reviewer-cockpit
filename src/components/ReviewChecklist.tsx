import React from 'react';

interface ReviewChecklistProps {
  checkedItems: number[];
  onToggleItem: (index: number) => void;
}

const CHECKLIST_ITEMS = [
  'README exists with setup/run instructions',
  'Playable URL works without building from source',
  'Code repo is public and accessible',
  'Code is original (not AI slop, tutorial clone, or plagiarism)',
  'Commits show incremental progress matching claimed hours',
  'Hours are proportional to project scope and complexity',
  'Screenshot / demo accurately represents the project',
];

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  checkedItems,
  onToggleItem,
}) => {
  return (
    <div className="shrink-0 grow-0 basis-auto border-t border-rv-border px-4 py-3.5 bg-rv-surface">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.8px] text-rv-dim font-semibold mb-2.5">
        <span>Review Checklist</span>
        <span className="text-[11px] font-normal text-rv-dim font-mono">
          {checkedItems.length}/{CHECKLIST_ITEMS.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item, index) => {
          const isChecked = checkedItems.includes(index);
          return (
            <button
              key={item}
              className="flex items-start gap-2 py-1 select-none bg-transparent border-none w-full text-left font-inherit cursor-pointer hover:opacity-85 text-rv-text"
              onClick={() => onToggleItem(index)}
            >
              <div
                className={`w-4 h-4 rounded-[3px] border-[1.5px] shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                  isChecked
                    ? 'bg-rv-green border-rv-green text-white font-bold text-[11px]'
                    : 'border-rv-border bg-rv-bg'
                }`}
              >
                {isChecked && '✓'}
              </div>
              <span
                className={`text-[13px] leading-[1.4] ${
                  isChecked ? 'text-rv-dim line-through' : 'text-rv-text'
                }`}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
