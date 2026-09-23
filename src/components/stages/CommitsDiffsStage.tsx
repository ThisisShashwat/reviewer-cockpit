import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  FileCode,
  GitCommit,
  Clock,
  FileText,
} from 'lucide-react';
import { CockpitProject, GitHubRepoData } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface CommitsDiffsStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

type CommitCategory = 'core' | 'cosmetic' | 'huge_dump';

interface ClassifiedCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
  additions: number;
  deletions: number;
  files: Array<{ filename: string; additions: number; deletions: number; status: string }>;
  category: CommitCategory;
}

export const CommitsDiffsStage: React.FC<CommitsDiffsStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const rawCommits = gitHubData?.commits || [];
  const repoFiles = gitHubData?.files || [];
  const isRateLimited = Boolean(gitHubData?.isRateLimited);

  // Classify each commit
  const classifiedCommits: ClassifiedCommit[] = useMemo(() => {
    const codeExts = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.c', '.cpp', '.h',
      '.html', '.css', '.scss', '.sql', '.sh', '.kicad_pcb', '.kicad_sch',
      '.sch', '.brd', '.step', '.cad', '.java', '.kt', '.swift',
    ];

    return rawCommits.map((c) => {
      const additions = c.additions || 0;
      const files = c.files || [];
      const hasCodeFiles = files.some((f) =>
        codeExts.some((ext) => f.filename.toLowerCase().endsWith(ext))
      );
      const onlyDocOrAssetFiles =
        files.length > 0 &&
        files.every((f) => {
          const lower = f.filename.toLowerCase();
          return (
            lower.endsWith('.md') ||
            lower.endsWith('.txt') ||
            lower.includes('license') ||
            lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.svg') ||
            lower.endsWith('.ico') ||
            lower.endsWith('.webp') ||
            lower.endsWith('.gif') ||
            lower === '.gitignore'
          );
        });

      let category: CommitCategory = 'core';
      if (additions >= 1000 || files.length >= 25) {
        category = 'huge_dump';
      } else if (onlyDocOrAssetFiles || (!hasCodeFiles && files.length > 0)) {
        category = 'cosmetic';
      }

      return {
        ...c,
        additions,
        deletions: c.deletions || 0,
        files,
        category,
      };
    });
  }, [rawCommits]);

  const totalAdditions = classifiedCommits.reduce((acc, c) => acc + c.additions, 0);
  const totalDeletions = classifiedCommits.reduce((acc, c) => acc + c.deletions, 0);

  const coreCommits = classifiedCommits.filter((c) => c.category === 'core');
  const cosmeticCommits = classifiedCommits.filter((c) => c.category === 'cosmetic');
  const hugeDumpCommits = classifiedCommits.filter((c) => c.category === 'huge_dump');

  const coreAdditions = coreCommits.reduce((acc, c) => acc + c.additions, 0);
  const corePercent = totalAdditions > 0 ? Math.round((coreAdditions / totalAdditions) * 100) : 0;

  // Selected commit for changed files inspector
  const selectedCommit =
    classifiedCommits.find((c) => c.sha === selectedCommitSha) || classifiedCommits[0];

  // Development Duration Calculation
  const timelineDuration = useMemo(() => {
    if (classifiedCommits.length < 2) return null;
    const timestamps = classifiedCommits
      .map((c) => (c.date ? new Date(c.date).getTime() : 0))
      .filter((t) => t > 0);
    if (timestamps.length < 2) return null;
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const diffHours = (maxTime - minTime) / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.max(1, Math.round(diffHours * 60));
      return { text: `${mins} minutes`, isSpike: mins <= 30 && totalAdditions > 1500 };
    }
    if (diffHours < 24) {
      return { text: `${diffHours.toFixed(1)} hours`, isSpike: false };
    }
    const days = Math.round(diffHours / 24);
    return { text: `${days} day${days > 1 ? 's' : ''}`, isSpike: false };
  }, [classifiedCommits, totalAdditions]);

  // Overall AI Signal Evaluation across the entire repo
  const overallAiEvaluation = useMemo(() => {
    const aiKeywords = ['.cursorrules', '.claude', 'copilot', 'devin', 'prompts', '.v0'];
    const detectedAiFiles = repoFiles.filter((f) =>
      aiKeywords.some((kw) => f.name.toLowerCase().includes(kw))
    );

    const genericPatterns = [
      'initial commit',
      'create complete',
      'added all',
      'feat: complete project',
      'full architecture',
      'implemented application',
      'finish project',
    ];
    const genericMessageCommits = classifiedCommits.filter((c) =>
      genericPatterns.some((pattern) => c.message.toLowerCase().includes(pattern))
    );

    const isSingleCommitConcentrated =
      classifiedCommits.length === 1 ||
      (classifiedCommits.length > 0 &&
        totalAdditions > 2000 &&
        classifiedCommits[0].additions / totalAdditions >= 0.85);

    let riskScore = 0;
    const riskReasons: string[] = [];

    if (detectedAiFiles.length > 0) {
      riskScore += 2;
      riskReasons.push(`AI configuration files present in repository (${detectedAiFiles.map((f) => f.name).join(', ')})`);
    }

    if (genericMessageCommits.length >= 2) {
      riskScore += 2;
      riskReasons.push(`${genericMessageCommits.length} commits use generic AI boilerplate messages (e.g. "feat: complete project")`);
    }

    if (isSingleCommitConcentrated) {
      riskScore += 2;
      riskReasons.push(`Over 85% of repository code (+${classifiedCommits[0]?.additions.toLocaleString()} lines) was dropped in a single commit`);
    }

    if (timelineDuration?.isSpike) {
      riskScore += 2;
      riskReasons.push(`Entire commit history spans only ${timelineDuration.text} despite claiming ${project.submittedHours} hours`);
    }

    if (riskScore >= 4) {
      return {
        level: 'high' as const,
        badge: 'High AI / One-Shot Dump Risk',
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
      reasons: ['Commits demonstrate gradual iterative development, diverse commit messages, and natural file progression.'],
    };
  }, [repoFiles, classifiedCommits, totalAdditions, timelineDuration, project.submittedHours]);

  const handlePass = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, true);
    }
  };

  const handleFail = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 6 of 7
            </span>
            <span className="text-xs text-content-tertiary">Code History & Integrity Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Git Commits Progression, File-Wise Metrics & AI Evaluation
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm authentic incremental development progression across commits, inspect changed files, and evaluate repository AI generation signals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`${project.codeUrl}/commits`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <span>GitHub Commits</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* GitHub Rate Limit Banner (Graceful fallback notice) */}
      {isRateLimited && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3 shadow-lg shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 flex-1">
            <span className="font-bold text-amber-300 block text-sm">
              GitHub API Unauthenticated Rate Limit (60 req/hr) Encountered
            </span>
            <p className="text-amber-200/90 leading-relaxed">
              GitHub limits unauthenticated API queries per IP address. The repository README was fetched directly via raw files, but full commit diffs cannot be queried via API at this moment. Review commits directly on GitHub.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href={`${project.codeUrl}/commits`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-brand-orange text-white font-semibold hover:bg-orange-600 transition-colors inline-flex items-center gap-1"
              >
                <span>Inspect Commits Directly on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top Signal Strip 1: High-Level Commit Classification Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 shrink-0">
        {/* Core Commits */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1 shadow-lg">
          <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
            Core Engineering
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {coreCommits.length} commits
          </div>
          <span className="text-[11px] text-[#71717a] font-mono">
            {corePercent}% of total diff changes
          </span>
        </div>

        {/* Cosmetic / Doc Commits */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1 shadow-lg">
          <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Cosmetic / Assets
          </span>
          <div className="text-xl font-bold font-mono text-blue-400">
            {cosmeticCommits.length} commits
          </div>
          <span className="text-[11px] text-[#71717a] font-mono">
            README, licenses, or image assets
          </span>
        </div>

        {/* Huge Dump Commits */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1 shadow-lg">
          <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <AlertTriangle className={`w-3.5 h-3.5 ${hugeDumpCommits.length > 0 ? 'text-amber-400' : 'text-[#71717a]'}`} />
            Mass Code Dumps
          </span>
          <div className={`text-xl font-bold font-mono ${hugeDumpCommits.length > 0 ? 'text-amber-400' : 'text-[#d4d4d8]'}`}>
            {hugeDumpCommits.length} huge
          </div>
          <span className="text-[11px] text-[#71717a] font-mono">
            {hugeDumpCommits.length > 0 ? '>1,000 lines dropped in 1 shot' : 'None detected'}
          </span>
        </div>

        {/* Timeline Span */}
        <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1 shadow-lg">
          <span className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Clock className="w-3.5 h-3.5 text-brand-orange" />
            Timeline Span
          </span>
          <div className="text-xl font-bold font-mono text-white">
            {timelineDuration ? timelineDuration.text : `${classifiedCommits.length} commits`}
          </div>
          <span className="text-[11px] text-[#71717a] font-mono">
            Claimed {project.submittedHours} hrs
          </span>
        </div>
      </div>

      {/* Top Signal Strip 2: OVERALL REPOSITORY AI SIGNAL (Not commit-wise, right at the top!) */}
      <div
        className={`p-4 rounded-2xl border text-white space-y-2.5 shadow-lg shrink-0 ${
          overallAiEvaluation.level === 'high'
            ? 'bg-rose-950/40 border-rose-500/50'
            : overallAiEvaluation.level === 'moderate'
            ? 'bg-amber-950/40 border-amber-500/50'
            : 'bg-[#121214] border-emerald-500/30'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#27272a]/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Bot
              className={`w-4 h-4 ${
                overallAiEvaluation.level === 'high'
                  ? 'text-rose-400'
                  : overallAiEvaluation.level === 'moderate'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Overall Repository AI Evaluation:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
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

          <span className="text-[11px] font-mono text-[#a1a1aa]">
            {rawCommits.length} total commits analyzed
          </span>
        </div>

        <ul className="text-xs space-y-1 text-[#d4d4d8] leading-relaxed">
          {overallAiEvaluation.reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-brand-orange mt-0.5">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Commit Explorer Grid (Sleek Dark Console Aesthetic) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[440px]">
        {/* Left column: Commits Timeline with Category Badges */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-brand-orange" />
              Commit Timeline ({classifiedCommits.length})
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-emerald-400 font-semibold">+{totalAdditions}</span>
              <span className="text-rose-400 font-semibold">-{totalDeletions}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]">
            {classifiedCommits.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71717a] space-y-2">
                <GitCommit className="w-6 h-6 text-[#52525b] mx-auto" />
                <p>
                  {isRateLimited
                    ? 'Commits rate-limited by GitHub API. Use GitHub Commits link above.'
                    : 'No commits returned or repository is empty.'}
                </p>
              </div>
            ) : (
              classifiedCommits.map((c) => {
                const isSelected = selectedCommit?.sha === c.sha;
                return (
                  <button
                    key={c.sha}
                    type="button"
                    onClick={() => setSelectedCommitSha(c.sha)}
                    className={`w-full text-left p-3.5 transition-colors block cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1e24] border-l-2 border-l-brand-orange'
                        : 'hover:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-white truncate">
                          {c.shortSha}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold ${
                            c.category === 'core'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : c.category === 'huge_dump'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {c.category === 'huge_dump' ? 'MASS DUMP' : c.category.toUpperCase()}
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

        {/* Right column: Changed Files & Diffs Inspector */}
        <div className="lg:col-span-7 bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-orange" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Changed Files in Commit {selectedCommit?.shortSha || ''} ({selectedCommit?.files?.length || 0})
              </span>
            </div>

            {selectedCommit && (
              <a
                href={selectedCommit.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
              >
                <span>Full GitHub Commit Diff</span>
                <ExternalLink className="w-3 h-3" />
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
                      <span className="text-[#d4d4d8] truncate">{file.filename}</span>
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

      {/* Interactive Reviewer Pass/Fail Checklist */}
      <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg shrink-0">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Stage 5 Verification: Code Integrity & Progression Checks
          </h3>
          <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
        </div>

        <div className="space-y-2.5">
          <PassFailControl
            label="Commits Demonstrate Genuine Iterative Engineering"
            description="Development happened incrementally across distinct working sessions without unnatural mass dumps."
            status={reviewChecklist['stage5_incremental_commits']}
            onPass={() => handlePass('stage5_incremental_commits')}
            onFail={() => handleFail('stage5_incremental_commits')}
          />

          <PassFailControl
            label="Code Driven by Core Logic (Not Inflated by Cosmetic/Asset Uploads)"
            description={`Verified that code diffs (${corePercent}% core logic) reflect real problem solving, not simply bulk image or documentation uploads.`}
            status={reviewChecklist['stage5_core_progress_verified']}
            onPass={() => handlePass('stage5_core_progress_verified')}
            onFail={() => handleFail('stage5_core_progress_verified')}
          />

          <PassFailControl
            label="Overall Repository AI Signal Evaluated"
            description="Repository verified for authentic authorship without one-shot AI dumping or uncredited template copying."
            status={reviewChecklist['stage5_ai_risk_evaluated']}
            onPass={() => handlePass('stage5_ai_risk_evaluated')}
            onFail={() => handleFail('stage5_ai_risk_evaluated')}
          />
        </div>
      </div>

      {/* Reviewer Action Bar */}
      <div className="pt-4 flex items-center justify-between border-t border-border-subtle shrink-0">
        {isFlagging ? (
          <div className="flex items-center gap-2 flex-1 max-w-md mr-4">
            <input
              type="text"
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="Reason for code integrity concern..."
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="button"
              onClick={() => {
                if (onEarlyExit && flagNote.trim()) {
                  onEarlyExit(`Code Integrity Concern: ${flagNote.trim()}`);
                }
                setIsFlagging(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
            >
              Confirm Flag
            </button>
            <button
              type="button"
              onClick={() => setIsFlagging(false)}
              className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsFlagging(true)}
            className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Flag Code Integrity Concern</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>Continue to Final Verdict Desk →</span>
        </button>
      </div>
    </div>
  );
};
