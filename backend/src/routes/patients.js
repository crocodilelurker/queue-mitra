import { Router } from "express";
import {
  handleRegisterPatient,
  handleListPatients,
  handleGetPatientProfile,
  handleUpdatePatient,
  handleDeletePatient,
} from "../controllers/patientController.js";

const router = Router();

router.post("/", handleRegisterPatient);
router.get("/", handleListPatients);
router.get("/:patientId", handleGetPatientProfile);
router.patch("/:patientId", handleUpdatePatient);
router.delete("/:patientId", handleDeletePatient);

export default router;
