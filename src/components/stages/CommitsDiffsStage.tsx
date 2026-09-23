import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileCode,
  GitCommit,
  Terminal,
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

export const CommitsDiffsStage: React.FC<CommitsDiffsStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'files' | 'ai'>('files');
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  const commits = gitHubData?.commits || [];
  const files = gitHubData?.files || [];
  const isRateLimited = Boolean(gitHubData?.isRateLimited);
  const totalAdditions = commits.reduce((acc, c) => acc + (c.additions || 0), 0);
  const totalDeletions = commits.reduce((acc, c) => acc + (c.deletions || 0), 0);

  const isSingleCommitDump = commits.length === 1 && totalAdditions > 3000;
  const selectedCommit = commits.find((c) => c.sha === selectedCommitSha) || commits[0];

  // AI Heuristic checks
  const aiIndicatorFiles = files.filter((f) =>
    ['.cursorrules', '.claude', 'copilot', 'devin', 'prompts'].some((kw) =>
      f.name.toLowerCase().includes(kw)
    )
  );

  const genericAiMessages = commits.filter((c) =>
    [
      'initial commit',
      'create complete',
      'added all',
      'feat: complete project',
      'full architecture',
      'implemented application',
    ].some((pattern) => c.message.toLowerCase().includes(pattern))
  );

  const hasAiIndicators = aiIndicatorFiles.length > 0 || genericAiMessages.length >= 2;

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

  const airlockUrl = `https://airlock.hackclub.com/?r=${encodeURIComponent(project.codeUrl)}`;

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 5 of 6
            </span>
            <span className="text-xs text-content-tertiary">Code History & Integrity Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Git Commits Progression, File-Wise Metrics & AI Heuristics
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm authentic incremental development progression across commits, inspect changed files, and evaluate AI generation signals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRateLimited ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> API Rate Limited
            </span>
          ) : hasAiIndicators ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> AI Signals Present
            </span>
          ) : commits.length > 0 ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Organic Code Patterns
            </span>
          ) : null}

          <a
            href={airlockUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-medium text-white hover:text-brand-orange flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Launch sandboxed Linux VM for this repository"
          >
            <Terminal className="w-3.5 h-3.5 text-brand-orange" />
            <span>Airlock Sandbox</span>
          </a>

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
              GitHub limits unauthenticated API queries per IP address. The repository README was fetched directly via raw files, but full commit diffs cannot be queried via API at this moment.
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
              <a
                href={airlockUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-white hover:text-brand-orange transition-colors inline-flex items-center gap-1"
              >
                <span>Open in Airlock Linux VM</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Single Commit Dump Warning */}
      {isSingleCommitDump && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3 shadow-lg shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-bold text-amber-300 block">
              Single-Commit Package Dump Detected ({totalAdditions.toLocaleString()} lines)
            </span>
            <span>
              Repository contains only one commit with over 3,000 lines. Verify whether this code was generated in one shot, cloned from a template, or represents true manual work.
            </span>
          </div>
        </div>
      )}

      {/* Commit Explorer Grid (Sleek Dark Console Aesthetic) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[440px]">
        {/* Left column: Commits Timeline */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <GitCommit className="w-4 h-4 text-brand-orange" />
              Commit Timeline ({commits.length})
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-emerald-400 font-semibold">+{totalAdditions}</span>
              <span className="text-rose-400 font-semibold">-{totalDeletions}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#27272a]">
            {commits.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71717a] space-y-2">
                <GitCommit className="w-6 h-6 text-[#52525b] mx-auto" />
                <p>{isRateLimited ? 'Commits rate-limited by GitHub API. Use GitHub Commits link above.' : 'No commits returned or repository is empty.'}</p>
              </div>
            ) : (
              commits.map((c) => {
                const isSelected = selectedCommit?.sha === c.sha;
                return (
                  <button
                    key={c.sha}
                    type="button"
                    onClick={() => {
                      setSelectedCommitSha(c.sha);
                      setActiveInspectorTab('files');
                    }}
                    className={`w-full text-left p-3.5 transition-colors block cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1e24] border-l-2 border-l-brand-orange'
                        : 'hover:bg-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-white truncate">
                        {c.shortSha}
                      </span>
                      <span className="text-[11px] text-[#71717a] font-mono">
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

        {/* Right column: Inspector with Files & AI Heuristics Tabs */}
        <div className="lg:col-span-7 bg-[#121214] border border-[#27272a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between">
            <div className="flex items-center bg-[#121214] border border-[#27272a] rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('files')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeInspectorTab === 'files'
                    ? 'bg-[#27272a] text-white font-semibold shadow-sm'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                Changed Files ({selectedCommit?.files?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('ai')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  activeInspectorTab === 'ai'
                    ? 'bg-[#27272a] text-white font-semibold shadow-sm'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-brand-orange" />
                <span>AI Signals</span>
                {hasAiIndicators && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            </div>

            {selectedCommit && (
              <a
                href={selectedCommit.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-orange hover:underline font-mono inline-flex items-center gap-1"
              >
                <span>Commit {selectedCommit.shortSha} Diff</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 select-text">
            {activeInspectorTab === 'files' ? (
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
            ) : (
              <div className="space-y-4 text-xs text-[#d4d4d8]">
                <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                    AI Rules & Configuration Files
                  </h4>
                  {aiIndicatorFiles.length > 0 ? (
                    <div className="space-y-1">
                      {aiIndicatorFiles.map((f, i) => (
                        <div key={i} className="text-amber-400 font-mono text-[11px]">
                          • {f.name} (Found in repository root)
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#71717a]">
                      No .cursorrules, .claude, devin, or prompts files detected in repository tree.
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                  <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                    Generic / Single-Shot Commit Messages
                  </h4>
                  {genericAiMessages.length > 0 ? (
                    <div className="space-y-1">
                      {genericAiMessages.map((c, i) => (
                        <div key={i} className="text-amber-400 font-mono text-[11px]">
                          • &ldquo;{c.message}&rdquo; ({c.shortSha})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#71717a]">
                      Commit messages demonstrate distinct, iterative human engineering steps.
                    </p>
                  )}
                </div>
              </div>
            )}
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
            label="Commits Demonstrate Iterative Progression"
            description="Development happened incrementally across distinct working sessions without unnatural mass dumps."
            status={reviewChecklist['stage5_incremental_commits']}
            onPass={() => handlePass('stage5_incremental_commits')}
            onFail={() => handleFail('stage5_incremental_commits')}
          />

          <PassFailControl
            label="Organic Authorship Verified (No AI Slop / Template Clones)"
            description="Code contains real architectural decisions, original comments, and problem-solving patterns."
            status={reviewChecklist['stage5_organic_authorship']}
            onPass={() => handlePass('stage5_organic_authorship')}
            onFail={() => handleFail('stage5_organic_authorship')}
          />

          <PassFailControl
            label="Diff Volume & File Scope Matches Claimed Hours"
            description="Amount of engineering delivered justifies the hours claimed without artificial padding."
            status={reviewChecklist['stage5_diff_scope_matches']}
            onPass={() => handlePass('stage5_diff_scope_matches')}
            onFail={() => handleFail('stage5_diff_scope_matches')}
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
