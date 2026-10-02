import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDataDir = path.join(rootDir, 'public', 'data');

fs.mkdirSync(publicDataDir, { recursive: true });

// Always write only the dummy sample project to public build assets (zero personal or participant data)
const DUMMY_PROJECTS = [
  {
    id: "rec_demo_reviewer_cockpit",
    liveRecordId: "rec_demo_reviewer_cockpit",
    projectName: "Live Reviewer Cockpit",
    projectType: "software",
    codeUrl: "https://github.com/ThisisShashwat/reviewer-cockpit",
    allCodeUrls: [
      "https://github.com/ThisisShashwat/reviewer-cockpit"
    ],
    playableUrl: "https://thisisshashwat.github.io/reviewer-cockpit/",
    allPlayableUrls: [
      "https://thisisshashwat.github.io/reviewer-cockpit/"
    ],
    description: "High-throughput triage and forensic auditing workstation for Hack Club Horizons submissions. Includes multi-stage verification workflows, commit progression inspection, and audit-compliant justifications.",
    githubUsername: "ThisisShashwat",
    submittedHours: 15,
    hackatimeId: "shashwat",
    hackatimeProjects: "reviewer-cockpit",
    lapseLinks: [],
    liveApproved: false,
    liveReviewStatus: "Pending",
    cockpitStatus: "pending",
    submittedAt: "2026-10-02T12:00:00.000Z",
    firstSyncedAt: "2026-10-02T12:00:00.000Z",
    lastSyncedAt: "2026-10-02T12:00:00.000Z",
    updatedAt: "2026-10-02T12:00:00.000Z",
    version: 1,
    changeCount: 0
  }
];

fs.writeFileSync(
  path.join(publicDataDir, 'projects.json'),
  JSON.stringify(DUMMY_PROJECTS, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(publicDataDir, 'verdicts.json'),
  JSON.stringify({}, null, 2),
  'utf-8'
);

fs.writeFileSync(
  path.join(publicDataDir, 'audit_log.json'),
  JSON.stringify([], null, 2),
  'utf-8'
);

console.log('[sync-public-data] Generated clean public dummy data (1 sample project, 0 secrets, 0 personal data).');
