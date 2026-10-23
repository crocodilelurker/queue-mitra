import { Router } from "express";
import {
  acknowledgeUrgent,
  callNext,
  completeTicket,
  getDashboard,
  listUrgent,
  markNoShow,
  updateStatus,
} from "../controllers/doctorController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireRole("doctor"));

router.get("/dashboard", getDashboard);
router.post("/call-next", callNext);
router.post("/tickets/:ticketId/complete", completeTicket);
router.post("/tickets/:ticketId/no-show", markNoShow);
router.patch("/status", updateStatus);
router.get("/urgent", listUrgent);
router.post("/urgent/:ticketId/seen", acknowledgeUrgent);

export default router;
