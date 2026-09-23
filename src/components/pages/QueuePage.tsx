import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { CockpitProject, CockpitStatus, QueueStats } from '../../lib/types';

interface QueuePageProps {
  projects: CockpitProject[];
  stats?: QueueStats;
  onSelectProject: (project: CockpitProject) => void;
  isLoading: boolean;
}

export const QueuePage: React.FC<QueuePageProps> = ({
  projects,
  stats,
  onSelectProject,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Filter projects based on search query, status, and track
  const filteredProjects = useMemo(() => {
    let list = projects;

    if (selectedStatus !== 'all') {
      list = list.filter((p) => p.cockpitStatus === selectedStatus);
    }

    if (selectedTrack !== 'all') {
      list = list.filter((p) => p.projectType === selectedTrack);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.githubUsername.toLowerCase().includes(q) ||
          p.codeUrl.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.hackatimeId && p.hackatimeId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [projects, selectedStatus, selectedTrack, search]);

  // Keyboard navigation: j/k to move highlight, Enter to select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredProjects.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (filteredProjects[highlightedIndex]) {
          onSelectProject(filteredProjects[highlightedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredProjects, highlightedIndex, onSelectProject]);

  const renderStatusBadge = (status: CockpitStatus) => {
    switch (status) {
      case 'pre_approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-semantic-successBg text-semantic-success border border-semantic-success/20">
            Pre-Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-semantic-dangerBg text-semantic-danger border border-semantic-danger/20">
            Rejected
          </span>
        );
      case 'flagged_fraud':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-semantic-warningBg text-semantic-warning border border-semantic-warning/20">
            Flagged Fraud
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-semantic-infoBg text-semantic-info border border-semantic-info/20">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden min-w-0">
      {/* Page Header Ribbon */}
      <div className="px-8 pt-8 pb-6 border-b border-border-subtle bg-canvas-subtle shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-content-primary">
              Submissions Queue
            </h1>
            <p className="text-sm text-content-tertiary mt-1">
              Select a project to launch the focused 6-step review cockpit.
            </p>
          </div>

          {/* High-Level Metric Counter Strip */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle">
              <span className="text-content-muted">Total: </span>
              <span className="font-bold text-content-primary">{stats?.total ?? projects.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle">
              <span className="text-content-muted">Pending: </span>
              <span className="font-bold text-semantic-info">{stats?.pending ?? 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle">
              <span className="text-content-muted">Pre-Approved: </span>
              <span className="font-bold text-semantic-success">{stats?.preApproved ?? 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle">
              <span className="text-content-muted">Rejected: </span>
              <span className="font-bold text-semantic-danger">{stats?.rejected ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Live Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 bg-canvas-card p-1 rounded-lg border border-border-subtle text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-canvas-elevated text-content-primary shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('pending')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedStatus === 'pending'
                  ? 'bg-canvas-elevated text-semantic-info shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Pending ({stats?.pending ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('pre_approved')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedStatus === 'pre_approved'
                  ? 'bg-canvas-elevated text-semantic-success shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Pre-Approved ({stats?.preApproved ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('rejected')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedStatus === 'rejected'
                  ? 'bg-canvas-elevated text-semantic-danger shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Rejected ({stats?.rejected ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('flagged_fraud')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedStatus === 'flagged_fraud'
                  ? 'bg-canvas-elevated text-semantic-warning shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Fraud ({stats?.flaggedFraud ?? 0})
            </button>
          </div>

          {/* Track Filter */}
          <div className="flex items-center gap-1 bg-canvas-card p-1 rounded-lg border border-border-subtle text-xs">
            <button
              type="button"
              onClick={() => setSelectedTrack('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                selectedTrack === 'all'
                  ? 'bg-canvas-elevated text-content-primary shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              All Tracks
            </button>
            <button
              type="button"
              onClick={() => setSelectedTrack('software')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                selectedTrack === 'software'
                  ? 'bg-canvas-elevated text-blue-400 shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Software
            </button>
            <button
              type="button"
              onClick={() => setSelectedTrack('hardware')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                selectedTrack === 'hardware'
                  ? 'bg-canvas-elevated text-purple-400 shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Hardware
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search projects, @github user, Hackatime ID..."
              className="w-full bg-canvas-card border border-border-subtle rounded-lg pl-9 pr-4 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>
      </div>

      {/* Main Table of Real Projects */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {isLoading ? (
          <div className="py-24 text-center text-sm text-content-tertiary">
            Loading submissions queue...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center text-sm text-content-tertiary space-y-2">
            <p>No submissions match your filter or search query.</p>
          </div>
        ) : (
          <div className="border border-border-subtle rounded-xl overflow-hidden bg-canvas-card shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-canvas-subtle text-xs text-content-tertiary uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Project & Track</th>
                  <th className="py-3 px-4">Requested</th>
                  <th className="py-3 px-4">Hackatime ID</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {filteredProjects.map((p, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const avatarUrl = p.githubUsername
                    ? `https://github.com/${p.githubUsername}.png?size=64`
                    : `https://api.dicebear.com/7.x/identicon/svg?seed=${p.id}`;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProject(p)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-canvas-hover'
                          : 'hover:bg-canvas-hover/60'
                      }`}
                    >
                      {/* Submitter */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full bg-canvas border border-border-subtle object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${p.id}`;
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-content-primary text-xs block truncate">
                              @{p.githubUsername || 'anonymous'}
                            </span>
                            <span className="text-[11px] font-mono text-content-muted">
                              {p.liveRecordId.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Project Name & Track */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-content-primary text-sm truncate max-w-xs">
                            {p.projectName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase font-mono ${
                              p.projectType === 'hardware'
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {p.projectType}
                          </span>
                        </div>
                        <p className="text-xs text-content-tertiary truncate max-w-md mt-0.5">
                          {p.description || 'No description provided'}
                        </p>
                      </td>

                      {/* Requested Hours */}
                      <td className="py-3 px-4 font-mono font-bold text-content-primary text-sm whitespace-nowrap">
                        {p.submittedHours} hrs
                      </td>

                      {/* Hackatime ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.hackatimeId ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-content-secondary px-2 py-0.5 rounded bg-canvas border border-border-subtle">
                            <Clock className="w-3 h-3 text-orange-400" />
                            {p.hackatimeId}
                          </span>
                        ) : (
                          <span className="text-xs text-content-muted">—</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-4 text-xs text-content-tertiary whitespace-nowrap">
                        {new Date(p.submittedAt).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(p.cockpitStatus)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-canvas border border-border-subtle text-xs font-semibold text-content-primary hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
