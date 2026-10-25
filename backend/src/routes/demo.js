import { Router } from "express";
import { getSimulationStatus, startSimulation, stopSimulation } from "../controllers/demoController.js";
import { ADMIN_ROLES, protect, requireRole } from "../middleware/auth.js";

// Demo controls for presentations. They only move real queues; they never create patients.
const router = Router();

router.use(protect, requireRole(...ADMIN_ROLES));
router.post("/auto-simulate/start", startSimulation);
router.post("/auto-simulate/stop", stopSimulation);
router.get("/auto-simulate/status", getSimulationStatus);

export default router;
