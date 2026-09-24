import React from 'react';
import {
  ListFilter,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { QueueStats } from '../../lib/types';

export type AppPage = 'queue' | 'review' | 'admin';

interface TopNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  stats?: QueueStats;
  serverOnline: boolean;
  onOpenSync: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeProjectTitle?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentPage,
  onNavigate,
  stats,
  serverOnline,
  onOpenSync,
  onRefresh,
  isRefreshing,
  activeProjectTitle,
}) => {
  return (
    <header className="h-14 bg-canvas border-b border-border-subtle px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & Main Navigation */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => onNavigate('queue')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="w-6 h-6 rounded-md bg-brand-red flex items-center justify-center font-bold text-white text-xs shadow-sm">
            L
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-content-primary tracking-tight">
              Live Reviewer
            </span>
            <span className="text-[11px] font-mono text-content-muted">cockpit</span>
          </div>
        </button>

        <div className="h-4 w-[1px] bg-border-subtle" />

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate('queue')}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1.5 ${
              currentPage === 'queue'
                ? 'bg-canvas-card text-content-primary shadow-sm border border-border-subtle'
                : 'text-content-tertiary hover:text-content-secondary'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Submissions Queue</span>
            {stats && (
              <span className="ml-1 text-[11px] font-mono px-1.5 py-0.2 rounded bg-canvas-hover text-content-muted">
                {stats.total}
              </span>
            )}
          </button>

          {currentPage === 'review' && activeProjectTitle && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold text-brand-orange bg-brand-orange/10 border border-brand-orange/20">
              <span>Reviewing: {activeProjectTitle}</span>
            </div>
          )}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Server Status Pill */}
        <div
          className="flex items-center gap-1.5 text-xs text-content-tertiary"
          title={serverOnline ? 'Connected to local Cockpit server (port 3001)' : 'Server disconnected'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serverOnline ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className="text-[12px] font-mono hidden sm:inline">
            {serverOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md text-content-tertiary hover:text-content-primary hover:bg-canvas-card transition-colors"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Sync Submissions Dump Button */}
        <button
          type="button"
          onClick={onOpenSync}
          className="px-3 py-1.5 rounded-md bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors"
        >
          <Upload className="w-3 h-3 text-brand-orange" />
          <span>Sync Dump</span>
        </button>
      </div>
    </header>
  );
};
