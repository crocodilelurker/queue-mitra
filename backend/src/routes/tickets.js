import { Router } from "express";
import { createTicket, getTicket, raiseUrgent } from "../controllers/ticketController.js";

// Public: patients don't log in to register or check their place in the queue.
const router = Router();

router.post("/", createTicket);
router.get("/:publicId", getTicket);
router.post("/:publicId/urgent", raiseUrgent);

export default router;
