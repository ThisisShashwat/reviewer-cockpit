/**
 * Cockpit Quick Ingest Helper - Content Script
 * Injects one-click "📋 Copy JSON" buttons on individual cards AND
 * a top toolbar to "⚡ Sync All to Cockpit" or "📋 Copy All JSON".
 */

(function () {
  'use strict';

  // Early exit guard: Only run on hackclub.com and airtable.com
  if (!window.location.hostname.includes('hackclub.com') && !window.location.hostname.includes('airtable.com')) {
    return;
  }

  const DEFAULT_SERVER_URL = 'http://100.68.188.57:3001';

  // Hardware classification keywords
  const HW_KEYWORDS = [
    'cad', 'pcb', 'kicad', '3d print', '3d-print', '3d printable', 'printable',
    'easyeda', 'onshape', 'blender', 'fusion 360', 'fusion360', 'hardware',
    'soldering', 'microcontroller', 'arduino', 'esp32', 'rp2040', 'rp-2040',
    'stm32', 'circuit', 'schematic', 'gerber', 'electronics', 'lora puck', 'macropad',
    'printables.com', 'tinkercad', 'devboard', 'firmware', 'flight controller'
  ];

  const HW_REGEX = new RegExp('\\b(' + HW_KEYWORDS.map(kw => kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'i');

  // 4 review tabs configuration
  const REVIEW_TABS = [
    { key: 'pending', label: 'Pending', path: '/review?status=Pending' },
    { key: 'approved', label: 'Approved', path: '/review?status=Approved' },
    { key: 'rejected', label: 'Rejected', path: '/review?status=Rejected' },
    { key: 'fraud', label: 'Fraud', path: '/review?status=Fraud' }
  ];

  /**
   * Determine the current review queue based on window URL
   */
  function getCurrentTabKey() {
    try {
      const url = new URL(window.location.href);
      const statusParam = url.searchParams.get('status');
      if (!statusParam) return 'pending';
      const s = statusParam.toLowerCase();
      if (s === 'approved') return 'approved';
      if (s === 'rejected') return 'rejected';
      if (s === 'fraud') return 'fraud';
      return 'pending';
    } catch (_) {
      return 'pending';
    }
  }

  // Cache Next.js hydration data if present in page scripts
  let pageHydrationRows = null;
  const rowsByCodeUrl = new Map();
  const rowsByHackatime = new Map();
  let hasScannedHydration = false;

  /**
   * Scan Next.js hydration payload from text or script content
   * without catastrophic regex backtracking
   */
  function extractHydrationRowsFromHtml(text) {
    if (!text || typeof text !== 'string') return null;

    let searchPos = 0;
    while (searchPos < text.length) {
      let idx = text.indexOf('"rows":[', searchPos);
      let isEscaped = false;
      let marker = '"rows":[';

      const escapedIdx = text.indexOf('\\"rows\\":[', searchPos);
      if (idx === -1 || (escapedIdx !== -1 && escapedIdx < idx)) {
        if (escapedIdx !== -1) {
          idx = escapedIdx;
          isEscaped = true;
          marker = '\\"rows\\":[';
        }
      }

      if (idx === -1) break;

      const start = idx + marker.length - 1; // index of '['
      let depth = 0;
      let end = -1;

      for (let i = start; i < text.length; i++) {
        if (text[i] === '[') depth++;
        else if (text[i] === ']') {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }

      if (end !== -1) {
        let rowsJson = text.substring(start, end);
        if (isEscaped) {
          rowsJson = rowsJson.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
          const parsed = JSON.parse(rowsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (_) {
          // Continue searching if this block was not valid rows array
        }
        searchPos = end;
      } else {
        searchPos = idx + marker.length;
      }
    }
    return null;
  }

  /**
   * Scan Next.js hydration data on current page exactly once
   */
  function scanHydrationData() {
    if (hasScannedHydration) return;
    hasScannedHydration = true;

    try {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const text = s.textContent;
        if (!text) continue;

        const rows = extractHydrationRowsFromHtml(text);
        if (rows && rows.length > 0) {
          pageHydrationRows = rows;
          for (const r of pageHydrationRows) {
            if (r.codeUrl) rowsByCodeUrl.set(String(r.codeUrl).trim().toLowerCase(), r);
            if (r.hackatimeId) rowsByHackatime.set(String(r.hackatimeId).trim(), r);
          }
          break;
        }
      }
    } catch (err) {
      console.debug('[Cockpit Ingest] Notice scanning hydration scripts:', err);
    }
  }

  // Extract GitHub username from URL
  function extractGhUsername(codeUrl, playableUrl, lapseLinks) {
    const urls = [codeUrl, playableUrl, ...(lapseLinks || [])].filter(Boolean);
    for (const u of urls) {
      if (typeof u !== 'string') continue;
      const m1 = u.match(/github\.com\/([a-zA-Z0-9_\-]+)/i);
      if (m1) {
        const user = m1[1];
        if (!['login', 'search', 'trending', 'topics', 'features', 'apps', 'about'].includes(user.toLowerCase())) {
          return user;
        }
      }
      const m2 = u.match(/https?:\/\/([a-zA-Z0-9_\-]+)\.github\.io/i);
      if (m2) return m2[1];
    }
    return null;
  }

  // Extract repo name from GitHub URL
  function extractRepoName(url) {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/github\.com\/[^/]+\/([^/?#]+)/i);
    if (m) {
      const repo = m[1].replace(/\.git$/i, '');
      if (!['login', 'search', 'trending', 'topics', 'features', 'apps'].includes(repo.toLowerCase())) {
        return repo;
      }
    }
    return null;
  }

  // Classify project type
  function detectProjectType(text) {
    if (!text) return 'software';
    return HW_REGEX.test(text) ? 'hardware' : 'software';
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Extract fields from a single submission card element
   */
  function extractFromQueueCard(cardEl, tabStatus) {
    scanHydrationData();
    const currentTab = tabStatus || getCurrentTabKey();

    // 1. Code URL & Playable URL
    let codeUrl = null;
    let playableUrl = null;

    const links = Array.from(cardEl.querySelectorAll('a'));
    for (const link of links) {
      const href = link.getAttribute('href') || link.href;
      if (!href) continue;
      const text = (link.textContent || '').trim().toLowerCase();

      if (href.includes('github.com') && !href.includes('hackclub/live')) {
        if (!codeUrl) codeUrl = href;
      } else if (text.includes('code url')) {
        codeUrl = href;
      } else if (text.includes('playable url') || text.includes('demo') || text.includes('playable')) {
        playableUrl = href;
      } else if (!playableUrl && (href.startsWith('http://') || href.startsWith('https://')) && !href.includes('hackclub.com')) {
        playableUrl = href;
      }
    }

    // 2. Screenshot
    let screenshotUrl = null;
    const img = cardEl.querySelector('img');
    if (img) {
      const src = img.getAttribute('src') || img.src;
      if (src && !src.includes('avatar') && !src.includes('icon')) {
        screenshotUrl = src;
      }
    }

    // 3. Project Name, Hackatime ID, Description, Lapse Links from <p> tags
    let projectName = null;
    let hackatimeId = null;
    let description = null;
    let lapseLinks = [];

    const pTags = Array.from(cardEl.querySelectorAll('p'));
    for (const p of pTags) {
      const fullText = (p.textContent || '').trim();

      if (/^Project:\s*/i.test(fullText)) {
        projectName = fullText.replace(/^Project:\s*/i, '').trim();
      } else if (/^Hackatime ID:\s*/i.test(fullText)) {
        hackatimeId = fullText.replace(/^Hackatime ID:\s*/i, '').trim();
      } else if (/^Description:\s*/i.test(fullText)) {
        description = fullText.replace(/^Description:\s*/i, '').trim();
      } else if (/^Lapse:\s*/i.test(fullText)) {
        const rawLapse = fullText.replace(/^Lapse:\s*/i, '').trim();
        const urls = rawLapse.match(/https?:\/\/[^\s,]+/g) || [];
        lapseLinks = urls.map(u => u.replace(/[.,;)>]+$/, ''));
      }
    }

    // 4. Hours
    let submittedHours = 0;
    const hoursInput = cardEl.querySelector('input[type="number"]');
    if (hoursInput && hoursInput.value) {
      submittedHours = parseFloat(hoursInput.value) || 0;
    } else {
      const cardText = cardEl.textContent || '';
      const hoursMatch = cardText.match(/stored:\s*([0-9.]+)\s*h/i) || cardText.match(/([0-9.]+)\s*hours?/i);
      if (hoursMatch) {
        submittedHours = parseFloat(hoursMatch[1]) || 0;
      }
    }

    // Fallback project name
    if (!projectName || projectName.toLowerCase() === 'none' || projectName.toLowerCase() === 'n/a') {
      projectName = extractRepoName(codeUrl) || extractRepoName(playableUrl) || 'Untitled Project';
    }

    // 5. GitHub username
    const githubUsername = extractGhUsername(codeUrl, playableUrl, lapseLinks);

    // 6. Project Type
    const corpus = [projectName, description, codeUrl, playableUrl, lapseLinks.join(' ')].join(' ');
    const projectType = detectProjectType(corpus);

    // 7. Record ID
    let recordId = null;
    if (codeUrl && rowsByCodeUrl.has(codeUrl.toLowerCase())) {
      recordId = rowsByCodeUrl.get(codeUrl.toLowerCase()).id;
    } else if (hackatimeId && rowsByHackatime.has(hackatimeId)) {
      recordId = rowsByHackatime.get(hackatimeId).id;
    }

    if (!recordId) {
      const recMatch = (cardEl.textContent || '').match(/\b(rec[a-zA-Z0-9]{14,17})\b/);
      if (recMatch) recordId = recMatch[1];
    }

    if (!recordId) {
      recordId = cardEl.getAttribute('data-record-id') ||
                 cardEl.getAttribute('data-id') ||
                 cardEl.getAttribute('id');
      if (recordId && !recordId.startsWith('rec')) recordId = null;
    }

    // Hydration overrides for full resolution screenshots and titles
    if (codeUrl && rowsByCodeUrl.has(codeUrl.toLowerCase())) {
      const hydRow = rowsByCodeUrl.get(codeUrl.toLowerCase());
      if (hydRow.screenshotUrl) screenshotUrl = hydRow.screenshotUrl;
      if (hydRow.projectName && (!projectName || projectName === 'Untitled Project')) {
        projectName = hydRow.projectName;
      }
    }

    if (!recordId) {
      const cleanProj = (projectName || 'proj').toLowerCase().replace(/[^a-z0-9]/g, '');
      const seed = (hackatimeId || githubUsername || cleanProj || 'sub');
      recordId = 'rec_' + seed + '_' + Math.abs(hashCode(codeUrl || projectName || Date.now().toString())).toString(36);
    }

    return {
      id: recordId,
      projectName: projectName || 'Untitled Project',
      codeUrl: codeUrl || '',
      playableUrl: playableUrl || '',
      screenshotUrl: screenshotUrl || '',
      description: description || '',
      submittedHours: Number(submittedHours.toFixed(1)),
      hackatimeId: hackatimeId || '',
      githubUsername: githubUsername || '',
      projectType: projectType,
      lapseLinks: lapseLinks || [],
      queue: currentTab,
      status: currentTab
    };
  }

  /**
   * Converts a Next.js hydration row object into a normalized Cockpit project
   */
  function convertHydrationRowToProject(r, tabStatus) {
    const codeUrl = String(r.codeUrl || '').trim();
    const playableUrl = String(r.playableUrl || '').trim();
    const rawLapse = String(r.lapseLinks || '').trim();
    const lapseUrls = rawLapse.match(/https?:\/\/[^\s,]+/g) || [];
    const lapseLinks = lapseUrls.map((u) => u.replace(/[.,;)>]+$/, ''));
    const ghUser = extractGhUsername(codeUrl, playableUrl, lapseLinks);
    const projName = r.projectName || extractRepoName(codeUrl) || 'Untitled Project';
    const hours = typeof r.hours === 'number' ? r.hours : parseFloat(r.hours) || 0;
    const corpus = [projName, r.description, codeUrl, playableUrl, lapseLinks.join(' ')].join(' ');
    const queue = tabStatus || getCurrentTabKey();

    return {
      id: r.id || ('rec_' + Math.abs(hashCode(codeUrl || projName)).toString(36)),
      projectName: projName,
      codeUrl: codeUrl,
      playableUrl: playableUrl,
      screenshotUrl: r.screenshotUrl || '',
      description: r.description || '',
      submittedHours: Number(hours.toFixed(1)),
      hackatimeId: r.hackatimeId ? String(r.hackatimeId) : '',
      hackatimeProjects: r.hackatimeProjects ? String(r.hackatimeProjects) : '',
      githubUsername: ghUser || '',
      projectType: detectProjectType(corpus),
      lapseLinks: lapseLinks,
      approved: Boolean(r.approved),
      reviewStatus: r.reviewStatus || (
        queue === 'approved' ? 'Approved' :
        queue === 'rejected' ? 'Rejected' :
        queue === 'fraud' ? 'Fraud' : 'Pending'
      ),
      queue: queue,
      status: queue,
    };
  }

  /**
   * Extracts all projects on the current page
   */
  function getAllProjectsFromPage(tabStatus) {
    scanHydrationData();
    const queue = tabStatus || getCurrentTabKey();

    // 1. If Next.js hydration rows are available, parse directly
    if (pageHydrationRows && pageHydrationRows.length > 0) {
      return pageHydrationRows.map((r) => convertHydrationRowToProject(r, queue));
    }

    // 2. DOM fallback
    const cards = Array.from(document.querySelectorAll('.card, [class*="card"]'))
      .filter((c) => {
        if (c.closest && (c.closest('#cockpit-top-toolbar') || c.closest('[class*="cockpit-"]'))) {
          return false;
        }
        return c.querySelector('a, img, p');
      });

    const results = [];
    const seenIds = new Set();

    for (const card of cards) {
      const p = extractFromQueueCard(card, queue);
      if (p && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        results.push(p);
      }
    }

    return results;
  }

  /**
   * Parse projects from fetched HTML of any review tab
   */
  function parseProjectsFromHtml(html, tabStatus) {
    // 1. Try Next.js hydration payload
    const rows = extractHydrationRowsFromHtml(html);
    if (rows && rows.length > 0) {
      return rows.map((r) => convertHydrationRowToProject(r, tabStatus));
    }

    // 2. Fallback: DOMParser
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const cards = Array.from(doc.querySelectorAll('.card, [class*="card"]'))
        .filter((c) => {
          if (c.closest && (c.closest('#cockpit-top-toolbar') || c.closest('[class*="cockpit-"]'))) {
            return false;
          }
          return c.querySelector('a, img, p');
        });

      const results = [];
      const seenIds = new Set();
      for (const card of cards) {
        const p = extractFromQueueCard(card, tabStatus);
        if (p && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          results.push(p);
        }
      }
      return results;
    } catch (err) {
      console.error(`[Cockpit Ingest] Failed to parse HTML for ${tabStatus}:`, err);
      return [];
    }
  }

  /**
   * Fetch background HTML for another review tab
   */
  async function fetchTabHtml(tabPath) {
    const url = new URL(tabPath, window.location.origin).href;
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${tabPath}`);
    }
    return await res.text();
  }

  /**
   * Helper to get/set configured Cockpit Server URL
   */
  async function getStoredServerUrl() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['cockpitServerUrl'], (result) => {
          resolve(result.cockpitServerUrl || DEFAULT_SERVER_URL);
        });
      } else {
        const stored = localStorage.getItem('COCKPIT_SERVER_URL');
        resolve(stored || DEFAULT_SERVER_URL);
      }
    });
  }

  async function setStoredServerUrl(url) {
    const cleanUrl = url.replace(/\/+$/, '');
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ cockpitServerUrl: cleanUrl });
    }
    localStorage.setItem('COCKPIT_SERVER_URL', cleanUrl);
  }

  /**
   * Copies single project JSON to clipboard
   */
  async function handleCopyClick(btn, cardEl) {
    try {
      const data = extractFromQueueCard(cardEl);
      const jsonStr = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonStr);

      const originalHtml = btn.innerHTML;
      btn.classList.add('cockpit-copied');
      btn.innerHTML = '<span class="cockpit-icon">✓</span><span>Copied!</span>';

      setTimeout(() => {
        btn.classList.remove('cockpit-copied');
        btn.innerHTML = originalHtml;
      }, 1500);

      console.log('[Cockpit Ingest] Copied single project JSON:', data.projectName);
    } catch (err) {
      console.error('[Cockpit Ingest] Failed to copy to clipboard:', err);
    }
  }

  function createCopyButton(cardEl) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cockpit-copy-btn';
    btn.title = 'Copy submission JSON for Cockpit Quick Ingest';
    btn.innerHTML = '<span class="cockpit-icon">📋</span><span>Copy JSON</span>';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleCopyClick(btn, cardEl);
    });

    return btn;
  }

  function injectIntoCard(cardEl) {
    if (cardEl.dataset.cockpitInjected === 'true') return;
    cardEl.dataset.cockpitInjected = 'true';

    const btn = createCopyButton(cardEl);
    const actionArea = cardEl.querySelector('.btn-success, .btn-warning')?.closest('.flex');
    if (actionArea) {
      btn.style.marginLeft = 'auto';
      actionArea.appendChild(btn);
    } else {
      const currentPos = window.getComputedStyle(cardEl).position;
      if (!currentPos || currentPos === 'static') {
        cardEl.style.position = 'relative';
      }
      btn.classList.add('cockpit-corner-badge');
      cardEl.appendChild(btn);
    }
  }

  /**
   * Top Floating Toolbar for Full-Queue Sync
   */
  function injectTopToolbar() {
    if (document.getElementById('cockpit-top-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'cockpit-top-toolbar';
    toolbar.className = 'cockpit-top-toolbar';

    toolbar.innerHTML = `
      <div class="cockpit-tb-left">
        <div class="cockpit-tb-brand">
          <span class="cockpit-tb-bolt">⚡</span>
          <span>Cockpit Sync</span>
        </div>
        <div class="cockpit-tb-badge" id="cockpit-tb-count">...</div>
      </div>
      <div class="cockpit-tb-right">
        <button type="button" class="cockpit-tb-btn cockpit-tb-btn-sync" id="cockpit-sync-all-btn" title="Sync all visible submissions directly to Reviewer Cockpit">
          <span class="cockpit-icon">⚡</span>
          <span id="cockpit-sync-btn-label">Sync All to Cockpit</span>
        </button>
        <button type="button" class="cockpit-tb-btn cockpit-tb-btn-copy" id="cockpit-copy-all-btn" title="Copy full queue JSON dump to clipboard">
          <span class="cockpit-icon">📋</span>
          <span id="cockpit-copy-btn-label">Copy All JSON</span>
        </button>
        <button type="button" class="cockpit-tb-btn cockpit-tb-btn-settings" id="cockpit-settings-toggle" title="Configure Cockpit Server URL">
          ⚙️
        </button>
      </div>
      <div class="cockpit-tb-settings-panel" id="cockpit-settings-panel" style="display: none;">
        <label>Cockpit Server URL:</label>
        <div class="cockpit-tb-input-group">
          <input type="text" id="cockpit-server-url-input" value="${DEFAULT_SERVER_URL}" placeholder="http://100.68.188.57:3001" />
          <button type="button" id="cockpit-save-url-btn">Save</button>
        </div>
      </div>
    `;

    const mount = document.body || document.documentElement;
    if (mount) {
      mount.appendChild(toolbar);
    }

    // Asynchronously update server URL from storage
    getStoredServerUrl().then((serverUrl) => {
      const input = toolbar.querySelector('#cockpit-server-url-input');
      if (input && serverUrl) {
        input.value = serverUrl;
      }
    });

    // Event: Settings toggle
    const toggleBtn = toolbar.querySelector('#cockpit-settings-toggle');
    const panel = toolbar.querySelector('#cockpit-settings-panel');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (!toolbar.contains(e.target)) {
        panel.style.display = 'none';
      }
    });

    // Event: Save Server URL
    const saveBtn = toolbar.querySelector('#cockpit-save-url-btn');
    const urlInput = toolbar.querySelector('#cockpit-server-url-input');
    saveBtn.addEventListener('click', async () => {
      const val = urlInput.value.trim();
      if (val) {
        await setStoredServerUrl(val);
        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
          saveBtn.textContent = 'Save';
          panel.style.display = 'none';
        }, 1000);
      }
    });

    // Event: Sync All to Cockpit
    const syncBtn = toolbar.querySelector('#cockpit-sync-all-btn');
    syncBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await syncAllTabsToCockpit();
    });

    // Event: Copy All JSON
    const copyAllBtn = toolbar.querySelector('#cockpit-copy-all-btn');
    const copyAllLabel = toolbar.querySelector('#cockpit-copy-btn-label');
    copyAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const projects = getAllProjectsFromPage();
      if (projects.length === 0) {
        alert('No projects detected on this page yet.');
        return;
      }

      const jsonStr = JSON.stringify(projects, null, 2);
      await navigator.clipboard.writeText(jsonStr);

      const originalText = copyAllLabel.textContent;
      copyAllBtn.classList.add('cockpit-btn-success');
      copyAllLabel.textContent = `✓ Copied ${projects.length} JSON!`;

      setTimeout(() => {
        copyAllBtn.classList.remove('cockpit-btn-success');
        copyAllLabel.textContent = originalText;
      }, 2000);
    });
  }

  let isSyncing = false;
  let lastSyncedPendingCount = null;

  /**
   * Performs full 4-tab sync across Pending, Approved, Rejected, and Fraud
   */
  async function syncAllTabsToCockpit() {
    if (isSyncing) return { inProgress: true };
    isSyncing = true;

    const syncBtn = document.getElementById('cockpit-sync-all-btn');
    const syncLabel = document.getElementById('cockpit-sync-btn-label');
    const originalText = syncLabel ? syncLabel.textContent : 'Sync All to Cockpit';

    try {
      if (syncLabel) {
        syncLabel.textContent = 'Fetching tabs...';
      }

      const currentTab = getCurrentTabKey();
      const isHackClub = window.location.hostname.includes('hackclub.com');
      const resultsByTab = {
        pending: [],
        approved: [],
        rejected: [],
        fraud: []
      };

      if (isHackClub) {
        // Parallel fetch of other 3 tabs, and local extraction for current tab
        await Promise.all(
          REVIEW_TABS.map(async (tab) => {
            if (tab.key === currentTab) {
              resultsByTab[tab.key] = getAllProjectsFromPage(currentTab);
            } else {
              try {
                const html = await fetchTabHtml(tab.path);
                resultsByTab[tab.key] = parseProjectsFromHtml(html, tab.key);
              } catch (err) {
                console.warn(`[Cockpit Ingest] Failed to fetch tab ${tab.key}:`, err);
                resultsByTab[tab.key] = [];
              }
            }
          })
        );
      } else {
        // Non-hackclub (e.g. Airtable)
        resultsByTab.pending = getAllProjectsFromPage('pending');
      }

      const tabCounts = {
        pending: resultsByTab.pending?.length || 0,
        approved: resultsByTab.approved?.length || 0,
        rejected: resultsByTab.rejected?.length || 0,
        fraud: resultsByTab.fraud?.length || 0
      };

      const allProjects = [
        ...(resultsByTab.pending || []),
        ...(resultsByTab.approved || []),
        ...(resultsByTab.rejected || []),
        ...(resultsByTab.fraud || [])
      ];

      if (allProjects.length === 0) {
        alert('No projects detected across the review tabs.');
        if (syncLabel) syncLabel.textContent = originalText;
        return { ok: false, error: 'No projects detected' };
      }

      if (syncLabel) {
        syncLabel.textContent = `Syncing 4 tabs (Pending: ${tabCounts.pending})...`;
      }

      const serverUrl = await getStoredServerUrl();
      const payload = {
        projects: allProjects,
        fullSync: true,
        tabCounts: tabCounts
      };

      try {
        const res = await fetch(`${serverUrl}/api/sync/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const resData = await res.json();
        const pendingCount = resData.stats?.pending ?? tabCounts.pending;
        lastSyncedPendingCount = pendingCount;

        if (syncBtn && syncLabel) {
          syncBtn.classList.add('cockpit-btn-success');
          syncLabel.textContent = `✓ Synced 4 Tabs! (${pendingCount} Pending)`;
        }

        const badge = document.getElementById('cockpit-tb-count');
        if (badge) {
          badge.textContent = `${pendingCount} Pending`;
        }

        setTimeout(() => {
          if (syncBtn && syncLabel) {
            syncBtn.classList.remove('cockpit-btn-success');
            syncLabel.textContent = originalText;
          }
        }, 3500);

        return {
          ok: true,
          stats: resData.stats,
          tabCounts: tabCounts,
          message: `✓ Synced 4 Tabs! (${pendingCount} Pending)`
        };
      } catch (err) {
        console.warn('[Cockpit Ingest] Direct server sync failed, falling back to clipboard:', err);

        const jsonStr = JSON.stringify(allProjects, null, 2);
        try {
          await navigator.clipboard.writeText(jsonStr);
        } catch (clipErr) {
          console.error('[Cockpit Ingest] Clipboard error:', clipErr);
        }

        if (syncBtn && syncLabel) {
          syncBtn.classList.add('cockpit-btn-success');
          syncLabel.textContent = '📋 Copied 4 Tabs to Clipboard!';
        }

        setTimeout(() => {
          if (syncBtn && syncLabel) {
            syncBtn.classList.remove('cockpit-btn-success');
            syncLabel.textContent = originalText;
          }
        }, 3500);

        return {
          ok: false,
          copied: true,
          tabCounts: tabCounts,
          message: '📋 Copied 4 Tabs to Clipboard!'
        };
      }
    } finally {
      isSyncing = false;
    }
  }

  function updateBadgeCount() {
    const badge = document.getElementById('cockpit-tb-count');
    if (!badge) return;

    if (lastSyncedPendingCount !== null) {
      badge.textContent = `${lastSyncedPendingCount} Pending`;
      return;
    }

    if (pageHydrationRows && pageHydrationRows.length > 0) {
      const currentTab = getCurrentTabKey();
      const label = currentTab === 'pending' ? 'Pending' : currentTab.charAt(0).toUpperCase() + currentTab.slice(1);
      badge.textContent = `${pageHydrationRows.length} ${label}`;
    } else {
      const count = document.querySelectorAll('.card, [class*="card"]').length;
      badge.textContent = `${count} found`;
    }
  }

  let isInjecting = false;

  /**
   * Scan DOM for submission cards safely and idempotently
   */
  function scanAndInject() {
    if (isInjecting) return;
    isInjecting = true;

    try {
      scanHydrationData();
      injectTopToolbar();
      updateBadgeCount();

      const unInjectedCards = document.querySelectorAll(
        '.card:not([data-cockpit-injected="true"]), [class*="card"]:not([data-cockpit-injected="true"])'
      );

      for (const card of unInjectedCards) {
        // Skip toolbar or elements inside cockpit UI
        if (card.closest && (card.closest('#cockpit-top-toolbar') || card.closest('[class*="cockpit-"]'))) {
          continue;
        }
        if (card.querySelector('a, img, p')) {
          injectIntoCard(card);
        }
      }
    } catch (err) {
      console.debug('[Cockpit Ingest] Error during scanAndInject:', err);
    } finally {
      isInjecting = false;
    }
  }

  let debounceTimer = null;
  function debouncedScanAndInject() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      scanAndInject();
    }, 300);
  }

  // Initial trigger
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debouncedScanAndInject);
  } else {
    debouncedScanAndInject();
  }

  // Safe MutationObserver ignoring own injections
  const observer = new MutationObserver((mutations) => {
    if (isInjecting) return;

    let shouldScan = false;
    for (const mutation of mutations) {
      const target = mutation.target;

      // Ignore mutations originating from cockpit UI
      if (target) {
        const el = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
        if (el?.closest && (el.closest('#cockpit-top-toolbar') || el.closest('[class*="cockpit-"]'))) {
          continue;
        }
      }

      // Check added nodes: ignore if only cockpit elements were added
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        let onlyCockpit = true;
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.id === 'cockpit-top-toolbar' ||
                (node.className && typeof node.className === 'string' && node.className.includes('cockpit-')) ||
                (node.dataset && node.dataset.cockpitInjected)) {
              continue;
            }
          }
          onlyCockpit = false;
          break;
        }
        if (onlyCockpit) {
          continue;
        }
      }

      shouldScan = true;
      break;
    }

    if (shouldScan) {
      debouncedScanAndInject();
    }
  });

  const targetNode = document.body || document.documentElement;
  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
    });
  }

  // Safe fallback polling at 5000ms instead of aggressive 1500ms
  setInterval(debouncedScanAndInject, 5000);

  // Message listener for popup triggers
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'SYNC_ALL_4_TABS' || request.action === 'SYNC_ALL') {
        syncAllTabsToCockpit()
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse({ ok: false, error: err.message }));
        return true; // Keep channel open for async response
      }
    });
  }

  console.log('[Cockpit Ingest Helper] Active with Full-Queue Sync & Quick Ingest.');
})();
