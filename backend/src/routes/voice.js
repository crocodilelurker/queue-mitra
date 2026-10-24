import { Router } from "express";
import { translateVoiceInput } from "../controllers/voiceController.js";

const router = Router();

// Route: POST /api/voice/translate
router.post("/translate", translateVoiceInput);

export default router;
