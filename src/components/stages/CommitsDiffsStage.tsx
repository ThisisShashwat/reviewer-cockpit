import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCode,
  Flame,
  GitCommit,
  Layers,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { formatCommitsSummary } from '../../lib/utils';
import { MultiOptionSelector, SelectorOption } from '../common/MultiOptionSelector';
import { PassFailControl } from '../common/PassFailControl';

interface CommitsDiffsStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  baselineArchiveCommit?: {
    commitHash: string;
    shortHash: string;
    shipName: string;
    archiveUrl: string;
    program?: string;
    hours?: number;
  };
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, any>;
  onToggleChecklist?: (key: string, status?: any) => void;
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
  const [expandedPatchSha, setExpandedPatchSha] = useState<string | null>(null);
  const [showAllPatches, setShowAllPatches] = useState(false);
  const [fileViewMode, setFileViewMode] = useState<'journal' | 'cards'>('journal');
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

  // Commit Timeline Pagination
  const [commitPage, setCommitPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const totalPages = Math.max(1, Math.ceil(visibleCommits.length / pageSize));
  const startIndex = (commitPage - 1) * pageSize;
  const paginatedCommits = useMemo(() => {
    return visibleCommits.slice(startIndex, startIndex + pageSize);
  }, [visibleCommits, startIndex, pageSize]);

  // Reset pagination when view scope or filter changes
  useEffect(() => {
    setCommitPage(1);
  }, [viewScope, selectedFileFilter]);

  // Keep reviewChecklist synced with commit breakdown
  useEffect(() => {
    if (!classifiedCommits || classifiedCommits.length === 0) return;
    const codeCount = classifiedCommits.filter(
      (c) => c.category === 'core' || c.category === 'huge_dump'
    ).length;
    const cosmeticCount = classifiedCommits.filter((c) => c.category === 'cosmetic').length;
    const boilerplateCount = classifiedCommits.filter((c) => c.category === 'boilerplate').length;

    const summaryText = formatCommitsSummary(codeCount, cosmeticCount, boilerplateCount);

    if (reviewChecklist['commits_summary'] !== summaryText) {
      onToggleChecklist?.('commits_summary', summaryText);
      onToggleChecklist?.('code_commits_count', codeCount);
      onToggleChecklist?.('cosmetic_commits_count', cosmeticCount);
      if (boilerplateCount > 0) {
        onToggleChecklist?.('boilerplate_commits_count', boilerplateCount);
      }
    }
  }, [classifiedCommits, onToggleChecklist, reviewChecklist]);

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
      fullSha: string;
      commitMessage: string;
      date: string;
      deletions: number;
      isAiTrace: boolean;
      isBoilerplateTrace: boolean;
      htmlUrl?: string;
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
            fullSha: c.sha,
            commitMessage: c.message,
            date: c.date,
            deletions: f.deletions,
            isAiTrace,
            isBoilerplateTrace,
            htmlUrl: c.htmlUrl || (project.codeUrl ? `${project.codeUrl.replace(/\/$/, '')}/commit/${c.sha}` : undefined),
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
          patch?: string;
          htmlUrl?: string;
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
          patch: (f as any).patch,
          htmlUrl: c.htmlUrl || (project.codeUrl ? `${project.codeUrl.replace(/\/$/, '')}/commit/${c.sha}` : undefined),
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

  type GitProgressionStatus = 'pass' | 'deflate' | 'ai_dump' | 'fail';

  const GIT_PROGRESSION_OPTIONS: SelectorOption<GitProgressionStatus>[] = [
    {
      id: 'pass',
      label: 'Pass (Authentic)',
      color: 'emerald',
      icon: Check,
      description: 'Genuine iterative development history with incremental problem-solving',
    },
    {
      id: 'deflate',
      label: 'Pass w/ Deflation',
      color: 'amber',
      icon: AlertTriangle,
      description: 'Low incremental progress, boilerplate imports, or repeated code requiring hours deflation',
    },
    {
      id: 'ai_dump',
      label: 'AI / Code Dump',
      color: 'purple',
      icon: Bot,
      description: 'Single monolithic commit or unedited LLM vibe-code dump',
    },
    {
      id: 'fail',
      label: 'Fail / Zero Progress',
      color: 'rose',
      icon: X,
      description: 'Zero progress since previous ship, duplicate repository, or broken/missing commits',
    },
  ];

  const currentGitStatus: GitProgressionStatus | undefined =
    reviewChecklist['git_progression_status'] ||
    (reviewChecklist['commits_diffs'] === true ? 'pass' :
     reviewChecklist['commits_diffs'] === false ? 'fail' : undefined);

  const handleGitProgressionChange = (val: GitProgressionStatus) => {
    onToggleChecklist?.('git_progression_status', val);
    if (val === 'pass') {
      onToggleChecklist?.('commits_diffs', true);
      onToggleChecklist?.('git_progression_verified', true);
    } else if (val === 'deflate') {
      onToggleChecklist?.('commits_diffs', true);
      onToggleChecklist?.('git_progression_verified', true);
      onToggleChecklist?.('flag_deflation_needed', true);
    } else if (val === 'ai_dump') {
      onToggleChecklist?.('commits_diffs', true);
      onToggleChecklist?.('git_progression_verified', true);
      onToggleChecklist?.('flag_ai_generated', true);
    } else if (val === 'fail') {
      onToggleChecklist?.('commits_diffs', false);
      onToggleChecklist?.('git_progression_verified', false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 5 of 7
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
          <button
            type="button"
            onClick={onAdvance}
            className="px-3.5 py-1.5 rounded-lg bg-[#ff6b35] hover:bg-[#ea580c] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
          >
            <span>Next: Submitter Portfolio →</span>
          </button>
        </div>
      </div>

      {/* Prior Approved Archive Baseline Flag Banner */}
      {baselineArchiveCommit && (
        <div
          className={`p-5 rounded-2xl text-white space-y-4 shadow-xl shrink-0 border ${
            isHeadIdenticalToBaseline
              ? 'bg-[#2b080d] border-2 border-rose-600'
              : 'bg-[#121214] border-amber-500/50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/30 inline-flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-amber-400" />
                Prior Approved Baseline: {baselineArchiveCommit.shortHash}
              </span>
              <h3 className="text-sm font-bold text-white pt-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Previously Shipped Project: &ldquo;{baselineArchiveCommit.shipName}&rdquo;
                  {baselineArchiveCommit.program && ` in ${baselineArchiveCommit.program}`}
                  {baselineArchiveCommit.hours !== undefined && ` (${baselineArchiveCommit.hours}h)`}
                </span>
              </h3>
              <p className="text-xs text-[#d4d4d8] leading-relaxed">
                Commits up to <code className="text-amber-300 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-[#27272a]">{baselineArchiveCommit.shortHash}</code> were already reviewed and approved{baselineArchiveCommit.program ? ` in ${baselineArchiveCommit.program}` : ''}. <strong className="text-white">DO NOT credit hours for commits up to this hash.</strong> Reviewers must strictly inspect the diff from <code className="text-amber-300 font-mono bg-black/60 px-1.5 py-0.5 rounded border border-[#27272a]">{baselineArchiveCommit.shortHash}...HEAD</code>.
              </p>
              {baselineIndex > 0 && (
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 pt-0.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{baselineIndex} new commit{baselineIndex > 1 ? 's' : ''} pushed since baseline</span>
                  {viewScope === 'current_ship' && (
                    <span className="text-[#a1a1aa] font-normal">
                      (showing only {baselineIndex} new commit{baselineIndex > 1 ? 's' : ''} in timeline below)
                    </span>
                  )}
                </div>
              )}
              {baselineIndex === -1 && (
                <div className="text-xs text-amber-300 flex items-center gap-1.5 pt-0.5">
                  <GitCommit className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Baseline commit {baselineArchiveCommit.shortHash} is earlier in git history than the {rawCommits.length} recent commits fetched. Use the compare link to inspect the full diff on GitHub.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`${project.codeUrl}/compare/${baselineArchiveCommit.commitHash}...HEAD`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 transition-colors text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Compare New Work ({baselineArchiveCommit.shortHash}...HEAD)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Critical Blocker: HEAD is Identical to Baseline */}
          {isHeadIdenticalToBaseline && (
            <div className="p-4 rounded-xl bg-[#3d0b13] border-2 border-rose-500 text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
                <span>
                  Critical Blocker: Repository HEAD is identical to the baseline archive commit ({baselineArchiveCommit.shortHash}). Zero new commits have been pushed since the prior approved ship!
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
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 shadow-md transition-colors cursor-pointer"
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

      {/* Permanent Deleted Files & Purged Traces Scanner */}
      <div
        className={`p-4 rounded-2xl bg-[#121214] border text-white space-y-3 shadow-lg shrink-0 ${
          purgedFiles.length > 0 ? 'border-rose-500/30' : 'border-[#27272a]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-2.5">
          <div className="flex items-center gap-2">
            {purgedFiles.length > 0 ? (
              <Trash2 className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Deleted Files & Purged Traces Scanner
            </h3>
            {purgedFiles.length > 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {purgedFiles.length} {purgedFiles.length === 1 ? 'file' : 'files'} purged in history
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified Clean (0 Purged Files)
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#a1a1aa] font-mono">
            Scans for purged AI prompts, agent rules, and scaffold boilerplate
          </span>
        </div>

        {purgedFiles.length > 0 ? (
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
                  <a
                    href={pf.htmlUrl || (project.codeUrl ? `${project.codeUrl.replace(/\/$/, '')}/commit/${pf.fullSha || pf.commitSha}` : '#')}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1 text-brand-orange font-semibold"
                    title={`Open deletion commit in GitHub: ${pf.commitMessage}`}
                  >
                    <span>Purged in {pf.commitSha}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span>{pf.date ? new Date(pf.date).toLocaleDateString() : ''}</span>
                </div>
                {pf.commitMessage && (
                  <p className="text-[10px] text-[#71717a] truncate" title={pf.commitMessage}>
                    {pf.commitMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272a] flex items-center gap-2 text-xs text-[#a1a1aa]">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All commits across git history retained their files. No evidence of purged Claude/Cursor agent configurations, deleted origin files, or removed source scaffolding found.
            </span>
          </div>
        )}
      </div>

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
              paginatedCommits.map((c) => {
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

          {/* Pagination Controls Bar */}
          {visibleCommits.length > 0 && (
            <div className="p-2.5 bg-[#18181b] border-t border-[#27272a] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#a1a1aa] font-mono text-[11px]">
                <span>
                  {startIndex + 1}–{Math.min(startIndex + pageSize, visibleCommits.length)} of {visibleCommits.length}
                </span>
                <span className="text-[#52525b]">|</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCommitPage(1);
                  }}
                  className="bg-[#121214] border border-[#27272a] rounded px-1.5 py-0.5 text-[10px] text-[#d4d4d8] focus:outline-none focus:border-brand-orange cursor-pointer"
                >
                  <option value={15}>15 / page</option>
                  <option value={30}>30 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                  <option value={9999}>All ({visibleCommits.length})</option>
                </select>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={commitPage <= 1}
                    onClick={() => setCommitPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded bg-[#121214] border border-[#27272a] text-[#d4d4d8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Prev</span>
                  </button>
                  <span className="px-2 py-0.5 font-mono text-[11px] text-[#a1a1aa]">
                    {commitPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={commitPage >= totalPages}
                    onClick={() => setCommitPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2 py-1 rounded bg-[#121214] border border-[#27272a] text-[#d4d4d8] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-2.5">
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-brand-orange" />
                  <span>History & Diffs for:</span>
                  <code className="text-brand-orange truncate">{selectedFileMetric.filename}</code>
                </span>
                <p className="text-[11px] text-[#a1a1aa] font-mono">
                  Modified in {selectedFileMetric.commitCount} commit{selectedFileMetric.commitCount > 1 ? 's' : ''} ({selectedFileMetric.additions > 0 ? `+${selectedFileMetric.additions}` : '0'}, {selectedFileMetric.deletions > 0 ? `-${selectedFileMetric.deletions}` : '0'})
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* View Mode Toggle: Journal vs Cards */}
                <div className="flex items-center bg-[#121214] p-0.5 rounded-lg border border-[#27272a] text-xs">
                  <button
                    type="button"
                    onClick={() => setFileViewMode('journal')}
                    className={`px-2.5 py-1 rounded font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                      fileViewMode === 'journal'
                        ? 'bg-brand-orange text-white font-semibold'
                        : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Diff Journal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileViewMode('cards')}
                    className={`px-2.5 py-1 rounded font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                      fileViewMode === 'cards'
                        ? 'bg-brand-orange text-white font-semibold'
                        : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                </div>

                {fileViewMode === 'cards' && (
                  <button
                    type="button"
                    onClick={() => setShowAllPatches((prev) => !prev)}
                    className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-mono transition-colors cursor-pointer"
                  >
                    {showAllPatches ? 'Collapse All' : 'Expand All'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFileFilter(null);
                    setExpandedPatchSha(null);
                    setShowAllPatches(false);
                  }}
                  className="text-xs text-[#a1a1aa] hover:text-white px-2.5 py-1 rounded bg-[#27272a] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* View Mode 1: Unified Continuous Chronological Diff Journal */}
            {fileViewMode === 'journal' ? (
              <div className="rounded-xl border border-[#27272a] bg-[#09090b] overflow-hidden">
                <div className="p-2.5 bg-[#121214] border-b border-[#27272a] flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
                  <span className="flex items-center gap-1.5 text-white font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-brand-orange" />
                    Chronological Diff Evolution (All Commits)
                  </span>
                  <span>{selectedFileMetric.commitsTouching.length} historical modifications</span>
                </div>

                <div className="divide-y divide-[#27272a] max-h-[500px] overflow-y-auto">
                  {selectedFileMetric.commitsTouching.map((cTouch, idx) => (
                    <div key={idx} className="p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-[#121214] px-3 py-2 rounded-lg border border-[#27272a]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-[#71717a] font-bold">
                            #{selectedFileMetric.commitsTouching.length - idx}
                          </span>
                          <span className="font-mono font-bold text-brand-orange text-xs">
                            {cTouch.shortSha}
                          </span>
                          <span className="text-xs text-[#e4e4e7] font-medium truncate max-w-sm md:max-w-md" title={cTouch.message}>
                            {cTouch.message}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-mono text-[#a1a1aa]">
                            {cTouch.date ? new Date(cTouch.date).toLocaleDateString() : ''}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-emerald-400">+{cTouch.additions}</span>
                          <span className="text-[11px] font-mono font-semibold text-rose-400">-{cTouch.deletions}</span>
                          <a
                            href={cTouch.htmlUrl || `${project.codeUrl}/commit/${cTouch.sha}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[10px] font-mono text-brand-orange inline-flex items-center gap-1 transition-colors"
                            title="Open commit on GitHub"
                          >
                            <span>Open on GitHub</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>

                      {cTouch.patch ? (
                        <div className="p-2.5 bg-[#09090b] rounded font-mono text-[11px] leading-relaxed space-y-0.5 select-text overflow-x-auto border border-[#1e1e24]">
                          {cTouch.patch.split('\n').map((line, lineIdx) => {
                            const isAdd = line.startsWith('+') && !line.startsWith('+++');
                            const isDel = line.startsWith('-') && !line.startsWith('---');
                            const isHunk = line.startsWith('@@');
                            return (
                              <div
                                key={lineIdx}
                                className={`px-1.5 py-0.2 rounded whitespace-pre-wrap break-all ${
                                  isAdd
                                    ? 'bg-emerald-950/60 text-emerald-300'
                                    : isDel
                                    ? 'bg-rose-950/60 text-rose-300'
                                    : isHunk
                                    ? 'bg-[#1e1e24] text-blue-300 font-bold my-1'
                                    : 'text-[#a1a1aa]'
                                }`}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-2 text-center text-[11px] text-[#71717a] font-mono">
                          <span>Patch diff not stored in cache. </span>
                          <a
                            href={cTouch.htmlUrl || `${project.codeUrl}/commit/${cTouch.sha}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-orange hover:underline inline-flex items-center gap-1"
                          >
                            <span>View commit diff on GitHub</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* View Mode 2: Card Accordion View */
              <div className="space-y-2.5 text-xs font-mono">
                {selectedFileMetric.commitsTouching.map((cTouch, idx) => {
                  const isExpanded = showAllPatches || expandedPatchSha === cTouch.sha;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#121214] border border-[#27272a] space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-brand-orange">{cTouch.shortSha}</span>
                          <span className="text-[#a1a1aa] text-[11px]">
                            {cTouch.date ? new Date(cTouch.date).toLocaleDateString() : ''}
                          </span>
                          <a
                            href={cTouch.htmlUrl || `${project.codeUrl}/commit/${cTouch.sha}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-1.5 py-0.5 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[10px] text-brand-orange inline-flex items-center gap-1 transition-colors"
                            title="Open commit on GitHub"
                          >
                            <span>Open in GitHub</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-400 font-semibold">+{cTouch.additions}</span>
                          <span className="text-rose-400 font-semibold">-{cTouch.deletions}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPatchSha((prev) => (prev === cTouch.sha ? null : cTouch.sha))
                            }
                            className="px-2 py-0.5 rounded bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange text-[10px] font-semibold transition-colors cursor-pointer border border-brand-orange/30"
                          >
                            {isExpanded ? 'Hide Diff' : 'Inspect Diff'}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#d4d4d8] font-sans leading-snug">{cTouch.message}</p>

                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-[#27272a]">
                          {cTouch.patch ? (
                            <div className="p-2.5 bg-[#09090b] border border-[#27272a] rounded-lg max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5 select-text">
                              {cTouch.patch.split('\n').map((line, lineIdx) => {
                                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                                const isDel = line.startsWith('-') && !line.startsWith('---');
                                const isHunk = line.startsWith('@@');
                                return (
                                  <div
                                    key={lineIdx}
                                    className={`px-1.5 py-0.2 rounded whitespace-pre-wrap break-all ${
                                      isAdd
                                        ? 'bg-emerald-950/60 text-emerald-300'
                                        : isDel
                                        ? 'bg-rose-950/60 text-rose-300'
                                        : isHunk
                                        ? 'bg-[#1e1e24] text-blue-300 font-bold my-1'
                                        : 'text-[#a1a1aa]'
                                    }`}
                                  >
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-[#09090b] border border-[#27272a] text-center text-xs text-[#71717a] flex items-center justify-center gap-2">
                              <span>Unified patch diff not stored for this file.</span>
                              <a
                                href={cTouch.htmlUrl || `${project.codeUrl}/commit/${cTouch.sha}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-orange hover:underline inline-flex items-center gap-1 font-semibold"
                              >
                                <span>View commit diff on GitHub</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shrink-0 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block">
              Archive vs Code Progression Verified (No Unchanged Resubmissions)
            </span>
            <p className="text-[11px] text-[#a1a1aa]">
              {baselineArchiveCommit
                ? `Verified genuine new progress and features were written beyond baseline ${baselineArchiveCommit.shortHash} (no naive hours subtraction).`
                : 'Verified genuine new progress and features were written beyond previous archived snapshot (no naive hours subtraction).'}
            </p>
          </div>
          <div className="shrink-0">
            <PassFailControl
              label="Progression"
              status={reviewChecklist['stage1_double_dip_checked']}
              onPass={() => onToggleChecklist?.('stage1_double_dip_checked', true)}
              onFail={() => onToggleChecklist?.('stage1_double_dip_checked', false)}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-white block">
              Git Progression & Incremental Authenticity Check
            </span>
            <p className="text-[11px] text-[#a1a1aa] mt-0.5">
              Verified authentic iterative development history vs monolithic prompt dumps or duplicate resubmissions.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <MultiOptionSelector<GitProgressionStatus>
              value={currentGitStatus}
              onChange={handleGitProgressionChange}
              options={GIT_PROGRESSION_OPTIONS}
              size="sm"
            />
          </div>
        </div>

        {/* Specific Code & Commit Checkboxes: monolithic initial dump & deleted origin files */}
        <div className="pt-2 border-t border-[#27272a] space-y-2">
          <span className="text-[11px] font-mono text-[#a1a1aa] block">
            Specific Code & Commit Forensic Checkboxes:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleChecklist?.('flag_monolithic_dump', !reviewChecklist['flag_monolithic_dump'])}
              className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                reviewChecklist['flag_monolithic_dump']
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-sm'
                  : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {reviewChecklist['flag_monolithic_dump'] ? (
                  <CheckSquare className="w-4 h-4 text-rose-400" />
                ) : (
                  <Square className="w-4 h-4 text-[#71717a]" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className={`text-xs font-semibold block ${reviewChecklist['flag_monolithic_dump'] ? 'text-rose-300' : 'text-[#d4d4d8]'}`}>
                  Monolithic Initial Dump
                </span>
                <span className="text-[10px] text-[#71717a] block leading-snug">
                  Initial commit dumps &gt;90% of entire codebase without iterative progression
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onToggleChecklist?.('flag_deleted_origin_files', !reviewChecklist['flag_deleted_origin_files'])}
              className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                reviewChecklist['flag_deleted_origin_files']
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-sm'
                  : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {reviewChecklist['flag_deleted_origin_files'] ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4 text-[#71717a]" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className={`text-xs font-semibold block ${reviewChecklist['flag_deleted_origin_files'] ? 'text-amber-300' : 'text-[#d4d4d8]'}`}>
                  Deleted Origin Files
                </span>
                <span className="text-[10px] text-[#71717a] block leading-snug">
                  Template traces, tutorial scaffolding, or author notes wiped in later commits
                </span>
              </div>
            </button>
          </div>
        </div>

        {currentGitStatus && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#27272a]">
            <span className="text-[11px] font-mono text-[#a1a1aa] shrink-0">Reason / Note:</span>
            <input
              type="text"
              value={reviewChecklist['note_git_progression'] || ''}
              onChange={(e) => onToggleChecklist?.('note_git_progression', e.target.value)}
              placeholder="Optional note (e.g. monolithic first commit, 80% AI vibe code, unchanged from last ship...)"
              className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-brand-orange"
            />
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          {currentGitStatus === 'pass' ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Git Progression Authenticity Verified</span>
            </span>
          ) : currentGitStatus === 'deflate' ? (
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Pass with Hours Deflation</span>
            </span>
          ) : currentGitStatus === 'ai_dump' ? (
            <span className="text-purple-400 font-semibold flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              <span>Flagged as AI / Code Dump</span>
            </span>
          ) : currentGitStatus === 'fail' ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <X className="w-4 h-4" />
              <span>Git History Failed / Zero Progress</span>
            </span>
          ) : (
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <span>Git Progression Audit Pending</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white font-bold hover:bg-[#ea580c] transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <span>Next: Submitter Portfolio →</span>
        </button>
      </div>
    </div>
  );
};
