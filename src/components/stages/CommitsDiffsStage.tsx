import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  FileCode,
  Flame,
  GitCommit,
  Trash2,
  X,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface CommitsDiffsStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  baselineArchiveCommit?: {
    commitHash: string;
    shortHash: string;
    shipName: string;
    archiveUrl: string;
  };
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

type CommitCategory = 'core' | 'cosmetic' | 'huge_dump' | 'boilerplate';

interface ClassifiedCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
  additions: number;
  deletions: number;
  codeAdditions: number;
  codeDeletions: number;
  files: Array<{ filename: string; additions: number; deletions: number; status: string }>;
  category: CommitCategory;
  isDump: boolean;
  dumpPercent: number;
}

export const CommitsDiffsStage: React.FC<CommitsDiffsStageProps> = ({
  project,
  gitHubData,
  baselineArchiveCommit,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | null>(null);
  const [viewScope, setViewScope] = useState<'current_ship' | 'full_repo'>(
    baselineArchiveCommit ? 'current_ship' : 'full_repo'
  );

  const rawCommits = gitHubData?.commits || [];
  const repoFiles = gitHubData?.files || [];
  const isRateLimited = Boolean(gitHubData?.isRateLimited);

  // Baseline Archive Commit index in current commit history
  const baselineIndex = useMemo(() => {
    if (!baselineArchiveCommit) return -1;
    return rawCommits.findIndex(
      (c) =>
        c.sha.toLowerCase().startsWith(baselineArchiveCommit.shortHash.toLowerCase()) ||
        baselineArchiveCommit.commitHash.toLowerCase().startsWith(c.sha.toLowerCase())
    );
  }, [rawCommits, baselineArchiveCommit]);

  const isHeadIdenticalToBaseline = baselineIndex === 0;

  // Classify each commit & compute pure code additions (excluding lockfiles & assets)
  const classifiedCommits: ClassifiedCommit[] = useMemo(() => {
    const codeExts = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.c', '.cpp', '.h',
      '.html', '.css', '.scss', '.sql', '.sh', '.kicad_pcb', '.kicad_sch',
      '.sch', '.brd', '.step', '.cad', '.java', '.kt', '.swift', '.php',
      '.rb', '.lua', '.dart', '.vue', '.svelte',
    ];

    const lockAndAssetExts = [
      '.lock', '-lock.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
      '.webp', '.mp3', '.mp4', '.wav', '.pdf', '.woff', '.woff2', '.ttf',
    ];

    // First pass: calculate total code additions across all commits
    let totalCodeAdded = 0;
    rawCommits.forEach((c) => {
      (c.files || []).forEach((f) => {
        const lower = f.filename.toLowerCase();
        const isCode = codeExts.some((ext) => lower.endsWith(ext));
        const isLockOrAsset = lockAndAssetExts.some((ext) => lower.includes(ext));
        if (isCode && !isLockOrAsset) {
          totalCodeAdded += f.additions || 0;
        }
      });
    });

    return rawCommits.map((c) => {
      const additions = c.additions || 0;
      const deletions = c.deletions || 0;
      const files = c.files || [];

      let commitCodeAdditions = 0;
      let commitCodeDeletions = 0;

      files.forEach((f) => {
        const lower = f.filename.toLowerCase();
        const isCode = codeExts.some((ext) => lower.endsWith(ext));
        const isLockOrAsset = lockAndAssetExts.some((ext) => lower.includes(ext));
        if (isCode && !isLockOrAsset) {
          commitCodeAdditions += f.additions || 0;
          commitCodeDeletions += f.deletions || 0;
        }
      });

      const onlyDocOrAssetFiles =
        files.length > 0 &&
        files.every((f) => {
          const lower = f.filename.toLowerCase();
          return (
            lower.endsWith('.md') ||
            lower.endsWith('.txt') ||
            lower.includes('license') ||
            lockAndAssetExts.some((ext) => lower.includes(ext)) ||
            lower === '.gitignore'
          );
        });

      // Calculate code dump percentage
      const dumpPercent =
        totalCodeAdded > 0 ? Math.round((commitCodeAdditions / totalCodeAdded) * 100) : 0;
      const isDump = dumpPercent >= 60 && commitCodeAdditions > 300;

      let category: CommitCategory = 'core';
      if (onlyDocOrAssetFiles) {
        category = 'cosmetic';
      } else if (additions >= 1000 && commitCodeAdditions < 200) {
        // Massive changes but mostly lockfile/config
        category = 'boilerplate';
      } else if (isDump || additions >= 1200) {
        category = 'huge_dump';
      }

      return {
        ...c,
        additions,
        deletions,
        codeAdditions: commitCodeAdditions,
        codeDeletions: commitCodeDeletions,
        files,
        category,
        isDump,
        dumpPercent,
      };
    });
  }, [rawCommits]);

  // Filtered commits based on scope toggle (Current Ship vs Full Repo) and file filter
  const visibleCommits = useMemo(() => {
    let list = classifiedCommits;

    // Scope filter: if baseline is present and scope is current_ship, show only commits after baseline
    if (viewScope === 'current_ship' && baselineIndex !== -1) {
      list = list.slice(0, baselineIndex);
    }

    // File filter: if a specific file is selected from churn table, show only commits modifying that file
    if (selectedFileFilter) {
      list = list.filter((c) =>
        (c.files || []).some((f) => f.filename === selectedFileFilter)
      );
    }

    return list;
  }, [classifiedCommits, viewScope, baselineIndex, selectedFileFilter]);

  // Selected commit
  const selectedCommit =
    visibleCommits.find((c) => c.sha === selectedCommitSha) || visibleCommits[0] || null;

  const totalAdditions = classifiedCommits.reduce((acc, c) => acc + c.additions, 0);
  const totalDeletions = classifiedCommits.reduce((acc, c) => acc + c.deletions, 0);

  // Deleted Files & Purged Traces Scanner
  const purgedFiles = useMemo(() => {
    const deleted: Array<{
      filename: string;
      commitSha: string;
      commitMessage: string;
      date: string;
      deletions: number;
      isAiTrace: boolean;
      isBoilerplateTrace: boolean;
    }> = [];

    const aiSignatures = [
      '.cursorrules',
      '.cursor/',
      '.claude',
      'prompts',
      '.prompt',
      'rules.md',
      '.windsurf',
      '.v0',
      'copilot-instructions',
      'aider',
    ];

    const boilerplateSignatures = ['starter', 'boilerplate', 'template', 'tutorial', 'sample'];

    classifiedCommits.forEach((c) => {
      (c.files || []).forEach((f) => {
        if (f.status === 'removed') {
          const lower = f.filename.toLowerCase();
          const isAiTrace = aiSignatures.some((sig) => lower.includes(sig));
          const isBoilerplateTrace = boilerplateSignatures.some((sig) => lower.includes(sig));

          deleted.push({
            filename: f.filename,
            commitSha: c.shortSha,
            commitMessage: c.message,
            date: c.date,
            deletions: f.deletions,
            isAiTrace,
            isBoilerplateTrace,
          });
        }
      });
    });

    return deleted;
  }, [classifiedCommits]);

  // File-Wise Aggregate Metrics Table
  const fileWiseMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        filename: string;
        additions: number;
        deletions: number;
        changes: number;
        commitCount: number;
        commitsTouching: Array<{
          sha: string;
          shortSha: string;
          message: string;
          date: string;
          additions: number;
          deletions: number;
        }>;
        category: 'Code' | 'Markup' | 'Config' | 'Asset';
      }
    >();

    for (const c of classifiedCommits) {
      for (const f of c.files || []) {
        if (!f.filename) continue;
        const existing = map.get(f.filename) || {
          filename: f.filename,
          additions: 0,
          deletions: 0,
          changes: 0,
          commitCount: 0,
          commitsTouching: [],
          category: 'Code' as const,
        };

        existing.additions += f.additions || 0;
        existing.deletions += f.deletions || 0;
        existing.changes += (f.additions || 0) + (f.deletions || 0);
        existing.commitCount += 1;
        existing.commitsTouching.push({
          sha: c.sha,
          shortSha: c.shortSha,
          message: c.message,
          date: c.date,
          additions: f.additions || 0,
          deletions: f.deletions || 0,
        });

        const lower = f.filename.toLowerCase();
        if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.rst')) {
          existing.category = 'Markup';
        } else if (
          lower.endsWith('.json') ||
          lower.endsWith('.yaml') ||
          lower.endsWith('.yml') ||
          lower.endsWith('.toml') ||
          lower.endsWith('.env') ||
          lower.endsWith('.lock')
        ) {
          existing.category = 'Config';
        } else if (
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.gif') ||
          lower.endsWith('.svg') ||
          lower.endsWith('.ico')
        ) {
          existing.category = 'Asset';
        } else {
          existing.category = 'Code';
        }

        map.set(f.filename, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.changes - a.changes);
  }, [classifiedCommits]);

  // Selected file details for file iteration timeline
  const selectedFileMetric = useMemo(() => {
    if (!selectedFileFilter) return null;
    return fileWiseMetrics.find((m) => m.filename === selectedFileFilter) || null;
  }, [fileWiseMetrics, selectedFileFilter]);

  // Overall AI Evaluation Risk Heuristics
  const overallAiEvaluation = useMemo(() => {
    const aiKeywords = ['.cursorrules', '.claude', 'copilot', 'devin', 'prompts', '.v0'];
    const detectedAiFiles = repoFiles.filter((f) =>
      aiKeywords.some((kw) => f.name.toLowerCase().includes(kw))
    );

    const dumpCommits = classifiedCommits.filter((c) => c.isDump);

    let riskScore = 0;
    const riskReasons: string[] = [];

    if (detectedAiFiles.length > 0) {
      riskScore += 2;
      riskReasons.push(
        `AI configuration files discovered in repository (${detectedAiFiles.map((f) => f.name).join(', ')})`
      );
    }

    if (purgedFiles.some((p) => p.isAiTrace)) {
      riskScore += 2;
      riskReasons.push(
        `AI prompt / config traces were purged in commit history (${purgedFiles.filter((p) => p.isAiTrace).map((p) => p.filename).join(', ')})`
      );
    }

    if (dumpCommits.length > 0) {
      riskScore += 2;
      riskReasons.push(
        `Massive code dump: Commit ${dumpCommits[0].shortSha} introduced ${dumpCommits[0].dumpPercent}% of total codebase`
      );
    }

    if (riskScore >= 4) {
      return {
        level: 'high' as const,
        badge: 'High AI / Mass Dump Probability',
        color: 'rose',
        reasons: riskReasons,
      };
    }
    if (riskScore >= 2) {
      return {
        level: 'moderate' as const,
        badge: 'Moderate AI Assistance (Inspect Iterations)',
        color: 'amber',
        reasons: riskReasons,
      };
    }
    return {
      level: 'low' as const,
      badge: 'Organic Human Engineering Patterns',
      color: 'emerald',
      reasons: [
        'Commits demonstrate natural incremental problem solving, diverse messages, and progressive file iteration.',
      ],
    };
  }, [repoFiles, classifiedCommits, purgedFiles]);

  const handlePass = (key: string) => {
    onToggleChecklist?.(key, true);
  };

  const handleFail = (key: string) => {
    onToggleChecklist?.(key, false);
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 5 of 6
            </span>
            <span className="text-xs text-content-tertiary">Git History & Integrity Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Git Commits Progression, File-Wise Metrics & AI Forensics
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm authentic incremental development progression across commits, inspect changed files, trace purged AI configs, and evaluate code churn per file.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {project.codeUrl && (
            <a
              href={`${project.codeUrl}/commits`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <span>GitHub Commits</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Prior Approved Archive Baseline Flag Banner */}
      {baselineArchiveCommit && (
        <div
          className={`p-4 rounded-xl text-white space-y-3 shadow-xl shrink-0 border ${
            isHeadIdenticalToBaseline
              ? 'bg-rose-950/60 border-rose-500/80'
              : 'bg-purple-950/40 border-purple-500/50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 inline-flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                Prior Approved Baseline: {baselineArchiveCommit.shortHash}
              </span>
              <h3 className="text-sm font-bold text-white pt-1">
                Double-Dip Boundary Established from Prior Ship &ldquo;{baselineArchiveCommit.shipName}&rdquo;
              </h3>
              <p className="text-xs text-purple-200/90 leading-relaxed">
                Commits up to <code className="text-emerald-400 font-mono bg-black/40 px-1.5 py-0.5 rounded">{baselineArchiveCommit.shortHash}</code> were already reviewed and approved. <strong>DO NOT credit hours for commits up to this hash.</strong> Reviewers must strictly inspect the diff from <code className="text-emerald-400 font-mono bg-black/40 px-1.5 py-0.5 rounded">{baselineArchiveCommit.shortHash}...HEAD</code>.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`${project.codeUrl}/compare/${baselineArchiveCommit.commitHash}...HEAD`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-brand-orange text-white hover:bg-orange-600 transition-colors text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Compare New Work ({baselineArchiveCommit.shortHash}...HEAD)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Critical Blocker: HEAD is Identical to Baseline */}
          {isHeadIdenticalToBaseline && (
            <div className="p-3 rounded-lg bg-rose-900/80 border border-rose-400 text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
                <span>
                  🚨 Critical Blocker: Repository HEAD is identical to the baseline archive commit ({baselineArchiveCommit.shortHash}). Zero new commits have been pushed since the prior approved ship!
                </span>
              </div>
              {onEarlyExit && (
                <button
                  type="button"
                  onClick={() =>
                    onEarlyExit(
                      `Double-Dip Zero Progress: Current repo HEAD is identical to previously approved archive commit (${baselineArchiveCommit.shortHash})`
                    )
                  }
                  className="px-3 py-1 rounded bg-rose-950 hover:bg-black text-white text-xs font-bold border border-rose-400 shrink-0 shadow-sm"
                >
                  Reject for Zero Progress
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* GitHub Rate Limit Banner if hit */}
      {isRateLimited && (
        <div className="p-4 rounded-2xl bg-[#121214] border border-amber-500/40 text-white flex items-start gap-3 shadow-xl shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 flex-1">
            <span className="font-bold text-amber-300 block text-sm">
              GitHub API Unauthenticated Rate Limit Encountered
            </span>
            <p className="text-[#d4d4d8] leading-relaxed">
              GitHub limits unauthenticated API queries to 60/hr per IP. Review commits directly on GitHub, or click the <strong>GH Token</strong> button in the top bar to raise your limit to 5,000 requests/hour.
            </p>
          </div>
        </div>
      )}

      {/* AI Footprint & Heuristics Overview Strip */}
      <div
        className={`p-5 rounded-2xl border text-white space-y-3 shadow-xl shrink-0 bg-[#121214] ${
          overallAiEvaluation.level === 'high'
            ? 'border-rose-500/60'
            : overallAiEvaluation.level === 'moderate'
            ? 'border-amber-500/60'
            : 'border-[#27272a]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#ff6b35]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              AI Footprint & Progression Evaluation
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                overallAiEvaluation.level === 'high'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : overallAiEvaluation.level === 'moderate'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {overallAiEvaluation.badge}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onToggleChecklist?.('flag_ai_generated')}
              className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                reviewChecklist['flag_ai_generated']
                  ? 'bg-amber-950/70 border-amber-500/70 text-amber-300 font-bold shadow-sm ring-1 ring-amber-500/40'
                  : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#3f3f46]'
              }`}
              title="Toggle AI-generated code flag for this submission"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>
                {reviewChecklist['flag_ai_generated']
                  ? 'Flagged: AI-Generated ✓'
                  : 'Mark as AI-Generated'}
              </span>
            </button>

            <span className="text-[11px] font-mono text-[#a1a1aa]">
              {classifiedCommits.length} total commits analyzed
            </span>
          </div>
        </div>

        <ul className="text-xs space-y-1.5 text-[#d4d4d8] leading-relaxed">
          {overallAiEvaluation.reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-[#ff6b35] mt-0.5 font-bold">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Deleted Files & Purged Traces Scanner (Smoking Gun Card) */}
      {purgedFiles.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#121214] border border-rose-500/30 text-white space-y-3 shadow-lg shrink-0">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2.5">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Deleted Files & Purged Traces Scanner ({purgedFiles.length} files removed in git history)
              </h3>
            </div>
            <span className="text-[11px] text-[#a1a1aa] font-mono">
              Scans for purged AI prompts, agent rules, and scaffold boilerplate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {purgedFiles.map((pf, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 ${
                  pf.isAiTrace
                    ? 'bg-purple-950/40 border-purple-500/50 text-white'
                    : pf.isBoilerplateTrace
                    ? 'bg-amber-950/40 border-amber-500/50 text-white'
                    : 'bg-[#18181b] border-[#27272a] text-[#d4d4d8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-semibold text-white max-w-[190px]">
                    {pf.filename}
                  </span>
                  {pf.isAiTrace ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-purple-500/30 text-purple-300 border border-purple-500/40">
                      AI CONFIG TRACE
                    </span>
                  ) : pf.isBoilerplateTrace ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                      SCAFFOLD TRACE
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-semibold">
                      -{pf.deletions}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#a1a1aa] pt-0.5">
                  <span>Purged in {pf.commitSha}</span>
                  <span>{pf.date ? new Date(pf.date).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Commit Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[460px]">
        {/* Left column: Commits Timeline with Scope Filter & Baseline Badges (5 Cols) */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          {/* Header ribbon with Scope Toggle */}
          <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-brand-orange" />
                Commit Timeline ({visibleCommits.length})
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-emerald-400 font-semibold">+{totalAdditions}</span>
                <span className="text-rose-400 font-semibold">-{totalDeletions}</span>
              </div>
            </div>

            {/* Scope Filter Toggle (Current Ship vs Full Repo) */}
            {baselineArchiveCommit && baselineIndex !== -1 && (
              <div className="flex items-center bg-[#121214] p-1 rounded-lg border border-[#27272a] text-xs">
                <button
                  type="button"
                  onClick={() => setViewScope('current_ship')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    viewScope === 'current_ship'
                      ? 'bg-brand-orange text-white font-semibold shadow-sm'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  Current Ship Only ({baselineIndex} new)
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope('full_repo')}
                  className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                    viewScope === 'full_repo'
                      ? 'bg-brand-orange text-white font-semibold shadow-sm'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  Full History ({classifiedCommits.length})
                </button>
              </div>
            )}

            {/* File Filter Pill if active */}
            {selectedFileFilter && (
              <div className="flex items-center justify-between px-2 py-1 rounded bg-[#27272a] text-xs font-mono text-white">
                <span className="truncate max-w-[220px]">
                  Filtered to file: <strong>{selectedFileFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFileFilter(null)}
                  className="text-[#a1a1aa] hover:text-white p-0.5"
                  title="Clear file filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]">
            {visibleCommits.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71717a] space-y-2">
                <GitCommit className="w-6 h-6 text-[#52525b] mx-auto" />
                <p>
                  {isRateLimited
                    ? 'Commits rate-limited by GitHub API. Use GitHub Commits link above.'
                    : 'No commits in this view scope.'}
                </p>
              </div>
            ) : (
              visibleCommits.map((c) => {
                const isSelected = selectedCommit?.sha === c.sha;
                const cIdx = classifiedCommits.findIndex((x) => x.sha === c.sha);
                const isBaseline = baselineIndex !== -1 && cIdx === baselineIndex;
                const isHistorical = baselineIndex !== -1 && cIdx > baselineIndex;
                const isPostBaseline = baselineIndex !== -1 && cIdx < baselineIndex;

                return (
                  <button
                    key={c.sha}
                    type="button"
                    onClick={() => setSelectedCommitSha(c.sha)}
                    className={`w-full text-left p-3.5 transition-colors block cursor-pointer ${
                      isHistorical ? 'opacity-60 bg-[#0e0e10]' : ''
                    } ${
                      isSelected
                        ? 'bg-[#1e1e24] border-l-2 border-l-brand-orange'
                        : 'hover:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="text-xs font-mono font-bold text-white truncate">
                          {c.shortSha}
                        </span>

                        {isBaseline ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                            ARCHIVE BOUNDARY
                          </span>
                        ) : isPostBaseline ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                            NEW WORK
                          </span>
                        ) : isHistorical ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase text-zinc-500 bg-zinc-900 border border-zinc-800">
                            PRIOR SHIP
                          </span>
                        ) : null}

                        {/* Code dump badge */}
                        {c.isDump && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5 text-rose-400" />
                            {c.dumpPercent}% CODE DUMP
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                            c.category === 'core'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : c.category === 'huge_dump'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : c.category === 'boilerplate'
                              ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {c.category === 'boilerplate'
                            ? 'BOILERPLATE'
                            : c.category === 'huge_dump'
                            ? 'MASS DUMP'
                            : c.category.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#71717a] font-mono shrink-0">
                        {c.date ? new Date(c.date).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#d4d4d8] line-clamp-2 mt-1">
                      {c.message}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-[#71717a]">
                      <span className="text-[#a1a1aa]">{c.author}</span>
                      <span>·</span>
                      <span className="text-emerald-400">+{c.additions}</span>
                      <span className="text-rose-400">-{c.deletions}</span>
                      <span>·</span>
                      <span>{c.files?.length || 0} files</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Changed Files & Diffs Inspector with HIGH-CONTRAST Link (7 Cols) */}
        <div className="lg:col-span-7 bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-orange" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Changed Files in {selectedCommit?.shortSha || ''} ({selectedCommit?.files?.length || 0})
              </span>
            </div>

            {/* HIGH CONTRAST ORANGE BUTTON FOR COMMIT DIFF */}
            {selectedCommit && (
              <a
                href={selectedCommit.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-md bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange border border-brand-orange/40 text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>View full commit diff</span>
                <ExternalLink className="w-3.5 h-3.5 text-brand-orange" />
              </a>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 select-text">
            <div className="space-y-2">
              {!selectedCommit || !selectedCommit.files || selectedCommit.files.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#71717a]">
                  No changed files recorded for this commit.
                </div>
              ) : (
                selectedCommit.files.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileCode className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                      <button
                        type="button"
                        onClick={() => setSelectedFileFilter(file.filename)}
                        className="text-[#d4d4d8] hover:text-brand-orange hover:underline truncate text-left cursor-pointer"
                        title="Click to inspect this file's commit iterations"
                      >
                        {file.filename}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold ${
                          file.status === 'added'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : file.status === 'removed'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-[#27272a] text-[#a1a1aa]'
                        }`}
                      >
                        {file.status}
                      </span>
                      <span className="text-emerald-400">+{file.additions}</span>
                      <span className="text-rose-400">-{file.deletions}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DUAL TIMELINE: File Iterations & Aggregate Churn Table */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-brand-orange" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              File-Wise Code Churn & Iteration Explorer ({fileWiseMetrics.length} files)
            </h3>
          </div>
          <span className="text-[11px] text-[#a1a1aa] font-mono">
            💡 Click any file row below to trace all commits that modified it
          </span>
        </div>

        {/* Selected File Iteration Inspector if active */}
        {selectedFileMetric && (
          <div className="p-4 rounded-xl bg-[#18181b] border border-brand-orange/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-orange" />
                Commit Iterations for: <code className="text-brand-orange">{selectedFileMetric.filename}</code>
              </span>
              <button
                type="button"
                onClick={() => setSelectedFileFilter(null)}
                className="text-xs text-[#a1a1aa] hover:text-white px-2 py-0.5 rounded bg-[#27272a]"
              >
                Close File View
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
              {selectedFileMetric.commitsTouching.map((cTouch, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#121214] border border-[#27272a] space-y-1 cursor-pointer hover:border-brand-orange transition-colors"
                  onClick={() => setSelectedCommitSha(cTouch.sha)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-orange">{cTouch.shortSha}</span>
                    <span className="text-[#a1a1aa] text-[10px]">
                      {cTouch.date ? new Date(cTouch.date).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#d4d4d8] truncate">{cTouch.message}</p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-400">+{cTouch.additions}</span>
                    <span className="text-rose-400">-{cTouch.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full File-Wise Churn Table */}
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] text-[11px] text-[#a1a1aa] font-mono sticky top-0 bg-[#121214]">
                <th className="pb-2 font-semibold">File Path (Click to Inspect)</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 font-semibold text-center">Commits Touching</th>
                <th className="pb-2 font-semibold text-right">Additions</th>
                <th className="pb-2 font-semibold text-right">Deletions</th>
                <th className="pb-2 font-semibold text-right">Net Churn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e24] font-mono">
              {fileWiseMetrics.map((file) => {
                const isSelected = selectedFileFilter === file.filename;
                return (
                  <tr
                    key={file.filename}
                    onClick={() =>
                      setSelectedFileFilter(isSelected ? null : file.filename)
                    }
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-brand-orange/20 text-white font-semibold'
                        : 'hover:bg-[#18181b] text-[#d4d4d8]'
                    }`}
                  >
                    <td className="py-2.5 pr-4 truncate max-w-xs">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-[#71717a] shrink-0" />
                        <span className="truncate">{file.filename}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold ${
                          file.category === 'Code'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : file.category === 'Config'
                            ? 'bg-blue-500/20 text-blue-400'
                            : file.category === 'Asset'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {file.category}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-[#e4e4e7]">{file.commitCount}</td>
                    <td className="py-2.5 text-right text-emerald-400">+{file.additions}</td>
                    <td className="py-2.5 text-right text-rose-400">-{file.deletions}</td>
                    <td className="py-2.5 text-right font-bold text-white">
                      {file.additions - file.deletions >= 0 ? '+' : ''}
                      {file.additions - file.deletions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage Checklist & Advance */}
      <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white flex items-center justify-between shrink-0">
        <div>
          <span className="text-xs font-bold text-white block">
            Git Integrity & Incremental Progress Check
          </span>
          <p className="text-[11px] text-[#a1a1aa]">
            Verified that code history demonstrates genuine iterative problem-solving and authentic development progression.
          </p>
        </div>

        <PassFailControl
          label="Git Progression"
          status={reviewChecklist.commits_diffs}
          onPass={() => handlePass('commits_diffs')}
          onFail={() => handleFail('commits_diffs')}
        />
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-content-tertiary">
            Progress through stages to formulate the final verdict.
          </span>
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white font-bold hover:bg-[#ea580c] transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <span>Next: Verdict Desk →</span>
        </button>
      </div>
    </div>
  );
};
