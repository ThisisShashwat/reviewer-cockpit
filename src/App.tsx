import { useState, useEffect, useMemo } from 'react';
import { 
  Code2, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  ShieldAlert,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  GitCommit,
  Folder,
  FileText,
  Layers,
  Video,
  RefreshCw,
  Sliders,
  User,
  Terminal
} from 'lucide-react';

import { SubmissionParams, GitHubRepoData, HackatimeProjectStats } from './lib/types';
import { parseLapseLinks, validatePlayableUrl } from './lib/linkParser';
import { fetchGitHubRepoData, fetchHackatimeData } from './lib/api';
import { evaluateSubmissionRules } from './lib/rules';
import { 
  VerdictState, 
  VERDICT_REASON_CHIPS, 
  buildReviewerClipboardSummary 
} from './lib/verdict';

// Real-world and test presets for instantaneous testing without Vercel or Airtable
const DEMO_PRESETS: Array<{
  name: string;
  badge?: string;
  description: string;
  params: SubmissionParams;
}> = [
  {
    name: '⚡ Real Case: SysPulse (doomk)',
    badge: 'Real Test',
    description: 'Submitted python CLI tool with Playable URL == Code URL and project name divergence',
    params: {
      codeUrl: 'https://github.com/be-the-root/syspulse',
      playableUrl: 'https://github.com/be-the-root/syspulse',
      track: 'software',
      hours: '15.0',
      hackatimeId: '57224',
      project: 'doomk',
      lapseLinks: '',
      recordId: 'recSysPulseReal001',
      description: 'SysPulse Core is a python network tool I made for running pings and nmap scans. I spent most of my time testing and debugging it to make sure everything works properlly and dosent crash when you run the scans. Hope you guys like my proejct!'
    }
  },
  {
    name: '🎮 Web Game (Software)',
    description: 'Clean web game with live URL and matching Hackatime project',
    params: {
      codeUrl: 'https://github.com/hackclub/live',
      playableUrl: 'https://live.hackclub.com',
      track: 'software',
      hours: '18.5',
      hackatimeId: '57224',
      project: 'live',
      lapseLinks: '',
      recordId: 'recDemoGame002',
      description: 'Live collaborative web game platform built with React and WebSockets.'
    }
  },
  {
    name: '⌨️ Custom Macropad (Hardware)',
    description: 'Hardware track with CAD STEP files, KiCad PCB, and devlog',
    params: {
      codeUrl: 'https://github.com/qcoral/hackpad-orpheus',
      playableUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      track: 'hardware',
      hours: '14.0',
      hackatimeId: '12890',
      project: '',
      lapseLinks: 'https://api.lapse.hackclub.com/timelapse/demo1',
      recordId: 'recDemoPad003',
      description: 'An ergonomic 9-key macropad with rotary encoder designed in KiCad.'
    }
  },
  {
    name: '📹 Messy Links (Hardware)',
    description: 'Comma/space-separated timelapses mixed with raw journal links in lapse box',
    params: {
      codeUrl: 'https://github.com/hackclub/sprig',
      playableUrl: 'https://sprig.hackclub.com',
      track: 'hardware',
      hours: '22.0',
      hackatimeId: '99412',
      project: '',
      lapseLinks: 'https://api.lapse.hackclub.com/timelapse/day1, https://api.lapse.hackclub.com/timelapse/day2 https://github.com/hackclub/sprig/blob/main/docs/journal.md',
      recordId: 'recDemoMessy004',
      description: 'Handheld console with custom games engine and micro-games.'
    }
  },
  {
    name: '🚨 Streamlit Disallowed Host',
    description: 'Triggers Fine-Shield disallowed host violation (streamlit.app)',
    params: {
      codeUrl: 'https://github.com/streamlit/streamlit',
      playableUrl: 'https://my-project.streamlit.app',
      track: 'software',
      hours: '12.0',
      hackatimeId: '33102',
      project: 'data-vis',
      lapseLinks: '',
      recordId: 'recDemoStreamlit005',
      description: 'Interactive data visualization dashboard.'
    }
  }
];

export default function App() {
  // 1. Submission Parameters state: initialized from URL parameters or presets
  const [params, setParams] = useState<SubmissionParams>({
    codeUrl: '',
    playableUrl: '',
    track: 'software',
    hours: '',
    hackatimeId: '',
    project: '',
    lapseLinks: '',
    recordId: '',
    description: ''
  });

  // 2. Client-side fetched data states (Zero private credentials)
  const [repoData, setRepoData] = useState<Partial<GitHubRepoData>>({ isLoading: false });
  const [hackatimeData, setHackatimeData] = useState<Partial<HackatimeProjectStats>>({ isLoading: false });
  const [activeTab, setActiveTab] = useState<'inspect' | 'verdict'>('inspect');
  const [repoSubTab, setRepoSubTab] = useState<'commits' | 'files' | 'readme'>('commits');

  // 3. Verdict Decision state
  const [verdict, setVerdict] = useState<VerdictState>({
    decision: 'needs_changes',
    approvedHours: '',
    selectedChips: [],
    customNotes: ''
  });
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Initialize from browser URL search parameters or fallback to Preset #1 (Real Case)
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const codeUrl = search.get('codeUrl') || '';
    const playableUrl = search.get('playableUrl') || '';
    const track = (search.get('track') as 'software' | 'hardware') || (search.get('lapseLinks') ? 'hardware' : 'software');
    const hours = search.get('hours') || '';
    const hackatimeId = search.get('hackatimeId') || '';
    const project = search.get('project') || '';
    const lapseLinks = search.get('lapseLinks') || '';
    const recordId = search.get('recordId') || '';
    const description = search.get('description') || '';

    if (codeUrl || playableUrl || hours || hackatimeId) {
      setParams({ codeUrl, playableUrl, track, hours, hackatimeId, project, lapseLinks, recordId, description });
      setVerdict(prev => ({ ...prev, approvedHours: hours }));
    } else {
      // Default to Preset 1 (Real Case: SysPulse)
      loadPreset(DEMO_PRESETS[0].params);
    }
  }, []);

  // Update URL search query without page reload when preset changes
  const loadPreset = (presetParams: SubmissionParams) => {
    setParams(presetParams);
    setVerdict({
      decision: 'needs_changes',
      approvedHours: presetParams.hours,
      selectedChips: [],
      customNotes: ''
    });

    const search = new URLSearchParams();
    Object.entries(presetParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${search.toString()}`);
  };

  // Fetch Public GitHub and Hackatime data whenever URLs or IDs change
  useEffect(() => {
    let isCancelled = false;

    if (params.codeUrl) {
      setRepoData({ isLoading: true });
      fetchGitHubRepoData(params.codeUrl).then((data) => {
        if (!isCancelled) setRepoData(data);
      });
    } else {
      setRepoData({ isLoading: false });
    }

    if (params.hackatimeId) {
      setHackatimeData({ isLoading: true });
      fetchHackatimeData(params.hackatimeId).then((data) => {
        if (!isCancelled) setHackatimeData(data);
      });
    } else {
      setHackatimeData({ isLoading: false });
    }

    return () => {
      isCancelled = true;
    };
  }, [params.codeUrl, params.hackatimeId]);

  // Derived intelligence: Link parsing & Rule checking
  const parsedLapseLinks = useMemo(() => parseLapseLinks(params.lapseLinks), [params.lapseLinks]);
  const playableValidation = useMemo(
    () => validatePlayableUrl(params.playableUrl, params.codeUrl), 
    [params.playableUrl, params.codeUrl]
  );
  const ruleResults = useMemo(
    () => evaluateSubmissionRules(params, playableValidation, repoData, hackatimeData),
    [params, playableValidation, repoData, hackatimeData]
  );

  // Filter blockers vs warnings
  const blockers = ruleResults.filter(r => r.severity === 'blocker');
  const warnings = ruleResults.filter(r => r.severity === 'warning');

  // Handle toggling justification chips in Verdict station
  const toggleChip = (chip: string) => {
    setVerdict(prev => {
      const exists = prev.selectedChips.includes(chip);
      return {
        ...prev,
        selectedChips: exists 
          ? prev.selectedChips.filter(c => c !== chip)
          : [...prev.selectedChips, chip]
      };
    });
  };

  // Clipboard hand-off handler
  const handleCopySummary = () => {
    const summaryText = buildReviewerClipboardSummary(
      params.recordId,
      params.project || repoData.repo || 'Project',
      params.hours,
      verdict
    );
    navigator.clipboard.writeText(summaryText).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-slate-100 selection:bg-red-500/30 selection:text-red-200">
      
      {/* 1. Header Bar */}
      <header className="border-b border-[#20222e] bg-[#12131a] px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-red-600 via-red-500 to-orange-500 flex items-center justify-center font-black text-white shadow-lg shadow-red-500/20 text-sm">
            HC
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Reviewer Cockpit 
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                v0.2 Live Inspector
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Zero-credential browser evaluation deck</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Record Pill */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#191a24] px-3 py-1.5 rounded-md border border-[#272938]">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-500">Record:</span>
            <span className="font-mono text-blue-300 font-semibold">{params.recordId || 'None'}</span>
          </div>

          {/* Navigation View Switcher */}
          <div className="flex items-center bg-[#181922] p-1 rounded-lg border border-[#262836]">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`text-xs px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'inspect'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Inspection Deck
            </button>
            <button
              onClick={() => setActiveTab('verdict')}
              className={`text-xs px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'verdict'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Verdict Station
            </button>
          </div>
        </div>
      </header>

      {/* 2. Demo Preset Selector Bar */}
      <nav className="bg-[#0f1016] border-b border-[#1f202b] px-6 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
        </span>
        {DEMO_PRESETS.map((preset) => {
          const isActive = params.recordId === preset.params.recordId;
          return (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.params)}
              title={preset.description}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm ring-1 ring-red-500/30'
                  : 'bg-[#161720] text-slate-300 hover:bg-[#20212d] border border-[#272938]'
              }`}
            >
              {preset.name}
              {preset.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/30 text-red-200 uppercase font-mono font-bold">
                  {preset.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Automated Rule Alert Banner (Immediate visual feedback) */}
      <div className="px-6 pt-5">
        {blockers.length > 0 ? (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-red-950/20">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-2">
                  Hard Blocker Detected ({blockers.length})
                </h2>
                <span className="text-[11px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  Requires Pre-approval or Changes
                </span>
              </div>
              {blockers.map((b) => (
                <div key={b.id} className="text-xs text-red-200/90 leading-relaxed">
                  <strong className="font-semibold text-white">{b.title}:</strong> {b.message}
                  {b.detail && <p className="text-[11px] text-red-300/70 mt-0.5">{b.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : warnings.length > 0 ? (
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Reviewer Attention Recommended ({warnings.length})
              </h2>
              {warnings.map((w) => (
                <p key={w.id} className="text-xs text-amber-200/80">
                  <strong className="font-medium text-amber-100">{w.title}:</strong> {w.message}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>All automated GitBook criteria passed inspection.</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">0 Blockers</span>
          </div>
        )}
      </div>

      {/* 4. Main Workstation Area */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        
        {activeTab === 'inspect' ? (
          /* ============================================================ */
          /* TAB 1: INSPECTION DECK (Split Screen Workstation)            */
          /* ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (5 Cols): Submitter Overview, Lapse, Hackatime */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Submission Card */}
              <div className="bg-[#13141b] border border-[#212330] rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#212330] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" /> Submitter Claims
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {params.track.toUpperCase()}
                  </span>
                </div>

                {/* Submitter Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Project Description
                  </label>
                  <p className="text-xs text-slate-300 bg-[#181924] p-3 rounded-lg border border-[#252838] leading-relaxed italic">
                    "{params.description || 'No description provided by submitter.'}"
                  </p>
                </div>

                {/* Claimed Hours & Project Name */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#181924] p-3 rounded-lg border border-[#252838]">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Claimed Time
                    </div>
                    <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                      {params.hours ? `${params.hours}h` : '0h'}
                    </div>
                  </div>

                  <div className="bg-[#181924] p-3 rounded-lg border border-[#252838]">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Project Tag
                    </div>
                    <div className="text-sm font-semibold font-mono text-slate-200 mt-1 truncate" title={params.project}>
                      {params.project || <span className="text-slate-500 italic">None</span>}
                    </div>
                  </div>
                </div>

                {/* Code & Playable Links */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#181924] border border-[#252838]">
                    <div className="flex items-center gap-2 truncate">
                      <Code2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-400 shrink-0">Code:</span>
                      <span className="font-mono text-slate-200 truncate">{params.codeUrl}</span>
                    </div>
                    <a 
                      href={params.codeUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-blue-400 hover:text-blue-300 ml-2 shrink-0 p-1 hover:bg-blue-500/10 rounded"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                    playableValidation.isCodeDuplicate 
                      ? 'bg-red-950/20 border-red-500/40 text-red-200' 
                      : 'bg-[#181924] border-[#252838]'
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <ExternalLink className={`w-4 h-4 shrink-0 ${playableValidation.isCodeDuplicate ? 'text-red-400' : 'text-emerald-400'}`} />
                      <span className="text-slate-400 shrink-0">Playable:</span>
                      <span className="font-mono text-slate-200 truncate">{params.playableUrl}</span>
                    </div>
                    <a 
                      href={params.playableUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-emerald-400 hover:text-emerald-300 ml-2 shrink-0 p-1 hover:bg-emerald-500/10 rounded"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Parsed Timelapse & Devlog Deck */}
              <div className="bg-[#13141b] border border-[#212330] rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#212330] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" /> Timelapse & Media Parser ({parsedLapseLinks.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Auto-extracted</span>
                </div>

                {parsedLapseLinks.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-3 text-center bg-[#181924] rounded-lg border border-[#232635]">
                    No timelapse or media links detected in submission.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parsedLapseLinks.map((link) => (
                      <div key={link.id} className="bg-[#181924] border border-[#252838] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-purple-400" />
                            {link.title}
                          </span>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {link.note && <p className="text-[11px] text-slate-400">{link.note}</p>}
                        
                        {/* Embed Player if available */}
                        {link.isEmbeddable && link.embedUrl && (
                          <div className="relative aspect-video rounded-md overflow-hidden bg-black border border-[#2d3042] mt-2">
                            <iframe 
                              src={link.embedUrl} 
                              className="w-full h-full"
                              title={link.title} 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hackatime Live Verification Card */}
              <div className="bg-[#13141b] border border-[#212330] rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#212330] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" /> Public Hackatime Heartbeats
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {params.hackatimeId || 'None'}
                  </span>
                </div>

                {hackatimeData.isLoading ? (
                  <div className="flex items-center justify-center p-6 text-xs text-slate-400 gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    Querying public Hackatime endpoints...
                  </div>
                ) : hackatimeData.error ? (
                  <div className="text-xs text-slate-400 p-3 bg-[#181924] rounded-lg border border-[#252838]">
                    {hackatimeData.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* User summary stats */}
                    <div className="flex items-center justify-between bg-[#181924] p-3 rounded-lg border border-[#252838]">
                      <div>
                        <div className="text-[11px] text-slate-400">Registered User</div>
                        <div className="text-xs font-bold text-slate-200 mt-0.5">{hackatimeData.username}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">All-Time Tracked</div>
                        <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                          {hackatimeData.totalHoursReadable}
                        </div>
                      </div>
                    </div>

                    {/* Detected Projects in Heartbeats */}
                    {hackatimeData.projects && hackatimeData.projects.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Active Projects in Tracker ({hackatimeData.projects.length})
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                          {hackatimeData.projects.map((proj) => {
                            const isSubmittedMatch = params.project && proj.toLowerCase() === params.project.toLowerCase();
                            const isRepoMatch = repoData.repo && proj.toLowerCase().includes(repoData.repo.toLowerCase());
                            return (
                              <span
                                key={proj}
                                className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                                  isSubmittedMatch
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                                    : isRepoMatch
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                                    : 'bg-[#1b1d28] text-slate-400 border border-[#282a3a]'
                                }`}
                              >
                                {proj} {isSubmittedMatch && '✓'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top Languages */}
                    {hackatimeData.languages && hackatimeData.languages.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Language Breakdown
                        </label>
                        <div className="space-y-1">
                          {hackatimeData.languages.slice(0, 4).map((lang) => (
                            <div key={lang.name} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-300">{lang.name}</span>
                              <span className="font-mono text-slate-400">{lang.text} ({lang.percent.toFixed(1)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column (7 Cols): Public GitHub Deep-Dive Station */}
            <div className="lg:col-span-7 space-y-5">
              
              <div className="bg-[#13141b] border border-[#212330] rounded-xl p-5 space-y-4 shadow-sm">
                
                {/* Header & Sub-tab Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#212330] pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-400" /> Public GitHub Inspector
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {repoData.fullName || params.codeUrl}
                    </p>
                  </div>

                  {/* Subtabs */}
                  <div className="flex items-center bg-[#181924] p-1 rounded-lg border border-[#262836]">
                    <button
                      onClick={() => setRepoSubTab('commits')}
                      className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                        repoSubTab === 'commits'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <GitCommit className="w-3.5 h-3.5" /> Commits ({repoData.commits?.length || 0})
                    </button>
                    <button
                      onClick={() => setRepoSubTab('files')}
                      className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                        repoSubTab === 'files'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" /> Files ({repoData.files?.length || 0})
                    </button>
                    <button
                      onClick={() => setRepoSubTab('readme')}
                      className={`text-xs px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                        repoSubTab === 'readme'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> README
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Commits Feed */}
                {repoSubTab === 'commits' && (
                  <div className="space-y-3">
                    {repoData.isLoading ? (
                      <div className="flex items-center justify-center p-8 text-xs text-slate-400 gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                        Fetching repository commit tree...
                      </div>
                    ) : repoData.error ? (
                      <div className="text-xs text-slate-400 p-4 bg-[#181924] rounded-lg border border-[#252838]">
                        {repoData.error}
                      </div>
                    ) : !repoData.commits || repoData.commits.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-6 text-center">
                        No commits found or unable to fetch history.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                        {repoData.commits.map((commit, idx) => (
                          <div 
                            key={commit.sha}
                            className="bg-[#181924] border border-[#252838] rounded-lg p-3 hover:border-[#35384e] transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                #{repoData.commits!.length - idx} • {commit.shortSha}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {commit.date ? new Date(commit.date).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 mt-2 font-medium leading-relaxed">
                              {commit.message}
                            </p>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <span>Author:</span>
                              <span className="text-slate-300 font-medium">{commit.author}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: File Structure */}
                {repoSubTab === 'files' && (
                  <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                    {!repoData.files || repoData.files.length === 0 ? (
                      <div className="text-xs text-slate-500 italic p-6 text-center">
                        No file list available.
                      </div>
                    ) : (
                      repoData.files.map((file) => (
                        <div 
                          key={file.path}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[#181924] border border-[#252838] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {file.type === 'dir' ? (
                              <Folder className="w-4 h-4 text-amber-400" />
                            ) : file.name.endsWith('.py') ? (
                              <Terminal className="w-4 h-4 text-blue-400" />
                            ) : (
                              <FileText className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="font-mono text-slate-200">{file.name}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-tab 3: README Viewer */}
                {repoSubTab === 'readme' && (
                  <div className="bg-[#181924] p-4 rounded-lg border border-[#252838] max-h-[26rem] overflow-y-auto">
                    {repoData.readmeContent ? (
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {repoData.readmeContent}
                      </pre>
                    ) : (
                      <div className="text-xs text-slate-500 italic text-center p-6">
                        No README.md found in default branch.
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Live Playable Demonstration Frame */}
              <div className="bg-[#13141b] border border-[#212330] rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#212330] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-400" /> Playable Demo Sandbox
                  </h3>
                  <a 
                    href={params.playableUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    Open Externally <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {playableValidation.isCodeDuplicate ? (
                  <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-6 text-center space-y-2">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <h4 className="text-xs font-bold text-red-300 uppercase tracking-wide">
                      Cannot Preview: Playable URL is Source Code
                    </h4>
                    <p className="text-xs text-red-200/80 max-w-md mx-auto">
                      Submitter provided the GitHub code repository as their playable demo. Reviewers cannot execute or test the project without a deployment or demo video.
                    </p>
                  </div>
                ) : playableValidation.embedType === 'youtube' && playableValidation.embedUrl ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-[#2d3042]">
                    <iframe 
                      src={playableValidation.embedUrl}
                      className="w-full h-full"
                      title="Playable Demo Video"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="border border-[#262836] rounded-xl overflow-hidden bg-white/5 h-80 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="text-xs text-slate-400 max-w-md">
                      Live iframe preview for external URL:
                    </div>
                    <div className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 max-w-full truncate">
                      {params.playableUrl || 'No playable URL provided'}
                    </div>
                    <a
                      href={params.playableUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow"
                    >
                      Test in New Browser Tab <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          /* ============================================================ */
          /* TAB 2: VERDICT & CLIPBOARD HAND-OFF STATION                 */
          /* ============================================================ */
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="bg-[#13141b] border border-[#212330] rounded-xl p-6 space-y-6 shadow-md">
              <div className="border-b border-[#212330] pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-red-400" /> Final Review Verdict Station
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select your determination and copy the formatted summary straight back to your Vercel/Airtable dashboard.
                </p>
              </div>

              {/* 4 Decision Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setVerdict(v => ({ ...v, decision: 'approve' }))}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                    verdict.decision === 'approve'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40 font-bold'
                      : 'bg-[#181924] border-[#252838] text-slate-400 hover:text-slate-200 hover:border-[#35384e]'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs">Approve Full</span>
                  <span className="text-[10px] text-slate-400 font-mono">{params.hours || '0'}h</span>
                </button>

                <button
                  onClick={() => setVerdict(v => ({ ...v, decision: 'adjust_hours' }))}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                    verdict.decision === 'adjust_hours'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-2 ring-amber-500/40 font-bold'
                      : 'bg-[#181924] border-[#252838] text-slate-400 hover:text-slate-200 hover:border-[#35384e]'
                  }`}
                >
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span className="text-xs">Adjust Hours</span>
                  <span className="text-[10px] text-slate-400 font-mono">Partial</span>
                </button>

                <button
                  onClick={() => setVerdict(v => ({ ...v, decision: 'needs_changes' }))}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                    verdict.decision === 'needs_changes'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-2 ring-blue-500/40 font-bold'
                      : 'bg-[#181924] border-[#252838] text-slate-400 hover:text-slate-200 hover:border-[#35384e]'
                  }`}
                >
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                  <span className="text-xs">Need Changes</span>
                  <span className="text-[10px] text-slate-400 font-mono">Pre-approval</span>
                </button>

                <button
                  onClick={() => setVerdict(v => ({ ...v, decision: 'reject' }))}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                    verdict.decision === 'reject'
                      ? 'bg-red-600/20 border-red-500 text-red-200 ring-2 ring-red-500/40 font-bold'
                      : 'bg-[#181924] border-[#252838] text-slate-400 hover:text-slate-200 hover:border-[#35384e]'
                  }`}
                >
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-xs">Reject</span>
                  <span className="text-[10px] text-slate-400 font-mono">Disallowed</span>
                </button>
              </div>

              {/* Hours Adjustment Input (if Adjust Hours selected) */}
              {verdict.decision === 'adjust_hours' && (
                <div className="bg-[#181924] p-4 rounded-xl border border-amber-500/30 flex items-center justify-between gap-4">
                  <div className="text-xs text-amber-200">
                    <strong>Adjusted Grant Hours:</strong>
                    <div className="text-[11px] text-amber-300/70">Claimed: {params.hours}h</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={params.hours || '50'}
                      value={verdict.approvedHours}
                      onChange={(e) => setVerdict(v => ({ ...v, approvedHours: e.target.value }))}
                      className="w-24 bg-[#0f1016] border border-[#2e3144] rounded-lg px-3 py-1.5 font-mono text-amber-300 text-sm focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-400">hours</span>
                  </div>
                </div>
              )}

              {/* Quick Justification Chips */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Audit Justification Chips (Click to Toggle)
                </label>
                <div className="flex flex-wrap gap-2">
                  {VERDICT_REASON_CHIPS[verdict.decision].map((chip) => {
                    const isSelected = verdict.selectedChips.includes(chip);
                    return (
                      <button
                        key={chip}
                        onClick={() => toggleChip(chip)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-200 border-blue-500/50 font-medium'
                            : 'bg-[#181924] text-slate-400 border-[#262836] hover:text-slate-200 hover:border-[#35384e]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Reviewer Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reviewer Notes / Feedback to Submitter
                </label>
                <textarea
                  value={verdict.customNotes}
                  onChange={(e) => setVerdict(v => ({ ...v, customNotes: e.target.value }))}
                  placeholder="Add custom notes, specific timestamps, or advice for the submitter..."
                  rows={3}
                  className="w-full bg-[#181924] border border-[#252838] rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
                />
              </div>

              {/* Live Formatted Clipboard Hand-off Box */}
              <div className="space-y-2 pt-2 border-t border-[#212330]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Formatted Clipboard Hand-off Summary
                  </label>
                  <button
                    onClick={handleCopySummary}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    {copiedNotification ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Summary
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-[#0e0f15] border border-[#252838] text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                  {buildReviewerClipboardSummary(
                    params.recordId,
                    params.project || repoData.repo || 'Project',
                    params.hours,
                    verdict
                  )}
                </pre>
                
                <p className="text-[11px] text-slate-500 italic">
                  💡 Tip: Click "Copy Summary" and paste it straight into your main reviewer dashboard's notes or Airtable row.
                </p>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
