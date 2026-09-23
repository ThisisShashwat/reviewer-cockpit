import React from 'react';
import { Check, X } from 'lucide-react';

export interface PassFailControlProps {
  label: React.ReactNode;
  description?: string;
  status: boolean | undefined;
  onPass: () => void;
  onFail: () => void;
}

export const PassFailControl: React.FC<PassFailControlProps> = ({
  label,
  description,
  status,
  onPass,
  onFail,
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white gap-3 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-[#f4f4f5] leading-snug">
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-[#a1a1aa] mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 select-none">
        <button
          type="button"
          onClick={onPass}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            status === true
              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400 font-bold'
              : 'bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46]'
          }`}
          title="Mark as Passed"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Pass</span>
        </button>

        <button
          type="button"
          onClick={onFail}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            status === false
              ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400 font-bold'
              : 'bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46]'
          }`}
          title="Mark as Failed / Concern"
        >
          <X className="w-3.5 h-3.5" />
          <span>Fail</span>
        </button>
      </div>
    </div>
  );
};
