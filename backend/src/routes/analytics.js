import { Router } from "express";
import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();

// GET /api/analytics/:hospitalCode (e.g. /api/analytics/CDH)
router.get("{/:hospitalCode}", getAnalytics);

export default router;
