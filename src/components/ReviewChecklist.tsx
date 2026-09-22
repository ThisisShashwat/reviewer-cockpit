import React from 'react';

interface ReviewChecklistProps {
  checkedItems: number[];
  onToggleItem: (index: number) => void;
}

const CHECKLIST_ITEMS = [
  'README exists with setup/run instructions',
  'Playable URL / Release binary runs as expected',
  'Code repo is public and accessible',
  'Code is original (not AI slop, tutorial clone, or plagiarism)',
  'Commits show incremental progress matching claimed hours',
  'Hours are proportional to project scope and complexity',
  'Deliverable accurately represents the project',
];

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  checkedItems,
  onToggleItem,
}) => {
  return (
    <div className="shrink-0 grow-0 basis-auto border-t border-rv-border px-4 py-3.5 bg-rv-surface select-none">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-rv-dim font-semibold mb-2.5">
        <span>Review Checklist</span>
        <span className="text-[11px] font-normal text-gray-500 font-mono">
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
                    ? 'bg-green-600 border-green-600 text-white font-bold text-[11px]'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isChecked && '✓'}
              </div>
              <span
                className={`text-[13px] leading-[1.4] ${
                  isChecked ? 'text-gray-400 line-through' : 'text-gray-800'
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
