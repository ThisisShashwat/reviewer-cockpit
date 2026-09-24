import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  FolderGit2,
  GitBranch,
  RefreshCw,
  Search,
  Star,
  UserCheck,
  Calendar,
  Code,
  Check,
  Sparkles,
  Award,
  Zap,
  Video,
  Globe,
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchGitHubUserRepos, generateAiSearchQuery } from '../../lib/api';
import { CockpitProject, GitHubUserRepo, GitHubRepoData } from '../../lib/types';
import { MultiOptionSelector, SelectorOption } from '../common/MultiOptionSelector';
import { PassFailControl } from '../common/PassFailControl';

interface PortfolioExperienceStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData> | null;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, any>;
  onToggleChecklist?: (key: string, status?: any) => void;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'highly_experienced';

const EXPERIENCE_OPTIONS: SelectorOption<ExperienceLevel>[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    color: 'emerald',
    icon: Sparkles,
    description: 'New to programming, early learning journey, first few projects or tutorial scaffolding',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    color: 'blue',
    icon: Check,
    description: 'Comfortable building functional applications with standard libraries and frameworks',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    color: 'purple',
    icon: Zap,
    description: 'Strong architectural instincts, diverse multi-repository portfolio, clean modular code',
  },
  {
    id: 'highly_experienced',
    label: 'Highly Experienced / Pro',
    color: 'amber',
    icon: Award,
    description: 'Senior-tier engineering patterns, complex distributed systems, multi-year production history',
  },
];

interface PortfolioStats {
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  languages: Array<{ lang: string; count: number; percent: number }>;
  earliestCreated: Date | null;
  latestPushed: Date | null;
}

export const PortfolioExperienceStage: React.FC<PortfolioExperienceStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [repos, setRepos] = useState<GitHubUserRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const username = (project.githubUsername || '').trim();

  useEffect(() => {
    let mounted = true;
    if (!username) {
      setIsLoading(false);
      setError('No GitHub username associated with this submission');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsRateLimited(false);

    fetchGitHubUserRepos(username)
      .then((data) => {
        if (mounted) {
          if (data.isRateLimited) {
            setIsRateLimited(true);
          }
          if (data.error && !data.isRateLimited) {
            setError(data.error);
          }
          setRepos(data.repos || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to fetch repositories');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [username]);

  // Aggregate statistics across public repos
  const stats: PortfolioStats = useMemo(() => {
    let totalStars = 0;
    let totalForks = 0;
    const langCounts: Record<string, number> = {};
    let earliestCreated: Date | null = null;
    let latestPushed: Date | null = null;

    repos.forEach((r) => {
      totalStars += r.stars;
      totalForks += r.forks;

      if (r.language) {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }

      if (r.createdAt) {
        const d = new Date(r.createdAt);
        if (!isNaN(d.getTime())) {
          if (!earliestCreated || d < earliestCreated) earliestCreated = d;
        }
      }

      if (r.pushedAt) {
        const d = new Date(r.pushedAt);
        if (!isNaN(d.getTime())) {
          if (!latestPushed || d > latestPushed) latestPushed = d;
        }
      }
    });

    const sortedLanguages = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({
        lang,
        count,
        percent: Math.round((count / (repos.length || 1)) * 100),
      }));

    return {
      totalStars,
      totalForks,
      totalRepos: repos.length,
      languages: sortedLanguages,
      earliestCreated,
      latestPushed,
    };
  }, [repos]);

  // Filtered repositories for table view
  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchSearch =
        searchFilter === '' ||
        r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (r.language && r.language.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchLang = !selectedLanguage || r.language === selectedLanguage;

      return matchSearch && matchLang;
    });
  }, [repos, searchFilter, selectedLanguage]);

  const currentExperience: ExperienceLevel | undefined =
    reviewChecklist['submitter_experience_level'];

  const handleExperienceChange = (level: ExperienceLevel) => {
    onToggleChecklist?.('submitter_experience_level', level);
    onToggleChecklist?.('submitter_experience_evaluated', true);
  };

  const getLanguageColor = (lang: string | null) => {
    switch (lang?.toLowerCase()) {
      case 'typescript':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'javascript':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'python':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'rust':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'go':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'c':
      case 'c++':
      case 'cpp':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'html':
      case 'css':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  // Query engineering for Plagiarism / Tutorial Web Search Audit
  const cleanProjectName = useMemo(() => {
    return (project.projectName || '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, [project.projectName]);

  const detectedLanguage = useMemo(() => {
    if (gitHubData?.language) return gitHubData.language;
    const lowerFiles = (gitHubData?.files || []).map((f) => f.name.toLowerCase());
    if (lowerFiles.some((f) => f.endsWith('.py'))) return 'Python';
    if (lowerFiles.some((f) => f.endsWith('.rs'))) return 'Rust';
    if (lowerFiles.some((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) return 'TypeScript';
    if (lowerFiles.some((f) => f.endsWith('.jsx') || f.endsWith('.js'))) return 'JavaScript';
    if (lowerFiles.some((f) => f.endsWith('.cpp') || f.endsWith('.c'))) return 'C++';
    if (lowerFiles.some((f) => f.endsWith('.java'))) return 'Java';
    if (lowerFiles.some((f) => f.endsWith('.go'))) return 'Go';
    if (lowerFiles.some((f) => f.endsWith('.html'))) return 'HTML/JS';
    return '';
  }, [gitHubData]);

  const detectedFramework = useMemo(() => {
    const lowerFiles = (gitHubData?.files || []).map((f) => f.name.toLowerCase());
    const lowerText = (project.projectName + ' ' + (project.description || '')).toLowerCase();
    const candidates = [
      'pygame', 'threejs', 'three.js', 'react', 'flutter', 'unity', 'godot',
      'raylib', 'fastapi', 'flask', 'express', 'electron', 'tailwind', 'arduino',
      'kicad', 'nextjs', 'svelte', 'vue', 'django'
    ];
    for (const c of candidates) {
      if (lowerText.includes(c) || lowerFiles.some((f) => f.includes(c))) {
        return c;
      }
    }
    return '';
  }, [gitHubData, project.projectName, project.description]);

  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const baseQuery = useMemo(() => {
    const parts = [cleanProjectName, detectedFramework, detectedLanguage].filter(Boolean);
    return parts.join(' ');
  }, [cleanProjectName, detectedFramework, detectedLanguage]);

  const effectiveQuery = customSearchQuery || baseQuery;

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${effectiveQuery} tutorial OR clone OR github`)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${effectiveQuery} tutorial`)}`;
  const githubSearchUrl = `https://github.com/search?q=${encodeURIComponent(effectiveQuery)}&type=repositories`;

  const handleOpenAllSearches = () => {
    window.open(googleSearchUrl, '_blank', 'noopener,noreferrer');
    window.open(youtubeSearchUrl, '_blank', 'noopener,noreferrer');
    window.open(githubSearchUrl, '_blank', 'noopener,noreferrer');
  };

  const [isGeneratingAiQuery, setIsGeneratingAiQuery] = useState(false);

  const handleGenerateAiQuery = async () => {
    try {
      setIsGeneratingAiQuery(true);
      const filenames = (gitHubData?.files || []).map((f) => f.name);
      const res = await generateAiSearchQuery({
        projectName: project.projectName,
        description: project.description,
        language: detectedLanguage || '',
        files: filenames,
        readmeSnippet: gitHubData?.readmeContent?.slice(0, 600),
      });

      if (res) {
        setCustomSearchQuery(res);
        toast.success('Generated AI engineered search query!');
      } else {
        toast.warning('No query returned from AI model');
      }
    } catch (err: any) {
      console.error('Failed to generate AI search query:', err);
      toast.error(err.message || 'Failed to generate AI search query');
    } finally {
      setIsGeneratingAiQuery(false);
    }
  };

  const isGoogleCleared = reviewChecklist['plagiarism_google_cleared'] === true;
  const isYoutubeCleared = reviewChecklist['plagiarism_youtube_cleared'] === true;
  const isGithubCleared = reviewChecklist['plagiarism_github_cleared'] === true;
  const clearedCount = [isGoogleCleared, isYoutubeCleared, isGithubCleared].filter(Boolean).length;

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col select-text">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 6 of 7
            </span>
            <span className="text-xs text-content-tertiary">Submitter Portfolio & Track Record</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Submitter Experience & Public GitHub Repositories
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit other public repositories by @<strong className="text-content-primary">{username}</strong> to calibrate technical experience, language proficiency, activity history, and project complexity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`https://github.com/${encodeURIComponent(username)}?tab=repositories`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-brand-orange" />
            <span>Open GitHub Profile</span>
            <ExternalLink className="w-3 h-3 text-content-muted" />
          </a>

          {/* Top Next Navigation Button */}
          <button
            type="button"
            onClick={onAdvance}
            className="px-4 py-2 rounded-xl bg-[#ff6b35] text-white font-bold hover:bg-[#ea580c] transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
          >
            <span>Next: Verdict Desk →</span>
          </button>
        </div>
      </div>

      {/* Experience Evaluation Control Card */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-xl shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-orange" />
              <span>Calibrate Submitter Experience Level</span>
            </h3>
            <p className="text-[11px] text-[#a1a1aa]">
              Based on other repositories, complexity of prior work, and git activity timeline, evaluate the submitter&apos;s background.
            </p>
          </div>

          {currentExperience && (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/30 shrink-0">
              Selected: {EXPERIENCE_OPTIONS.find((o) => o.id === currentExperience)?.label}
            </span>
          )}
        </div>

        <MultiOptionSelector<ExperienceLevel>
          value={currentExperience}
          onChange={handleExperienceChange}
          options={EXPERIENCE_OPTIONS}
          size="sm"
        />
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-content-tertiary text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
          <span>Fetching public repositories for @{username} from GitHub API...</span>
        </div>
      ) : isRateLimited ? (
        <div className="p-5 rounded-2xl bg-[#121214] border border-amber-500/40 text-white space-y-2 shadow-lg">
          <span className="font-bold text-amber-300 block text-sm">GitHub Rate Limit Encountered</span>
          <p className="text-xs text-[#d4d4d8] leading-relaxed">
            The GitHub API returned a rate-limit notice. You can inspect the user&apos;s repositories directly on GitHub using the profile button above.
          </p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-[#121214] border border-rose-500/40 text-white space-y-2 shadow-lg">
          <span className="font-bold text-rose-300 block text-sm">Unable to Load Portfolio</span>
          <p className="text-xs text-[#d4d4d8] leading-relaxed">{error}</p>
        </div>
      ) : (
        <>
          {/* Submitter Metrics & Timeline Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1">
              <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold block">Public Repositories</span>
              <span className="text-xl font-bold font-mono text-white">{stats.totalRepos}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1">
              <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold block">Total Stars</span>
              <span className="text-xl font-bold font-mono text-amber-400 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400/20" />
                <span>{stats.totalStars}</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1">
              <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold block">Earliest Public Repo</span>
              <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{stats.earliestCreated ? new Date(stats.earliestCreated).toLocaleDateString() : 'N/A'}</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-1">
              <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold block">Most Recent Push</span>
              <span className="text-xs font-bold font-mono text-blue-400 flex items-center gap-1.5 pt-1">
                <GitBranch className="w-3.5 h-3.5 shrink-0" />
                <span>{stats.latestPushed ? new Date(stats.latestPushed).toLocaleDateString() : 'N/A'}</span>
              </span>
            </div>
          </div>

          {/* Languages Stack Distribution */}
          {stats.languages.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Code className="w-3.5 h-3.5 text-brand-orange" />
                  Primary Language Diversity ({stats.languages.length} stacks detected)
                </span>
                {selectedLanguage && (
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage(null)}
                    className="text-[11px] text-brand-orange hover:underline cursor-pointer"
                  >
                    Clear Language Filter ({selectedLanguage})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {stats.languages.map((l) => {
                  const isSelected = selectedLanguage === l.lang;
                  return (
                    <button
                      key={l.lang}
                      type="button"
                      onClick={() => setSelectedLanguage(isSelected ? null : l.lang)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-brand-orange text-white border-brand-orange shadow-md font-bold'
                          : `${getLanguageColor(l.lang)} hover:brightness-125`
                      }`}
                    >
                      <span>{l.lang}</span>
                      <span className="text-[10px] opacity-75">({l.count} repos · {l.percent}%)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Plagiarism & Tutorial Web Search Audit Card */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-xl shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Plagiarism & Tutorial Web Search Audit
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    clearedCount === 3
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : clearedCount > 0
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {clearedCount === 3
                    ? 'All 3 Audited (No Easy Matches Found)'
                    : `${clearedCount} of 3 Audited`}
                </span>
              </div>

              <span className="text-[11px] font-mono text-[#a1a1aa]">
                1-Click Multi-Engine Forensics
              </span>
            </div>

            {/* Search Query Formulation Row */}
            <div className="flex flex-col gap-3 bg-[#18181b] p-3.5 rounded-xl border border-[#27272a]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-mono text-[#a1a1aa] block font-semibold">
                  Engineered Search Query (Powered by Gemini 3.8 Flash)
                </span>

                <div className="flex items-center gap-2">
                  {customSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomSearchQuery('')}
                      className="text-[10px] font-mono text-brand-orange hover:underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateAiQuery}
                    disabled={isGeneratingAiQuery}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-orange to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                    title="Calls Gemini 3.8 Flash via Hack Club AI Proxy to engineer a high-precision search query using project files and metadata"
                  >
                    {isGeneratingAiQuery ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Engineering Query...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>Generate Engineered Search Query</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    type="text"
                    value={effectiveQuery}
                    onChange={(e) => setCustomSearchQuery(e.target.value)}
                    placeholder="Click 'Generate Engineered Search Query' or type project keywords..."
                    className="w-full bg-[#121214] border border-[#27272a] rounded px-3 py-1.5 text-xs text-white placeholder-[#71717a] font-mono focus:outline-none focus:border-brand-orange"
                  />
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#71717a] flex-wrap">
                    <span>Stack hints:</span>
                    {cleanProjectName && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        Title: {cleanProjectName}
                      </span>
                    )}
                    {detectedFramework && (
                      <span className="px-1.5 py-0.2 rounded bg-brand-orange/20 text-orange-300 border border-brand-orange/30">
                        Framework: {detectedFramework}
                      </span>
                    )}
                    {detectedLanguage && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Lang: {detectedLanguage}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3 Engine Buttons + Open All 3 */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Search Google for identical tutorials or blog posts"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Google</span>
                    <ExternalLink className="w-3 h-3 text-[#71717a]" />
                  </a>

                  <a
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Search YouTube for identical video walkthroughs and asset packs"
                  >
                    <Video className="w-3.5 h-3.5 text-rose-400" />
                    <span>YouTube</span>
                    <ExternalLink className="w-3 h-3 text-[#71717a]" />
                  </a>

                  <a
                    href={githubSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                    title="Search GitHub for existing matching repositories and templates"
                  >
                    <Search className="w-3.5 h-3.5 text-purple-400" />
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3 text-[#71717a]" />
                  </a>

                  <button
                    type="button"
                    onClick={handleOpenAllSearches}
                    className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Open Google, YouTube, and GitHub in new tabs at once"
                  >
                    <span>Open All 3</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Reviewer Verification Checkboxes */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-[#a1a1aa] block">
                Reviewer Search Due-Diligence Checkboxes:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleChecklist?.('plagiarism_google_cleared', !isGoogleCleared)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isGoogleCleared
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isGoogleCleared ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-[#71717a]" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className={`text-xs font-semibold block ${isGoogleCleared ? 'text-emerald-300' : 'text-[#d4d4d8]'}`}>
                      Google Web Check
                    </span>
                    <span className="text-[11px] text-[#71717a] block leading-snug">
                      I searched Google and could not easily find an identical tutorial or source article.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleChecklist?.('plagiarism_youtube_cleared', !isYoutubeCleared)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isYoutubeCleared
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isYoutubeCleared ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-[#71717a]" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className={`text-xs font-semibold block ${isYoutubeCleared ? 'text-emerald-300' : 'text-[#d4d4d8]'}`}>
                      YouTube Video Check
                    </span>
                    <span className="text-[11px] text-[#71717a] block leading-snug">
                      I searched YouTube and could not easily find a matching video walkthrough or assets.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleChecklist?.('plagiarism_github_cleared', !isGithubCleared)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isGithubCleared
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isGithubCleared ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-[#71717a]" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className={`text-xs font-semibold block ${isGithubCleared ? 'text-emerald-300' : 'text-[#d4d4d8]'}`}>
                      GitHub Repo Check
                    </span>
                    <span className="text-[11px] text-[#71717a] block leading-snug">
                      I searched GitHub and could not easily find an identical template or parent repo.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Plagiarism / Tutorial Match Pass/Fail Checklist Control */}
            <div className="pt-2 border-t border-[#27272a] space-y-3">
              <PassFailControl
                label={
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <ShieldAlert className="w-4 h-4 text-brand-orange" />
                    <span>Tutorial & Plagiarism Verification</span>
                  </span>
                }
                description="Pass if research confirms genuine original work with no copied tutorial. Fail if an identical tutorial walkthrough, video project clone, or template copycat is identified."
                status={
                  reviewChecklist['flag_tutorial_plagiarized'] === undefined
                    ? undefined
                    : reviewChecklist['flag_tutorial_plagiarized'] === false
                    ? true
                    : false
                }
                onPass={() => {
                  onToggleChecklist?.('flag_tutorial_plagiarized', false);
                  onToggleChecklist?.('note_plagiarism_match', '');
                }}
                onFail={() => {
                  onToggleChecklist?.('flag_tutorial_plagiarized', true);
                }}
              />

              {reviewChecklist['flag_tutorial_plagiarized'] === true && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Record Matching Tutorial / Cloned Repository Reference</span>
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                      Flagged for Rejection
                    </span>
                  </div>
                  <input
                    type="text"
                    value={reviewChecklist['note_plagiarism_match'] || ''}
                    onChange={(e) => onToggleChecklist?.('note_plagiarism_match', e.target.value)}
                    placeholder="Paste matching tutorial link, YouTube video URL, or copied repo title (e.g. https://youtube.com/watch?v=... or TechWithTim Flappy Bird)..."
                    className="w-full bg-[#121214] border border-rose-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-rose-300/40 font-mono focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Repository Explorer Grid / Table */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Repositories ({filteredRepos.length} of {repos.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#71717a]" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter repos by name or stack..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#71717a] text-xs font-mono focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>
            </div>

            {filteredRepos.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#a1a1aa] italic">
                No repositories match the current filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs truncate">
                          {repo.name}
                        </span>
                        {repo.isFork && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]">
                            Fork
                          </span>
                        )}
                        {repo.language && (
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-mono border ${getLanguageColor(
                              repo.language
                            )}`}
                          >
                            {repo.language}
                          </span>
                        )}
                        {repo.stars > 0 && (
                          <span className="text-[10px] font-mono text-amber-400 flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{repo.stars}</span>
                          </span>
                        )}
                      </div>

                      {repo.description ? (
                        <p className="text-[11px] text-[#d4d4d8] leading-relaxed line-clamp-2">
                          {repo.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#71717a] italic">No description provided</p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-[#71717a] font-mono pt-0.5 flex-wrap">
                        {repo.size !== undefined && repo.size > 0 && (
                          <>
                            <span className="text-[#a1a1aa] font-semibold">
                              Size: {repo.size > 1024 ? `${(repo.size / 1024).toFixed(1)} MB` : `${repo.size} KB`}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>Created: {repo.createdAt ? new Date(repo.createdAt).toLocaleDateString() : ''}</span>
                        <span>•</span>
                        <span>Last Pushed: {repo.pushedAt ? new Date(repo.pushedAt).toLocaleDateString() : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-brand-orange hover:text-white text-[#d4d4d8] font-mono text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title={`Open ${repo.name} repository on GitHub in a new tab`}
                      >
                        <span>Open Repo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
            <div className="text-xs text-content-tertiary">
              Calibration of submitter experience helps contextualize commit velocity and AI usage.
            </div>

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white font-bold hover:bg-[#ea580c] transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <span>Next: Verdict Desk →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
