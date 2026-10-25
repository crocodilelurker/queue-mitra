import { Router } from "express";
import { CONSOLE_ROLES, protect, requireRole } from "../middleware/auth.js";
import { buildStaffOverview } from "../services/overviewService.js";

const router = Router();

router.use(protect, requireRole(...CONSOLE_ROLES));

// GET /api/staff/overview: every department's live queue, doctors and open urgent requests.
router.get("/overview", async (req, res) => {
  res.json(await buildStaffOverview(req.user.hospital));
});

export default router;
