import { Router } from "express";
import { getEmergencySigns, suggestDepartment } from "../controllers/triageController.js";
import { translateVoiceInput } from "../controllers/voiceController.js";

const router = Router();

// Public triage and emergency assistance routes
router.post("/suggest", suggestDepartment);
router.get("/warning-signs", getEmergencySigns);
router.post("/voice-translate", translateVoiceInput);

export default router;
