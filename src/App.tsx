import { useState, useEffect, useMemo } from 'react';
import { SubmissionParams, GitHubRepoData, HackatimeProjectStats, ManifestLookupData } from './lib/types';
import { fetchGitHubRepoData, fetchHackatimeData, fetchManifestLookup } from './lib/api';
import { validatePlayableUrl } from './lib/linkParser';
import { VerdictState } from './lib/verdict';

// Components
import { TopBar } from './components/TopBar';
import { UserInfo } from './components/UserInfo';
import { TabBar, Tab } from './components/TabBar';
import { ReadmePanel } from './components/ReadmePanel';
import { CommitsPanel } from './components/CommitsPanel';
import { DemoIframe } from './components/DemoIframe';
import { ProjectCardPanel } from './components/ProjectCardPanel';
import { VerdictPanel } from './components/VerdictPanel';
import { GitHubPanel } from './components/GitHubPanel';
import { ManifestPanel } from './components/ManifestPanel';
import { ReviewChecklist } from './components/ReviewChecklist';

// Presets for real-world and test submissions
const PRESETS: Array<{
  name: string;
  badge?: string;
  params: SubmissionParams;
}> = [
  {
    name: 'SysPulse (doomk) - Real Submission',
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
    name: 'Custom Macropad (Hardware Track)',
    badge: 'Hardware',
    params: {
      codeUrl: 'https://github.com/qcoral/hackpad-orpheus',
      playableUrl: 'https://github.com/qcoral/hackpad-orpheus',
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
    name: 'Web Game (Software Track)',
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
    name: 'Messy Links Submission (Hardware)',
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
    name: 'Streamlit Disallowed Host Violation',
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
  const [manifestData, setManifestData] = useState<ManifestLookupData>({
    isLoading: false,
    isRegistered: false,
    otherSubmissions: [],
    halceonUrl: 'https://lin6bu84s73ya069zkua89ny.halceon.dev/'
  });

  // Center tab state
  const [activeTab, setActiveTab] = useState<string>('readme');

  // Notes state
  const [projectNote, setProjectNote] = useState('');
  const [userNote, setUserNote] = useState('');

  // Checklist state
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<number[]>([]);

  // Verdict state
  const [verdict, setVerdict] = useState<VerdictState>({
    decision: 'approve',
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
      decision: p.playableUrl === p.codeUrl && p.track !== 'hardware' ? 'adjust_hours' : 'approve',
      approvedHours: p.hours,
      selectedChips: [],
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

  // Fetch GitHub, Hackatime, and Manifest data when URLs or IDs change
  useEffect(() => {
    let cancelled = false;

    if (params.codeUrl) {
      setRepoData({ isLoading: true });
      fetchGitHubRepoData(params.codeUrl).then((res) => {
        if (!cancelled) {
          setRepoData(res);
          // Query Manifest for double-dipping
          setManifestData(prev => ({ ...prev, isLoading: true }));
          fetchManifestLookup(params.codeUrl, res.owner || '').then((m) => {
            if (!cancelled) setManifestData(m);
          });
        }
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

  const hasReleases = Boolean(repoData.releases && repoData.releases.length > 0);
  const isHardware = params.track === 'hardware';

  const isPlayableBlocked = Boolean(
    playableValidation.isProhibitedHost ||
    (!params.playableUrl) ||
    (playableValidation.isCodeDuplicate && !isHardware && !hasReleases)
  );

  const blockerMessage = playableValidation.isProhibitedHost
    ? 'Prohibited Hosting Platform (Streamlit)'
    : (!params.playableUrl)
    ? 'Missing Playable URL'
    : (playableValidation.isCodeDuplicate && !isHardware && !hasReleases)
    ? 'Playable URL points to Source Code (No binaries or web deploy)'
    : undefined;

  // Dynamic center tabs with commit count badge
  const centerTabs: Tab[] = [
    { id: 'readme', label: 'Readme' },
    { id: 'commits', label: 'Commits', badge: repoData.commits?.length || 0 },
    { id: 'demo', label: 'Demo / Deliverables' },
    { id: 'card', label: 'Project Card' },
    { id: 'verdict', label: 'Verdict' },
  ];

  return (
    <div className="font-sans bg-rv-bg text-rv-text h-screen flex flex-col overflow-hidden select-none">
      
      {/* 1. Horizons TopBar (Light Theme) */}
      <TopBar
        currentIndex={currentPresetIndex}
        presets={PRESETS}
        onSelectPreset={loadPreset}
        recordId={params.recordId}
        isBlocker={isPlayableBlocked}
        blockerMessage={blockerMessage}
      />

      {/* 2. Horizons 3-Column Review Grid [300px_1fr_320px] */}
      <div className="grid grid-cols-[300px_1fr_320px] flex-1 overflow-hidden">
        
        {/* LEFT PANEL: Real Submitter Info & Actions */}
        <div className="bg-rv-surface border-r border-rv-border overflow-y-auto">
          <UserInfo
            displayName={hackatimeData.username || repoData.owner || 'Submitter'}
            githubOwner={repoData.owner}
            repoUrl={params.codeUrl || null}
            playableUrl={params.playableUrl || null}
            readmeUrl={params.codeUrl ? `${params.codeUrl}/blob/main/README.md` : null}
            hasReleases={hasReleases}
            submittedHours={parseFloat(params.hours) || 0}
            hackatimeTotalHours={hackatimeData.totalHoursReadable}
            track={params.track}
            projectNote={projectNote}
            onProjectNoteChange={setProjectNote}
            userNote={userNote}
            onUserNoteChange={setUserNote}
          />
        </div>

        {/* CENTER PANEL: Tabbed Workspace */}
        <div className="flex flex-col overflow-hidden bg-white">
          {/* Horizons TabBar */}
          <TabBar
            tabs={centerTabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id)}
          />

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden relative">
            
            {/* 1. Readme Tab (Rendered with marked) */}
            <div className={`absolute inset-0 ${activeTab !== 'readme' ? 'hidden' : ''}`}>
              <ReadmePanel
                markdown={repoData.readmeContent || ''}
                loading={repoData.isLoading}
              />
            </div>

            {/* 2. Dedicated Commits Tab with Diffs & Files */}
            <div className={`absolute inset-0 ${activeTab !== 'commits' ? 'hidden' : ''}`}>
              <CommitsPanel
                commits={repoData.commits || []}
                repoUrl={params.codeUrl || null}
                loading={repoData.isLoading}
              />
            </div>

            {/* 3. Demo / Deliverables Tab */}
            <div className={`absolute inset-0 flex flex-col ${activeTab !== 'demo' ? 'hidden' : ''}`}>
              <DemoIframe
                demoUrl={params.playableUrl || null}
                codeUrl={params.codeUrl || null}
                track={params.track}
                releases={repoData.releases}
                hardwareFiles={repoData.hardwareFiles}
                lapseLinks={params.lapseLinks}
              />
            </div>

            {/* 4. Project Card Tab */}
            <div className={`absolute inset-0 ${activeTab !== 'card' ? 'hidden' : ''}`}>
              <ProjectCardPanel
                projectTitle={params.project || repoData.repo || 'Project'}
                projectDescription={params.description}
                projectType={params.track === 'hardware' ? 'Hardware' : (hasReleases ? 'Desktop / CLI Binary' : 'CLI Tool / Python')}
                demoUrl={params.playableUrl || null}
                codeUrl={params.codeUrl || null}
                readmeUrl={params.codeUrl ? `${params.codeUrl}/blob/main/README.md` : null}
              />
            </div>

            {/* 5. Verdict Tab */}
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

        {/* RIGHT PANEL: GitHub Stats + Double-Dipping + Checklist */}
        <div className="bg-rv-surface border-l border-rv-border flex flex-col overflow-y-auto">
          <GitHubPanel
            repo={repoData}
            repoUrl={params.codeUrl || null}
          />

          <ManifestPanel
            manifest={manifestData}
            codeUrl={params.codeUrl}
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
