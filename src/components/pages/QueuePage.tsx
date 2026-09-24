import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { CockpitProject, QueueStats } from '../../lib/types';

interface QueuePageProps {
  projects: CockpitProject[];
  stats?: QueueStats;
  initialStatus?: string;
  onSelectProject: (
    project: CockpitProject,
    queueContext?: { status: string; track: string }
  ) => void;
  onStartSoftwareQueue?: () => void;
  isLoading: boolean;
}

export const QueuePage: React.FC<QueuePageProps> = ({
  projects,
  stats,
  initialStatus,
  onSelectProject,
  onStartSoftwareQueue,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus || 'pending');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (initialStatus && initialStatus !== selectedStatus) {
      setSelectedStatus(initialStatus);
    }
  }, [initialStatus]);

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

  // Nested track counts based on currently selected status
  const trackCounts = useMemo(() => {
    const subset =
      selectedStatus === 'all'
        ? projects
        : projects.filter((p) => p.cockpitStatus === selectedStatus);
    return {
      all: subset.length,
      software: subset.filter((p) => p.projectType === 'software').length,
      hardware: subset.filter((p) => p.projectType === 'hardware').length,
    };
  }, [projects, selectedStatus]);

  // Nested status counts based on currently selected track
  const statusCounts = useMemo(() => {
    const subset =
      selectedTrack === 'all'
        ? projects
        : projects.filter((p) => p.projectType === selectedTrack);
    return {
      all: subset.length,
      pending: subset.filter((p) => p.cockpitStatus === 'pending').length,
      preApproved: subset.filter((p) => p.cockpitStatus === 'pre_approved').length,
      completedPreApproved: subset.filter((p) => p.cockpitStatus === 'completed_pre_approved').length,
      approved: subset.filter((p) => p.cockpitStatus === 'approved').length,
      rejected: subset.filter((p) => p.cockpitStatus === 'rejected').length,
      flaggedFraud: subset.filter((p) => p.cockpitStatus === 'flagged_fraud').length,
    };
  }, [projects, selectedTrack]);

  // Software submissions strictly pending review
  const pendingSoftwareCount = useMemo(
    () =>
      projects.filter((p) => p.projectType === 'software' && p.cockpitStatus === 'pending')
        .length,
    [projects]
  );

  // Reset highlight cursor when filtering changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [selectedStatus, selectedTrack, search]);

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
          onSelectProject(filteredProjects[highlightedIndex], {
            status: selectedStatus,
            track: selectedTrack,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredProjects, highlightedIndex, onSelectProject]);

  const renderStatusBadge = (projectItem: CockpitProject) => {
    const status = projectItem.cockpitStatus;
    switch (status) {
      case 'pre_approved': {
        const action = projectItem.cockpitVerdict?.action;
        const actionLabel = action === 'reject' ? 'Reject' : action === 'flag_fraud' ? 'Fraud' : 'Approve';
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Pre-Approved ({actionLabel})
          </span>
        );
      }
      case 'completed_pre_approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Completed Pre-Approved
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Approved (Raw Ingest)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-semantic-dangerBg text-semantic-danger border border-semantic-dangerBorder">
            Rejected (Raw Ingest)
          </span>
        );
      case 'flagged_fraud':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-semantic-warningBg text-semantic-warning border border-semantic-warningBorder">
            Fraud (Raw Ingest)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-semantic-infoBg text-semantic-info border border-semantic-infoBorder">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden min-w-0">
      {/* Page Header Ribbon */}
      <div className="px-8 pt-7 pb-5 border-b border-border-subtle bg-canvas-card shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-content-primary font-heading">
              Live Submissions Queue
            </h1>
            <p className="text-xs text-content-tertiary mt-1">
              Select a submission to launch the focused 6-step review cockpit.
            </p>
          </div>

          {/* Quick Software Review Action & Metrics */}
          <div className="flex items-center gap-3">
            {onStartSoftwareQueue && (
              <button
                type="button"
                onClick={onStartSoftwareQueue}
                className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Review Software Queue ({pendingSoftwareCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <div className="px-2.5 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle">
                <span className="text-content-tertiary">Total: </span>
                <span className="font-bold text-content-primary">{stats?.total ?? projects.length}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle">
                <span className="text-content-tertiary">Pending: </span>
                <span className="font-bold text-semantic-info">{stats?.pending ?? 0}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle">
                <span className="text-content-tertiary">Pre-Approved: </span>
                <span className="font-bold text-semantic-success">{stats?.preApproved ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Live Search Bar */}
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-canvas-subtle p-1 rounded-lg border border-border-subtle text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedStatus('pending')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'pending'
                  ? 'bg-canvas-card text-semantic-info shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('pre_approved')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'pre_approved'
                  ? 'bg-canvas-card text-semantic-success shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Pre-Approved ({statusCounts.preApproved})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('completed_pre_approved')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'completed_pre_approved'
                  ? 'bg-canvas-card text-purple-400 shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Completed ({statusCounts.completedPreApproved})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('approved')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'approved'
                  ? 'bg-canvas-card text-emerald-400 shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Approved ({statusCounts.approved})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('rejected')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'rejected'
                  ? 'bg-canvas-card text-semantic-danger shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Rejected ({statusCounts.rejected})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('flagged_fraud')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'flagged_fraud'
                  ? 'bg-canvas-card text-semantic-warning shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Fraud ({statusCounts.flaggedFraud})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-canvas-card text-content-primary shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              All ({statusCounts.all})
            </button>
          </div>

          {/* Track Filter */}
          <div className="flex items-center gap-1 bg-canvas-subtle p-1 rounded-lg border border-border-subtle text-xs">
            <button
              type="button"
              onClick={() => setSelectedTrack('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedTrack === 'all'
                  ? 'bg-canvas-card text-content-primary shadow-sm font-semibold'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              All Tracks ({trackCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTrack('software')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedTrack === 'software'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Software ({trackCounts.software})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTrack('hardware')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedTrack === 'hardware'
                  ? 'bg-purple-50 text-purple-700 font-semibold shadow-sm'
                  : 'text-content-tertiary hover:text-content-primary'
              }`}
            >
              Hardware ({trackCounts.hardware})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-content-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search project, @github, Hackatime..."
              className="w-full bg-canvas-subtle border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:border-brand-orange focus:bg-canvas-card transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Table of Genuine Live Submissions */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        {isLoading ? (
          <div className="py-24 text-center text-xs text-content-tertiary">
            Loading submissions queue...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center text-xs text-content-tertiary space-y-2">
            <p>No submissions match your filter or search query.</p>
          </div>
        ) : (
          <div className="border border-border-subtle rounded-xl overflow-hidden bg-canvas-card shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-canvas-subtle text-[11px] text-content-tertiary uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Project & Track</th>
                  <th className="py-3 px-4">Claimed</th>
                  <th className="py-3 px-4">Hackatime ID</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {filteredProjects.map((p, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const avatarUrl = p.githubUsername
                    ? `https://github.com/${p.githubUsername}.png?size=64`
                    : `https://api.dicebear.com/7.x/identicon/svg?seed=${p.id}`;

                  return (
                    <tr
                      key={p.id}
                      onClick={() =>
                        onSelectProject(p, {
                          status: selectedStatus,
                          track: selectedTrack,
                        })
                      }
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isHighlighted ? 'bg-canvas-hover' : 'hover:bg-canvas-hover/60'
                      }`}
                    >
                      {/* Submitter */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full bg-canvas border border-border-subtle object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${p.id}`;
                            }}
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-content-primary text-xs block truncate">
                              @{p.githubUsername || 'anonymous'}
                            </span>
                            <span className="text-[10px] font-mono text-content-muted">
                              {p.liveRecordId.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Project Name & Track */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-content-primary text-xs truncate max-w-xs">
                            {p.projectName}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-semibold ${
                              p.projectType === 'hardware'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {p.projectType}
                          </span>
                        </div>
                        <p className="text-[11px] text-content-tertiary truncate max-w-md mt-0.5">
                          {p.description || 'No description provided'}
                        </p>
                      </td>

                      {/* Requested Hours */}
                      <td className="py-3 px-4 font-mono font-bold text-content-primary text-xs whitespace-nowrap">
                        {p.submittedHours} hrs
                      </td>

                      {/* Hackatime ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.hackatimeId ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-content-secondary px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle">
                            <Clock className="w-3 h-3 text-brand-orange" />
                            {p.hackatimeId}
                          </span>
                        ) : (
                          <span className="text-[11px] text-content-muted">—</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3 px-4 text-[11px] text-content-tertiary whitespace-nowrap">
                        {new Date(p.submittedAt).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(p)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p, {
                              status: selectedStatus,
                              track: selectedTrack,
                            });
                          }}
                          className="px-3 py-1 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-primary hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-colors inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>
                            {p.cockpitStatus === 'pending'
                              ? 'Review'
                              : p.cockpitStatus === 'pre_approved'
                              ? 'Audit / Dispatch'
                              : 'View'}
                          </span>
                          <ArrowRight className="w-3 h-3" />
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
