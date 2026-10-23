import { Router } from "express";
import {
  getSimulationStatus,
  resetDemo,
  seedPatients,
  startSimulation,
  stopSimulation,
} from "../controllers/demoController.js";

const router = Router();

// Demo controls (can be invoked by judges or staff during presentation)
router.post("/seed-patients", seedPatients);
router.post("/reset", resetDemo);
router.post("/auto-simulate/start", startSimulation);
router.post("/auto-simulate/stop", stopSimulation);
router.get("/auto-simulate/status", getSimulationStatus);

export default router;
