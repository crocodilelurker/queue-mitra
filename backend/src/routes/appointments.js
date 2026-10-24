import { Router } from "express";
import {
  handleBookAppointment,
  handleListAppointments,
  handleUpdateAppointment,
  handleCompleteConsultation,
} from "../controllers/appointmentController.js";

const router = Router();

router.post("/", handleBookAppointment);
router.get("/", handleListAppointments);
router.patch("/:id", handleUpdateAppointment);
router.post("/:id/complete", handleCompleteConsultation);

export default router;
