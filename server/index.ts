import cors from "cors";
import express from "express";
import { apiRouter } from "./routes.js";
import { storage } from "./storage.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logger for visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith("/api/health")) {
      console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount main API
app.use("/api", apiRouter);

// Start server
async function main() {
  try {
    await storage.init();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Hack Club Reviewer Cockpit Server running on http://localhost:${PORT}`);
      console.log(`   - Projects Endpoint: http://localhost:${PORT}/api/projects`);
      console.log(`   - Sync Endpoint:     http://localhost:${PORT}/api/sync/projects`);
      console.log(`   - Pre-Approved:      http://localhost:${PORT}/api/preapproved`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

main();
