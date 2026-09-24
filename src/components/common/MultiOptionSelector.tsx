import React from 'react';

export type OptionColor = 'emerald' | 'amber' | 'purple' | 'rose' | 'blue';

export interface SelectorOption<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color: OptionColor;
  description?: string;
}

interface MultiOptionSelectorProps<T extends string = string> {
  value?: T;
  options: SelectorOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'xs';
}

const COLOR_CLASSES: Record<OptionColor, string> = {
  emerald: 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400 shadow-sm',
  amber: 'bg-amber-600 text-white font-bold ring-1 ring-amber-400 shadow-sm',
  purple: 'bg-purple-600 text-white font-bold ring-1 ring-purple-400 shadow-sm',
  rose: 'bg-rose-600 text-white font-bold ring-1 ring-rose-400 shadow-sm',
  blue: 'bg-blue-600 text-white font-bold ring-1 ring-blue-400 shadow-sm',
};

export function MultiOptionSelector<T extends string = string>({
  value,
  options,
  onChange,
  size = 'xs',
}: MultiOptionSelectorProps<T>) {
  const paddingClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]';

  return (
    <div className="flex flex-wrap items-center gap-1.5 select-none">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        const Icon = opt.icon;
        const activeClass = COLOR_CLASSES[opt.color] || COLOR_CLASSES.emerald;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium ${paddingClass} ${
              isSelected
                ? activeClass
                : 'bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46]'
            }`}
            title={opt.description || opt.label}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
