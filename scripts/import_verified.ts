import fs from "node:fs/promises";
import { normalizeLiveSubmission } from "../server/normalizer.js";

async function run() {
  const rawData = JSON.parse(await fs.readFile("./data/extracted_live_submissions.json", "utf-8"));
  console.log(`Loaded ${rawData.length} raw records.`);

  const projects = rawData.map((raw: any) => normalizeLiveSubmission(raw));
  await fs.writeFile("./data/projects.json", JSON.stringify(projects, null, 2), "utf-8");

  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.cockpitStatus] = (statusCounts[p.cockpitStatus] || 0) + 1;
  }
  console.log("Successfully normalized and saved projects.json!");
  console.log("Status counts:", statusCounts);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
