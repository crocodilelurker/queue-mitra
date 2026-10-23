import { Router } from "express";
import { getPatientNotifications } from "../controllers/notificationController.js";

const router = Router();

router.get("/:identifier", getPatientNotifications);

export default router;
