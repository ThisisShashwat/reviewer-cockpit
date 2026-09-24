import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  Flame,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { CockpitProject, CockpitStatus, QueueStats } from '../lib/types';

interface TopBarProps {
  currentIndex: number;
  totalProjects: number;
  projects: CockpitProject[];
  currentProject?: CockpitProject;
  stats?: QueueStats;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  onSelectProject: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  serverOnline: boolean;
  onOpenSync: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentIndex,
  totalProjects,
  projects,
  currentProject,
  stats,
  statusFilter,
  onFilterChange,
  onSelectProject,
  onPrev,
  onNext,
  serverOnline,
  onOpenSync,
  onRefresh,
  isRefreshing,
}) => {
  const getStatusBadge = (status: CockpitStatus) => {
    switch (status) {
      case 'pre_approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Pre-Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'flagged_fraud':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> Flagged Fraud
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  return (
    <header className="h-14 bg-rv-surface border-b border-rv-border px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & Queue Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rv-accent to-rv-brand flex items-center justify-center shadow-md">
            <Flame className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wide text-rv-text flex items-center gap-1.5">
              HORIZONS <span className="text-rv-accent font-normal text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rv-accent/15">Cockpit</span>
            </span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-rv-border" />

        {/* Project Stepping Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex <= 0}
            title="Previous submission (Press P)"
            className="p-1.5 rounded-md bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Project Switcher Select */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rv-surface2 border border-rv-border">
            <span className="text-[11px] font-mono font-medium text-rv-dim">
              {totalProjects > 0 ? `${currentIndex + 1}/${totalProjects}` : '0/0'}
            </span>
            {projects.length > 0 && (
              <select
                value={currentIndex}
                onChange={(e) => onSelectProject(Number(e.target.value))}
                className="bg-transparent text-xs font-medium text-rv-text focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                {projects.map((p, idx) => (
                  <option key={p.id} value={idx} className="bg-rv-surface text-rv-text">
                    {p.projectName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= totalProjects - 1}
            title="Next submission (Press N)"
            className="p-1.5 rounded-md bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Project Status Chip */}
        {currentProject && getStatusBadge(currentProject.cockpitStatus)}
      </div>

      {/* Center Filter Tabs */}
      <div className="hidden lg:flex items-center gap-1 bg-rv-surface2 p-1 rounded-lg border border-rv-border text-xs">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1 rounded-md font-medium transition-all ${
            statusFilter === 'all'
              ? 'bg-rv-surface text-rv-text shadow-sm border border-rv-border'
              : 'text-rv-dim hover:text-rv-text'
          }`}
        >
          All ({stats?.total ?? totalProjects})
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('pending')}
          className={`px-3 py-1 rounded-md font-medium transition-all ${
            statusFilter === 'pending'
              ? 'bg-rv-surface text-blue-400 shadow-sm border border-rv-border'
              : 'text-rv-dim hover:text-rv-text'
          }`}
        >
          Pending ({stats?.pending ?? 0})
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('pre_approved')}
          className={`px-3 py-1 rounded-md font-medium transition-all ${
            statusFilter === 'pre_approved'
              ? 'bg-rv-surface text-emerald-400 shadow-sm border border-rv-border'
              : 'text-rv-dim hover:text-rv-text'
          }`}
        >
          Pre-Approved ({stats?.preApproved ?? 0})
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('rejected')}
          className={`px-3 py-1 rounded-md font-medium transition-all ${
            statusFilter === 'rejected'
              ? 'bg-rv-surface text-red-400 shadow-sm border border-rv-border'
              : 'text-rv-dim hover:text-rv-text'
          }`}
        >
          Rejected ({stats?.rejected ?? 0})
        </button>
      </div>

      {/* Right Controls & Tools */}
      <div className="flex items-center gap-2.5">
        {/* Server Status Indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rv-surface2 border border-rv-border text-[11px] font-mono text-rv-dim"
          title={serverOnline ? 'Connected to local Cockpit server (port 3001)' : 'Server unreachable'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="hidden sm:inline">
            {serverOnline ? 'Server Live' : 'Disconnected'}
          </span>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh projects and history"
          className="p-2 rounded-lg bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Sync Modal Button */}
        <button
          type="button"
          onClick={onOpenSync}
          className="px-3 py-1.5 rounded-lg bg-rv-surface2 border border-rv-border text-xs font-semibold text-rv-text hover:bg-rv-surface3 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Database className="w-3.5 h-3.5 text-rv-accent" />
          <span>Sync Live Dump</span>
        </button>
      </div>
    </header>
  );
};
