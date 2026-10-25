import { Router } from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import { CONSOLE_ROLES, protect, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/analytics/:hospitalCode (signed-in staff only)
router.get("{/:hospitalCode}", protect, requireRole(...CONSOLE_ROLES), getAnalytics);

export default router;
