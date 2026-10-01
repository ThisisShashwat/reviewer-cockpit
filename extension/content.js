/**
 * Cockpit Quick Ingest Helper - Content Script
 * Injects one-click "📋 Copy JSON" buttons on individual cards AND
 * a top toolbar to "⚡ Sync All to Cockpit" or "📋 Copy All JSON".
 */

(function () {
  'use strict';

  const DEFAULT_SERVER_URL = 'http://100.68.188.57:3001';

  // Hardware classification keywords
  const HW_KEYWORDS = [
    'cad', 'pcb', 'kicad', '3d print', '3d-print', '3d printable', 'printable',
    'easyeda', 'onshape', 'blender', 'fusion 360', 'fusion360', 'hardware',
    'soldering', 'microcontroller', 'arduino', 'esp32', 'rp2040', 'rp-2040',
    'stm32', 'circuit', 'schematic', 'gerber', 'electronics', 'lora puck', 'macropad',
    'printables.com', 'tinkercad', 'devboard', 'firmware', 'flight controller'
  ];

  // Cache Next.js hydration data if present in page scripts
  let pageHydrationRows = null;
  let rowsByCodeUrl = new Map();
  let rowsByHackatime = new Map();

  function scanHydrationData() {
    if (pageHydrationRows) return;
    try {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const text = s.textContent || '';
        if (text.includes('__next_f') || text.includes('"rows":[')) {
          // Look for pushed rows
          const matches = text.matchAll(/self\.__next_f\.push\(\[1,\s*"((?:\\.|[^"\\])*)"\]\)/g);
          let fullStr = '';
          for (const m of matches) {
            try {
              fullStr += JSON.parse('"' + m[1] + '"');
            } catch (e) {}
          }
          if (!fullStr && text.includes('"rows":[')) {
            fullStr = text;
          }

          const idx = fullStr.indexOf('"rows":[');
          if (idx !== -1) {
            // Find balanced array
            let start = idx + '"rows":'.length;
            let depth = 0;
            let end = -1;
            for (let i = start; i < fullStr.length; i++) {
              if (fullStr[i] === '[') depth++;
              else if (fullStr[i] === ']') {
                depth--;
                if (depth === 0) {
                  end = i + 1;
                  break;
                }
              }
            }
            if (end !== -1) {
              const rowsJson = fullStr.substring(start, end);
              pageHydrationRows = JSON.parse(rowsJson);
              for (const r of pageHydrationRows) {
                if (r.codeUrl) rowsByCodeUrl.set(r.codeUrl.trim().toLowerCase(), r);
                if (r.hackatimeId) rowsByHackatime.set(String(r.hackatimeId).trim(), r);
              }
              break;
            }
          }
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
    const lower = text.toLowerCase();
    for (const kw of HW_KEYWORDS) {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        return 'hardware';
      }
    }
    return 'software';
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
  function extractFromQueueCard(cardEl) {
    scanHydrationData();

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
      lapseLinks: lapseLinks || []
    };
  }

  /**
   * Extracts all projects on the current page
   */
  function getAllProjectsFromPage() {
    scanHydrationData();

    // 1. If Next.js hydration rows are available, parse directly
    if (pageHydrationRows && pageHydrationRows.length > 0) {
      return pageHydrationRows.map((r) => {
        const codeUrl = String(r.codeUrl || '').trim();
        const playableUrl = String(r.playableUrl || '').trim();
        const rawLapse = String(r.lapseLinks || '').trim();
        const lapseUrls = rawLapse.match(/https?:\/\/[^\s,]+/g) || [];
        const lapseLinks = lapseUrls.map((u) => u.replace(/[.,;)>]+$/, ''));
        const ghUser = extractGhUsername(codeUrl, playableUrl, lapseLinks);
        const projName = r.projectName || extractRepoName(codeUrl) || 'Untitled Project';
        const hours = typeof r.hours === 'number' ? r.hours : parseFloat(r.hours) || 0;
        const corpus = [projName, r.description, codeUrl, playableUrl, lapseLinks.join(' ')].join(' ');

        return {
          id: r.id || ('rec_' + Math.abs(hashCode(codeUrl || projName)).toString(36)),
          projectName: projName,
          codeUrl: codeUrl,
          playableUrl: playableUrl,
          screenshotUrl: r.screenshotUrl || '',
          description: r.description || '',
          submittedHours: Number(hours.toFixed(1)),
          hackatimeId: r.hackatimeId ? String(r.hackatimeId) : '',
          githubUsername: ghUser || '',
          projectType: detectProjectType(corpus),
          lapseLinks: lapseLinks,
        };
      });
    }

    // 2. DOM fallback
    const cards = Array.from(document.querySelectorAll('.card, [class*="card"]'))
      .filter((c) => c.querySelector('a, img, p'));

    const results = [];
    const seenIds = new Set();

    for (const card of cards) {
      const p = extractFromQueueCard(card);
      if (p && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        results.push(p);
      }
    }

    return results;
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
  async function injectTopToolbar() {
    if (document.getElementById('cockpit-top-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'cockpit-top-toolbar';
    toolbar.className = 'cockpit-top-toolbar';

    const currentServerUrl = await getStoredServerUrl();

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
          <input type="text" id="cockpit-server-url-input" value="${currentServerUrl}" placeholder="http://100.68.188.57:3001" />
          <button type="button" id="cockpit-save-url-btn">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(toolbar);

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
    const syncLabel = toolbar.querySelector('#cockpit-sync-btn-label');
    syncBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const projects = getAllProjectsFromPage();
      if (projects.length === 0) {
        alert('No projects detected on this page yet.');
        return;
      }

      const originalText = syncLabel.textContent;
      syncLabel.textContent = `Syncing ${projects.length}...`;

      const serverUrl = await getStoredServerUrl();

      try {
        const res = await fetch(`${serverUrl}/api/sync/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projects),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        syncBtn.classList.add('cockpit-btn-success');
        syncLabel.textContent = `✓ Synced ${data.created + data.updated || projects.length} to Cockpit!`;

        setTimeout(() => {
          syncBtn.classList.remove('cockpit-btn-success');
          syncLabel.textContent = originalText;
        }, 3000);
      } catch (err) {
        console.warn('[Cockpit Ingest] Direct server sync failed, falling back to clipboard:', err);

        // Fallback: Copy to clipboard so user can paste into Cockpit -> Sync Dump
        const jsonStr = JSON.stringify(projects, null, 2);
        await navigator.clipboard.writeText(jsonStr);

        syncBtn.classList.add('cockpit-btn-success');
        syncLabel.textContent = `📋 Copied ${projects.length} to Clipboard!`;

        setTimeout(() => {
          syncBtn.classList.remove('cockpit-btn-success');
          syncLabel.textContent = originalText;
        }, 3500);
      }
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

  function updateBadgeCount() {
    const badge = document.getElementById('cockpit-tb-count');
    if (badge) {
      const projects = getAllProjectsFromPage();
      badge.textContent = `${projects.length} found`;
    }
  }

  /**
   * Scan DOM for submission cards
   */
  function scanAndInject() {
    scanHydrationData();
    injectTopToolbar();
    updateBadgeCount();

    const queueCards = document.querySelectorAll('.card, [class*="card"]');
    for (const card of queueCards) {
      if (card.querySelector('a, img, p') && !card.dataset.cockpitInjected) {
        injectIntoCard(card);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndInject);
  } else {
    scanAndInject();
  }

  const observer = new MutationObserver(() => {
    scanAndInject();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  setInterval(scanAndInject, 1500);

  console.log('[Cockpit Ingest Helper] Active with Full-Queue Sync & Quick Ingest.');
})();
