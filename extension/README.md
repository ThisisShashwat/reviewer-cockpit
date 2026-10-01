# Cockpit Quick Ingest Helper (Chrome Extension v1.1)

A lightweight Manifest V3 Chrome extension for **Reviewer Cockpit** that allows:
1. **One-Click Individual Card Copy**: `📋 Copy JSON` on any submission card.
2. **Bulk One-Click Queue Sync**: `⚡ Sync All to Cockpit` button at the top of the queue that sends all projects directly into Cockpit with 1 click!
3. **Full Queue Dump Copy**: `📋 Copy All JSON` button to copy the entire queue array to clipboard.

Works directly on **`https://live.hackclub.com/review`** and Airtable queues, completely bypassing Vercel Bot Mitigation by running inside your authenticated browser!

---

## 🚀 How to Install in Google Chrome (4 Simple Steps)

1. Open Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
2. Enable **"Developer mode"** via the toggle switch in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left toolbar.
4. Select the `extension` folder on your laptop:
   ```text
   Downloads\cockpit-extension
   ```

---

## ⚡ How to Use

### Mode A: Bulk Sync All Projects (Fastest!)
1. Open `https://live.hackclub.com/review` in Chrome (make sure you are logged in).
2. At the top-right, you will see the floating **⚡ Cockpit Sync** bar showing how many submissions were found (e.g. `⚡ 75 found`).
3. Click **`⚡ Sync All to Cockpit`**:
   - The extension immediately extracts all projects and sends them directly to your Cockpit server!
   - Turns into **`✓ Synced X to Cockpit!`**.
   - *Note:* If Cockpit server is unreachable, it automatically copies all JSON to your clipboard so you can paste it into **Sync Dump** in Cockpit.

### Mode B: One-by-One Quick Ingest
1. On `https://live.hackclub.com/review`, find any project card you want to review.
2. Click **`📋 Copy JSON`** in the card header → turns into **`✓ Copied!`** in emerald green.
3. In Reviewer Cockpit, click **`⚡ Quick Ingest`** → Press <kbd>Ctrl+V</kbd> → <kbd>Ctrl+Enter</kbd>.
4. The project is instantly added to **Pending** and launched right into the Cockpit!

---

## ⚙️ Cockpit Server Configuration
Click the ⚙️ cog on the floating banner or open the extension popup to set your Reviewer Cockpit address:
- **Tailscale Address**: `http://100.68.188.57:3001` (Default)
- **Local LAN Address**: `http://192.168.1.14:3001`
- **Localhost Address**: `http://localhost:3001`
