import { Router } from "express";
import { getEmergencySigns, suggestDepartment } from "../controllers/triageController.js";

const router = Router();

// Public triage and emergency assistance routes
router.post("/suggest", suggestDepartment);
router.get("/warning-signs", getEmergencySigns);

export default router;
