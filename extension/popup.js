// Cockpit Quick Ingest Helper Popup Logic

const DEFAULT_SERVER_URL = 'http://100.68.188.57:3001';

document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('server-url-input');
  const saveBtn = document.getElementById('btn-save-url');
  const syncBtn = document.getElementById('btn-sync-all');
  const copyBtn = document.getElementById('btn-copy-all');
  const statusMsg = document.getElementById('status-msg');

  // Load configured server URL
  if (chrome.storage?.local) {
    chrome.storage.local.get(['cockpitServerUrl'], (result) => {
      urlInput.value = result.cockpitServerUrl || DEFAULT_SERVER_URL;
    });
  }

  // Save server URL
  saveBtn.addEventListener('click', () => {
    const val = urlInput.value.trim().replace(/\/+$/, '');
    if (val) {
      if (chrome.storage?.local) {
        chrome.storage.local.set({ cockpitServerUrl: val }, () => {
          showStatus('Server URL saved!', 'success');
        });
      } else {
        localStorage.setItem('COCKPIT_SERVER_URL', val);
        showStatus('Server URL saved!', 'success');
      }
    }
  });

  // Helper to click in-page button
  async function triggerInPageAction(btnId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (id) => {
          const btn = document.getElementById(id);
          if (btn) {
            btn.click();
            return { ok: true };
          }
          return { ok: false, error: 'Button not found on page' };
        },
        args: [btnId],
      });
      showStatus('Action triggered on active page!', 'success');
    } catch (err) {
      showStatus('Could not run on this page: ' + (err.message || ''), 'error');
    }
  }

  syncBtn.addEventListener('click', () => {
    triggerInPageAction('cockpit-sync-all-btn');
  });

  copyBtn.addEventListener('click', () => {
    triggerInPageAction('cockpit-copy-all-btn');
  });

  function showStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = `status-msg ${type}`;
    setTimeout(() => {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
    }, 3000);
  }
});
