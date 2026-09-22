import React from 'react';

export interface Tab {
  id: string;
  label: string;
  badge?: string | number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex items-end bg-rv-surface border-b border-rv-border px-3 pt-2 shrink-0 select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`relative px-4 py-2 text-[13px] font-semibold rounded-t-lg border border-b-0 cursor-pointer transition-all duration-150 -mb-px flex items-center gap-1.5 ${
              isActive
                ? 'bg-rv-bg text-rv-text border-rv-border z-10 font-bold shadow-sm'
                : 'bg-transparent text-rv-dim border-transparent hover:text-rv-text hover:bg-rv-surface2'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-rv-blue text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
