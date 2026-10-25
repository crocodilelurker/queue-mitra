import { Router } from "express";
import {
  counterRegister,
  createTicket,
  getSlip,
  getTicket,
  lookupTicket,
  raiseUrgent,
  syncOffline,
  updatePreferences,
} from "../controllers/ticketController.js";
import { CONSOLE_ROLES, protect, requireRole } from "../middleware/auth.js";
import { limiters } from "../middleware/rateLimit.js";

// Public: patients don't log in to register or check their place in the queue.
const router = Router();

router.post("/", limiters.tickets, createTicket);
router.post("/counter", protect, requireRole(...CONSOLE_ROLES), counterRegister);
router.post("/sync", limiters.tickets, syncOffline);
router.get("/lookup/:tokenNumber", lookupTicket);
router.get("/:publicId", getTicket);
router.get("/:publicId/slip", getSlip);
router.patch("/:publicId/preferences", updatePreferences);
router.post("/:publicId/urgent", limiters.urgent, raiseUrgent);

export default router;
