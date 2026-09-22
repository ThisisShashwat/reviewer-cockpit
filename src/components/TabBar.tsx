import React from 'react';

export interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex items-end bg-rv-surface border-b border-rv-border px-2 pt-1.5 shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`relative px-4 py-2 text-[12px] font-semibold rounded-t-lg border border-b-0 cursor-pointer transition-all duration-150 -mb-px ${
              isActive
                ? 'bg-rv-bg text-rv-text border-rv-border z-10'
                : 'bg-transparent text-rv-dim border-transparent hover:text-rv-text hover:bg-rv-surface2'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
