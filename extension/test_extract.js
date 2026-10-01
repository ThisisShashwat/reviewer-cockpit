/**
 * Verification test script for Cockpit Quick Ingest Helper extraction logic.
 * Parses sample submission cards from pending.html and asserts accurate field extraction.
 */

const HW_KEYWORDS = [
  'cad', 'pcb', 'kicad', '3d print', '3d-print', '3d printable', 'printable',
  'easyeda', 'onshape', 'blender', 'fusion 360', 'fusion360', 'hardware',
  'soldering', 'microcontroller', 'arduino', 'esp32', 'rp2040', 'rp-2040',
  'stm32', 'circuit', 'schematic', 'gerber', 'electronics', 'lora puck', 'macropad',
  'printables.com', 'tinkercad', 'devboard', 'firmware', 'flight controller'
];

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

function detectProjectType(textCorpus) {
  const lower = (textCorpus || '').toLowerCase();
  for (const kw of HW_KEYWORDS) {
    if (lower.includes(kw)) return 'hardware';
  }
  return 'software';
}

function extractFromHtmlSnippet(cardHtml) {
  // Strip HTML comments (Next.js empty comment hydration placeholders)
  const clean = cardHtml.replace(/<!--[\s\S]*?-->/g, '');

  // 1. Links
  const codeMatch = clean.match(/<a[^>]*href="([^"]+)"[^>]*>\s*Code URL\s*<\/a>/i) ||
                    clean.match(/<a[^>]*href="(https?:\/\/github\.com\/[^"]+)"/i);
  const codeUrl = codeMatch ? codeMatch[1] : null;

  const playableMatch = clean.match(/<a[^>]*href="([^"]+)"[^>]*>\s*Playable URL\s*<\/a>/i);
  const playableUrl = playableMatch ? playableMatch[1] : null;

  // 2. Screenshot
  const imgMatch = clean.match(/<img[^>]*src="([^"]+)"/i);
  const screenshotUrl = imgMatch ? imgMatch[1] : null;

  // 3. Project Name
  const projMatch = clean.match(/<p[^>]*>\s*Project:\s*([^<]+)<\/p>/i);
  let projectName = projMatch ? projMatch[1].trim() : null;

  // 4. Hackatime ID
  const htMatch = clean.match(/<p[^>]*>\s*Hackatime ID:\s*([^<]+)<\/p>/i);
  const hackatimeId = htMatch ? htMatch[1].trim() : null;

  // 5. Description
  const descMatch = clean.match(/<p[^>]*>\s*Description:\s*([\s\S]*?)<\/p>/i);
  const description = descMatch ? descMatch[1].trim() : null;

  // 6. Lapse Links
  const lapseMatch = clean.match(/<p[^>]*>\s*Lapse:\s*([^<]+)<\/p>/i);
  let lapseLinks = [];
  if (lapseMatch) {
    const raw = lapseMatch[1];
    const urls = raw.match(/https?:\/\/[^\s,]+/g) || [];
    lapseLinks = urls.map(u => u.replace(/[.,;)>]+$/, ''));
  }

  // 7. Submitted Hours
  const hoursInputMatch = clean.match(/<input[^>]*type="number"[^>]*value="([^"]+)"/i);
  const storedHoursMatch = clean.match(/stored:\s*([0-9.]+)\s*h/i);
  const submittedHours = hoursInputMatch ? parseFloat(hoursInputMatch[1]) : (storedHoursMatch ? parseFloat(storedHoursMatch[1]) : 0);

  // 8. Fallback project name
  if (!projectName && codeUrl) {
    const m = codeUrl.match(/github\.com\/[^/]+\/([^/?#]+)/i);
    if (m) projectName = m[1].replace(/\.git$/i, '');
  }

  // 9. GitHub Username
  const githubUsername = extractGhUsername(codeUrl, playableUrl, lapseLinks);

  // 10. Project Type
  const corpus = [projectName, description, codeUrl, playableUrl, lapseLinks.join(' ')].join(' ');
  const projectType = detectProjectType(corpus);

  return {
    projectName,
    codeUrl,
    playableUrl,
    screenshotUrl,
    description,
    submittedHours,
    hackatimeId,
    githubUsername,
    projectType,
    lapseLinks
  };
}

// Sample snippet from Card 0 in pending.html
const sampleCardHtml = `
<div class="card bg-base-200 p-4 gap-3">
  <div class="flex gap-4 items-start flex-wrap">
    <img src="./pending_files/Screenshot2026-09-23005438.png" alt="" class="w-32 h-32 object-cover rounded-lg">
    <div class="flex flex-col gap-1 text-sm">
      <a class="link" href="https://github.com/udayprakash999/KUROMI-WORLD" target="_blank" rel="noreferrer">Code URL</a>
      <a class="link" href="https://udayprakash999.github.io/KUROMI-WORLD/" target="_blank" rel="noreferrer">Playable URL</a>
      <p>Project: <!-- -->KUROMI WORLD</p>
      <p>Hackatime ID: <!-- -->11836</p>
      <p class="max-w-md whitespace-pre-wrap">Description: <!-- -->A cute lil Kuromi fan page made with  html and css this website showcases kuromi friends and her personality and a gallery of kuromi.</p>
      <p class="opacity-60">Pending</p>
    </div>
  </div>
  <div class="flex gap-2 flex-wrap items-center">
    <label class="text-sm opacity-70">Hours</label>
    <input type="number" step="0.1" min="0" class="input input-bordered input-sm w-24" value="3">
    <span class="text-xs opacity-60">stored: <!-- -->3<!-- -->h</span>
  </div>
</div>
`;

console.log('Testing extraction on sample submission card...');
const result = extractFromHtmlSnippet(sampleCardHtml);
console.log('Extracted result:\n', JSON.stringify(result, null, 2));

// Assertions
if (result.projectName !== 'KUROMI WORLD') throw new Error(`Expected projectName 'KUROMI WORLD', got '${result.projectName}'`);
if (result.codeUrl !== 'https://github.com/udayprakash999/KUROMI-WORLD') throw new Error(`Expected codeUrl match`);
if (result.playableUrl !== 'https://udayprakash999.github.io/KUROMI-WORLD/') throw new Error(`Expected playableUrl match`);
if (result.submittedHours !== 3) throw new Error(`Expected hours 3, got ${result.submittedHours}`);
if (result.hackatimeId !== '11836') throw new Error(`Expected hackatimeId 11836, got ${result.hackatimeId}`);
if (result.githubUsername !== 'udayprakash999') throw new Error(`Expected githubUsername 'udayprakash999', got ${result.githubUsername}`);
if (result.projectType !== 'software') throw new Error(`Expected projectType 'software', got ${result.projectType}`);
if (!result.description.startsWith('A cute lil Kuromi')) throw new Error(`Description match failed`);

console.log('\n✅ All assertions passed successfully in test_extract.js!');
