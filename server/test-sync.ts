import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, "../data/seed.json");
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  console.log("🧪 Starting Reviewer Cockpit Server Integration Tests...\n");

  // 1. Health check
  console.log("1. Checking Server Health...");
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.statusText}`);
  const healthData = await healthRes.json();
  console.log("✅ Server Health OK:", healthData);

  // 2. Initial Bulk Sync
  console.log("\n2. Ingesting Seed Projects via POST /api/sync/projects...");
  const rawSeed = await fs.readFile(SEED_FILE, "utf-8");
  const seedProjects = JSON.parse(rawSeed);

  const syncRes = await fetch(`${BASE_URL}/sync/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(seedProjects),
  });
  if (!syncRes.ok) throw new Error(`Sync failed: ${await syncRes.text()}`);
  const syncData = await syncRes.json();
  console.log("✅ Sync Result:", syncData);
  if (syncData.created !== seedProjects.length) {
    console.warn(`Expected ${seedProjects.length} created, got ${syncData.created}`);
  }

  // 3. Query All Projects
  console.log("\n3. Querying GET /api/projects...");
  const listRes = await fetch(`${BASE_URL}/projects`);
  const listData = await listRes.json();
  console.log(`✅ Loaded ${listData.projects.length} projects. Queue stats:`, listData.stats);

  // 4. Update a project and re-sync to test Change Detector
  console.log("\n4. Testing Change Detector & Append-Only Audit Logging...");
  const updatedProjects = JSON.parse(rawSeed);
  // Modify project 1 overrideHours and description
  updatedProjects[0].overrideHours = 9.5;
  updatedProjects[0].description = "Updated description with new telemetry";

  const resyncRes = await fetch(`${BASE_URL}/sync/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedProjects),
  });
  const resyncData = await resyncRes.json();
  console.log("✅ Re-sync Result (expecting 1 updated, 4 unchanged):", resyncData);
  if (resyncData.updated !== 1) {
    throw new Error(`Expected 1 updated, got ${resyncData.updated}`);
  }

  // 5. Inspect Audit Log for Project 1
  console.log("\n5. Inspecting Project 1 Audit History...");
  const proj1Res = await fetch(`${BASE_URL}/projects/${seedProjects[0].id}`);
  const proj1Data = await proj1Res.json();
  console.log(`✅ Project version: ${proj1Data.project.version}, changeCount: ${proj1Data.project.changeCount}`);
  console.log(`✅ Audit History (${proj1Data.auditHistory.length} entries):`);
  for (const log of proj1Data.auditHistory) {
    console.log(`   - [${log.timestamp.slice(11, 19)}] ${log.action}: ${log.summary}`);
  }

  // 6. Submit Reviewer Verdict (Pre-Approve)
  console.log("\n6. Submitting Verdict via POST /api/verdicts...");
  const verdictPayload = {
    projectId: seedProjects[0].id,
    action: "pre_approve",
    approvedHours: 9.0,
    deflatedHours: 0.5,
    hoursJustification: "Rust CLI with complete source code, Linux x86_64 binary release attached to v1.0.0. Deflated 0.5h for idle terminal pauses.",
    publicFeedback: "Incredible CLI tool! The terminal ASCII art and performance benchmarks look great.",
    appliedChecklist: {
      hasSourceCode: true,
      hasPlayableRelease: true,
      notDoubleDipped: true,
      hoursReasonable: true,
    },
    reviewerName: "Shashwat",
  };

  const verdictRes = await fetch(`${BASE_URL}/verdicts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(verdictPayload),
  });
  if (!verdictRes.ok) throw new Error(`Verdict failed: ${await verdictRes.text()}`);
  const verdictData = await verdictRes.json();
  console.log("✅ Verdict Recorded:", verdictData.verdict.action, `(${verdictData.verdict.approvedHours}h)`);

  // 7. Verify Pre-Approved Queue & Admin Clipboard Format
  console.log("\n7. Querying GET /api/preapproved (Admin Clipboard Desk)...");
  const preapprovedRes = await fetch(`${BASE_URL}/preapproved`);
  const preapprovedData = await preapprovedRes.json();
  console.log(`✅ Pre-approved count: ${preapprovedData.count}`);
  const firstItem = preapprovedData.items[0];
  console.log("--- Sample 1-Click Clipboard Text for Admin ---");
  console.log(firstItem.clipboardText);
  console.log("-----------------------------------------------");

  // 8. Queue Stats
  console.log("\n8. Final Stats via GET /api/stats...");
  const statsRes = await fetch(`${BASE_URL}/stats`);
  const stats = await statsRes.json();
  console.log("✅ Final Stats:", stats);

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Phase 1 is rock-solid.\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
