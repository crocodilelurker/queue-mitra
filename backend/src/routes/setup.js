import { Router } from "express";
import { getCatalog, getStatus, runSetup } from "../controllers/setupController.js";
import { limiters } from "../middleware/rateLimit.js";

// Public first-run setup.
const router = Router();

router.get("/status", getStatus);
router.get("/catalog", getCatalog);
router.post("/", limiters.setup, runSetup);

export default router;
