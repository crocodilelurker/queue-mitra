import { Router } from "express";
import {
  acknowledgeUrgent,
  callNext,
  completeTicket,
  getDashboard,
  listUrgent,
  markNoShow,
  requeueTicket,
  transferTicket,
  updateStatus,
} from "../controllers/doctorController.js";
import { CONSOLE_ROLES, protect, requireRole } from "../middleware/auth.js";

// Queue actions for doctors (their own room) and staff/admins (any department: pass departmentCode).
const router = Router();

router.use(protect, requireRole(...CONSOLE_ROLES));

router.get("/dashboard", getDashboard);
router.post("/call-next", callNext);
router.post("/tickets/:ticketId/complete", completeTicket);
router.post("/tickets/:ticketId/no-show", markNoShow);
router.post("/tickets/:ticketId/requeue", requeueTicket);
router.post("/tickets/:ticketId/transfer", transferTicket);
router.patch("/status", updateStatus);
router.get("/urgent", listUrgent);
router.post("/urgent/:ticketId/seen", acknowledgeUrgent);

export default router;
