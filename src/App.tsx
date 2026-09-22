import { useState, useEffect } from 'react';
import { 
  Code2, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Database,
  ArrowRight
} from 'lucide-react';

// Pre-configured demo presets to test real-world scenarios immediately without Vercel or Airtable
const DEMO_PRESETS = [
  {
    name: '🎮 Web Game (Software)',
    description: 'Vercel-hosted game with steady Hackatime hours and clean repo',
    params: {
      codeUrl: 'https://github.com/hackclub/live',
      playableUrl: 'https://live.hackclub.com',
      track: 'software',
      hours: '18.5',
      hackatimeId: '57224',
      project: 'live',
      lapseLinks: '',
      recordId: 'recDemoGame001'
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
      recordId: 'recDemoPad002'
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
      recordId: 'recDemoMessy003'
    }
  },
  {
    name: '🚨 Streamlit Prohibited Host',
    description: 'Triggers Fine-Shield disallowed host violation (streamlit.app)',
    params: {
      codeUrl: 'https://github.com/streamlit/streamlit',
      playableUrl: 'https://my-project.streamlit.app',
      track: 'software',
      hours: '12.0',
      hackatimeId: '33102',
      project: 'data-vis',
      lapseLinks: '',
      recordId: 'recDemoStreamlit004'
    }
  }
];

export default function App() {
  // Submission parameters state: initialized from current URL query parameters or fallback
  const [params, setParams] = useState({
    codeUrl: '',
    playableUrl: '',
    track: 'software',
    hours: '',
    hackatimeId: '',
    project: '',
    lapseLinks: '',
    recordId: ''
  });

  // Read URL query parameters on initial page mount
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const codeUrl = search.get('codeUrl') || '';
    const playableUrl = search.get('playableUrl') || '';
    const track = search.get('track') || (search.get('lapseLinks') ? 'hardware' : 'software');
    const hours = search.get('hours') || '';
    const hackatimeId = search.get('hackatimeId') || '';
    const project = search.get('project') || '';
    const lapseLinks = search.get('lapseLinks') || '';
    const recordId = search.get('recordId') || '';

    // If query params are present, populate state; otherwise default to Preset 1
    if (codeUrl || playableUrl || hours) {
      setParams({ codeUrl, playableUrl, track, hours, hackatimeId, project, lapseLinks, recordId });
    } else {
      loadPreset(DEMO_PRESETS[0].params);
    }
  }, []);

  // Helper to load a preset and update browser URL without page reload
  const loadPreset = (presetParams: typeof params) => {
    setParams(presetParams);
    const search = new URLSearchParams();
    Object.entries(presetParams).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${search.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e12] text-slate-100">
      {/* Header Bar */}
      <header className="border-b border-[#23232e] bg-[#14141a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center font-bold text-white shadow-lg shadow-red-500/20">
            HC
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Reviewer Cockpit <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">MVP Skeleton</span>
            </h1>
            <p className="text-xs text-slate-400">Zero-credential standalone inspection tool</p>
          </div>
        </div>

        {/* Quick status badge */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#1b1b24] px-3 py-1.5 rounded-md border border-[#2a2a38]">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active Record:</span>
          <span className="font-mono text-emerald-400 font-semibold">{params.recordId || 'None'}</span>
        </div>
      </header>

      {/* Demo Preset Bar (For effortless testing without Vercel) */}
      <nav className="bg-[#121217] border-b border-[#20202a] px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
        </span>
        {DEMO_PRESETS.map((preset) => {
          const isActive = params.recordId === preset.params.recordId;
          return (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.params)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-red-500/15 text-red-300 border border-red-500/40 shadow-sm'
                  : 'bg-[#1a1a23] text-slate-300 hover:bg-[#242432] border border-[#2a2a38]'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </nav>

      {/* Main Skeleton Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        
        {/* Welcome & Architecture Card */}
        <div className="bg-[#171720] border border-[#262636] rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              URL Parameter Receiver Active
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              This client-side cockpit receives submission attributes purely through query strings. No private database credentials or cookies are required.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Track: {params.track.toUpperCase()}
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              Claimed: {params.hours || '0'}h
            </span>
          </div>
        </div>

        {/* 2-Column Parameter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Column 1: Core Code & Demo Links */}
          <div className="bg-[#14141a] border border-[#23232e] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-[#23232e] pb-2.5">
              <Code2 className="w-4 h-4 text-blue-400" /> Project Source & Demos
            </h3>

            {/* Code URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center justify-between">
                <span>Code URL (GitHub)</span>
                {params.codeUrl && (
                  <a href={params.codeUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </label>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-[#1a1a23] border border-[#272736] text-slate-200 break-all select-all">
                {params.codeUrl || <span className="text-slate-500 italic">No code URL provided</span>}
              </div>
            </div>

            {/* Playable URL */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center justify-between">
                <span>Playable URL (Demo / Deployment)</span>
                {params.playableUrl && (
                  <a href={params.playableUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </label>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-[#1a1a23] border border-[#272736] text-slate-200 break-all select-all">
                {params.playableUrl || <span className="text-slate-500 italic">No playable URL provided</span>}
              </div>
            </div>

            {/* Hackatime Project Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Hackatime Project Name</label>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-[#1a1a23] border border-[#272736] text-slate-200">
                {params.project || <span className="text-slate-500 italic">None (Hardware Track)</span>}
              </div>
            </div>
          </div>

          {/* Column 2: Hours & Identity Metadata */}
          <div className="bg-[#14141a] border border-[#23232e] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b border-[#23232e] pb-2.5">
              <Clock className="w-4 h-4 text-amber-400" /> Time & Identity Attributes
            </h3>

            {/* Claimed Hours */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Claimed Hours</label>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-[#1a1a23] border border-[#272736] text-amber-300 font-semibold">
                {params.hours ? `${params.hours} hours` : <span className="text-slate-500 italic">0h</span>}
              </div>
            </div>

            {/* Hackatime Submitter ID */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Submitter Hackatime ID</label>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-[#1a1a23] border border-[#272736] text-slate-200">
                {params.hackatimeId || <span className="text-slate-500 italic">No Hackatime ID</span>}
              </div>
            </div>

            {/* Raw Lapse / Journal Field */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Raw Lapse / Devlog Text Field</label>
              <div className="font-mono text-xs p-2.5 rounded-lg bg-[#1a1a23] border border-[#272736] text-slate-200 break-all select-all min-h-[4.5rem]">
                {params.lapseLinks || <span className="text-slate-500 italic">Empty (Software Track)</span>}
              </div>
            </div>
          </div>

        </div>

        {/* Next Step Banner */}
        <div className="border border-dashed border-[#2d2d3e] rounded-xl p-4 flex items-center justify-between text-xs text-slate-400 bg-[#121217]">
          <span>
            <strong className="text-slate-200">Phase 1 Complete:</strong> Skeleton is running and cleanly parsing all URL attributes.
          </span>
          <span className="flex items-center gap-1 text-red-400 font-medium">
            Next: Layering in Phase 2 Intelligent Link Classifier <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

      </main>
    </div>
  );
}
