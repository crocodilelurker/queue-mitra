import { Router } from "express";
import {
  handleGetOverview,
  handleListDoctors,
  handleUpdateDoctorStatus,
} from "../controllers/adminController.js";

const router = Router();

router.get("/overview", handleGetOverview);
router.get("/doctors", handleListDoctors);
router.patch("/doctors/:id/status", handleUpdateDoctorStatus);

export default router;
