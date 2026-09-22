import { useState, useEffect, useMemo } from 'react';
import { SubmissionParams, GitHubRepoData, HackatimeProjectStats } from './lib/types';
import { fetchGitHubRepoData, fetchHackatimeData } from './lib/api';
import { validatePlayableUrl } from './lib/linkParser';
import { VerdictState } from './lib/verdict';

// Horizons Reviewer Components
import { TopBar } from './components/TopBar';
import { UserInfo } from './components/UserInfo';
import { TabBar, Tab } from './components/TabBar';
import { ReadmePanel } from './components/ReadmePanel';
import { DemoIframe } from './components/DemoIframe';
import { ProjectCardPanel } from './components/ProjectCardPanel';
import { VerdictPanel } from './components/VerdictPanel';
import { GitHubPanel } from './components/GitHubPanel';
import { ReviewChecklist } from './components/ReviewChecklist';

// Presets for real-world and test submissions
const PRESETS: Array<{
  name: string;
  badge?: string;
  params: SubmissionParams;
}> = [
  {
    name: '⚡ Real Case: SysPulse (doomk)',
    badge: 'Real Test',
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
    badge: 'Software',
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
    badge: 'Hardware',
    params: {
      codeUrl: 'https://github.com/qcoral/hackpad-orpheus',
      playableUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      track: 'hardware',
      hours: '14.0',
      hackatimeId: '12890',
      project: '',
      lapseLinks: 'https://api.lapse.hackclub.com/timelapse/demo1',
      recordId: 'recDemoPad003',
      description: 'An ergonomic 9-key macropad with rotary encoder designed in KiCad with custom PCB.'
    }
  },
  {
    name: '📹 Messy Links (Hardware)',
    badge: 'Hardware',
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
    name: '🚨 Streamlit Prohibited Host',
    badge: 'Blocked',
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

const CENTER_TABS: Tab[] = [
  { id: 'readme', label: 'Readme' },
  { id: 'demo', label: 'Demo' },
  { id: 'card', label: 'Project Card' },
  { id: 'verdict', label: 'Verdict' },
];

export default function App() {
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);

  // Active submission parameters
  const [params, setParams] = useState<SubmissionParams>({
    codeUrl: '',
    playableUrl: '',
    track: 'software',
    hours: '0',
    hackatimeId: '',
    project: '',
    lapseLinks: '',
    recordId: '',
    description: ''
  });

  // Client-side fetched data (zero credentials)
  const [repoData, setRepoData] = useState<Partial<GitHubRepoData>>({ isLoading: false });
  const [hackatimeData, setHackatimeData] = useState<Partial<HackatimeProjectStats>>({ isLoading: false });

  // Center tab state
  const [activeTab, setActiveTab] = useState<string>('readme');

  // Notes state
  const [projectNote, setProjectNote] = useState('');
  const [userNote, setUserNote] = useState('');

  // Checklist state
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<number[]>([]);

  // Verdict state
  const [verdict, setVerdict] = useState<VerdictState>({
    decision: 'needs_changes',
    approvedHours: '',
    selectedChips: [],
    customNotes: ''
  });

  // Load from URL query parameters on mount or default to Preset 0 (SysPulse)
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const codeUrl = search.get('codeUrl');
    const playableUrl = search.get('playableUrl');
    const track = (search.get('track') as 'software' | 'hardware') || (search.get('lapseLinks') ? 'hardware' : 'software');
    const hours = search.get('hours');
    const hackatimeId = search.get('hackatimeId');
    const project = search.get('project');
    const lapseLinks = search.get('lapseLinks');
    const recordId = search.get('recordId');
    const description = search.get('description');

    if (codeUrl || playableUrl || hours || hackatimeId) {
      setParams({
        codeUrl: codeUrl || '',
        playableUrl: playableUrl || '',
        track: track || 'software',
        hours: hours || '0',
        hackatimeId: hackatimeId || '',
        project: project || '',
        lapseLinks: lapseLinks || '',
        recordId: recordId || 'recCustom',
        description: description || ''
      });
      setVerdict(v => ({ ...v, approvedHours: hours || '0' }));
    } else {
      loadPreset(0);
    }
  }, []);

  // Helper to load a preset
  const loadPreset = (index: number) => {
    if (index < 0 || index >= PRESETS.length) return;
    setCurrentPresetIndex(index);
    const p = PRESETS[index].params;
    setParams(p);
    setVerdict({
      decision: p.playableUrl === p.codeUrl ? 'needs_changes' : 'approve',
      approvedHours: p.hours,
      selectedChips: p.playableUrl === p.codeUrl ? ['Playable URL is identical to GitHub source code repo (Criterion #10)'] : [],
      customNotes: ''
    });
    setCheckedChecklistItems([]);
    setActiveTab('readme');

    // Update query params in address bar without reload
    const search = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
      if (v) search.set(k, v);
    });
    window.history.replaceState({}, '', `${window.location.pathname}?${search.toString()}`);
  };

  // Fetch GitHub and Hackatime public data when URLs or IDs change
  useEffect(() => {
    let cancelled = false;

    if (params.codeUrl) {
      setRepoData({ isLoading: true });
      fetchGitHubRepoData(params.codeUrl).then((res) => {
        if (!cancelled) setRepoData(res);
      });
    } else {
      setRepoData({ isLoading: false });
    }

    if (params.hackatimeId) {
      setHackatimeData({ isLoading: true });
      fetchHackatimeData(params.hackatimeId).then((res) => {
        if (!cancelled) setHackatimeData(res);
      });
    } else {
      setHackatimeData({ isLoading: false });
    }

    return () => {
      cancelled = true;
    };
  }, [params.codeUrl, params.hackatimeId]);

  // Playable URL validation
  const playableValidation = useMemo(
    () => validatePlayableUrl(params.playableUrl, params.codeUrl),
    [params.playableUrl, params.codeUrl]
  );

  const toggleChecklistItem = (index: number) => {
    setCheckedChecklistItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const isPlayableBlocked = playableValidation.isCodeDuplicate || playableValidation.isProhibitedHost;
  const blockerMessage = playableValidation.isCodeDuplicate
    ? 'CRITICAL: Playable URL is Source Code'
    : playableValidation.isProhibitedHost
    ? 'Prohibited Hosting Platform'
    : undefined;

  return (
    <div className="font-sans bg-rv-bg text-rv-text h-screen flex flex-col overflow-hidden select-none">
      {/* 1. Horizons TopBar */}
      <TopBar
        currentIndex={currentPresetIndex}
        totalCount={PRESETS.length}
        onNext={() => loadPreset(currentPresetIndex + 1)}
        onPrev={() => loadPreset(currentPresetIndex - 1)}
        presets={PRESETS}
        onSelectPreset={loadPreset}
        isBlocker={isPlayableBlocked}
        blockerMessage={blockerMessage}
      />

      {/* 2. Horizons Exact 3-Column Review Grid */}
      <div className="grid grid-cols-[300px_1fr_320px] flex-1 overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="bg-rv-surface border-r border-rv-border overflow-y-auto">
          <UserInfo
            displayName={hackatimeData.username || 'Be The Root'}
            slackUserId={params.hackatimeId ? `U${params.hackatimeId}` : undefined}
            repoUrl={params.codeUrl || null}
            playableUrl={params.playableUrl || null}
            readmeUrl={params.codeUrl ? `${params.codeUrl}/blob/main/README.md` : null}
            submittedHours={parseFloat(params.hours) || 0}
            track={params.track}
            projectNote={projectNote}
            onProjectNoteChange={setProjectNote}
            userNote={userNote}
            onUserNoteChange={setUserNote}
          />
        </div>

        {/* CENTER PANEL */}
        <div className="flex flex-col overflow-hidden">
          {/* Exact Horizons TabBar */}
          <TabBar
            tabs={CENTER_TABS}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id)}
          />

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden relative">
            <div className={`absolute inset-0 ${activeTab !== 'readme' ? 'hidden' : ''}`}>
              <ReadmePanel
                markdown={repoData.readmeContent || ''}
                loading={repoData.isLoading}
              />
            </div>

            <div className={`absolute inset-0 flex flex-col ${activeTab !== 'demo' ? 'hidden' : ''}`}>
              <DemoIframe
                demoUrl={params.playableUrl || null}
                codeUrl={params.codeUrl || null}
              />
            </div>

            <div className={`absolute inset-0 ${activeTab !== 'card' ? 'hidden' : ''}`}>
              <ProjectCardPanel
                projectTitle={params.project || repoData.repo || 'Project'}
                projectDescription={params.description}
                projectType={params.track === 'hardware' ? 'Hardware' : 'CLI Tool / Python'}
                demoUrl={params.playableUrl || null}
                codeUrl={params.codeUrl || null}
                readmeUrl={params.codeUrl ? `${params.codeUrl}/blob/main/README.md` : null}
              />
            </div>

            <div className={`absolute inset-0 ${activeTab !== 'verdict' ? 'hidden' : ''}`}>
              <VerdictPanel
                recordId={params.recordId}
                projectTitle={params.project || repoData.repo || 'Project'}
                submittedHours={params.hours}
                verdict={verdict}
                onVerdictChange={setVerdict}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-rv-surface border-l border-rv-border flex flex-col overflow-hidden">
          <GitHubPanel
            repo={repoData}
            repoUrl={params.codeUrl || null}
          />

          <ReviewChecklist
            checkedItems={checkedChecklistItems}
            onToggleItem={toggleChecklistItem}
          />
        </div>

      </div>
    </div>
  );
}
