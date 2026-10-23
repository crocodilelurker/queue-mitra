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

// Public: patients don't log in to register or check their place in the queue.
const router = Router();

router.post("/", createTicket);
router.post("/counter", counterRegister);
router.post("/sync", syncOffline);
router.get("/lookup/:tokenNumber", lookupTicket);
router.get("/:publicId", getTicket);
router.get("/:publicId/slip", getSlip);
router.patch("/:publicId/preferences", updatePreferences);
router.post("/:publicId/urgent", raiseUrgent);

export default router;
