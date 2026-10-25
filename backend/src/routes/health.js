import { Router } from "express";
import { dbStatus } from "../config/db.js";

const router = Router();

// GET /api/health: for uptime checks and the hosting platform's health probe (503 when the DB is down).
router.get("/", (req, res) => {
  const db = dbStatus();
  const ok = db.state === "connected";
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "queue-mitra-backend",
    database: db.state,
    databaseMode: db.mode,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
