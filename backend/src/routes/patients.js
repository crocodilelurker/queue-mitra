import { Router } from "express";
import {
  handleRegisterPatient,
  handleListPatients,
  handleGetPatientProfile,
  handleUpdatePatient,
} from "../controllers/patientController.js";

const router = Router();

router.post("/", handleRegisterPatient);
router.get("/", handleListPatients);
router.get("/:patientId", handleGetPatientProfile);
router.patch("/:patientId", handleUpdatePatient);

export default router;
